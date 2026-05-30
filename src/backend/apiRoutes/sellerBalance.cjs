const { assertStripeAccountOwnedBySeller, getSellerStripeAccountId } = require("./sellerStripeShared.cjs");
const {
  getSellerPayoutSchedule,
  getUsdBalanceAmounts,
  mapSellerBalanceRouteError,
  normalizePayoutSchedule,
  retrieveConnectedAccountBalance,
  upsertSellerPayoutSchedule,
} = require("./sellerBalanceShared.cjs");
const { isSellerOnboardingComplete, getSellerOnboardingState } = require("./sellerOnboardingShared.cjs");
const { sendJsonError } = require("../apiErrorShared.cjs");

module.exports = function sellerBalanceRoutes(deps) {
  const { app, pool, stripe, getAuthUserFromRequest } = deps;

  const attachCompletedSeller = async (req, res, next) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser?.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }

      const userResult = await pool.query(
        "SELECT id, COALESCE(role, 'customer') AS role FROM users WHERE id = $1",
        [authUser.id]
      );
      if (userResult.rows.length === 0 || userResult.rows[0].role !== "seller") {
        return res.status(403).json({ message: "Access denied. Sellers only." });
      }

      const onboarding = await getSellerOnboardingState(pool, authUser.id);
      if (!isSellerOnboardingComplete(onboarding.completionStep)) {
        return res.status(403).json({
          message: "Complete seller onboarding before accessing balance tools.",
          completionStep: onboarding.completionStep,
        });
      }

      req.user = { id: Number(authUser.id) };
      return next();
    } catch (error) {
      console.error("Failed seller balance auth:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };

  app.get("/api/seller/balance", attachCompletedSeller, async (req, res) => {
    try {
      const accountId = await getSellerStripeAccountId(pool, req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "Stripe Connect account is not configured." });
      }

      await assertStripeAccountOwnedBySeller(stripe, pool, req.user.id, accountId);
      const balance = await retrieveConnectedAccountBalance(stripe, accountId);
      const { availableCents, pendingCents } = getUsdBalanceAmounts(balance);
      const schedule = await getSellerPayoutSchedule(pool, req.user.id);

      return res.status(200).json({
        available: availableCents / 100,
        pending: pendingCents / 100,
        currency: "usd",
        payoutSchedule: schedule,
      });
    } catch (error) {
      const mapped = mapSellerBalanceRouteError(error, "Failed to load seller balance.");
      console.error("Failed to load seller balance:", error);
      return res.status(mapped.statusCode).json({ message: mapped.message });
    }
  });

  app.post("/api/seller/balance/cashout", attachCompletedSeller, async (req, res) => {
    try {
      const accountId = await getSellerStripeAccountId(pool, req.user.id);
      if (!accountId) {
        return res.status(400).json({ message: "Stripe Connect account is not configured." });
      }

      await assertStripeAccountOwnedBySeller(stripe, pool, req.user.id, accountId);

      const requestedAmount = Number(req.body?.amount);
      const balance = await retrieveConnectedAccountBalance(stripe, accountId);
      const { availableCents } = getUsdBalanceAmounts(balance);

      let payoutCents = availableCents;
      if (req.body?.amount !== undefined && req.body?.amount !== null && String(req.body.amount).trim() !== "") {
        if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
          return res.status(400).json({ message: "Cash out amount must be a positive number." });
        }
        if (requestedAmount > 100000) {
          return res.status(400).json({ message: "Cash out amount exceeds the allowed limit." });
        }
        payoutCents = Math.min(availableCents, Math.round(requestedAmount * 100));
      }

      if (payoutCents <= 0) {
        return res.status(400).json({ message: "No available balance to cash out." });
      }

      const payout = await stripe.payouts.create(
        {
          amount: payoutCents,
          currency: "usd",
        },
        { stripeAccount: accountId }
      );

      return res.status(200).json({
        message: "Cash out initiated.",
        amount: payoutCents / 100,
        payoutId: payout.id,
        status: payout.status,
      });
    } catch (error) {
      const mapped = mapSellerBalanceRouteError(error, "Failed to cash out balance.");
      console.error("Failed seller cashout:", error);
      return res.status(mapped.statusCode).json({ message: mapped.message });
    }
  });

  app.put("/api/seller/balance/recurring", attachCompletedSeller, async (req, res) => {
    try {
      const schedule = await upsertSellerPayoutSchedule(pool, req.user.id, req.body);
      return res.status(200).json({
        message: "Recurring payout settings saved.",
        payoutSchedule: schedule,
      });
    } catch (error) {
      return sendJsonError(res, error, "Failed to save recurring payout settings.", {
        context: "seller-balance-recurring",
      });
    }
  });

  app.get("/api/seller/balance/recurring", attachCompletedSeller, async (req, res) => {
    try {
      const schedule = await getSellerPayoutSchedule(pool, req.user.id);
      return res.status(200).json({ payoutSchedule: normalizePayoutSchedule(schedule) });
    } catch (error) {
      console.error("Failed to load recurring payout settings:", error);
      return res.status(500).json({ message: "Failed to load recurring payout settings." });
    }
  });
};
