const BOX_SHRINK_FACTOR = 0.95;
const MIN_BOX_DIMENSION_MM = 1;
const MAX_BOX_DIMENSION_MM = 2000;
const MAX_BOX_WEIGHT_G = 100000;

function parsePositiveNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < MIN_BOX_DIMENSION_MM) {
    const error = new Error(`${fieldName} must be a positive number.`);
    error.statusCode = 400;
    throw error;
  }
  if (parsed > MAX_BOX_DIMENSION_MM && fieldName !== "max weight") {
    const error = new Error(`${fieldName} is too large.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

function parseMaxWeight(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < MIN_BOX_DIMENSION_MM || parsed > MAX_BOX_WEIGHT_G) {
    const error = new Error("Max weight must be a positive number within allowed limits.");
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

function parseBoxPayload(input = {}) {
  const name = String(input.name || "").trim();
  if (name.length < 1 || name.length > 80) {
    const error = new Error("Box name must be between 1 and 80 characters.");
    error.statusCode = 400;
    throw error;
  }

  return {
    name,
    widthMm: parsePositiveNumber(input.width ?? input.widthMm, "Box width"),
    lengthMm: parsePositiveNumber(input.length ?? input.lengthMm, "Box length"),
    heightMm: parsePositiveNumber(input.height ?? input.heightMm, "Box height"),
    maxWeightG: parseMaxWeight(input.maxWeight ?? input.maxWeightG),
  };
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

function productDimensionsAreValid(product) {
  const item = getProductPackingItem(product);
  return [item.width, item.height, item.depth, item.weight].every(
    (value) => Number.isFinite(value) && value >= MIN_BOX_DIMENSION_MM
  );
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

function productFitsInAnyBox(product, boxes) {
  if (!productDimensionsAreValid(product)) {
    return { fits: false, reason: "invalid_dimensions" };
  }

  const item = getProductPackingItem(product);
  for (const box of boxes) {
    const bin = getEffectiveBoxBin(box);
    if (itemFitsInBin(item, bin)) {
      return { fits: true, box };
    }
  }

  return { fits: false, reason: "no_matching_box" };
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
  const largestProduct = await getLargestProductForSeller(pool, sellerUserId);
  if (!largestProduct) return { ok: true, largestProduct: null };

  const boxList = boxes || (await listSellerBoxes(pool, sellerUserId));
  const fit = productFitsInAnyBox(largestProduct, boxList);
  return {
    ok: fit.fits,
    largestProduct,
    fit,
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
  ensureSellerBoxesTable,
  getEffectiveBoxBin,
  getLargestProductForSeller,
  getProductPackingItem,
  itemFitsInBin,
  listSellerBoxes,
  normalizeBoxRow,
  parseBoxPayload,
  productDimensionsAreValid,
  productFitsInAnyBox,
  sellerBoxesCoverLargestProduct,
};
