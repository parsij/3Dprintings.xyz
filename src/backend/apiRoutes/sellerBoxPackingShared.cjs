const { BOX_SHRINK_FACTOR, getEffectiveBoxBin } = require("./sellerBoxesShared.cjs");
const { productDimensionsAreValid } = require("./productDimensionsShared.cjs");

const MM_PER_IN = 25.4;
const GRAMS_PER_OZ = 28.3495;

let pack3DLoader = import("binpackingjs/3d").then((module) => module.pack3D);

async function getPack3D() {
  return pack3DLoader;
}

function boxVolumeMm3(box) {
  return Number(box.widthMm) * Number(box.heightMm) * Number(box.lengthMm);
}

function getProductPackingItem(product, suffix = "") {
  const weight = Number(product.model_weight_g ?? product.modelWeightG ?? product.weightG);
  const width = Number(product.model_width_mm ?? product.modelWidthMm ?? product.widthMm);
  const height = Number(product.model_height_mm ?? product.modelHeightMm ?? product.heightMm);
  const depth = Number(product.model_length_mm ?? product.modelLengthMm ?? product.lengthMm);

  const baseName = String(product.name || product.id || "product");
  return {
    name: suffix ? `${baseName}-${suffix}` : baseName,
    width,
    height,
    depth,
    weight,
  };
}

function expandItemsForPacking(items = []) {
  const expanded = [];

  for (const item of items) {
    const quantity = Number(item.quantity || 1);
    if (!Number.isInteger(quantity) || quantity <= 0) continue;

    for (let index = 0; index < quantity; index += 1) {
      expanded.push(getProductPackingItem(item, String(index + 1)));
    }
  }

  return expanded;
}

function ceilMmToInches(mm) {
  const numeric = Number(mm);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.ceil(numeric / MM_PER_IN));
}

function ceilGramsToOunces(grams) {
  const numeric = Number(grams);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.ceil(numeric / GRAMS_PER_OZ));
}

function buildEasyPostParcelFromBox(box, totalWeightG) {
  return {
    length: ceilMmToInches(box.lengthMm),
    width: ceilMmToInches(box.widthMm),
    height: ceilMmToInches(box.heightMm),
    weight: ceilGramsToOunces(totalWeightG),
  };
}

async function packItemsIntoSmallestSellerBox(items, boxes = []) {
  const packingItems = expandItemsForPacking(items);
  if (packingItems.length === 0) {
    return { fits: false, reason: "no_items" };
  }

  if (!packingItems.every((item) =>
    Number.isFinite(item.width) && item.width > 0
    && Number.isFinite(item.height) && item.height > 0
    && Number.isFinite(item.depth) && item.depth > 0
    && Number.isFinite(item.weight) && item.weight > 0
  )) {
    return { fits: false, reason: "invalid_dimensions" };
  }

  const pack3D = await getPack3D();
  const sortedBoxes = [...boxes].sort((left, right) => boxVolumeMm3(left) - boxVolumeMm3(right));

  for (const box of sortedBoxes) {
    const bin = getEffectiveBoxBin(box);
    const totalWeightG = packingItems.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeightG > bin.maxWeight) {
      continue;
    }

    const result = pack3D({
      bins: [{
        name: String(box.id || box.name),
        width: bin.width,
        height: bin.height,
        depth: bin.depth,
        maxWeight: bin.maxWeight,
      }],
      items: packingItems.map((item) => ({
        name: item.name,
        width: item.width,
        height: item.height,
        depth: item.depth,
        weight: item.weight,
      })),
    });

    if (result.unfitItems.length === 0 && result.packedBins.length > 0) {
      return {
        fits: true,
        box,
        totalWeightG,
        parcel: buildEasyPostParcelFromBox(box, totalWeightG),
        packedItemCount: packingItems.length,
      };
    }
  }

  return { fits: false, reason: "no_matching_box" };
}

async function productFitsInAnyBox(product, boxes = []) {
  if (!productDimensionsAreValid(product)) {
    return { fits: false, reason: "invalid_dimensions" };
  }

  return packItemsIntoSmallestSellerBox([{ ...product, quantity: 1 }], boxes);
}

function resolvePrepareDays(items = []) {
  const values = items
    .map((item) => Number(item.daysToPrepare ?? item.days_to_prepare))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7);

  if (values.length === 0) return 1;
  return Math.max(...values);
}

module.exports = {
  buildEasyPostParcelFromBox,
  ceilGramsToOunces,
  ceilMmToInches,
  expandItemsForPacking,
  getProductPackingItem,
  packItemsIntoSmallestSellerBox,
  productFitsInAnyBox,
  resolvePrepareDays,
};
