const { getFrontendUrl } = require("../envShared.cjs");

const SELLER_COMPLETION_STEPS = ["shop_url", "stripe_connect", "shipping_origin", "first_box", "completed"];

function normalizeCompletionStep(value) {
  const step = String(value || "").trim().toLowerCase();
  if (step === "completed") return "completed";
  if (SELLER_COMPLETION_STEPS.includes(step)) return step;
  return "shop_url";
}

function getNextCompletionStep(currentStep) {
  const step = normalizeCompletionStep(currentStep);
  if (step === "completed") return "completed";
  const index = SELLER_COMPLETION_STEPS.indexOf(step);
  if (index < 0 || index >= SELLER_COMPLETION_STEPS.length - 1) {
    return "completed";
  }
  return SELLER_COMPLETION_STEPS[index + 1];
}

function isSellerOnboardingComplete(completionStep) {
  return normalizeCompletionStep(completionStep) === "completed";
}

function buildSellerShopUrl(sellerUserId, options = {}) {
  const siteOrigin = options.siteOrigin || getFrontendUrl();
  return `${siteOrigin}/shop/${Number(sellerUserId)}`;
}

async function ensureSellerCompletionColumn(pool) {
  await pool.query(`
    ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS completions VARCHAR(32) NOT NULL DEFAULT 'shop_url'
  `);
  await pool.query(`
    ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT
  `);
}

async function getSellerOnboardingState(pool, sellerUserId) {
  const result = await pool.query(
    `SELECT seller_user_id,
            shop_name,
            terms_of_service_accepted,
            stripe_connect_account_id,
            completions,
            sellersaddres
     FROM seller_profiles
     WHERE seller_user_id = $1
     LIMIT 1`,
    [sellerUserId]
  );

  if (result.rows.length === 0) {
    return {
      exists: false,
      completionStep: "shop_url",
      isComplete: false,
      shopName: "",
      stripeConnectAccountId: null,
    };
  }

  const row = result.rows[0];
  const completionStep = normalizeCompletionStep(row.completions);
  return {
    exists: true,
    completionStep,
    isComplete: isSellerOnboardingComplete(completionStep),
    shopName: row.shop_name || "",
    termsAccepted: Boolean(row.terms_of_service_accepted),
    stripeConnectAccountId: row.stripe_connect_account_id || null,
    sellerAddress: row.sellersaddres || {},
  };
}

async function advanceSellerCompletion(pool, sellerUserId, fromStep) {
  const current = await getSellerOnboardingState(pool, sellerUserId);
  const expected = normalizeCompletionStep(fromStep);
  const actual = normalizeCompletionStep(current.completionStep);

  if (actual !== expected) {
    const error = new Error(`Onboarding step mismatch. Expected ${expected}, current ${actual}.`);
    error.statusCode = 409;
    throw error;
  }

  const nextStep = getNextCompletionStep(actual);
  await pool.query(
    `UPDATE seller_profiles
     SET completions = $1,
         updated_at = NOW()
     WHERE seller_user_id = $2`,
    [nextStep, sellerUserId]
  );

  return {
    previousStep: actual,
    completionStep: nextStep,
    isComplete: isSellerOnboardingComplete(nextStep),
  };
}

module.exports = {
  SELLER_COMPLETION_STEPS,
  advanceSellerCompletion,
  buildSellerShopUrl,
  ensureSellerCompletionColumn,
  getNextCompletionStep,
  getSellerOnboardingState,
  isSellerOnboardingComplete,
  normalizeCompletionStep,
};
