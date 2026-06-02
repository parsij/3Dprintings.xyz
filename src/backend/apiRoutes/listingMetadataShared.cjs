const ITEM_TYPES = new Set(["physical", "digital"]);
const MADE_BY_OPTIONS = new Set(["i_made_it", "someone_in_shop", "another_person"]);
const ITEM_KINDS = new Set(["finished_product", "supply_or_tool"]);

const FILAMENT_TYPES = new Set([
  "PLA",
  "PLA+",
  "PETG",
  "ABS",
  "ASA",
  "TPU",
  "TPE",
  "Nylon (PA)",
  "PC (Polycarbonate)",
  "HIPS",
  "PVA",
  "PET",
  "PP",
  "POM",
  "Carbon Fiber Filled",
  "Glass Fiber Filled",
  "Wood-filled",
  "Metal-filled",
  "Standard Resin",
  "Tough Resin",
  "Flexible Resin",
  "Mix",
]);

function parseListingMetadata(body = {}) {
  return {
    itemType: String(body.itemType || "").trim().toLowerCase(),
    madeBy: String(body.madeBy || "").trim().toLowerCase(),
    itemKind: String(body.itemKind || "").trim().toLowerCase(),
    materialType: String(body.materialType || "").trim(),
    aiUsed: body.aiUsed === true || body.aiUsed === "true",
  };
}

function validateListingMetadata(metadata) {
  const fieldErrors = {};

  if (!ITEM_TYPES.has(metadata.itemType)) {
    fieldErrors.itemType = "Select whether this is a physical item or a digital file.";
  }

  if (!MADE_BY_OPTIONS.has(metadata.madeBy)) {
    fieldErrors.madeBy = "Select who made this item.";
  }

  if (!ITEM_KINDS.has(metadata.itemKind)) {
    fieldErrors.itemKind = "Select what kind of item this is.";
  }

  if (metadata.itemType === "physical") {
    if (!metadata.materialType) {
      fieldErrors.materialType = "Select what this item is made out of.";
    } else if (!FILAMENT_TYPES.has(metadata.materialType)) {
      fieldErrors.materialType = "Select a valid material type.";
    }
  }

  return fieldErrors;
}

module.exports = {
  FILAMENT_TYPES,
  ITEM_KINDS,
  ITEM_TYPES,
  MADE_BY_OPTIONS,
  parseListingMetadata,
  validateListingMetadata,
};
