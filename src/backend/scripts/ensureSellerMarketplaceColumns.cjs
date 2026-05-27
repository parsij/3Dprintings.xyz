const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const pool = require("../db.cjs");
const { ensureSellerMarketplaceSchema } = require("../apiRoutes/sellerMarketplaceSchema.cjs");

async function run() {
  try {
    await ensureSellerMarketplaceSchema(pool);
    console.log("Seller marketplace schema ensured.");
  } catch (error) {
    console.error("Seller marketplace migration failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
