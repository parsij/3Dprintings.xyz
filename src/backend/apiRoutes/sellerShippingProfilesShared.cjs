const PROCESSING_TIME_OPTIONS = new Set([
  "1_day",
  "1_2_days",
  "1_3_days",
  "2_4_days",
  "3_7_days",
]);

const SHIPPING_PRICING_MODES = new Set(["calculated", "fixed"]);

async function ensureSellerShippingProfilesTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seller_shipping_profiles (
      id SERIAL PRIMARY KEY,
      seller_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_name VARCHAR(120) NOT NULL,
      pricing_mode VARCHAR(16) NOT NULL DEFAULT 'calculated',
      fixed_price_cents INTEGER,
      processing_time VARCHAR(16) NOT NULL DEFAULT '1_3_days',
      free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_seller_shipping_profiles_seller_user_id
    ON seller_shipping_profiles (seller_user_id, id DESC)
  `);
}

function normalizeShippingProfilePayload(body = {}) {
  const pricingMode = String(body.pricingMode || body.pricing_mode || "calculated").trim().toLowerCase();
  const fixedPrice = body.fixedPrice ?? body.fixed_price ?? null;
  const fixedPriceText = fixedPrice === null || fixedPrice === undefined ? "" : String(fixedPrice).trim();
  const parsedFixedPrice = fixedPrice === null || fixedPrice === "" ? null : Number(fixedPrice);

  return {
    profileName: String(body.profileName || body.profile_name || "").trim(),
    pricingMode: SHIPPING_PRICING_MODES.has(pricingMode) ? pricingMode : "calculated",
    fixedPriceCents: Number.isFinite(parsedFixedPrice) && parsedFixedPrice >= 0
      ? Math.round(parsedFixedPrice * 100)
      : null,
    fixedPriceText,
    processingTime: String(body.processingTime || body.processing_time || "1_3_days").trim().toLowerCase(),
    freeShipping: body.freeShipping === true || body.free_shipping === true || body.freeShipping === "true",
  };
}

function validateShippingProfilePayload(payload) {
  const errors = {};

  if (!payload.profileName) {
    errors.profileName = "Profile name is required.";
  } else if (payload.profileName.length > 120) {
    errors.profileName = "Profile name must be at most 120 characters.";
  }

  if (!PROCESSING_TIME_OPTIONS.has(payload.processingTime)) {
    errors.processingTime = "Select a valid processing time.";
  }

  if (payload.pricingMode === "fixed") {
    if (payload.fixedPriceCents === null) {
      errors.fixedPrice = "Enter a fixed shipping price.";
    } else if (!/^\d+(\.\d{1,2})?$/.test(payload.fixedPriceText)) {
      errors.fixedPrice = "Fixed shipping price can include up to 2 decimal places.";
    } else if (payload.fixedPriceCents > 10000000) {
      errors.fixedPrice = "Fixed shipping price is too high.";
    }
  }

  return errors;
}

async function listSellerShippingProfiles(pool, sellerUserId) {
  const result = await pool.query(
    `SELECT id,
            profile_name,
            pricing_mode,
            fixed_price_cents,
            processing_time,
            free_shipping,
            created_at,
            updated_at
     FROM seller_shipping_profiles
     WHERE seller_user_id = $1
     ORDER BY id DESC`,
    [sellerUserId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    profileName: row.profile_name,
    pricingMode: row.pricing_mode,
    fixedPrice: row.fixed_price_cents != null ? Number(row.fixed_price_cents) / 100 : null,
    processingTime: row.processing_time,
    freeShipping: Boolean(row.free_shipping),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function createSellerShippingProfile(pool, sellerUserId, body) {
  const payload = normalizeShippingProfilePayload(body);
  const errors = validateShippingProfilePayload(payload);
  if (Object.keys(errors).length > 0) {
    const error = new Error("Invalid shipping profile.");
    error.statusCode = 400;
    error.fieldErrors = errors;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO seller_shipping_profiles (
       seller_user_id,
       profile_name,
       pricing_mode,
       fixed_price_cents,
       processing_time,
       free_shipping
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id,
               profile_name,
               pricing_mode,
               fixed_price_cents,
               processing_time,
               free_shipping,
               created_at,
               updated_at`,
    [
      sellerUserId,
      payload.profileName,
      payload.pricingMode,
      payload.pricingMode === "fixed" ? payload.fixedPriceCents : null,
      payload.processingTime,
      payload.freeShipping,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    profileName: row.profile_name,
    pricingMode: row.pricing_mode,
    fixedPrice: row.fixed_price_cents != null ? Number(row.fixed_price_cents) / 100 : null,
    processingTime: row.processing_time,
    freeShipping: Boolean(row.free_shipping),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getSellerShippingProfile(pool, sellerUserId, profileId) {
  const result = await pool.query(
    `SELECT id,
            profile_name,
            pricing_mode,
            fixed_price_cents,
            processing_time,
            free_shipping
     FROM seller_shipping_profiles
     WHERE id = $1 AND seller_user_id = $2
     LIMIT 1`,
    [profileId, sellerUserId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    profileName: row.profile_name,
    pricingMode: row.pricing_mode,
    fixedPrice: row.fixed_price_cents != null ? Number(row.fixed_price_cents) / 100 : null,
    processingTime: row.processing_time,
    freeShipping: Boolean(row.free_shipping),
  };
}

module.exports = {
  PROCESSING_TIME_OPTIONS,
  createSellerShippingProfile,
  ensureSellerShippingProfilesTable,
  getSellerShippingProfile,
  listSellerShippingProfiles,
  normalizeShippingProfilePayload,
  validateShippingProfilePayload,
};
