const {
  listSellerBoxes,
  normalizeBoxRow,
  parseBoxPayload,
  sellerBoxesCoverLargestProduct,
} = require("./sellerBoxesShared.cjs");
const { isSellerOnboardingComplete, getSellerOnboardingState } = require("./sellerOnboardingShared.cjs");

module.exports = function sellerBoxesRoutes(deps) {
  const { app, pool, getAuthUserFromRequest } = deps;

  const attachAuthenticatedSeller = async (req, res, next) => {
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
          message: "Complete seller onboarding before managing boxes.",
          completionStep: onboarding.completionStep,
        });
      }

      req.user = { id: Number(authUser.id) };
      return next();
    } catch (error) {
      console.error("Failed seller box auth:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };

  app.get("/api/seller/boxes", attachAuthenticatedSeller, async (req, res) => {
    try {
      const boxes = await listSellerBoxes(pool, req.user.id);
      const coverage = await sellerBoxesCoverLargestProduct(pool, req.user.id, boxes);
      return res.status(200).json({
        boxes,
        largestProduct: coverage.largestProduct,
        coversLargestProduct: coverage.ok,
      });
    } catch (error) {
      console.error("Failed to list seller boxes:", error);
      return res.status(500).json({ message: "Failed to load boxes." });
    }
  });

  app.post("/api/seller/boxes", attachAuthenticatedSeller, async (req, res) => {
    try {
      const box = parseBoxPayload(req.body);
      const result = await pool.query(
        `INSERT INTO seller_boxes (
           seller_user_id, name, width_mm, length_mm, height_mm, max_weight_g
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, seller_user_id, name, width_mm, length_mm, height_mm, max_weight_g, created_at, updated_at`,
        [req.user.id, box.name, box.widthMm, box.lengthMm, box.heightMm, box.maxWeightG]
      );

      const boxes = await listSellerBoxes(pool, req.user.id);
      const coverage = await sellerBoxesCoverLargestProduct(pool, req.user.id, boxes);
      return res.status(201).json({
        message: "Box added.",
        box: normalizeBoxRow(result.rows[0]),
        coversLargestProduct: coverage.ok,
      });
    } catch (error) {
      console.error("Failed to create seller box:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to create box.",
      });
    }
  });

  app.put("/api/seller/boxes/:boxId", attachAuthenticatedSeller, async (req, res) => {
    try {
      const boxId = Number.parseInt(req.params.boxId, 10);
      if (!Number.isInteger(boxId) || boxId <= 0) {
        return res.status(400).json({ message: "Invalid box id." });
      }

      const parsed = parseBoxPayload(req.body);
      const existingBoxes = await listSellerBoxes(pool, req.user.id);
      const previewBoxes = existingBoxes.map((entry) =>
        Number(entry.id) === boxId
          ? {
              ...entry,
              name: parsed.name,
              widthMm: parsed.widthMm,
              lengthMm: parsed.lengthMm,
              heightMm: parsed.heightMm,
              maxWeightG: parsed.maxWeightG,
            }
          : entry
      );
      const coverage = await sellerBoxesCoverLargestProduct(pool, req.user.id, previewBoxes);
      if (!coverage.ok) {
        return res.status(400).json({
          message: "This box change leaves your largest product without a valid 95% fit box.",
          coversLargestProduct: false,
        });
      }

      const result = await pool.query(
        `UPDATE seller_boxes
         SET name = $1,
             width_mm = $2,
             length_mm = $3,
             height_mm = $4,
             max_weight_g = $5,
             updated_at = NOW()
         WHERE id = $6 AND seller_user_id = $7
         RETURNING id, seller_user_id, name, width_mm, length_mm, height_mm, max_weight_g, created_at, updated_at`,
        [parsed.name, parsed.widthMm, parsed.lengthMm, parsed.heightMm, parsed.maxWeightG, boxId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Box not found." });
      }

      return res.status(200).json({
        message: "Box updated.",
        box: normalizeBoxRow(result.rows[0]),
        coversLargestProduct: true,
      });
    } catch (error) {
      console.error("Failed to update seller box:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to update box.",
      });
    }
  });

  app.delete("/api/seller/boxes/:boxId", attachAuthenticatedSeller, async (req, res) => {
    try {
      const boxId = Number.parseInt(req.params.boxId, 10);
      if (!Number.isInteger(boxId) || boxId <= 0) {
        return res.status(400).json({ message: "Invalid box id." });
      }

      const existingBoxes = await listSellerBoxes(pool, req.user.id);
      if (existingBoxes.length <= 1) {
        return res.status(400).json({ message: "You must keep at least one shipping box." });
      }

      const remainingBoxes = existingBoxes.filter((box) => Number(box.id) !== boxId);
      const coverageBeforeDelete = await sellerBoxesCoverLargestProduct(pool, req.user.id, remainingBoxes);
      if (!coverageBeforeDelete.ok) {
        return res.status(400).json({
          message: "Removing this box leaves your largest product without a valid 95% fit box.",
          coversLargestProduct: false,
        });
      }

      const deleteResult = await pool.query(
        `DELETE FROM seller_boxes
         WHERE id = $1 AND seller_user_id = $2
         RETURNING id`,
        [boxId, req.user.id]
      );
      if (deleteResult.rows.length === 0) {
        return res.status(404).json({ message: "Box not found." });
      }

      return res.status(200).json({
        message: "Box removed.",
        coversLargestProduct: true,
      });
    } catch (error) {
      console.error("Failed to delete seller box:", error);
      return res.status(500).json({ message: "Failed to delete box." });
    }
  });
};
