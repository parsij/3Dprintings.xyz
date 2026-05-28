const PAYOUT_TYPES = new Set(["full", "half", "custom"]);
const { getSellerStripeAccountId } = require("./sellerStripeShared.cjs");

function normalizePayoutSchedule(input = {}) {
  const payoutType = String(input.payoutType || input.payout_type || "full").trim().toLowerCase();
  const dayOfMonth = Number.parseInt(input.dayOfMonth ?? input.day_of_month, 10);
  const customAmountCents = Number.parseInt(input.customAmountCents ?? input.custom_amount_cents, 10);

  return {
    enabled: Boolean(input.enabled),
    payoutType: PAYOUT_TYPES.has(payoutType) ? payoutType : "full",
    dayOfMonth: Number.isInteger(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 28 ? dayOfMonth : 1,
    customAmountCents: Number.isInteger(customAmountCents) && customAmountCents > 0 ? customAmountCents : null,
  };
}

async function ensureSellerPayoutSchedulesTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seller_payout_schedules (
      seller_user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      payout_type VARCHAR(20) NOT NULL DEFAULT 'full',
      day_of_month INTEGER NOT NULL DEFAULT 1,
      custom_amount_cents INTEGER,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT seller_payout_schedules_day_check CHECK (day_of_month BETWEEN 1 AND 28),
      CONSTRAINT seller_payout_schedules_type_check CHECK (payout_type IN ('full', 'half', 'custom'))
    )
  `);
}

async function getSellerPayoutSchedule(pool, sellerUserId) {
  const result = await pool.query(
    `SELECT seller_user_id, enabled, payout_type, day_of_month, custom_amount_cents, updated_at
     FROM seller_payout_schedules
     WHERE seller_user_id = $1
     LIMIT 1`,
    [sellerUserId]
  );

  if (result.rows.length === 0) {
    return normalizePayoutSchedule({ enabled: false });
  }

  const row = result.rows[0];
  return normalizePayoutSchedule({
    enabled: row.enabled,
    payoutType: row.payout_type,
    dayOfMonth: row.day_of_month,
    customAmountCents: row.custom_amount_cents,
  });
}

async function upsertSellerPayoutSchedule(pool, sellerUserId, schedule) {
  const normalized = normalizePayoutSchedule(schedule);
  if (normalized.enabled && normalized.payoutType === "custom" && !normalized.customAmountCents) {
    const error = new Error("Custom recurring payout requires a positive amount.");
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    `INSERT INTO seller_payout_schedules (
       seller_user_id,
       enabled,
       payout_type,
       day_of_month,
       custom_amount_cents,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (seller_user_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       payout_type = EXCLUDED.payout_type,
       day_of_month = EXCLUDED.day_of_month,
       custom_amount_cents = EXCLUDED.custom_amount_cents,
       updated_at = NOW()`,
    [
      sellerUserId,
      normalized.enabled,
      normalized.payoutType,
      normalized.dayOfMonth,
      normalized.customAmountCents,
    ]
  );

  return normalized;
}

function resolvePayoutAmountCents(availableCents, schedule) {
  const available = Math.max(0, Math.round(Number(availableCents) || 0));
  if (available <= 0) return 0;

  if (schedule.payoutType === "half") {
    return Math.floor(available / 2);
  }
  if (schedule.payoutType === "custom") {
    return Math.min(available, Number(schedule.customAmountCents) || 0);
  }
  return available;
}

function getUtcPayoutDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getUtcDayOfMonth(date = new Date()) {
  return date.getUTCDate();
}

async function listScheduledPayoutSellerIds(pool, utcDayOfMonth = getUtcDayOfMonth()) {
  const result = await pool.query(
    `SELECT seller_user_id
     FROM seller_payout_schedules
     WHERE enabled = TRUE
       AND day_of_month = $1`,
    [utcDayOfMonth]
  );

  return result.rows
    .map((row) => Number(row.seller_user_id))
    .filter((sellerId) => Number.isInteger(sellerId) && sellerId > 0);
}

async function executeScheduledSellerPayout(pool, stripe, sellerId, options = {}) {
  const payoutDateKey = options.payoutDateKey || getUtcPayoutDateKey();
  const schedule = await getSellerPayoutSchedule(pool, sellerId);

  if (!schedule.enabled) {
    return { skipped: true, reason: "schedule_disabled" };
  }

  if (getUtcDayOfMonth() !== Number(schedule.dayOfMonth)) {
    return { skipped: true, reason: "wrong_day" };
  }

  const accountId = await getSellerStripeAccountId(pool, sellerId);
  if (!accountId) {
    return { skipped: true, reason: "missing_stripe_account" };
  }

  const balance = await stripe.balance.retrieve({ stripeAccount: accountId });
  const availableEntry = (balance.available || []).find((entry) => entry.currency === "usd");
  const availableCents = availableEntry?.amount || 0;
  const payoutCents = resolvePayoutAmountCents(availableCents, schedule);
  if (payoutCents <= 0) {
    return { skipped: true, reason: "no_available_balance" };
  }

  const payout = await stripe.payouts.create(
    { amount: payoutCents, currency: "usd" },
    {
      stripeAccount: accountId,
      idempotencyKey: `scheduled-payout-${sellerId}-${payoutDateKey}`,
    }
  );

  return {
    skipped: false,
    sellerId,
    payoutCents,
    payoutId: payout.id,
    status: payout.status,
  };
}

module.exports = {
  ensureSellerPayoutSchedulesTable,
  executeScheduledSellerPayout,
  getSellerPayoutSchedule,
  getUtcDayOfMonth,
  getUtcPayoutDateKey,
  listScheduledPayoutSellerIds,
  normalizePayoutSchedule,
  resolvePayoutAmountCents,
  upsertSellerPayoutSchedule,
};
