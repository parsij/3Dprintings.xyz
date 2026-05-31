const MAX_WEIGHT_G = 50000;
const MAX_DIMENSION_MM = 3000;
const MIN_DAYS_TO_PREPARE = 1;
const MAX_DAYS_TO_PREPARE = 7;
const WEIGHT_UNITS = new Set(["lb", "kg"]);
const DIMENSION_UNITS = new Set(["in", "cm"]);
const LB_TO_G = 453.592;
const IN_TO_MM = 25.4;
const { parseOneDecimalNumber, parseOneDecimalCanonical } = require("./numericInputShared.cjs");

const FIELD_BY_LABEL = {
  "Model weight": "modelWeight",
  Height: "modelHeight",
  Width: "modelWidth",
  Length: "modelLength",
  "Days to prepare": "daysToPrepare",
  Dimension: "dimensions",
};

function createValidationError(message, fieldLabel, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.field = FIELD_BY_LABEL[fieldLabel] || "dimensions";
  return error;
}

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

function convertWeightToGrams(value, unit) {
  let amount;
  try {
    amount = parseOneDecimalNumber(value, "Model weight");
  } catch (error) {
    throw createValidationError(error.message, "Model weight");
  }

  if (unit === "kg") {
    return Math.round(amount * 1000 * 10) / 10;
  }
  return Math.round(amount * LB_TO_G * 10) / 10;
}

function convertDimensionToMm(value, unit, fieldLabel = "Dimension") {
  let amount;
  try {
    amount = parseOneDecimalNumber(value, fieldLabel);
  } catch (error) {
    throw createValidationError(error.message, fieldLabel);
  }

  if (unit === "cm") {
    return Math.round(amount * 10 * 10) / 10;
  }
  return Math.round(amount * IN_TO_MM * 10) / 10;
}

function assertWeightWithinLimit(modelWeightG) {
  const normalized = Math.round(Number(modelWeightG) * 10) / 10;
  if (!Number.isFinite(normalized) || normalized <= 0 || normalized > MAX_WEIGHT_G) {
    throw createValidationError(
      `Model weight cannot exceed ${MAX_WEIGHT_G / 1000} kg.`,
      "Model weight"
    );
  }
}

function assertDimensionWithinLimit(modelMm, fieldLabel) {
  const normalized = Math.round(Number(modelMm) * 10) / 10;
  if (!Number.isFinite(normalized) || normalized <= 0 || normalized > MAX_DIMENSION_MM) {
    throw createValidationError(
      `${fieldLabel} cannot exceed ${MAX_DIMENSION_MM / 10} cm.`,
      fieldLabel
    );
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

    let parsedClient;
    try {
      parsedClient = parseOneDecimalCanonical(clientValue, label);
    } catch (error) {
      throw createValidationError(error.message, label);
    }

    if (Math.round(parsedClient * 10) !== Math.round(expected * 10)) {
      throw createValidationError(`${label} does not match the selected unit.`, label);
    }
  }
}

function parseDaysToPrepare(value, fieldLabel = "Days to prepare") {
  if (value === undefined || value === null || String(value).trim() === "") {
    return MIN_DAYS_TO_PREPARE;
  }

  if (!isNaturalNumber(value)) {
    throw createValidationError(
      `${fieldLabel} must be a whole number from ${MIN_DAYS_TO_PREPARE} to ${MAX_DAYS_TO_PREPARE}.`,
      fieldLabel
    );
  }

  const parsed = Number.parseInt(String(value).trim(), 10);
  if (parsed < MIN_DAYS_TO_PREPARE || parsed > MAX_DAYS_TO_PREPARE) {
    throw createValidationError(
      `${fieldLabel} must be between ${MIN_DAYS_TO_PREPARE} and ${MAX_DAYS_TO_PREPARE}.`,
      fieldLabel
    );
  }

  return parsed;
}

function parseCanonicalDimension(value, fieldLabel) {
  try {
    return parseOneDecimalCanonical(value, fieldLabel);
  } catch (error) {
    throw createValidationError(error.message, fieldLabel);
  }
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

  const modelWeightG = String(body.modelWeight ?? "").trim() !== ""
    ? convertWeightToGrams(body.modelWeight, modelWeightUnit)
    : parseCanonicalDimension(body.modelWeightG ?? body.model_weight_g, "Model weight");

  const modelHeightMm = String(body.modelHeight ?? "").trim() !== ""
    ? convertDimensionToMm(body.modelHeight, modelDimensionUnit, "Height")
    : parseCanonicalDimension(body.modelHeightMm ?? body.model_height_mm, "Height");

  const modelWidthMm = String(body.modelWidth ?? "").trim() !== ""
    ? convertDimensionToMm(body.modelWidth, modelDimensionUnit, "Width")
    : parseCanonicalDimension(body.modelWidthMm ?? body.model_width_mm, "Width");

  const modelLengthMm = String(body.modelLength ?? "").trim() !== ""
    ? convertDimensionToMm(body.modelLength, modelDimensionUnit, "Length")
    : parseCanonicalDimension(body.modelLengthMm ?? body.model_length_mm, "Length");

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
    (value) => Number.isFinite(value) && value > 0
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
