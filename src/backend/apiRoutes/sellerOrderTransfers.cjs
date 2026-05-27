const { distributeOrderTransfers } = require("./sellerStripeShared.cjs");

let sellerTransfersColumnReady = false;

async function ensureSellerTransfersColumn(pool) {
  if (sellerTransfersColumnReady) return;

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS seller_transfers_completed BOOLEAN NOT NULL DEFAULT FALSE
  `);
  sellerTransfersColumnReady = true;
}

function getOrderItems(order) {
  const items = order?.items?.items;
  return Array.isArray(items) ? items : [];
}

async function processMultiSellerTransfers(stripe, pool, orderId, paymentIntentId) {
  await ensureSellerTransfersColumn(pool);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT id, status, total_amount, items, seller_transfers_completed
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      const error = new Error(`Order ${orderId} not found for seller transfers.`);
      error.statusCode = 404;
      throw error;
    }

    const order = orderResult.rows[0];
    if (order.seller_transfers_completed) {
      await client.query("ROLLBACK");
      return { skipped: true, reason: "already_transferred" };
    }

    if (order.status === "cancelled") {
      await client.query("ROLLBACK");
      return { skipped: true, reason: "order_cancelled" };
    }

    const orderItems = getOrderItems(order);
    const totalCents = Math.round(Number(order.total_amount || 0) * 100);

    let transferResult;
    try {
      transferResult = await distributeOrderTransfers(stripe, pool, {
        orderId,
        paymentIntentId,
        totalCents,
        orderItems,
      });
    } catch (transferError) {
      const idempotencyReplay = transferError?.code === "idempotency_key_in_use"
        || transferError?.raw?.code === "idempotency_key_in_use";
      if (!idempotencyReplay) {
        throw transferError;
      }
      transferResult = { skipped: true, reason: "idempotency_replay" };
    }

    await client.query(
      `UPDATE orders
       SET seller_transfers_completed = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
      [orderId]
    );

    await client.query("COMMIT");
    return transferResult;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  ensureSellerTransfersColumn,
  processMultiSellerTransfers,
};
