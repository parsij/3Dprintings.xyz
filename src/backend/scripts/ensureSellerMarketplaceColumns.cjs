const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const pool = require("../db.cjs");
const { ensureSellerProfilesTable } = require("../apiRoutes/sellerProfileShared.cjs");
const { ensureSellerBoxesTable } = require("../apiRoutes/sellerBoxesShared.cjs");
const { ensureSellerPayoutSchedulesTable } = require("../apiRoutes/sellerBalanceShared.cjs");
const { SELLER_COMPLETION_STEPS } = require("../apiRoutes/sellerOnboardingShared.cjs");

async function run() {
  try {
    await ensureSellerProfilesTable(pool);
    await ensureSellerBoxesTable(pool);
    await ensureSellerPayoutSchedulesTable(pool);

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
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255)
    `);

    await pool.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS seller_transfers_completed BOOLEAN NOT NULL DEFAULT FALSE
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

    console.log("Seller marketplace columns ensured.");
    console.log(`Completion steps: ${SELLER_COMPLETION_STEPS.join(" -> ")} -> completed`);
  } catch (error) {
    console.error("Seller marketplace migration failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
