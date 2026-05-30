const TECHNICAL_ERROR_PATTERNS = [
  /\beasypost\b/i,
  /\bstripe (?:api|error|request|webhook)\b/i,
  /no such (?:payment_intent|charge|customer|account|price)/i,
  /\bpostgres(?:ql)?\b/i,
  /\bsql\b/i,
  /\bapi[_ ]?key\b/i,
  /\bsecret\b/i,
  /ECONNREFUSED/,
  /ENOTFOUND/,
  /ETIMEDOUT/,
  /\/home\//i,
  /\/src\//i,
  /\.cjs:\d+/i,
  /\.js:\d+/i,
  /\bat\s+\w+/i,
  /internal server error/i,
  /bad gateway/i,
  /service unavailable/i,
  /network error/i,
  /axios/i,
  /unexpected token/i,
  /syntaxerror/i,
  /typeerror/i,
  /referenceerror/i,
];

function isUserSafeMessage(message) {
  if (typeof message !== "string") return false;

  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 280) return false;
  if (trimmed.includes("\n") || trimmed.includes("\r")) return false;

  return !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function getUserFacingError(error, fallback = "Something went wrong. Please try again.") {
  const candidate = error?.response?.data?.message
    ?? error?.response?.data?.error
    ?? error?.message;

  if (typeof candidate === "string" && isUserSafeMessage(candidate)) {
    return candidate.trim();
  }

  return fallback;
}
