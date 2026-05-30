import {
  isOneDecimalNumber,
  parseOneDecimalNumber,
  formatToOneDecimal,
} from "./numericInput.js";

export const MAX_WEIGHT_G = 50000;
export const MAX_DIMENSION_MM = 3000;
export const MIN_DAYS_TO_PREPARE = 1;
export const MAX_DAYS_TO_PREPARE = 7;
export const MAX_WEIGHT_KG = MAX_WEIGHT_G / 1000;
export const MAX_DIMENSION_CM = MAX_DIMENSION_MM / 10;

const LB_TO_G = 453.592;
const IN_TO_MM = 25.4;

export { isOneDecimalNumber, parseOneDecimalNumber, formatToOneDecimal };

export function isNaturalNumber(value) {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) return false;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed >= 1;
}

export function convertWeightToGrams(value, unit) {
  const amount = Number.parseFloat(String(value).trim());
  if (unit === "kg") {
    return Math.round(amount * 1000 * 10) / 10;
  }
  return Math.round(amount * LB_TO_G * 10) / 10;
}

export function convertDimensionToMm(value, unit) {
  const amount = Number.parseFloat(String(value).trim());
  if (unit === "cm") {
    return Math.round(amount * 10 * 10) / 10;
  }
  return Math.round(amount * IN_TO_MM * 10) / 10;
}

export function getMaxWeightForUnit(unit) {
  if (unit === "kg") return MAX_WEIGHT_KG;
  return Math.round((MAX_WEIGHT_G / LB_TO_G) * 10) / 10;
}

export function getMaxDimensionForUnit(unit) {
  if (unit === "cm") return MAX_DIMENSION_CM;
  return Math.round((MAX_DIMENSION_MM / IN_TO_MM) * 10) / 10;
}

export function validateWeightInput(value, unit) {
  if (!isOneDecimalNumber(value)) {
    return "Weight must be a number greater than 0 with at most 1 decimal place.";
  }
  const grams = convertWeightToGrams(value, unit);
  if (grams > MAX_WEIGHT_G) {
    return `Weight cannot exceed ${formatToOneDecimal(getMaxWeightForUnit(unit))} ${unit}.`;
  }
  return null;
}

export function validateDimensionInput(value, unit, label) {
  if (!isOneDecimalNumber(value)) {
    return `${label} must be a number greater than 0 with at most 1 decimal place.`;
  }
  const millimeters = convertDimensionToMm(value, unit);
  if (millimeters > MAX_DIMENSION_MM) {
    return `${label} cannot exceed ${formatToOneDecimal(getMaxDimensionForUnit(unit))} ${unit}.`;
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

export function fromCanonicalWeight(grams, unit = "lb") {
  const normalized = Number(grams);
  if (!Number.isFinite(normalized) || normalized <= 0) return "";
  const value = unit === "kg" ? normalized / 1000 : normalized / LB_TO_G;
  return formatToOneDecimal(value);
}

export function fromCanonicalDimension(mm, unit = "in") {
  const normalized = Number(mm);
  if (!Number.isFinite(normalized) || normalized <= 0) return "";
  const value = unit === "cm" ? normalized / 10 : normalized / IN_TO_MM;
  return formatToOneDecimal(value);
}

export function productToFormDimensions(product = {}) {
  const weightUnit = product.model_weight_unit === "kg" ? "kg" : "lb";
  const dimensionUnit = product.model_dimension_unit === "cm" ? "cm" : "in";

  return {
    modelWeight: fromCanonicalWeight(product.model_weight_g, weightUnit),
    modelWeightUnit: weightUnit,
    modelHeight: fromCanonicalDimension(product.model_height_mm, dimensionUnit),
    modelWidth: fromCanonicalDimension(product.model_width_mm, dimensionUnit),
    modelLength: fromCanonicalDimension(product.model_length_mm, dimensionUnit),
    modelDimensionUnit: dimensionUnit,
    daysToPrepare: String(product.days_to_prepare ?? 1),
  };
}
