const pool = require("../db.cjs");
const { ensureSellerProfilesTable } = require("../apiRoutes/sellerProfileShared.cjs");
const { ensureSellerAddressColumn } = require("../apiRoutes/shippingShared.cjs");

async function main() {
  try {
    await ensureSellerProfilesTable(pool);
    await ensureSellerAddressColumn(pool);
    console.log("seller_profiles.sellersaddres column ensured.");
  } catch (error) {
    console.error("Failed to ensure seller address column:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
