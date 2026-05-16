const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const pool = require("../db.cjs");
const {
  ensureSellerDashboardTable,
  refreshSellerDashboard,
} = require("../apiRoutes/sellerShared.cjs");

async function run() {
  try {
    await ensureSellerDashboardTable(pool);
    console.log("Seller dashboard metrics table ensured.");

    const sellersResult = await pool.query(`
      SELECT DISTINCT user_id
      FROM products
      WHERE user_id IS NOT NULL
      ORDER BY user_id
    `);

    const sellerIds = sellersResult.rows.map((row) => Number(row.user_id)).filter(Boolean);
    console.log(`Found ${sellerIds.length} seller(s) to backfill.`);

    for (const sellerId of sellerIds) {
      await refreshSellerDashboard(pool, sellerId);
      console.log(`Backfilled seller dashboard metrics for user_id=${sellerId}`);
    }

    console.log("Seller dashboard setup completed.");
  } catch (error) {
    console.error("Seller dashboard setup failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
