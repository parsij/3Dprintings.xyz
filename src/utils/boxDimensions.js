import {
  convertDimensionToMm,
  convertWeightToGrams,
  fromCanonicalDimension,
  fromCanonicalWeight,
  isOneDecimalNumber,
  formatToOneDecimal,
} from "./productDimensions.js";

export const BOX_DIMENSION_UNITS = [
  { value: "in", label: "in" },
  { value: "cm", label: "cm" },
];

export const BOX_WEIGHT_UNITS = [
  { value: "lb", label: "lb" },
  { value: "kg", label: "kg" },
];

const IN_TO_MM = 25.4;
const LB_TO_G = 453.592;

export const CARRIER_BOX_LIMITS = {
  maxWeightLb: 70,
  maxLongestSideIn: 108,
  maxLengthPlusGirthIn: 130,
};

export const MAX_BOX_DIMENSION_MM = Math.round(CARRIER_BOX_LIMITS.maxLongestSideIn * IN_TO_MM * 10) / 10;
export const MAX_BOX_WEIGHT_G = Math.round(CARRIER_BOX_LIMITS.maxWeightLb * LB_TO_G * 10) / 10;

export function getMaxBoxDimensionForUnit(unit) {
  if (unit === "cm") return Math.round((CARRIER_BOX_LIMITS.maxLongestSideIn * 2.54) * 10) / 10;
  return CARRIER_BOX_LIMITS.maxLongestSideIn;
}

export function getMaxBoxWeightForUnit(unit) {
  if (unit === "kg") return Math.round((MAX_BOX_WEIGHT_G / 1000) * 10) / 10;
  return CARRIER_BOX_LIMITS.maxWeightLb;
}

function sortedBoxDimensionsMm(widthMm, lengthMm, heightMm) {
  return [widthMm, lengthMm, heightMm].sort((left, right) => right - left);
}

export function getBoxLongestSideInches(widthMm, lengthMm, heightMm) {
  const [longestMm] = sortedBoxDimensionsMm(widthMm, lengthMm, heightMm);
  return longestMm / IN_TO_MM;
}

export function getBoxLengthPlusGirthInches(widthMm, lengthMm, heightMm) {
  const [longestMm, middleMm, shortestMm] = sortedBoxDimensionsMm(widthMm, lengthMm, heightMm);
  return (longestMm + (2 * middleMm) + (2 * shortestMm)) / IN_TO_MM;
}

export function validateBoxCarrierLimits({
  widthMm,
  lengthMm,
  heightMm,
  maxWeightG,
  dimensionUnit = "in",
  weightUnit = "lb",
}) {
  const errors = {};

  if (Number.isFinite(maxWeightG) && maxWeightG > MAX_BOX_WEIGHT_G) {
    errors.maxWeight = `Max weight cannot exceed ${formatToOneDecimal(getMaxBoxWeightForUnit(weightUnit))} ${weightUnit}.`;
  }

  if (![widthMm, lengthMm, heightMm].every((value) => Number.isFinite(value) && value > 0)) {
    return errors;
  }

  const longestSideIn = getBoxLongestSideInches(widthMm, lengthMm, heightMm);
  if (longestSideIn > CARRIER_BOX_LIMITS.maxLongestSideIn) {
    const limit = dimensionUnit === "cm"
      ? formatToOneDecimal(getMaxBoxDimensionForUnit("cm"))
      : String(CARRIER_BOX_LIMITS.maxLongestSideIn);
    errors.dimensions = `Longest side cannot exceed ${limit} ${dimensionUnit} (108 in / 9 ft).`;
  }

  const lengthPlusGirthIn = getBoxLengthPlusGirthInches(widthMm, lengthMm, heightMm);
  if (lengthPlusGirthIn > CARRIER_BOX_LIMITS.maxLengthPlusGirthIn) {
    const limit = dimensionUnit === "cm"
      ? formatToOneDecimal(CARRIER_BOX_LIMITS.maxLengthPlusGirthIn * 2.54)
      : String(CARRIER_BOX_LIMITS.maxLengthPlusGirthIn);
    errors.dimensions = errors.dimensions
      || `Combined length and girth cannot exceed ${limit} ${dimensionUnit} (length + 2×width + 2×height, max 130 in).`;
  }

  return errors;
}

export function validateBoxDimensionInput(value, unit, label) {
  if (!isOneDecimalNumber(value)) {
    return `${label} must be a number greater than 0 with at most 1 decimal place.`;
  }
  const millimeters = convertDimensionToMm(value, unit);
  if (millimeters > MAX_BOX_DIMENSION_MM) {
    return `${label} cannot exceed ${formatToOneDecimal(getMaxBoxDimensionForUnit(unit))} ${unit}.`;
  }
  return null;
}

export function validateBoxWeightInput(value, unit) {
  if (!isOneDecimalNumber(value)) {
    return "Max weight must be a number greater than 0 with at most 1 decimal place.";
  }
  const grams = convertWeightToGrams(value, unit);
  if (grams > MAX_BOX_WEIGHT_G) {
    return `Max weight cannot exceed ${formatToOneDecimal(getMaxBoxWeightForUnit(unit))} ${unit}.`;
  }
  return null;
}

export function toCanonicalBoxPayload(form) {
  return {
    name: String(form.name || "").trim(),
    width: form.width,
    length: form.length,
    height: form.height,
    maxWeight: form.maxWeight,
    dimensionUnit: form.dimensionUnit,
    weightUnit: form.weightUnit,
    widthMm: convertDimensionToMm(form.width, form.dimensionUnit),
    lengthMm: convertDimensionToMm(form.length, form.dimensionUnit),
    heightMm: convertDimensionToMm(form.height, form.dimensionUnit),
    maxWeightG: convertWeightToGrams(form.maxWeight, form.weightUnit),
  };
}

export function boxToFormValues(box, preferredDimensionUnit = "in", preferredWeightUnit = "lb") {
  return {
    name: box.name || "",
    width: fromCanonicalDimension(box.widthMm, preferredDimensionUnit),
    length: fromCanonicalDimension(box.lengthMm, preferredDimensionUnit),
    height: fromCanonicalDimension(box.heightMm, preferredDimensionUnit),
    maxWeight: fromCanonicalWeight(box.maxWeightG, preferredWeightUnit),
    dimensionUnit: preferredDimensionUnit,
    weightUnit: preferredWeightUnit,
  };
}

export function formatBoxDimensions(box, dimensionUnit = "in") {
  const width = fromCanonicalDimension(box.widthMm, dimensionUnit);
  const length = fromCanonicalDimension(box.lengthMm, dimensionUnit);
  const height = fromCanonicalDimension(box.heightMm, dimensionUnit);
  return `${width} × ${length} × ${height} ${dimensionUnit}`;
}

export function formatBoxWeight(box, weightUnit = "lb") {
  return `${fromCanonicalWeight(box.maxWeightG, weightUnit)} ${weightUnit} max`;
}
