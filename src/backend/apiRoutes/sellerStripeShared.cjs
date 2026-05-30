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
  // Sellers receive product revenue only (after platform fee on products).
  // Tax, shipping, and shipping markup stay on the platform balance.
  const sellerPlatformFeeCents = calculatePlatformFeeCents(subtotalCents);
  const distributableCents = Math.max(0, subtotalCents - sellerPlatformFeeCents);
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

const STRIPE_REQUIREMENT_LABELS = {
  "individual.verification.document": "Upload a government-issued photo ID",
  "individual.verification.additional_document": "Upload an additional identity document",
  "individual.id_number": "Provide your tax ID or Social Security number",
  "individual.dob.day": "Provide your date of birth",
  "individual.dob.month": "Provide your date of birth",
  "individual.dob.year": "Provide your date of birth",
  "individual.address.line1": "Provide your home address",
  "individual.address.city": "Provide your home address",
  "individual.address.state": "Provide your home address",
  "individual.address.postal_code": "Provide your home address",
  "individual.first_name": "Provide your legal first name",
  "individual.last_name": "Provide your legal last name",
  "individual.email": "Provide your email address",
  "individual.phone": "Provide your phone number",
  "external_account": "Add a bank account for payouts",
  "business_profile.url": "Confirm your shop URL",
  "tos_acceptance.date": "Accept Stripe's terms of service",
  "tos_acceptance.ip": "Accept Stripe's terms of service",
};

function describeStripeRequirements(currentlyDue = [], pastDue = []) {
  const codes = [...new Set([...currentlyDue, ...pastDue].filter(Boolean))];
  if (codes.length === 0) {
    return null;
  }

  const labels = codes.map((code) => STRIPE_REQUIREMENT_LABELS[code] || code.replaceAll(".", " "));
  const uniqueLabels = [...new Set(labels)];

  if (uniqueLabels.length === 1) {
    return uniqueLabels[0];
  }

  return `Complete the following in Stripe: ${uniqueLabels.join(", ")}`;
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

function resolveStripeConnectLinkType(readiness) {
  if (readiness.paymentReady && readiness.needsAccountUpdate) {
    return "account_update";
  }
  return "account_onboarding";
}

function shouldFallbackToOnboardingLink(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("account_onboarding")
    && message.includes("account_update");
}

async function createStripeConnectAccountLink(stripe, accountId, { returnUrl, refreshUrl, linkType }) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: linkType,
  });
}

async function createStripeConnectAccountLinkWithFallback(stripe, accountId, options) {
  const { returnUrl, refreshUrl, preferredLinkType } = options;
  const linkTypes = preferredLinkType === "account_update"
    ? ["account_update", "account_onboarding"]
    : ["account_onboarding"];

  let lastError = null;
  for (const linkType of linkTypes) {
    try {
      const link = await createStripeConnectAccountLink(stripe, accountId, {
        returnUrl,
        refreshUrl,
        linkType,
      });
      return { link, linkType };
    } catch (error) {
      lastError = error;
      if (linkType === "account_update" && shouldFallbackToOnboardingLink(error)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Failed to create Stripe Connect account link.");
}

async function createStripeConnectRemediationLink(stripe, accountId, returnUrl, refreshUrl) {
  const { link, linkType } = await createStripeConnectAccountLinkWithFallback(stripe, accountId, {
    returnUrl,
    refreshUrl,
    preferredLinkType: "account_update",
  });
  return {
    url: link.url,
    linkType,
  };
}

async function createStripeConnectOnboardingLink(stripe, pool, sellerUserId, returnUrl, refreshUrl) {
  const accountId = await ensureStripeConnectAccount(stripe, pool, sellerUserId);
  await syncStripeConnectAccountSettings(stripe, accountId, sellerUserId);

  const account = await stripe.accounts.retrieve(accountId);
  const readiness = evaluateStripeConnectReadiness(account);
  const preferredLinkType = resolveStripeConnectLinkType(readiness);
  const { link: accountLink, linkType } = await createStripeConnectAccountLinkWithFallback(
    stripe,
    accountId,
    {
      returnUrl,
      refreshUrl,
      preferredLinkType,
    }
  );

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

  const paymentIntent = await stripe.paymentIntents.retrieve(String(paymentIntentId));
  const sourceTransaction = paymentIntent.latest_charge;
  if (!sourceTransaction) {
    const error = new Error(`PaymentIntent ${paymentIntentId} has no charge for seller transfers.`);
    error.statusCode = 409;
    throw error;
  }

  const sourceTransactionId = typeof sourceTransaction === "string"
    ? sourceTransaction
    : sourceTransaction.id;

  for (const allocation of allocations) {
    const destination = await assertSellerCanReceivePayments(pool, stripe, allocation.sellerId);

    const transfer = await stripe.transfers.create(
      {
        amount: allocation.amountCents,
        currency: "usd",
        destination,
        source_transaction: sourceTransactionId,
        transfer_group: String(paymentIntentId),
        metadata: {
          orderId: String(orderId),
          sellerId: String(allocation.sellerId),
          platformFeeCents: String(platformFeeCents),
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

  if (allocations.length === 0) {
    const error = new Error("Checkout items are missing seller payout details.");
    error.statusCode = 400;
    throw error;
  }

  for (const allocation of allocations) {
    if (!sellerAccountById.get(allocation.sellerId)) {
      const error = new Error("Seller payout account is not configured.");
      error.statusCode = 400;
      throw error;
    }
  }

  // Collect the full payment on the platform and transfer seller shares after
  // checkout completes so the platform fee stays on the platform balance.
  return {
    multiSeller: true,
    platformFeeCents,
    allocations,
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
  describeStripeRequirements,
  distributeOrderTransfers,
  ensureStripeConnectAccount,
  evaluateStripeConnectReadiness,
  getSellerStripeAccountId,
  getStripeConnectReadiness,
  isStripeConnectReady,
  syncStripeConnectAccountSettings,
};
