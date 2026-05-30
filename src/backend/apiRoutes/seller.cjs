const fs = require("fs");
const path = require("path");
const { refreshSellerDashboard } = require("./sellerShared.cjs");
const { ensureLikesColumns, normalizeNumericArray } = require("./likesShared.cjs");
const {
  ensureSellerOrderLabel,
  extractShippingAddressFromOrderItems,
  fetchLabelBinary,
  filterTrackingForSeller,
} = require("./shippingShared.cjs");
const {
  normalizeSellerProfile,
  resolveShopLogoUrl,
  sellerProfileFromRow,
  validateSellerProfile,
} = require("./sellerProfileShared.cjs");
const { sendJsonError } = require("../apiErrorShared.cjs");
const {
  createSellerAvatarLogoUrl,
  persistSellerLogoUrl,
  resolveSellerLogoUrlForSave,
  shouldAutoGenerateSellerAvatar,
} = require("./sellerAvatar.cjs");
const {
  getSellerOnboardingState,
  isSellerOnboardingComplete,
} = require("./sellerOnboardingShared.cjs");
const {
  parseAndValidateProductDimensions,
  productDimensionsAreValid,
} = require("./productDimensionsShared.cjs");
const {
  listSellerBoxes,
} = require("./sellerBoxesShared.cjs");
const { productFitsInAnyBox, getProductBoxFitMessage } = require("./sellerBoxPackingShared.cjs");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sellerUploadDir = path.join(__dirname, "..", "imgUploads");

function normalizeTagList(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((tag) => String(tag || "").trim().toLowerCase()).filter(Boolean))];
}

function parseProductTags(rawValue) {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return normalizeTagList(rawValue);
  if (typeof rawValue === "string") {
    try {
      return normalizeTagList(JSON.parse(rawValue));
    } catch {
      return normalizeTagList(rawValue.split(","));
    }
  }
  return [];
}

function normalizeSellerPreferences(input) {
  const payload = input && typeof input === "object" ? input : {};
  const storeName = String(payload.storeName || "").trim();
  const supportEmail = String(payload.supportEmail || "").trim().toLowerCase();
  const storeDescription = String(payload.storeDescription || "").trim();

  return {
    storeName,
    supportEmail,
    storeDescription,
    shopLogoUrl: String(payload.shopLogoUrl || "").trim(),
    notifyNewOrders: payload.notifyNewOrders !== false,
    notifyNewReviews: payload.notifyNewReviews !== false,
    notifyPayouts: Boolean(payload.notifyPayouts),
  };
}

function buildImageUrl(req, fileName) {
  if (!fileName) return null;
  const protocol = req.protocol || "https";
  const host = req.get("host");
  return `${protocol}://${host}/api/imgUploads/${fileName}`;
}

module.exports = function sellerRoutes(deps) {
  const {
    app,
    pool,
    upload,
    cleanupUploadedFiles,
    createAuthToken,
    setAuthCookie,
    getAuthUserFromRequest,
    isAuthenticatedAnIisValid,
    EMAIL_REGEX,
    enqueueWrite,
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

  const isSeller = (req, res, next) => {
    if (req.user && req.user.role === "seller") {
      return next();
    }
    return res.status(403).json({ message: "Access denied. Sellers only." });
  };

  const requireCompletedOnboarding = async (req, res, next) => {
    try {
      const state = await getSellerOnboardingState(pool, req.user.id);
      if (!isSellerOnboardingComplete(state.completionStep)) {
        return res.status(403).json({
          message: "Complete seller onboarding to access this area.",
          completionStep: state.completionStep,
        });
      }
      return next();
    } catch (error) {
      console.error("Failed onboarding gate check:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };

  const ensureSellerWriteAuth = (req, res, next) => {
    const auth = isAuthenticatedAnIisValid(req, res, "nothing");
    if (!auth?.userId) return;
    req.auth = auth;
    return next();
  };

  const scheduleTagUsageCounts = async (currentTags, nextTags) => {
    const currentSet = new Set(normalizeTagList(currentTags));
    const nextSet = new Set(normalizeTagList(nextTags));
    const removedTags = [...currentSet].filter((tag) => !nextSet.has(tag));
    const addedTags = [...nextSet].filter((tag) => !currentSet.has(tag));

    if (removedTags.length === 0 && addedTags.length === 0) return;

    await enqueueWrite('tags.adjustUsage', { removedTags, addedTags });
  };

  app.post("/api/seller/become", attachAuthenticatedUser, async (req, res) => {
    try {
      const onboarding = await getSellerOnboardingState(pool, req.user.id);
      if (req.user.role === "seller") {
        setAuthCookie(res, createAuthToken(req.user));
        return res.status(200).json({
          message: "Continue seller onboarding.",
          user: { ...req.user, role: "seller" },
          completionStep: onboarding.completionStep,
          isComplete: isSellerOnboardingComplete(onboarding.completionStep),
        });
      }

      return res.status(200).json({
        message: "Start seller onboarding.",
        completionStep: onboarding.completionStep || "shop_url",
        isComplete: false,
      });
    } catch (error) {
      console.error("Failed to start seller onboarding:", error);
      return res.status(500).json({ message: "Failed to start seller onboarding." });
    }
  });

  app.get("/api/seller/dashboard", attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      const snapshot = await refreshSellerDashboard(pool, req.user.id);
      return res.status(200).json({
        metrics: snapshot.metrics,
        salesData: snapshot.dailySales,
        products: snapshot.topProducts,
        revenueData: snapshot.monthlyRevenue,
        averageScore: snapshot.averageRating,
        totals: {
          lifetimeRevenue: snapshot.lifetimeRevenue,
          lifetimeUnitsSold: snapshot.lifetimeUnitsSold,
          lifetimeOrders: snapshot.lifetimeOrders,
          totalReviews: snapshot.totalReviews,
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error loading seller dashboard:", error);
      return res.status(500).json({ message: "Failed to load seller dashboard." });
    }
  });

  app.post("/api/seller/dashboard/refresh", attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      await enqueueWrite('seller.refreshDashboard', { sellerId: req.user.id }, {
        jobKey: `seller-dashboard:${req.user.id}`,
      });
      return res.status(202).json({
        message: "seller dashboard refresh queued.",
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error refreshing seller dashboard:", error);
      return res.status(500).json({ message: "Failed to refresh seller dashboard." });
    }
  });

  app.get("/api/seller/orders", attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, "nothing");
      if (!auth?.userId) return;

      const sellerId = req.user.id;
      const requestedStatus = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "";
      const allowedStatuses = new Set(["pending", "completed", "cancelled"]);
      const statusFilter = allowedStatuses.has(requestedStatus) ? requestedStatus : null;

      const ordersResult = await pool.query(
        `
          WITH expanded_items AS (
            SELECT
              o.id AS order_id,
              o.customer_id,
              o.status,
              o.created_at,
              o.updated_at,
              o.items,
              o.tracking,
              item,
              CASE
                WHEN COALESCE(item->>'id', '') ~ '^\\d+$' THEN (item->>'id')::int
                WHEN COALESCE(item->>'productId', '') ~ '^\\d+$' THEN (item->>'productId')::int
                ELSE NULL
              END AS product_id,
              CASE
                WHEN COALESCE(item->>'quantity', '') ~ '^\\d+$' THEN (item->>'quantity')::int
                ELSE 0
              END AS quantity,
              CASE
                WHEN COALESCE(item->>'current_price', '') ~ '^\\d+(\\.\\d+)?$' THEN (item->>'current_price')::numeric
                WHEN COALESCE(item->>'price', '') ~ '^\\d+(\\.\\d+)?$' THEN (item->>'price')::numeric
                ELSE NULL
              END AS unit_price
            FROM orders o
            JOIN LATERAL jsonb_array_elements(COALESCE(o.items->'items', '[]'::jsonb)) AS item ON TRUE
          )
          SELECT
            e.order_id,
            e.customer_id,
            e.status,
            e.created_at,
            e.updated_at,
            e.items,
            e.tracking,
            p.id AS product_id,
            p.name AS product_name,
            p.img_path,
            e.quantity,
            COALESCE(e.unit_price, p.current_price, 0)::numeric(12,2) AS unit_price,
            (COALESCE(e.quantity, 0) * COALESCE(e.unit_price, p.current_price, 0))::numeric(12,2) AS line_total,
            u.username AS customer_username,
            u.email AS customer_email
          FROM expanded_items e
          JOIN products p ON p.id = e.product_id
          LEFT JOIN users u ON u.id = e.customer_id
          WHERE p.user_id = $1
            AND ($2::text IS NULL OR e.status = $2::text)
          ORDER BY e.created_at DESC, e.order_id, p.id
        `,
        [sellerId, statusFilter]
      );

      const ordersMap = new Map();
      for (const row of ordersResult.rows) {
        const key = String(row.order_id);
        if (!ordersMap.has(key)) {
          const itemsPayload = row.items && typeof row.items === "object" ? row.items : {};
          const sellerTracking = filterTrackingForSeller(row.tracking, sellerId);

          ordersMap.set(key, {
            id: row.order_id,
            customerId: Number(row.customer_id),
            customerUsername: row.customer_username || null,
            customerEmail: row.customer_email || null,
            shippingAddress: extractShippingAddressFromOrderItems(itemsPayload),
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            tracking: sellerTracking,
            items: [],
          });
        }

        const lineTotal = Number(row.line_total || 0);
        const order = ordersMap.get(key);
        const firstImage = Array.isArray(row.img_path) && row.img_path.length > 0 ? row.img_path[0] : null;
        const imageUrl = firstImage ? buildImageUrl(req, firstImage) : null;
        order.items.push({
          productId: Number(row.product_id),
          productName: row.product_name,
          quantity: Number(row.quantity || 0),
          unitPrice: Number(row.unit_price || 0),
          lineTotal,
          imageUrl,
        });
      }

      return res.status(200).json({
        orders: Array.from(ordersMap.values()),
      });
    } catch (error) {
      console.error("Error loading seller orders:", error);
      return res.status(500).json({ message: "Failed to load seller orders." });
    }
  });

  app.get("/api/seller/orders/:orderId/label", attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      const { orderId } = req.params;
      if (!UUID_REGEX.test(orderId)) {
        return res.status(400).json({ message: "Invalid order id." });
      }

      const label = await ensureSellerOrderLabel(pool, orderId, req.user.id);
      return res.status(200).json({
        orderId,
        trackingCode: label.trackingCode || null,
        carrier: label.carrier || null,
        hasLabel: Boolean(label.labelPdfUrl || label.labelUrl),
        viewUrl: `/api/seller/orders/${encodeURIComponent(orderId)}/label/file`,
        downloadUrl: `/api/seller/orders/${encodeURIComponent(orderId)}/label/file?download=1`,
      });
    } catch (error) {
      return sendJsonError(res, error, "Failed to prepare shipping label.", {
        context: "seller-order-label-prepare",
      });
    }
  });

  app.get("/api/seller/orders/:orderId/label/file", attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      const { orderId } = req.params;
      if (!UUID_REGEX.test(orderId)) {
        return res.status(400).json({ message: "Invalid order id." });
      }

      const label = await ensureSellerOrderLabel(pool, orderId, req.user.id);
      const labelUrl = label.labelPdfUrl || label.labelUrl;
      const { buffer, contentType } = await fetchLabelBinary(labelUrl);
      const shouldDownload = String(req.query.download || "") === "1";

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `${shouldDownload ? "attachment" : "inline"}; filename="shipping-label-${orderId}.pdf"`
      );
      res.setHeader("Cache-Control", "private, no-store");
      return res.send(buffer);
    } catch (error) {
      return sendJsonError(res, error, "Failed to retrieve shipping label.", {
        context: "seller-order-label-file",
      });
    }
  });

  app.get("/api/seller/preferences", attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT u.username,
                u.email,
                u.phone_number,
                COALESCE(u.seller_preferences, '{}'::jsonb) AS seller_preferences,
                sp.seller_user_id,
                sp.shop_name,
                sp.shop_bio,
                sp.shop_logo_url,
                sp.primary_printer_specialization,
                sp.design_software,
                sp.external_portfolio_link,
                sp.intellectual_property_certified,
                sp.terms_of_service_accepted,
                sp.sellersaddres
         FROM users u
         LEFT JOIN seller_profiles sp ON sp.seller_user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const row = result.rows[0];
      const preferences = normalizeSellerPreferences(row.seller_preferences);
      let sellerProfile = sellerProfileFromRow(row, preferences);

      if (
        row.seller_user_id &&
        !String(row.shop_logo_url || "").trim() &&
        preferences.shopLogoUrl
      ) {
        await pool.query(
          `UPDATE seller_profiles
           SET shop_logo_url = $1,
               updated_at = NOW()
           WHERE seller_user_id = $2`,
          [preferences.shopLogoUrl, req.user.id]
        );
        sellerProfile = {
          ...sellerProfile,
          shopLogoUrl: sellerProfileFromRow(
            { ...row, shop_logo_url: preferences.shopLogoUrl },
            preferences
          ).shopLogoUrl,
        };
      }

      if (
        sellerProfile.shopName &&
        shouldAutoGenerateSellerAvatar(sellerProfile.shopLogoUrl, {
          shopName: sellerProfile.shopName,
          shopNameChanged: false,
        })
      ) {
        const imageUrl = await createSellerAvatarLogoUrl({
          shopName: sellerProfile.shopName,
          sellerId: req.user.id,
          currentLogoUrl: sellerProfile.shopLogoUrl,
          uploadDir: sellerUploadDir,
          buildImageUrl,
          req,
        });
        await persistSellerLogoUrl(pool, req.user.id, imageUrl);
        preferences.shopLogoUrl = imageUrl;
        sellerProfile = {
          ...sellerProfile,
          shopLogoUrl: resolveShopLogoUrl(imageUrl),
        };
      }

      return res.status(200).json({
        profile: {
          username: row.username,
          email: row.email,
          phoneNumber: row.phone_number || "",
        },
        preferences,
        sellerProfile: sellerProfile,
      });
    } catch (error) {
      console.error("Error loading seller preferences:", error);
      return res.status(500).json({ message: "Failed to load seller preferences." });
    }
  });

  app.put("/api/seller/preferences", ensureSellerWriteAuth, attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      const preferences = normalizeSellerPreferences(req.body);
      const sellerProfile = normalizeSellerProfile(req.body);
      if (preferences.storeName.length > 80) {
        return res.status(400).json({ message: "Store name must be 80 characters or less." });
      }
      if (preferences.supportEmail && !EMAIL_REGEX.test(preferences.supportEmail)) {
        return res.status(400).json({ message: "Support email format is invalid." });
      }
      if (preferences.storeDescription.length > 2000) {
        return res.status(400).json({ message: "Store description must be 2000 characters or less." });
      }

      const sellerProfileError = validateSellerProfile(sellerProfile);
      if (sellerProfileError) {
        return res.status(400).json({ message: sellerProfileError });
      }

      const existingResult = await pool.query(
        `SELECT sp.shop_name,
                sp.shop_logo_url,
                COALESCE(u.seller_preferences, '{}'::jsonb) AS seller_preferences
         FROM users u
         LEFT JOIN seller_profiles sp ON sp.seller_user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [req.user.id]
      );
      const existingRow = existingResult.rows[0] || {};
      const existingPreferences = normalizeSellerPreferences(existingRow.seller_preferences);
      const existingShopName = String(existingRow.shop_name || existingPreferences.storeName || "").trim();
      const existingLogoUrl = String(
        existingRow.shop_logo_url || existingPreferences.shopLogoUrl || ""
      ).trim();
      const shopNameChanged = existingShopName.toLowerCase() !== sellerProfile.shopName.toLowerCase();

      const resolvedLogoUrl = await resolveSellerLogoUrlForSave({
        sellerId: req.user.id,
        shopName: sellerProfile.shopName,
        shopNameChanged,
        submittedLogoUrl: sellerProfile.shopLogoUrl,
        existingLogoUrl,
        uploadDir: sellerUploadDir,
        buildImageUrl,
        req,
      });

      sellerProfile.shopLogoUrl = resolvedLogoUrl;
      preferences.shopLogoUrl = resolvedLogoUrl;

      await pool.query(
        `UPDATE users
         SET seller_preferences = $1::jsonb
         WHERE id = $2`,
        [JSON.stringify(preferences), req.user.id]
      );

      await pool.query(
        `INSERT INTO seller_profiles (
           seller_user_id,
           shop_name,
           shop_bio,
           shop_logo_url,
           primary_printer_specialization,
           design_software,
           external_portfolio_link,
           intellectual_property_certified,
           terms_of_service_accepted,
           sellersaddres
         )
         VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6::text[], NULLIF($7, ''), $8, $9, $10::jsonb)
         ON CONFLICT (seller_user_id) DO UPDATE SET
           shop_name = EXCLUDED.shop_name,
           shop_bio = EXCLUDED.shop_bio,
           shop_logo_url = EXCLUDED.shop_logo_url,
           primary_printer_specialization = EXCLUDED.primary_printer_specialization,
           design_software = EXCLUDED.design_software,
           external_portfolio_link = EXCLUDED.external_portfolio_link,
           intellectual_property_certified = EXCLUDED.intellectual_property_certified,
           terms_of_service_accepted = EXCLUDED.terms_of_service_accepted,
           sellersaddres = EXCLUDED.sellersaddres,
           updated_at = NOW()`,
        [
          req.user.id,
          sellerProfile.shopName,
          sellerProfile.shopBio,
          sellerProfile.shopLogoUrl,
          sellerProfile.primaryPrinterSpecialization,
          sellerProfile.designSoftware,
          sellerProfile.externalPortfolioLink,
          sellerProfile.intellectualPropertyCertified,
          sellerProfile.termsOfServiceAccepted,
          JSON.stringify(sellerProfile.sellerAddress || {}),
        ]
      );

      return res.status(200).json({
        message: "Preferences updated.",
        preferences,
        sellerProfile,
      });
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({ message: "Shop name is already taken." });
      }
      console.error("Error updating seller preferences:", error);
      return res.status(500).json({ message: "Failed to update seller preferences." });
    }
  });

  app.post(
    "/api/seller/preferences/profile-image",
    ensureSellerWriteAuth,
    attachAuthenticatedUser,
    isSeller,
    requireCompletedOnboarding,
    upload.single("profileImage"),
    async (req, res) => {
      const uploadedFile = req.file;

      try {
        if (!uploadedFile) {
          return res.status(400).json({ message: "Upload a profile image." });
        }

        const originalExt = path.extname(uploadedFile.originalname || uploadedFile.filename || "").toLowerCase();
        const mimeExtMap = {
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
        };
        const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
        const normalizedExt = allowedExtensions.has(originalExt)
          ? originalExt.replace(".jpeg", ".jpg")
          : mimeExtMap[uploadedFile.mimetype] || ".jpg";
        const fileName = `seller-${req.user.id}-profile-${Date.now()}${normalizedExt}`;
        const nextPath = path.join(path.dirname(uploadedFile.path), fileName);

        await fs.promises.rename(uploadedFile.path, nextPath);
        uploadedFile.filename = fileName;
        uploadedFile.path = nextPath;
        const imageUrl = buildImageUrl(req, fileName);

        await pool.query(
          `UPDATE seller_profiles
           SET shop_logo_url = $1,
               updated_at = NOW()
           WHERE seller_user_id = $2`,
          [imageUrl, req.user.id]
        );

        await pool.query(
          `UPDATE users
           SET seller_preferences = jsonb_set(
             COALESCE(seller_preferences, '{}'::jsonb),
             '{shopLogoUrl}',
             to_jsonb($1::text),
             true
           )
           WHERE id = $2`,
          [imageUrl, req.user.id]
        );

        return res.status(201).json({
          message: "Profile image saved.",
          imageUrl,
          fileName,
        });
      } catch (error) {
        await cleanupUploadedFiles(uploadedFile ? [uploadedFile] : []);
        console.error("Error uploading seller profile image:", error);
        return res.status(500).json({ message: "Failed to upload profile image." });
      }
    }
  );

  app.get("/api/seller/products", attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT p.*,
                COALESCE(r.review_count, 0)::int AS reviews_count
         FROM products p
         LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS review_count
            FROM reviews
            WHERE reviews.product_id = p.id
         ) r ON true
         WHERE p.user_id = $1
         ORDER BY p.id DESC`,
        [req.user.id]
      );

      const products = result.rows.map((product) => {
        const firstImage = Array.isArray(product.img_path) && product.img_path.length > 0 ? product.img_path[0] : null;
        return {
          ...product,
          tags: parseProductTags(product.tags),
          category: typeof product.category === "string" ? product.category.trim() : "",
          image_url: buildImageUrl(req, firstImage),
        };
      });

      return res.status(200).json({ products });
    } catch (error) {
      console.error("Error loading seller products:", error);
      return res.status(500).json({ message: "Failed to load seller products." });
    }
  });

  app.put("/api/seller/products/:productId", ensureSellerWriteAuth, attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      const productId = Number.parseInt(req.params.productId, 10);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product ID." });
      }

      const existingProductResult = await pool.query(
        `SELECT id, user_id, tags, img_path,
                model_weight_g, model_height_mm, model_width_mm, model_length_mm,
                model_weight_unit, model_dimension_unit, days_to_prepare
         FROM products
         WHERE id = $1
         LIMIT 1`,
        [productId]
      );

      if (existingProductResult.rows.length === 0) {
        return res.status(404).json({ message: "Product not found." });
      }

      const existingProduct = existingProductResult.rows[0];
      if (Number(existingProduct.user_id) !== Number(req.user.id)) {
        return res.status(403).json({ message: "You can only edit your own products." });
      }

        const { isProfane } = await import("../../services/profanityFilter.js");
        const modelName = String(req.body?.modelName || "").trim();
        const description = String(req.body?.description || "").trim();
        const category = String(req.body?.category || "").trim();
        const parsedPrice = Number(req.body?.price);
        const rawQuantity = req.body?.quantity;
        const parsedQuantity = Number(rawQuantity);
        const nextTags = normalizeTagList(req.body?.tags);

       if (modelName.length < 3 || !/^[a-zA-Z0-9 ]+$/.test(modelName)) {
         return res.status(400).json({ message: "Model name must be at least 3 characters and contain letters/numbers/spaces only." });
       }
       if (description.length < 20) {
         return res.status(400).json({ message: "Description must be at least 20 characters." });
       }
       if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
         return res.status(400).json({ message: "Price must be a positive number." });
       }
       if (rawQuantity === "" || rawQuantity === null || rawQuantity === undefined || String(rawQuantity).trim() === "" || !Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
         return res.status(400).json({ message: "Quantity must be a whole number." });
       }
       if (isProfane(modelName) || isProfane(description) || nextTags.some((tag) => isProfane(tag))) {
         return res.status(400).json({ message: "Explicit content is not allowed in title, description, or tags." });
       }

      let dimensions = null;
      const hasDimensionPayload = [
        req.body?.modelWeight,
        req.body?.modelHeight,
        req.body?.modelWidth,
        req.body?.modelLength,
      ].some((value) => value !== undefined && value !== null && String(value).trim() !== "");

      if (hasDimensionPayload) {
        try {
          dimensions = parseAndValidateProductDimensions(req.body);
        } catch (dimensionError) {
          return res.status(dimensionError.statusCode || 400).json({
            message: dimensionError.message || "Invalid model dimensions.",
          });
        }

        if (!productDimensionsAreValid(dimensions)) {
          return res.status(400).json({ message: "Model weight, height, width, and length are invalid." });
        }

        const sellerBoxes = await listSellerBoxes(pool, req.user.id);
        if (sellerBoxes.length === 0) {
          return res.status(400).json({
            message: "You must add at least one shipping box before listing products.",
            boxesUrl: "/boxes",
          });
        }

        const fitResult = await productFitsInAnyBox(
          {
            name: modelName,
            model_weight_g: dimensions.modelWeightG,
            model_height_mm: dimensions.modelHeightMm,
            model_width_mm: dimensions.modelWidthMm,
            model_length_mm: dimensions.modelLengthMm,
          },
          sellerBoxes
        );

        if (!fitResult.fits) {
          return res.status(400).json({
            message: getProductBoxFitMessage(fitResult.reason),
            boxesUrl: "/boxes",
          });
        }
      }

      const currentTags = parseProductTags(existingProduct.tags);
      await scheduleTagUsageCounts(currentTags, nextTags);

      const updatedResult = await pool.query(
        `UPDATE products
         SET name = $1,
             description = $2,
             original_price = $3,
             current_price = $3,
             category = $4,
             tags = $5::jsonb,
             quantity = $6,
             model_weight_g = COALESCE($7, model_weight_g),
             model_height_mm = COALESCE($8, model_height_mm),
             model_width_mm = COALESCE($9, model_width_mm),
             model_length_mm = COALESCE($10, model_length_mm),
             model_weight_unit = COALESCE($11, model_weight_unit),
             model_dimension_unit = COALESCE($12, model_dimension_unit),
             days_to_prepare = COALESCE($13, days_to_prepare)
         WHERE id = $14
         RETURNING *`,
        [
          modelName,
          description,
          parsedPrice,
          category || null,
          JSON.stringify(nextTags),
          parsedQuantity,
          dimensions?.modelWeightG ?? null,
          dimensions?.modelHeightMm ?? null,
          dimensions?.modelWidthMm ?? null,
          dimensions?.modelLengthMm ?? null,
          dimensions?.modelWeightUnit ?? null,
          dimensions?.modelDimensionUnit ?? null,
          dimensions?.daysToPrepare ?? null,
          productId,
        ]
      );

      const updatedProduct = updatedResult.rows[0];
      const firstImage = Array.isArray(updatedProduct.img_path) && updatedProduct.img_path.length > 0
        ? updatedProduct.img_path[0]
        : null;

      return res.status(200).json({
        message: "Product updated.",
        product: {
          ...updatedProduct,
          tags: parseProductTags(updatedProduct.tags),
          category: typeof updatedProduct.category === "string" ? updatedProduct.category.trim() : "",
          image_url: buildImageUrl(req, firstImage),
        },
      });
    } catch (error) {
      console.error("Error updating seller product:", error);
      return res.status(500).json({ message: "Failed to update product." });
    }
  });

  app.get("/api/seller/reviews", attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      await ensureLikesColumns(pool);
      const likedResult = await pool.query(
        `SELECT COALESCE(liked_reviews, '[]'::jsonb) AS liked_reviews
         FROM users
         WHERE id = $1`,
        [req.user.id]
      );
      const likedReviewIds = likedResult.rows.length > 0 ? normalizeNumericArray(likedResult.rows[0].liked_reviews) : [];

      const reviewsResult = await pool.query(
        `SELECT r.id,
                r.product_id,
                r.user_id,
                r.rating,
                r.content,
                r.created_at,
                r.seller_reply,
                r.seller_reply_updated_at,
                u.username AS reviewer_username,
                p.name AS product_name,
                p.img_path AS product_img_path
         FROM reviews r
         JOIN products p ON p.id = r.product_id
         LEFT JOIN users u ON u.id = r.user_id
         WHERE p.user_id = $1
         ORDER BY r.created_at DESC, r.id DESC`,
        [req.user.id]
      );

      const reviews = reviewsResult.rows.map((row) => {
        const firstImage = Array.isArray(row.product_img_path) && row.product_img_path.length > 0
          ? row.product_img_path[0]
          : null;

        return {
          id: Number(row.id),
          productId: Number(row.product_id),
          productName: row.product_name,
          productImageUrl: buildImageUrl(req, firstImage),
          userId: row.user_id ? Number(row.user_id) : null,
          username: row.reviewer_username || "Anonymous",
          rating: Number(row.rating),
          content: row.content || "",
          createdAt: row.created_at,
          sellerReply: row.seller_reply || "",
          sellerReplyUpdatedAt: row.seller_reply_updated_at || null,
          isLiked: likedReviewIds.includes(Number(row.id)),
        };
      });

      return res.status(200).json({ reviews });
    } catch (error) {
      console.error("Error loading seller reviews:", error);
      return res.status(500).json({ message: "Failed to load seller reviews." });
    }
  });

  app.put("/api/seller/reviews/:reviewId/reply", ensureSellerWriteAuth, attachAuthenticatedUser, isSeller, requireCompletedOnboarding, async (req, res) => {
    try {
      const reviewId = Number.parseInt(req.params.reviewId, 10);
      if (!Number.isInteger(reviewId) || reviewId <= 0) {
        return res.status(400).json({ message: "Invalid review ID." });
      }

      const reply = String(req.body?.reply || "").trim();
      if (reply.length > 2000) {
        return res.status(400).json({ message: "Reply must be 2000 characters or less." });
      }

      const reviewResult = await pool.query(
        `SELECT r.id
         FROM reviews r
         JOIN products p ON p.id = r.product_id
         WHERE r.id = $1
           AND p.user_id = $2
         LIMIT 1`,
        [reviewId, req.user.id]
      );

      if (reviewResult.rows.length === 0) {
        return res.status(404).json({ message: "Review not found for this seller." });
      }

      const replyValue = reply || null;
      const updatedResult = await pool.query(
        `UPDATE reviews
         SET seller_reply = $1,
             seller_reply_updated_at = CASE WHEN $1::text IS NULL THEN NULL ELSE NOW() END
         WHERE id = $2
           AND product_id IN (SELECT id FROM products WHERE user_id = $3)
         RETURNING id, seller_reply, seller_reply_updated_at`,
        [replyValue, reviewId, req.user.id]
      );

      if (updatedResult.rows.length === 0) {
        return res.status(404).json({ message: "Review not found for this seller." });
      }

      const updated = updatedResult.rows[0];
      return res.status(200).json({
        message: replyValue ? "Reply saved." : "Reply removed.",
        review: {
          id: Number(updated.id),
          sellerReply: updated.seller_reply || "",
          sellerReplyUpdatedAt: updated.seller_reply_updated_at || null,
        },
      });
    } catch (error) {
       console.error("Error saving seller review reply:", error);
       return res.status(500).json({ message: "Failed to save reply." });
     }
   });
 };
