const BOX_SHRINK_FACTOR = 0.95;
const MIN_BOX_DIMENSION_MM = 0.1;
const IN_TO_MM = 25.4;
const LB_TO_G = 453.592;
const CARRIER_BOX_LIMITS = {
  maxWeightLb: 70,
  maxLongestSideIn: 108,
  maxLengthPlusGirthIn: 130,
};
const MAX_BOX_DIMENSION_MM = Math.round(CARRIER_BOX_LIMITS.maxLongestSideIn * IN_TO_MM * 10) / 10;
const MAX_BOX_WEIGHT_G = Math.round(CARRIER_BOX_LIMITS.maxWeightLb * LB_TO_G * 10) / 10;
const { productDimensionsAreValid, convertDimensionToMm, convertWeightToGrams, DIMENSION_UNITS, WEIGHT_UNITS } = require("./productDimensionsShared.cjs");
const { parseOneDecimalCanonical } = require("./numericInputShared.cjs");

function normalizeUnit(value, allowedUnits, fallback) {
  const unit = String(value || fallback).trim().toLowerCase();
  return allowedUnits.has(unit) ? unit : fallback;
}

function parseBoxMeasurement(rawValue, canonicalValue, fieldName, convertFn, unit) {
  if (String(rawValue ?? "").trim() !== "") {
    return convertFn(rawValue, unit);
  }

  const canonical = canonicalValue;
  const parsed = parseOneDecimalCanonical(canonical, fieldName);
  if (parsed < MIN_BOX_DIMENSION_MM) {
    const error = new Error(`${fieldName} must be a positive number.`);
    error.statusCode = 400;
    throw error;
  }
  if (fieldName !== "Max weight" && parsed > MAX_BOX_DIMENSION_MM) {
    const error = new Error(`${fieldName} is too large.`);
    error.statusCode = 400;
    throw error;
  }
  if (fieldName === "Max weight" && parsed > MAX_BOX_WEIGHT_G) {
    const error = new Error("Max weight must be a positive number within allowed limits.");
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

function sortedBoxDimensionsMm(widthMm, lengthMm, heightMm) {
  return [widthMm, lengthMm, heightMm].sort((left, right) => right - left);
}

function getBoxLengthPlusGirthInches(widthMm, lengthMm, heightMm) {
  const [longestMm, middleMm, shortestMm] = sortedBoxDimensionsMm(widthMm, lengthMm, heightMm);
  return (longestMm + (2 * middleMm) + (2 * shortestMm)) / IN_TO_MM;
}

function assertBoxCarrierLimits({ widthMm, lengthMm, heightMm, maxWeightG }) {
  if (maxWeightG > MAX_BOX_WEIGHT_G) {
    const error = new Error(`Max weight cannot exceed ${CARRIER_BOX_LIMITS.maxWeightLb} lb.`);
    error.statusCode = 400;
    throw error;
  }

  const longestSideIn = Math.max(widthMm, lengthMm, heightMm) / IN_TO_MM;
  if (longestSideIn > CARRIER_BOX_LIMITS.maxLongestSideIn) {
    const error = new Error(
      `Longest side cannot exceed ${CARRIER_BOX_LIMITS.maxLongestSideIn} in (9 ft).`
    );
    error.statusCode = 400;
    throw error;
  }

  const lengthPlusGirthIn = getBoxLengthPlusGirthInches(widthMm, lengthMm, heightMm);
  if (lengthPlusGirthIn > CARRIER_BOX_LIMITS.maxLengthPlusGirthIn) {
    const error = new Error(
      "Combined length and girth cannot exceed 130 in (length + 2×width + 2×height)."
    );
    error.statusCode = 400;
    throw error;
  }
}

function parseBoxPayload(input = {}) {
  const name = String(input.name || "").trim();
  if (name.length < 1 || name.length > 80) {
    const error = new Error("Box name must be between 1 and 80 characters.");
    error.statusCode = 400;
    throw error;
  }

  const dimensionUnit = normalizeUnit(input.dimensionUnit ?? input.dimension_unit, DIMENSION_UNITS, "in");
  const weightUnit = normalizeUnit(input.weightUnit ?? input.weight_unit, WEIGHT_UNITS, "lb");

  const widthMm = parseBoxMeasurement(
    input.width,
    input.widthMm,
    "Box width",
    convertDimensionToMm,
    dimensionUnit
  );
  const lengthMm = parseBoxMeasurement(
    input.length,
    input.lengthMm,
    "Box length",
    convertDimensionToMm,
    dimensionUnit
  );
  const heightMm = parseBoxMeasurement(
    input.height,
    input.heightMm,
    "Box height",
    convertDimensionToMm,
    dimensionUnit
  );
  const maxWeightG = parseBoxMeasurement(
    input.maxWeight,
    input.maxWeightG ?? input.max_weight_g,
    "Max weight",
    convertWeightToGrams,
    weightUnit
  );

  const parsedBox = {
    name,
    widthMm,
    lengthMm,
    heightMm,
    maxWeightG,
  };

  assertBoxCarrierLimits(parsedBox);

  return parsedBox;
}

function normalizeBoxRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    widthMm: Number(row.width_mm),
    lengthMm: Number(row.length_mm),
    heightMm: Number(row.height_mm),
    maxWeightG: Number(row.max_weight_g),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getEffectiveBoxBin(box) {
  return {
    name: box.name,
    width: Number(box.widthMm) * BOX_SHRINK_FACTOR,
    height: Number(box.heightMm) * BOX_SHRINK_FACTOR,
    depth: Number(box.lengthMm) * BOX_SHRINK_FACTOR,
    maxWeight: Number(box.maxWeightG),
  };
}

function getProductPackingItem(product) {
  const weight = Number(product.model_weight_g ?? product.weightG);
  const width = Number(product.model_width_mm ?? product.widthMm);
  const height = Number(product.model_height_mm ?? product.heightMm);
  const depth = Number(product.model_length_mm ?? product.lengthMm);

  return {
    name: String(product.name || product.id || "product"),
    width,
    height,
    depth,
    weight,
  };
}

function permuteDimensions(width, height, depth) {
  const w = Number(width);
  const h = Number(height);
  const d = Number(depth);
  const orientations = [
    [w, h, d],
    [w, d, h],
    [h, w, d],
    [h, d, w],
    [d, w, h],
    [d, h, w],
  ];
  const seen = new Set();
  const unique = [];

  for (const [ow, oh, od] of orientations) {
    const key = `${ow}:${oh}:${od}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ width: ow, height: oh, depth: od });
  }

  return unique;
}

function itemFitsInBin(item, bin) {
  if (item.weight > bin.maxWeight) return false;

  const orientations = permuteDimensions(item.width, item.height, item.depth);
  return orientations.some(
    (orientation) =>
      orientation.width <= bin.width
      && orientation.height <= bin.height
      && orientation.depth <= bin.depth
  );
}

async function getLargestProductForSeller(pool, sellerUserId) {
  const result = await pool.query(
    `SELECT id, name, model_weight_g, model_width_mm, model_height_mm, model_length_mm
     FROM products
     WHERE user_id = $1
       AND model_weight_g IS NOT NULL
       AND model_width_mm IS NOT NULL
       AND model_height_mm IS NOT NULL
       AND model_length_mm IS NOT NULL
     ORDER BY (model_width_mm * model_height_mm * model_length_mm) DESC,
              model_weight_g DESC,
              id DESC
     LIMIT 1`,
    [sellerUserId]
  );

  return result.rows[0] || null;
}

async function sellerBoxesCoverLargestProduct(pool, sellerUserId, boxes = null) {
  const { productFitsInAnyBox } = require("./sellerBoxPackingShared.cjs");
  const largestProduct = await getLargestProductForSeller(pool, sellerUserId);
  if (!largestProduct) return { ok: true, largestProduct: null };

  const boxList = boxes || (await listSellerBoxes(pool, sellerUserId));
  const fit = await productFitsInAnyBox(largestProduct, boxList);
  return {
    ok: fit.fits,
    largestProduct,
    fit,
  };
}

async function countSellerProducts(pool, sellerUserId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS product_count
     FROM products
     WHERE user_id = $1`,
    [sellerUserId]
  );
  return Number(result.rows[0]?.product_count || 0);
}

async function enrichBoxesWithActions(pool, sellerUserId, boxes = []) {
  const productCount = await countSellerProducts(pool, sellerUserId);
  const coverage = await sellerBoxesCoverLargestProduct(pool, sellerUserId, boxes);
  const enriched = [];

  for (const box of boxes) {
    const remainingBoxes = boxes.filter((entry) => Number(entry.id) !== Number(box.id));
    const deleteCoverage = await sellerBoxesCoverLargestProduct(pool, sellerUserId, remainingBoxes);
    const canDelete = boxes.length > 1 && deleteCoverage.ok;

    enriched.push({
      ...box,
      canDelete,
      deleteBlockedReason: canDelete
        ? null
        : boxes.length <= 1
          ? productCount > 0
            ? "You must keep at least one box while you have listed products."
            : "You must keep at least one shipping box."
          : "Removing this box leaves your largest product without a valid 95% fit box.",
    });
  }

  return {
    boxes: enriched,
    productCount,
    coversLargestProduct: coverage.ok,
    largestProduct: coverage.largestProduct,
  };
}

async function ensureSellerBoxesTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seller_boxes (
      id SERIAL PRIMARY KEY,
      seller_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(80) NOT NULL,
      width_mm NUMERIC(10,2) NOT NULL,
      length_mm NUMERIC(10,2) NOT NULL,
      height_mm NUMERIC(10,2) NOT NULL,
      max_weight_g NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT seller_boxes_dimensions_check CHECK (
        width_mm >= ${MIN_BOX_DIMENSION_MM}
        AND length_mm >= ${MIN_BOX_DIMENSION_MM}
        AND height_mm >= ${MIN_BOX_DIMENSION_MM}
        AND max_weight_g >= ${MIN_BOX_DIMENSION_MM}
      )
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_seller_boxes_seller_user_id
    ON seller_boxes (seller_user_id)
  `);
}

async function listSellerBoxes(pool, sellerUserId) {
  const result = await pool.query(
    `SELECT id, seller_user_id, name, width_mm, length_mm, height_mm, max_weight_g, created_at, updated_at
     FROM seller_boxes
     WHERE seller_user_id = $1
     ORDER BY id ASC`,
    [sellerUserId]
  );
  return result.rows.map(normalizeBoxRow);
}

module.exports = {
  BOX_SHRINK_FACTOR,
  countSellerProducts,
  ensureSellerBoxesTable,
  enrichBoxesWithActions,
  getEffectiveBoxBin,
  getLargestProductForSeller,
  getProductPackingItem,
  itemFitsInBin,
  listSellerBoxes,
  normalizeBoxRow,
  parseBoxPayload,
  productDimensionsAreValid,
  sellerBoxesCoverLargestProduct,
};
