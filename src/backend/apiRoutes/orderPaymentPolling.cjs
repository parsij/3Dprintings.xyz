const { fulfillPaidOrder } = require("./orderFulfillment.cjs");

const ORDER_PAYMENT_POLL_INTERVAL_MS = 10_000;
const ORDER_PAYMENT_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const ORDER_PAYMENT_POLL_JOB_PREFIX = "poll:";

function getPaymentTypeFromSession(session, fallback = "card") {
  if (Array.isArray(session?.payment_method_types) && session.payment_method_types[0]) {
    return session.payment_method_types[0];
  }
  return fallback;
}

async function clearCartForOrderCustomer(pool, orderId) {
  if (!orderId) return;

  const ownerResult = await pool.query(
    `SELECT customer_id FROM orders WHERE id = $1`,
    [orderId]
  );
  const customerId = ownerResult.rows[0]?.customer_id;
  if (!customerId) return;

  await pool.query(
    `UPDATE users SET cart_json = '{}'::jsonb WHERE id = $1`,
    [customerId]
  );
}

async function runOrderPaymentCheck(pool, stripe, orderId) {
  const result = await pool.query(
    `SELECT id, status, created_at, stripe_session_id, payment_type
     FROM orders
     WHERE id = $1`,
    [orderId]
  );

  if (result.rows.length === 0) {
    return { shouldContinue: false };
  }

  const order = result.rows[0];
  if (order.status !== "pending") {
    return { shouldContinue: false };
  }

  const createdAtMs = new Date(order.created_at).getTime();
  if (!Number.isFinite(createdAtMs)) {
    return { shouldContinue: false };
  }

  const ageMs = Date.now() - createdAtMs;
  if (ageMs >= ORDER_PAYMENT_TIMEOUT_MS) {
    await pool.query(
      `UPDATE orders
       SET status = 'cancelled',
           updated_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [orderId]
    );
    return { shouldContinue: false };
  }

  if (!order.stripe_session_id) {
    return { shouldContinue: true };
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
  } catch (error) {
    console.error(`Stripe session check failed for order ${orderId}:`, error.message || error);
    return { shouldContinue: true };
  }

  if (session?.payment_status !== "paid") {
    return { shouldContinue: true };
  }

  const paymentType = getPaymentTypeFromSession(session, order.payment_type || "card");
  const fulfillment = await fulfillPaidOrder(pool, orderId, paymentType);
  if (fulfillment.completed) {
    await clearCartForOrderCustomer(pool, orderId);
  }

  return { shouldContinue: false };
}

function scheduleOrderPaymentPoll(enqueueWrite, orderId) {
  if (!orderId || typeof enqueueWrite !== "function") return;

  return enqueueWrite(
    "orders.pollPayment",
    { orderId },
    { jobKey: `${ORDER_PAYMENT_POLL_JOB_PREFIX}${orderId}` }
  );
}

async function bootstrapPendingOrderPolling(pool, enqueueWrite) {
  try {
    await pool.query(
      `UPDATE orders
       SET status = 'cancelled',
           updated_at = NOW()
       WHERE status = 'pending' AND created_at <= NOW() - INTERVAL '2 hours'`
    );

    const pending = await pool.query(
      `SELECT id
       FROM orders
       WHERE status = 'pending' AND created_at > NOW() - INTERVAL '2 hours'`
    );

    await Promise.all(
      pending.rows.map((row) => scheduleOrderPaymentPoll(enqueueWrite, row.id))
    );
  } catch (error) {
    console.error("Error bootstrapping order payment polling:", error);
  }
}

module.exports = {
  ORDER_PAYMENT_POLL_INTERVAL_MS,
  ORDER_PAYMENT_POLL_JOB_PREFIX,
  runOrderPaymentCheck,
  scheduleOrderPaymentPoll,
  bootstrapPendingOrderPolling,
  clearCartForOrderCustomer,
  getPaymentTypeFromSession,
};
