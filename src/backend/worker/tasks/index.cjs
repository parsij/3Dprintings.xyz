const { fulfillPaidOrder } = require("../../apiRoutes/orderFulfillment.cjs");
const {
  ORDER_PAYMENT_POLL_INTERVAL_MS,
  ORDER_PAYMENT_POLL_JOB_PREFIX,
  runOrderPaymentCheck,
} = require("../../apiRoutes/orderPaymentPolling.cjs");
const { mergeTrackerWebhookIntoOrders } = require("../../apiRoutes/shippingShared.cjs");
const { refreshSellerDashboard } = require("../../apiRoutes/sellerShared.cjs");
const { processMultiSellerTransfers } = require("../../apiRoutes/sellerOrderTransfers.cjs");
const {
  getSellerPayoutSchedule,
  resolvePayoutAmountCents,
} = require("../../apiRoutes/sellerBalanceShared.cjs");
const { getSellerStripeAccountId } = require("../../apiRoutes/sellerStripeShared.cjs");
const { enqueueWrite } = require("../../worker/queue.cjs");
const appPool = require("../../db.cjs");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

async function withPool(helpers, fn) {
  return helpers.withPgClient((client) => fn(client));
}

const taskList = {
  "users.clearCart": async (payload, helpers) => {
    const { userId } = payload;
    await withPool(helpers, (client) =>
      client.query(`UPDATE users SET cart_json = '{}'::jsonb WHERE id = $1`, [userId])
    );
  },

  "products.updateRating": async (payload, helpers) => {
    const { productId } = payload;
    await withPool(helpers, async (client) => {
      const aggregateResult = await client.query(
        `SELECT COALESCE(AVG(rating), 0)::numeric(3,2) AS average_rating
         FROM reviews
         WHERE product_id = $1`,
        [productId]
      );
      const averageRating = Number(aggregateResult.rows[0]?.average_rating || 0);
      await client.query(`UPDATE products SET rating = $1 WHERE id = $2`, [
        averageRating,
        productId,
      ]);
    });
  },

  "tags.bumpUsage": async (payload, helpers) => {
    const { tags } = payload;
    if (!Array.isArray(tags) || tags.length === 0) return;

    await withPool(helpers, async (client) => {
      for (const tag of tags) {
        await client.query(
          `INSERT INTO tags (tag_name, uses)
           VALUES ($1, 1)
           ON CONFLICT (tag_name) DO UPDATE
           SET uses = tags.uses + 1`,
          [tag]
        );
      }
    });
  },

  "tags.adjustUsage": async (payload, helpers) => {
    const { addedTags = [], removedTags = [] } = payload;

    await withPool(helpers, async (client) => {
      for (const tag of removedTags) {
        await client.query(
          `UPDATE tags SET uses = GREATEST(uses - 1, 0) WHERE tag_name = $1`,
          [tag]
        );
      }
      for (const tag of addedTags) {
        await client.query(
          `INSERT INTO tags (tag_name, uses)
           VALUES ($1, 1)
           ON CONFLICT (tag_name) DO UPDATE
           SET uses = tags.uses + 1`,
          [tag]
        );
      }
    });
  },

  "orders.fulfill": async (payload, helpers) => {
    const { orderId, paymentType } = payload;
    await fulfillPaidOrder(appPool, orderId, paymentType);
  },

  "orders.transferSellers": async (payload) => {
    const { orderId, paymentIntentId } = payload;
    if (!orderId || !paymentIntentId) return;
    await processMultiSellerTransfers(stripe, appPool, orderId, paymentIntentId);
  },

  "orders.pollPayment": async (payload) => {
    const { orderId } = payload;
    if (!orderId) return;

    const { shouldContinue } = await runOrderPaymentCheck(appPool, stripe, orderId);
    if (!shouldContinue) return;

    await enqueueWrite(
      "orders.pollPayment",
      { orderId },
      {
        jobKey: `${ORDER_PAYMENT_POLL_JOB_PREFIX}${orderId}`,
        runAt: new Date(Date.now() + ORDER_PAYMENT_POLL_INTERVAL_MS),
      }
    );
  },

  "shipping.mergeTracker": async (payload, helpers) => {
    const { tracker } = payload;
    await withPool(helpers, (client) => mergeTrackerWebhookIntoOrders(client, tracker));
  },

  "seller.refreshDashboard": async (payload, helpers) => {
    const { sellerId } = payload;
    await withPool(helpers, (client) => refreshSellerDashboard(client, sellerId));
  },

  "seller.scheduledPayout": async (payload) => {
    const { sellerId } = payload;
    if (!sellerId) return;

    const schedule = await getSellerPayoutSchedule(appPool, sellerId);
    if (!schedule.enabled) return;

    const today = new Date();
    if (today.getDate() !== Number(schedule.dayOfMonth)) return;

    const accountId = await getSellerStripeAccountId(appPool, sellerId);
    if (!accountId) return;

    const balance = await stripe.balance.retrieve({ stripeAccount: accountId });
    const availableEntry = (balance.available || []).find((entry) => entry.currency === "usd");
    const availableCents = availableEntry?.amount || 0;
    const payoutCents = resolvePayoutAmountCents(availableCents, schedule);
    if (payoutCents <= 0) return;

    await stripe.payouts.create(
      { amount: payoutCents, currency: "usd" },
      { stripeAccount: accountId }
    );
  },

};

module.exports = taskList;
