const ONE_DECIMAL_PATTERN = /^(?:0\.[0-9]|[1-9]\d*(?:\.\d)?)$/;

function isOneDecimalNumber(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === ".") return false;
  if (!ONE_DECIMAL_PATTERN.test(normalized)) return false;

  const decimalDigits = normalized.includes(".") ? normalized.split(".")[1].length : 0;
  if (decimalDigits > 1) return false;

  return Number.parseFloat(normalized) > 0;
}

function parseOneDecimalNumber(value, fieldLabel = "Value") {
  if (!isOneDecimalNumber(value)) {
    const error = new Error(`${fieldLabel} must be a number greater than 0 with at most 1 decimal place.`);
    error.statusCode = 400;
    throw error;
  }
  return Math.round(Number.parseFloat(String(value).trim()) * 10) / 10;
}

function parseOneDecimalCanonical(value, fieldLabel = "Value") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    const error = new Error(`${fieldLabel} must be a positive number.`);
    error.statusCode = 400;
    throw error;
  }

  const normalized = Math.round(parsed * 10) / 10;
  if (Math.abs(parsed - normalized) > 0.0001) {
    const error = new Error(`${fieldLabel} must have at most 1 decimal place.`);
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

module.exports = {
  isOneDecimalNumber,
  parseOneDecimalCanonical,
  parseOneDecimalNumber,
};
