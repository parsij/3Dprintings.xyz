import {
  convertDimensionToMm,
  convertWeightToGrams,
  fromCanonicalDimension,
  fromCanonicalWeight,
  isNaturalNumber,
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
  if (unit === "cm") return Math.floor(MAX_BOX_DIMENSION_MM / 10);
  return Math.floor(MAX_BOX_DIMENSION_MM / 25.4);
}

export function getMaxBoxWeightForUnit(unit) {
  if (unit === "kg") return Math.floor(MAX_BOX_WEIGHT_G / 1000);
  return Math.floor(MAX_BOX_WEIGHT_G / 453.592);
}

export function validateBoxDimensionInput(value, unit, label) {
  if (!isNaturalNumber(value)) {
    return `${label} must be a whole number greater than 0.`;
  }
  const millimeters = convertDimensionToMm(value, unit);
  if (millimeters > MAX_BOX_DIMENSION_MM) {
    return `${label} cannot exceed ${getMaxBoxDimensionForUnit(unit)} ${unit}.`;
  }
  return null;
}

export function validateBoxWeightInput(value, unit) {
  if (!isNaturalNumber(value)) {
    return "Max weight must be a whole number greater than 0.";
  }
  const grams = convertWeightToGrams(value, unit);
  if (grams > MAX_BOX_WEIGHT_G) {
    return `Max weight cannot exceed ${getMaxBoxWeightForUnit(unit)} ${unit}.`;
  }
  return null;
}

export function toCanonicalBoxPayload(form) {
  return {
    name: String(form.name || "").trim(),
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
