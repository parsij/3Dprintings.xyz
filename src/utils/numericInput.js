export function sanitizeOneDecimalInput(value) {
  const raw = String(value ?? "");
  let cleaned = raw.replace(/[^\d.]/g, "");
  const dotIndex = cleaned.indexOf(".");

  if (dotIndex === -1) {
    return cleaned.replace(/^0+(?=\d)/, "");
  }

  const whole = cleaned.slice(0, dotIndex).replace(/^0+(?=\d)/, "") || "0";
  const fraction = cleaned.slice(dotIndex + 1).replace(/\./g, "").slice(0, 1);
  if (fraction === "" && cleaned.endsWith(".")) {
    return `${whole}.`;
  }
  return fraction ? `${whole}.${fraction}` : whole;
}

export function isOneDecimalNumber(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === ".") return false;
  if (!/^(?:0\.[0-9]|[1-9]\d*(?:\.\d)?)$/.test(normalized)) return false;

  const decimalDigits = normalized.includes(".") ? normalized.split(".")[1].length : 0;
  if (decimalDigits > 1) return false;

  return Number.parseFloat(normalized) > 0;
}

export function parseOneDecimalNumber(value, fieldLabel = "Value") {
  if (!isOneDecimalNumber(value)) {
    throw new Error(`${fieldLabel} must be a number greater than 0 with at most 1 decimal place.`);
  }
  return Math.round(Number.parseFloat(String(value).trim()) * 10) / 10;
}

export function formatToOneDecimal(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  if (!Number.isFinite(rounded) || rounded <= 0) return "";
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1);
}
