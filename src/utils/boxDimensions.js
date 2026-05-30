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

export const MAX_BOX_DIMENSION_MM = 2000;
export const MAX_BOX_WEIGHT_G = 100000;

export function getMaxBoxDimensionForUnit(unit) {
  if (unit === "cm") return MAX_BOX_DIMENSION_MM / 10;
  return Math.round((MAX_BOX_DIMENSION_MM / 25.4) * 10) / 10;
}

export function getMaxBoxWeightForUnit(unit) {
  if (unit === "kg") return MAX_BOX_WEIGHT_G / 1000;
  return Math.round((MAX_BOX_WEIGHT_G / 453.592) * 10) / 10;
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
