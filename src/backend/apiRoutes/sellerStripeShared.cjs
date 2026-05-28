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

async function syncStripeConnectAccountSettings(stripe, accountId, sellerUserId) {
  const shopUrl = buildSellerShopUrl(sellerUserId);
  await stripe.accounts.update(accountId, {
    business_profile: { url: shopUrl },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      sellerUserId: String(sellerUserId),
    },
  });
}

function getRequirementList(requirements, key) {
  const value = requirements?.[key];
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function evaluateStripeConnectReadiness(account) {
  if (!account) {
    return {
      ready: false,
      paymentReady: false,
      onboardingComplete: false,
      needsAccountUpdate: false,
      pendingReview: false,
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      cardPaymentsStatus: "inactive",
      transfersStatus: "inactive",
      currentlyDue: [],
      pastDue: [],
      pendingVerification: [],
      disabledReason: null,
    };
  }

  const requirements = account.requirements || {};
  const currentlyDue = getRequirementList(requirements, "currently_due");
  const pastDue = getRequirementList(requirements, "past_due");
  const pendingVerification = getRequirementList(requirements, "pending_verification");
  const disabledReason = requirements.disabled_reason || null;

  const cardPaymentsStatus = account?.capabilities?.card_payments || "inactive";
  const transfersStatus = account?.capabilities?.transfers || "inactive";

  const detailsSubmitted = Boolean(account?.details_submitted);
  const chargesEnabled = Boolean(account?.charges_enabled);
  const payoutsEnabled = Boolean(account?.payouts_enabled);

  const capabilitiesActive = cardPaymentsStatus === "active" && transfersStatus === "active";
  const needsAccountUpdate = currentlyDue.length > 0 || pastDue.length > 0;

  const paymentReady = Boolean(
    detailsSubmitted
    && chargesEnabled
    && payoutsEnabled
    && capabilitiesActive
    && !needsAccountUpdate
    && !disabledReason
  );

  const onboardingComplete = Boolean(
    detailsSubmitted
    && !needsAccountUpdate
    && !disabledReason
  );

  const pendingReview = Boolean(
    onboardingComplete
    && !paymentReady
    && (pendingVerification.length > 0 || !chargesEnabled || !payoutsEnabled)
  );

  return {
    ready: paymentReady,
    paymentReady,
    onboardingComplete,
    needsAccountUpdate,
    pendingReview,
    detailsSubmitted,
    chargesEnabled,
    payoutsEnabled,
    cardPaymentsStatus,
    transfersStatus,
    currentlyDue,
    pastDue,
    pendingVerification,
    disabledReason,
  };
}

async function createStripeConnectAccountLink(stripe, accountId, { returnUrl, refreshUrl, linkType }) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: linkType,
  });
}

async function createStripeConnectRemediationLink(stripe, accountId, returnUrl, refreshUrl) {
  return createStripeConnectAccountLink(stripe, accountId, {
    returnUrl,
    refreshUrl,
    linkType: "account_update",
  });
}

async function createStripeConnectOnboardingLink(stripe, pool, sellerUserId, returnUrl, refreshUrl) {
  const accountId = await ensureStripeConnectAccount(stripe, pool, sellerUserId);
  await syncStripeConnectAccountSettings(stripe, accountId, sellerUserId);

  const account = await stripe.accounts.retrieve(accountId);
  const readiness = evaluateStripeConnectReadiness(account);
  const linkType = readiness.detailsSubmitted || readiness.needsAccountUpdate
    ? "account_update"
    : "account_onboarding";

  const accountLink = await createStripeConnectAccountLink(stripe, accountId, {
    returnUrl,
    refreshUrl,
    linkType,
  });

  return {
    accountId,
    url: accountLink.url,
    linkType,
  };
}

async function isStripeConnectReady(stripe, accountId) {
  if (!accountId) return false;
  const account = await stripe.accounts.retrieve(accountId);
  return evaluateStripeConnectReadiness(account).paymentReady;
}

async function getStripeConnectReadiness(stripe, accountId) {
  if (!accountId) {
    return evaluateStripeConnectReadiness(null);
  }

  const account = await stripe.accounts.retrieve(accountId);
  return evaluateStripeConnectReadiness(account);
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
  const metadataSellerId = String(account.metadata?.sellerUserId || "");
  if (metadataSellerId !== String(sellerUserId)) {
    if (!metadataSellerId && storedAccountId === accountId) {
      await stripe.accounts.update(accountId, {
        metadata: {
          ...(account.metadata || {}),
          sellerUserId: String(sellerUserId),
        },
      });
      return stripe.accounts.retrieve(accountId);
    }

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
  createStripeConnectRemediationLink,
  distributeOrderTransfers,
  ensureStripeConnectAccount,
  evaluateStripeConnectReadiness,
  getSellerStripeAccountId,
  getStripeConnectReadiness,
  isStripeConnectReady,
  syncStripeConnectAccountSettings,
};
