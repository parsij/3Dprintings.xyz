const { getFrontendUrl } = require("../envShared.cjs");
const { buildSellerShopUrl, isSellerOnboardingComplete } = require("./sellerOnboardingShared.cjs");

const PLATFORM_FEE_RATE = 0.051;
const PLATFORM_FEE_FIXED_CENTS = 15;
const MIN_CHECKOUT_TOTAL_CENTS = 50;

function calculatePlatformFeeCents(totalCents) {
  const normalizedTotal = Math.max(0, Math.round(Number(totalCents) || 0));
  const uncappedFee = Math.round(normalizedTotal * PLATFORM_FEE_RATE) + PLATFORM_FEE_FIXED_CENTS;
  return Math.min(uncappedFee, Math.max(0, normalizedTotal - 1));
}

function assertCheckoutTotalsAreValid(totalCents) {
  const normalizedTotal = Math.max(0, Math.round(Number(totalCents) || 0));
  if (normalizedTotal < MIN_CHECKOUT_TOTAL_CENTS) {
    const error = new Error(`Order total must be at least $${(MIN_CHECKOUT_TOTAL_CENTS / 100).toFixed(2)}.`);
    error.statusCode = 400;
    throw error;
  }

  const platformFeeCents = calculatePlatformFeeCents(normalizedTotal);
  if (platformFeeCents >= normalizedTotal) {
    const error = new Error("Order total is too low to process payment.");
    error.statusCode = 400;
    throw error;
  }

  return { normalizedTotal, platformFeeCents };
}

function allocateSellerPayoutsCents(orderItems, totalCents, platformFeeCents) {
  const sellerTotals = new Map();

  for (const item of orderItems) {
    const sellerId = Number(item.sellerId || item.seller_id);
    if (!Number.isInteger(sellerId) || sellerId <= 0) continue;

    const lineCents = Math.round(Number(item.current_price || 0) * 100) * Number(item.quantity || 1);
    sellerTotals.set(sellerId, (sellerTotals.get(sellerId) || 0) + lineCents);
  }

  const subtotalCents = [...sellerTotals.values()].reduce((sum, value) => sum + value, 0);
  const distributableCents = Math.max(0, Math.round(Number(totalCents) || 0) - platformFeeCents);
  const allocations = [];

  if (subtotalCents <= 0 || sellerTotals.size === 0) {
    return allocations;
  }

  let assigned = 0;
  const entries = [...sellerTotals.entries()];
  entries.forEach(([sellerId, sellerSubtotalCents], index) => {
    let amountCents;
    if (index === entries.length - 1) {
      amountCents = Math.max(0, distributableCents - assigned);
    } else {
      amountCents = Math.floor((distributableCents * sellerSubtotalCents) / subtotalCents);
      assigned += amountCents;
    }
    if (amountCents > 0) {
      allocations.push({ sellerId, amountCents });
    }
  });

  return allocations;
}

async function getSellerStripeAccountId(pool, sellerUserId) {
  const result = await pool.query(
    `SELECT stripe_connect_account_id
     FROM seller_profiles
     WHERE seller_user_id = $1
     LIMIT 1`,
    [sellerUserId]
  );
  return result.rows[0]?.stripe_connect_account_id || null;
}

async function assertSellerCanReceivePayments(pool, stripe, sellerUserId) {
  const profileResult = await pool.query(
    `SELECT stripe_connect_account_id, completions
     FROM seller_profiles
     WHERE seller_user_id = $1
     LIMIT 1`,
    [sellerUserId]
  );

  if (profileResult.rows.length === 0) {
    const error = new Error(`Seller ${sellerUserId} is not configured to receive payments.`);
    error.statusCode = 400;
    throw error;
  }

  const profile = profileResult.rows[0];
  if (!isSellerOnboardingComplete(profile.completions)) {
    const error = new Error(`Seller ${sellerUserId} has not completed onboarding.`);
    error.statusCode = 400;
    throw error;
  }

  const accountId = profile.stripe_connect_account_id;
  if (!accountId) {
    const error = new Error(`Seller ${sellerUserId} has not connected Stripe payouts.`);
    error.statusCode = 400;
    throw error;
  }

  const ready = await isStripeConnectReady(stripe, accountId);
  if (!ready) {
    const error = new Error(`Seller ${sellerUserId} has not finished Stripe Connect setup.`);
    error.statusCode = 400;
    throw error;
  }

  return accountId;
}

async function ensureStripeConnectAccount(stripe, pool, sellerUserId) {
  const profileResult = await pool.query(
    `SELECT stripe_connect_account_id
     FROM seller_profiles
     WHERE seller_user_id = $1
     LIMIT 1`,
    [sellerUserId]
  );

  if (profileResult.rows.length === 0) {
    const error = new Error("Create your shop before connecting Stripe.");
    error.statusCode = 409;
    throw error;
  }

  const existingId = profileResult.rows[0].stripe_connect_account_id;
  if (existingId) {
    return existingId;
  }

  const shopUrl = buildSellerShopUrl(sellerUserId);
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      url: shopUrl,
    },
    metadata: {
      sellerUserId: String(sellerUserId),
    },
  });

  await pool.query(
    `UPDATE seller_profiles
     SET stripe_connect_account_id = $1,
         updated_at = NOW()
     WHERE seller_user_id = $2`,
    [account.id, sellerUserId]
  );

  return account.id;
}

async function createStripeConnectOnboardingLink(stripe, pool, sellerUserId, returnUrl, refreshUrl) {
  const accountId = await ensureStripeConnectAccount(stripe, pool, sellerUserId);
  const shopUrl = buildSellerShopUrl(sellerUserId);

  await stripe.accounts.update(accountId, {
    business_profile: { url: shopUrl },
  });

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return {
    accountId,
    url: accountLink.url,
  };
}

async function isStripeConnectReady(stripe, accountId) {
  if (!accountId) return false;
  const account = await stripe.accounts.retrieve(accountId);
  return Boolean(
    account.details_submitted
    && account.charges_enabled
    && account.payouts_enabled
  );
}

async function assertStripeAccountOwnedBySeller(stripe, pool, sellerUserId, accountId) {
  if (!accountId) {
    const error = new Error("Stripe Connect account has not been created yet.");
    error.statusCode = 400;
    throw error;
  }

  const profileResult = await pool.query(
    `SELECT stripe_connect_account_id
     FROM seller_profiles
     WHERE seller_user_id = $1
     LIMIT 1`,
    [sellerUserId]
  );

  const storedAccountId = profileResult.rows[0]?.stripe_connect_account_id;
  if (!storedAccountId || storedAccountId !== accountId) {
    const error = new Error("Stripe account does not belong to this seller.");
    error.statusCode = 403;
    throw error;
  }

  const account = await stripe.accounts.retrieve(accountId);
  if (String(account.metadata?.sellerUserId || "") !== String(sellerUserId)) {
    const error = new Error("Stripe account metadata does not match this seller.");
    error.statusCode = 403;
    throw error;
  }

  return account;
}

async function distributeOrderTransfers(stripe, pool, { orderId, paymentIntentId, totalCents, orderItems }) {
  const platformFeeCents = calculatePlatformFeeCents(totalCents);
  const allocations = allocateSellerPayoutsCents(orderItems, totalCents, platformFeeCents);
  const transfers = [];

  for (const allocation of allocations) {
    const destination = await assertSellerCanReceivePayments(pool, stripe, allocation.sellerId);

    const transfer = await stripe.transfers.create(
      {
        amount: allocation.amountCents,
        currency: "usd",
        destination,
        transfer_group: paymentIntentId,
        metadata: {
          orderId: String(orderId),
          sellerId: String(allocation.sellerId),
        },
      },
      {
        idempotencyKey: `transfer-${orderId}-${allocation.sellerId}`,
      }
    );
    transfers.push(transfer);
  }

  return {
    platformFeeCents,
    allocations,
    transfers,
  };
}

function buildCheckoutPaymentIntentData({ totalCents, orderItems, sellerAccountById }) {
  const { platformFeeCents } = assertCheckoutTotalsAreValid(totalCents);
  const allocations = allocateSellerPayoutsCents(orderItems, totalCents, platformFeeCents);
  const uniqueSellerIds = [...new Set(allocations.map((entry) => entry.sellerId))];

  if (uniqueSellerIds.length === 0) {
    const error = new Error("Checkout items are missing seller payout details.");
    error.statusCode = 400;
    throw error;
  }

  if (uniqueSellerIds.length !== 1) {
    return { multiSeller: true, platformFeeCents, allocations };
  }

  const sellerId = uniqueSellerIds[0];
  const destination = sellerAccountById.get(sellerId);
  if (!destination) {
    const error = new Error("Seller payout account is not configured.");
    error.statusCode = 400;
    throw error;
  }

  return {
    multiSeller: false,
    platformFeeCents,
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination,
      },
    },
  };
}

module.exports = {
  PLATFORM_FEE_FIXED_CENTS,
  PLATFORM_FEE_RATE,
  MIN_CHECKOUT_TOTAL_CENTS,
  allocateSellerPayoutsCents,
  assertCheckoutTotalsAreValid,
  assertSellerCanReceivePayments,
  assertStripeAccountOwnedBySeller,
  buildCheckoutPaymentIntentData,
  calculatePlatformFeeCents,
  createStripeConnectOnboardingLink,
  distributeOrderTransfers,
  ensureStripeConnectAccount,
  getSellerStripeAccountId,
  isStripeConnectReady,
};
