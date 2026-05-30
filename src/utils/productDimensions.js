export const MAX_WEIGHT_G = 50000;
export const MAX_DIMENSION_MM = 3000;
export const MIN_DAYS_TO_PREPARE = 1;
export const MAX_DAYS_TO_PREPARE = 7;
export const MAX_WEIGHT_KG = MAX_WEIGHT_G / 1000;
export const MAX_DIMENSION_CM = MAX_DIMENSION_MM / 10;

const LB_TO_G = 453.592;
const IN_TO_MM = 25.4;

export function isNaturalNumber(value) {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) return false;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed >= 1;
}

export function convertWeightToGrams(value, unit) {
  const amount = Number.parseInt(String(value).trim(), 10);
  if (unit === "kg") {
    return amount * 1000;
  }
  return Math.round(amount * LB_TO_G);
}

export function convertDimensionToMm(value, unit) {
  const amount = Number.parseInt(String(value).trim(), 10);
  if (unit === "cm") {
    return amount * 10;
  }
  return Math.round(amount * IN_TO_MM);
}

export function getMaxWeightForUnit(unit) {
  if (unit === "kg") return MAX_WEIGHT_KG;
  return Math.floor(MAX_WEIGHT_G / LB_TO_G);
}

export function getMaxDimensionForUnit(unit) {
  if (unit === "cm") return MAX_DIMENSION_CM;
  return Math.floor(MAX_DIMENSION_MM / IN_TO_MM);
}

export function validateWeightInput(value, unit) {
  if (!isNaturalNumber(value)) {
    return "Weight must be a whole number greater than 0.";
  }
  const grams = convertWeightToGrams(value, unit);
  if (grams > MAX_WEIGHT_G) {
    return `Weight cannot exceed ${getMaxWeightForUnit(unit)} ${unit}.`;
  }
  return null;
}

export function validateDimensionInput(value, unit, label) {
  if (!isNaturalNumber(value)) {
    return `${label} must be a whole number greater than 0.`;
  }
  const millimeters = convertDimensionToMm(value, unit);
  if (millimeters > MAX_DIMENSION_MM) {
    return `${label} cannot exceed ${getMaxDimensionForUnit(unit)} ${unit}.`;
  }
  return null;
}

export function validateDaysToPrepare(value) {
  if (!isNaturalNumber(value)) {
    return `Days to prepare must be a whole number from ${MIN_DAYS_TO_PREPARE} to ${MAX_DAYS_TO_PREPARE}.`;
  }

  const parsed = Number.parseInt(String(value).trim(), 10);
  if (parsed < MIN_DAYS_TO_PREPARE || parsed > MAX_DAYS_TO_PREPARE) {
    return `Days to prepare must be between ${MIN_DAYS_TO_PREPARE} and ${MAX_DAYS_TO_PREPARE}.`;
  }

  return null;
}

export function toCanonicalDimensions({
  modelWeight,
  modelWeightUnit,
  modelHeight,
  modelWidth,
  modelLength,
  modelDimensionUnit,
}) {
  return {
    modelWeightG: convertWeightToGrams(modelWeight, modelWeightUnit),
    modelHeightMm: convertDimensionToMm(modelHeight, modelDimensionUnit),
    modelWidthMm: convertDimensionToMm(modelWidth, modelDimensionUnit),
    modelLengthMm: convertDimensionToMm(modelLength, modelDimensionUnit),
    modelWeightUnit,
    modelDimensionUnit,
  };
}
