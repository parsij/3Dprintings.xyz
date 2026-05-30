const { ensureSellerProfilesTable } = require("./sellerProfileShared.cjs");
const { ensureSellerBoxesTable } = require("./sellerBoxesShared.cjs");
const { ensureSellerPayoutSchedulesTable } = require("./sellerBalanceShared.cjs");
const { ensureSellerTransfersColumn } = require("./sellerOrderTransfers.cjs");

async function ensureSellerMarketplaceSchema(pool) {
  await ensureSellerProfilesTable(pool);
  await ensureSellerBoxesTable(pool);
  await ensureSellerPayoutSchedulesTable(pool);
  await ensureSellerTransfersColumn(pool);

  await pool.query(`
    ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS completions VARCHAR(32) NOT NULL DEFAULT 'shop_url'
  `);

  await pool.query(`
    ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS model_weight_g NUMERIC(10,2)
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS model_height_mm NUMERIC(10,2)
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS model_width_mm NUMERIC(10,2)
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS model_length_mm NUMERIC(10,2)
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS model_weight_unit VARCHAR(2) NOT NULL DEFAULT 'lb'
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS model_dimension_unit VARCHAR(2) NOT NULL DEFAULT 'in'
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS days_to_prepare INTEGER NOT NULL DEFAULT 1
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_days_to_prepare_check'
      ) THEN
        ALTER TABLE products
        ADD CONSTRAINT products_days_to_prepare_check
        CHECK (days_to_prepare BETWEEN 1 AND 7);
      END IF;
    END $$;
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255)
  `);

  await pool.query(`
    UPDATE seller_profiles sp
    SET completions = 'completed'
    WHERE completions IS DISTINCT FROM 'completed'
      AND sp.shop_name IS NOT NULL
      AND char_length(trim(sp.shop_name)) >= 3
      AND sp.terms_of_service_accepted = TRUE
      AND sp.stripe_connect_account_id IS NOT NULL
      AND sp.sellersaddres IS NOT NULL
      AND sp.sellersaddres::text <> '{}'
      AND EXISTS (
        SELECT 1 FROM seller_boxes b WHERE b.seller_user_id = sp.seller_user_id
      )
  `);
}

module.exports = {
  ensureSellerMarketplaceSchema,
};
