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
  executeScheduledSellerPayout,
  getUtcPayoutDateKey,
  listScheduledPayoutSellerIds,
} = require("../../apiRoutes/sellerBalanceShared.cjs");
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

  "seller.runScheduledPayouts": async () => {
    const payoutDateKey = getUtcPayoutDateKey();
    const sellerIds = await listScheduledPayoutSellerIds(appPool);

    if (sellerIds.length === 0) {
      console.log(`No recurring seller payouts due on ${payoutDateKey} (UTC).`);
      return;
    }

    for (const sellerId of sellerIds) {
      await enqueueWrite(
        "seller.scheduledPayout",
        { sellerId, payoutDateKey },
        {
          jobKey: `seller-scheduled-payout:${sellerId}:${payoutDateKey}`,
          maxAttempts: 5,
        }
      );
    }

    console.log(`Queued ${sellerIds.length} recurring seller payout job(s) for ${payoutDateKey} (UTC).`);
  },

  "seller.scheduledPayout": async (payload) => {
    const sellerId = Number(payload?.sellerId);
    if (!Number.isInteger(sellerId) || sellerId <= 0) return;

    try {
      const result = await executeScheduledSellerPayout(appPool, stripe, sellerId, {
        payoutDateKey: payload?.payoutDateKey,
      });

      if (result.skipped) return;

      console.log(`Scheduled payout created for seller ${sellerId}:`, {
        payoutId: result.payoutId,
        amountCents: result.payoutCents,
        status: result.status,
      });
    } catch (error) {
      console.error(`Scheduled payout failed for seller ${sellerId}:`, error);
      throw error;
    }
  },

};

module.exports = taskList;
