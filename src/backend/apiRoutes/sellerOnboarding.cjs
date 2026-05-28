const {
  advanceSellerCompletion,
  buildSellerShopUrl,
  getSellerOnboardingState,
  isSellerOnboardingComplete,
  normalizeCompletionStep,
} = require("./sellerOnboardingShared.cjs");
const { normalizeAddressPayload, validateUsAddress } = require("./shippingShared.cjs");
const {
  assertStripeAccountOwnedBySeller,
  createStripeConnectOnboardingLink,
  createStripeConnectRemediationLink,
  evaluateStripeConnectReadiness,
  getStripeConnectReadiness,
  syncStripeConnectAccountSettings,
} = require("./sellerStripeShared.cjs");
const { listSellerBoxes, parseBoxPayload, sellerBoxesCoverLargestProduct } = require("./sellerBoxesShared.cjs");
const { getSellerFrontendUrl } = require("../envShared.cjs");

module.exports = function sellerOnboardingRoutes(deps) {
  const {
    app,
    pool,
    stripe,
    createAuthToken,
    setAuthCookie,
    getAuthUserFromRequest,
    isAuthenticatedAnIisValid,
  } = deps;

  const attachAuthenticatedUser = async (req, res, next) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser?.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }

      const userResult = await pool.query(
        "SELECT id, username, email, COALESCE(role, 'customer') AS role FROM users WHERE id = $1",
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: "User not authenticated." });
      }

      req.user = {
        id: Number(userResult.rows[0].id),
        username: userResult.rows[0].username,
        email: userResult.rows[0].email,
        role: userResult.rows[0].role,
      };
      return next();
    } catch (error) {
      console.error("Failed to attach authenticated user:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };

  const requireSellerRole = (req, res, next) => {
    if (req.user?.role === "seller") return next();
    return res.status(403).json({ message: "Seller access is required." });
  };

  app.get("/api/seller/onboarding/status", attachAuthenticatedUser, requireSellerRole, async (req, res) => {
    try {
      const state = await getSellerOnboardingState(pool, req.user.id);
      const boxes = await listSellerBoxes(pool, req.user.id);
      let stripeReadiness = evaluateStripeConnectReadiness(null);
      if (state.stripeConnectAccountId) {
        stripeReadiness = await getStripeConnectReadiness(stripe, state.stripeConnectAccountId);
      }

      return res.status(200).json({
        completionStep: state.completionStep,
        isComplete: state.isComplete,
        shopName: state.shopName,
        shopUrl: buildSellerShopUrl(req.user.id),
        stripeReady: stripeReadiness.paymentReady,
        stripeReadiness,
        boxCount: boxes.length,
      });
    } catch (error) {
      console.error("Failed to load seller onboarding status:", error);
      return res.status(500).json({ message: "Failed to load onboarding status." });
    }
  });

  app.post("/api/seller/onboarding/shop", attachAuthenticatedUser, async (req, res) => {
    try {
      const shopName = String(req.body?.shopName || "").trim();
      const termsAccepted = Boolean(req.body?.termsOfServiceAccepted);

      if (shopName.length < 3 || shopName.length > 30) {
        return res.status(400).json({ message: "Shop name must be between 3 and 30 characters." });
      }
      if (!/^[A-Za-z0-9_ ]+$/.test(shopName)) {
        return res.status(400).json({ message: "Shop name can only contain letters, numbers, spaces, and underscores." });
      }
      if (!termsAccepted) {
        return res.status(400).json({ message: "You must agree to the Seller Terms of Service." });
      }

      if (req.user.role !== "seller") {
        const updatedUserResult = await pool.query(
          `UPDATE users
           SET role = 'seller'
           WHERE id = $1
           RETURNING id, username, email, role`,
          [req.user.id]
        );
        req.user = {
          id: Number(updatedUserResult.rows[0].id),
          username: updatedUserResult.rows[0].username,
          email: updatedUserResult.rows[0].email,
          role: updatedUserResult.rows[0].role,
        };
        setAuthCookie(res, createAuthToken(req.user));
      }

      const onboarding = await getSellerOnboardingState(pool, req.user.id);
      const currentStep = normalizeCompletionStep(onboarding.completionStep);
      if (isSellerOnboardingComplete(currentStep)) {
        return res.status(200).json({
          message: "Seller onboarding already completed.",
          user: req.user,
          completionStep: "completed",
          shopUrl: buildSellerShopUrl(req.user.id),
        });
      }

      await pool.query(
        `INSERT INTO seller_profiles (
           seller_user_id,
           shop_name,
           primary_printer_specialization,
           design_software,
           intellectual_property_certified,
           terms_of_service_accepted,
           completions
         )
         VALUES ($1, $2, 'fdm', '{}'::text[], TRUE, TRUE, 'stripe_connect')
         ON CONFLICT (seller_user_id) DO UPDATE SET
           shop_name = EXCLUDED.shop_name,
           terms_of_service_accepted = TRUE,
           completions = CASE
             WHEN seller_profiles.completions = 'shop_url' THEN 'stripe_connect'
             ELSE seller_profiles.completions
           END,
           updated_at = NOW()`,
        [req.user.id, shopName]
      );

      const nextState = await getSellerOnboardingState(pool, req.user.id);
      return res.status(200).json({
        message: "Shop details saved.",
        user: req.user,
        completionStep: nextState.completionStep,
        shopUrl: buildSellerShopUrl(req.user.id),
      });
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({ message: "Shop name is already taken." });
      }
      console.error("Failed to save seller shop onboarding:", error);
      return res.status(500).json({ message: "Failed to save shop details." });
    }
  });

  app.post("/api/seller/onboarding/stripe-link", attachAuthenticatedUser, requireSellerRole, async (req, res) => {
    try {
      const state = await getSellerOnboardingState(pool, req.user.id);
      if (normalizeCompletionStep(state.completionStep) !== "stripe_connect") {
        return res.status(409).json({ message: "Complete the previous onboarding step first." });
      }

      const sellerOrigin = getSellerFrontendUrl();
      const link = await createStripeConnectOnboardingLink(
        stripe,
        pool,
        req.user.id,
        `${sellerOrigin}/onboarding/stripe?return=1`,
        `${sellerOrigin}/onboarding/stripe?refresh=1`
      );

      return res.status(200).json({
        url: link.url,
        shopUrl: buildSellerShopUrl(req.user.id),
      });
    } catch (error) {
      console.error("Failed to create Stripe Connect onboarding link:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to start Stripe Connect onboarding.",
      });
    }
  });

  app.post("/api/seller/onboarding/stripe-verify", attachAuthenticatedUser, requireSellerRole, async (req, res) => {
    try {
      const state = await getSellerOnboardingState(pool, req.user.id);
      const currentStep = normalizeCompletionStep(state.completionStep);
      const accountId = state.stripeConnectAccountId;
      const sellerOrigin = getSellerFrontendUrl();
      const returnUrl = `${sellerOrigin}/onboarding/stripe?return=1`;
      const refreshUrl = `${sellerOrigin}/onboarding/stripe?refresh=1`;

      if (!accountId) {
        return res.status(400).json({
          message: "Stripe Connect account has not been created yet.",
          stripeReady: false,
        });
      }

      await syncStripeConnectAccountSettings(stripe, accountId, req.user.id);
      const account = await assertStripeAccountOwnedBySeller(stripe, pool, req.user.id, accountId);
      const readiness = evaluateStripeConnectReadiness(account);

      if (readiness.needsAccountUpdate) {
        const remediationLink = await createStripeConnectRemediationLink(
          stripe,
          accountId,
          returnUrl,
          refreshUrl
        );

        console.warn("Stripe Connect needs account update", {
          sellerUserId: req.user.id,
          accountId,
          currentlyDue: readiness.currentlyDue,
          pastDue: readiness.pastDue,
        });

        return res.status(409).json({
          message: "Stripe needs additional information before payouts can be enabled.",
          stripeReady: false,
          needsAccountUpdate: true,
          actionUrl: remediationLink.url,
          stripeReadiness: readiness,
          completionStep: currentStep,
        });
      }

      if (!readiness.onboardingComplete) {
        console.warn("Stripe Connect onboarding incomplete", {
          sellerUserId: req.user.id,
          accountId,
          ...readiness,
        });
        return res.status(409).json({
          message: "Stripe Connect onboarding is not complete yet. Finish setup in Stripe first.",
          stripeReady: false,
          stripeReadiness: readiness,
          completionStep: currentStep,
        });
      }

      if (currentStep !== "stripe_connect") {
        if (currentStep === "shop_url") {
          return res.status(409).json({
            message: "Complete the previous onboarding step first.",
            stripeReady: readiness.paymentReady,
            stripeReadiness: readiness,
            completionStep: currentStep,
          });
        }

        return res.status(200).json({
          message: "Stripe Connect already verified.",
          stripeReady: readiness.paymentReady,
          stripeReadiness: readiness,
          completionStep: currentStep,
          isComplete: isSellerOnboardingComplete(currentStep),
          alreadyVerified: true,
        });
      }

      const advanced = await advanceSellerCompletion(pool, req.user.id, "stripe_connect");
      return res.status(200).json({
        message: readiness.pendingReview
          ? "Stripe Connect saved. Stripe is still reviewing your account before payouts go live."
          : "Stripe Connect verified.",
        stripeReady: readiness.paymentReady,
        stripePendingReview: readiness.pendingReview,
        stripeReadiness: readiness,
        completionStep: advanced.completionStep,
        isComplete: advanced.isComplete,
      });
    } catch (error) {
      console.error("Failed to verify Stripe Connect onboarding:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to verify Stripe Connect onboarding.",
      });
    }
  });

  app.post("/api/seller/onboarding/shipping", attachAuthenticatedUser, requireSellerRole, async (req, res) => {
    try {
      const state = await getSellerOnboardingState(pool, req.user.id);
      if (normalizeCompletionStep(state.completionStep) !== "shipping_origin") {
        return res.status(409).json({ message: "Shipping origin is not the current onboarding step." });
      }

      const sellerAddress = normalizeAddressPayload(req.body?.sellerAddress || req.body || {});
      const addressError = validateUsAddress(sellerAddress, "Shipping origin address", {
        requireStreetNumber: true,
      });
      if (addressError) {
        return res.status(400).json({ message: addressError });
      }

      await pool.query(
        `UPDATE seller_profiles
         SET sellersaddres = $1::jsonb,
             updated_at = NOW()
         WHERE seller_user_id = $2`,
        [JSON.stringify(sellerAddress), req.user.id]
      );

      const advanced = await advanceSellerCompletion(pool, req.user.id, "shipping_origin");
      return res.status(200).json({
        message: "Shipping origin saved.",
        completionStep: advanced.completionStep,
        isComplete: advanced.isComplete,
      });
    } catch (error) {
      console.error("Failed to save shipping origin:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to save shipping origin.",
      });
    }
  });

  app.post("/api/seller/onboarding/first-box", attachAuthenticatedUser, requireSellerRole, async (req, res) => {
    try {
      const state = await getSellerOnboardingState(pool, req.user.id);
      if (normalizeCompletionStep(state.completionStep) !== "first_box") {
        return res.status(409).json({ message: "First box setup is not the current onboarding step." });
      }

      const box = parseBoxPayload(req.body);
      const insertResult = await pool.query(
        `INSERT INTO seller_boxes (
           seller_user_id, name, width_mm, length_mm, height_mm, max_weight_g
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, seller_user_id, name, width_mm, length_mm, height_mm, max_weight_g, created_at, updated_at`,
        [req.user.id, box.name, box.widthMm, box.lengthMm, box.heightMm, box.maxWeightG]
      );

      const advanced = await advanceSellerCompletion(pool, req.user.id, "first_box");
      return res.status(201).json({
        message: "First shipping box saved.",
        box: require("./sellerBoxesShared.cjs").normalizeBoxRow(insertResult.rows[0]),
        completionStep: advanced.completionStep,
        isComplete: advanced.isComplete,
      });
    } catch (error) {
      console.error("Failed to save first onboarding box:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to save first box.",
      });
    }
  });
};
