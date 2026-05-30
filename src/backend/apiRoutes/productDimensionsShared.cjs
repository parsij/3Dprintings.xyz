const MAX_WEIGHT_G = 50000;
const MAX_DIMENSION_MM = 3000;
const MIN_DAYS_TO_PREPARE = 1;
const MAX_DAYS_TO_PREPARE = 7;
const WEIGHT_UNITS = new Set(["lb", "kg"]);
const DIMENSION_UNITS = new Set(["in", "cm"]);
const LB_TO_G = 453.592;
const IN_TO_MM = 25.4;

function normalizeUnit(value, allowedUnits, fallback) {
  const unit = String(value || fallback).trim().toLowerCase();
  return allowedUnits.has(unit) ? unit : fallback;
}

function isNaturalNumber(value) {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) return false;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed >= 1;
}

function parseNaturalNumber(value, fieldLabel) {
  if (!isNaturalNumber(value)) {
    const error = new Error(`${fieldLabel} must be a whole number greater than 0.`);
    error.statusCode = 400;
    throw error;
  }
  return Number.parseInt(String(value).trim(), 10);
}

function convertWeightToGrams(value, unit) {
  if (unit === "kg") {
    return value * 1000;
  }
  return Math.round(value * LB_TO_G);
}

function convertDimensionToMm(value, unit) {
  if (unit === "cm") {
    return value * 10;
  }
  return Math.round(value * IN_TO_MM);
}

function assertWeightWithinLimit(modelWeightG) {
  if (!Number.isInteger(modelWeightG) || modelWeightG < 1 || modelWeightG > MAX_WEIGHT_G) {
    const error = new Error(`Model weight cannot exceed ${MAX_WEIGHT_G / 1000} kg.`);
    error.statusCode = 400;
    throw error;
  }
}

function assertDimensionWithinLimit(modelMm, fieldLabel) {
  if (!Number.isInteger(modelMm) || modelMm < 1 || modelMm > MAX_DIMENSION_MM) {
    const error = new Error(`${fieldLabel} cannot exceed ${MAX_DIMENSION_MM / 10} cm.`);
    error.statusCode = 400;
    throw error;
  }
}

function assertClientCanonicalValuesMatch(computed, body) {
  const pairs = [
    [computed.modelWeightG, body.modelWeightG ?? body.model_weight_g, "Model weight"],
    [computed.modelHeightMm, body.modelHeightMm ?? body.model_height_mm, "Height"],
    [computed.modelWidthMm, body.modelWidthMm ?? body.model_width_mm, "Width"],
    [computed.modelLengthMm, body.modelLengthMm ?? body.model_length_mm, "Length"],
  ];

  for (const [expected, clientValue, label] of pairs) {
    if (clientValue === undefined || clientValue === null || String(clientValue).trim() === "") {
      continue;
    }
    if (!isNaturalNumber(clientValue)) {
      const error = new Error(`${label} canonical value is invalid.`);
      error.statusCode = 400;
      throw error;
    }
    if (Number.parseInt(String(clientValue).trim(), 10) !== expected) {
      const error = new Error(`${label} does not match the selected unit.`);
      error.statusCode = 400;
      throw error;
    }
  }
}

function parseDaysToPrepare(value, fieldLabel = "Days to prepare") {
  if (value === undefined || value === null || String(value).trim() === "") {
    return MIN_DAYS_TO_PREPARE;
  }

  if (!isNaturalNumber(value)) {
    const error = new Error(`${fieldLabel} must be a whole number from ${MIN_DAYS_TO_PREPARE} to ${MAX_DAYS_TO_PREPARE}.`);
    error.statusCode = 400;
    throw error;
  }

  const parsed = Number.parseInt(String(value).trim(), 10);
  if (parsed < MIN_DAYS_TO_PREPARE || parsed > MAX_DAYS_TO_PREPARE) {
    const error = new Error(`${fieldLabel} must be between ${MIN_DAYS_TO_PREPARE} and ${MAX_DAYS_TO_PREPARE}.`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

function parseAndValidateProductDimensions(body = {}) {
  const modelWeightUnit = normalizeUnit(
    body.modelWeightUnit ?? body.model_weight_unit,
    WEIGHT_UNITS,
    "lb"
  );
  const modelDimensionUnit = normalizeUnit(
    body.modelDimensionUnit ?? body.model_dimension_unit,
    DIMENSION_UNITS,
    "in"
  );

  const weightInput = parseNaturalNumber(
    body.modelWeight ?? body.modelWeightG ?? body.model_weight_g,
    "Model weight"
  );
  const heightInput = parseNaturalNumber(
    body.modelHeight ?? body.modelHeightMm ?? body.model_height_mm,
    "Height"
  );
  const widthInput = parseNaturalNumber(
    body.modelWidth ?? body.modelWidthMm ?? body.model_width_mm,
    "Width"
  );
  const lengthInput = parseNaturalNumber(
    body.modelLength ?? body.modelLengthMm ?? body.model_length_mm,
    "Length"
  );

  const modelWeightG = convertWeightToGrams(weightInput, modelWeightUnit);
  const modelHeightMm = convertDimensionToMm(heightInput, modelDimensionUnit);
  const modelWidthMm = convertDimensionToMm(widthInput, modelDimensionUnit);
  const modelLengthMm = convertDimensionToMm(lengthInput, modelDimensionUnit);

  assertWeightWithinLimit(modelWeightG);
  assertDimensionWithinLimit(modelHeightMm, "Height");
  assertDimensionWithinLimit(modelWidthMm, "Width");
  assertDimensionWithinLimit(modelLengthMm, "Length");

  assertClientCanonicalValuesMatch(
    {
      modelWeightG,
      modelHeightMm,
      modelWidthMm,
      modelLengthMm,
    },
    body
  );

  const daysToPrepare = parseDaysToPrepare(body.daysToPrepare ?? body.days_to_prepare);

  return {
    modelWeightG,
    modelHeightMm,
    modelWidthMm,
    modelLengthMm,
    modelWeightUnit,
    modelDimensionUnit,
    daysToPrepare,
  };
}

function productDimensionsAreValid(product) {
  const weight = Number(product.model_weight_g ?? product.modelWeightG);
  const height = Number(product.model_height_mm ?? product.modelHeightMm);
  const width = Number(product.model_width_mm ?? product.modelWidthMm);
  const length = Number(product.model_length_mm ?? product.modelLengthMm);

  return [weight, height, width, length].every(
    (value) => Number.isInteger(value) && value >= 1
  )
    && weight <= MAX_WEIGHT_G
    && height <= MAX_DIMENSION_MM
    && width <= MAX_DIMENSION_MM
    && length <= MAX_DIMENSION_MM;
}

module.exports = {
  DIMENSION_UNITS,
  IN_TO_MM,
  LB_TO_G,
  MAX_DAYS_TO_PREPARE,
  MAX_DIMENSION_MM,
  MAX_WEIGHT_G,
  MIN_DAYS_TO_PREPARE,
  WEIGHT_UNITS,
  assertDimensionWithinLimit,
  assertWeightWithinLimit,
  convertDimensionToMm,
  convertWeightToGrams,
  isNaturalNumber,
  parseAndValidateProductDimensions,
  parseDaysToPrepare,
  productDimensionsAreValid,
};
