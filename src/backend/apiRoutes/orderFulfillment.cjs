let inventoryDeductedColumnReady = false;

async function ensureInventoryDeductedColumn(pool) {
  if (inventoryDeductedColumnReady) return;

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS inventory_deducted BOOLEAN NOT NULL DEFAULT FALSE
  `);
  inventoryDeductedColumnReady = true;
}

function getOrderItems(order) {
  const items = order?.items?.items;
  return Array.isArray(items) ? items : [];
}

function getProductQuantities(items) {
  const quantitiesByProductId = new Map();

  for (const item of items) {
    const productId = Number(item.id || item.productId);
    const quantity = Number.parseInt(item.quantity, 10) || 0;

    if (!Number.isInteger(productId) || productId <= 0 || quantity <= 0) {
      continue;
    }

    quantitiesByProductId.set(
      productId,
      (quantitiesByProductId.get(productId) || 0) + quantity
    );
  }

  return quantitiesByProductId;
}

async function fulfillPaidOrder(pool, orderId, paymentType = "card") {
  if (!orderId) return { order: null, completed: false, inventoryDeducted: false };

  await ensureInventoryDeductedColumn(pool);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT id, customer_id, status, items, inventory_deducted
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { order: null, completed: false, inventoryDeducted: false };
    }

    const order = orderResult.rows[0];
    let inventoryDeducted = false;

    if (!order.inventory_deducted) {
      const quantitiesByProductId = getProductQuantities(getOrderItems(order));

      for (const [productId, quantity] of quantitiesByProductId) {
        await client.query(
          `UPDATE products
           SET quantity = GREATEST(0, quantity - $1),
               sales_count = COALESCE(sales_count, 0) + $1
           WHERE id = $2`,
          [quantity, productId]
        );
      }

      inventoryDeducted = true;
    }

    const updatedOrderResult = await client.query(
      `UPDATE orders
       SET status = 'completed',
           payment_type = COALESCE(payment_type, $2),
           inventory_deducted = TRUE,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, customer_id, status, total_amount, payment_type, created_at, updated_at, stripe_session_id, inventory_deducted`,
      [orderId, paymentType || "card"]
    );

    await client.query("COMMIT");

    return {
      order: updatedOrderResult.rows[0] || order,
      completed: true,
      inventoryDeducted,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  ensureInventoryDeductedColumn,
  fulfillPaidOrder,
};
