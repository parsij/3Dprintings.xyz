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
  /unexpected token/i,
  /syntaxerror/i,
  /typeerror/i,
  /referenceerror/i,
];

function createUserError(message, statusCode = 400) {
  const error = new Error(String(message || "Invalid request."));
  error.statusCode = statusCode;
  error.exposeToClient = true;
  return error;
}

function isUserSafeMessage(message) {
  if (typeof message !== "string") return false;

  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 280) return false;
  if (trimmed.includes("\n") || trimmed.includes("\r")) return false;

  return !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function resolveClientError(error, fallbackMessage = "Something went wrong. Please try again.") {
  if (error?.exposeToClient === true) {
    const message = String(error.userMessage || error.message || "").trim();
    if (message) {
      return {
        statusCode: Number(error.statusCode) || 400,
        message,
      };
    }
  }

  const statusCode = Number(error?.statusCode || error?.status);
  const rawMessage = typeof error?.message === "string" ? error.message.trim() : "";

  if (
    Number.isInteger(statusCode)
    && statusCode >= 400
    && statusCode < 500
    && rawMessage
    && isUserSafeMessage(rawMessage)
  ) {
    return { statusCode, message: rawMessage };
  }

  if (statusCode === 403) {
    return { statusCode: 403, message: "You do not have permission to do that." };
  }
  if (statusCode === 404) {
    return { statusCode: 404, message: "The requested item was not found." };
  }
  if (statusCode === 409) {
    return { statusCode: 409, message: fallbackMessage || "That action could not be completed." };
  }
  if (statusCode === 413) {
    return { statusCode: 413, message: "The request was too large." };
  }
  if (statusCode === 502 || statusCode === 503) {
    return {
      statusCode: 502,
      message: fallbackMessage || "A required service is temporarily unavailable. Please try again.",
    };
  }
  if (statusCode === 400) {
    return { statusCode: 400, message: fallbackMessage || "Invalid request. Please check your input and try again." };
  }

  return { statusCode: 500, message: fallbackMessage || "Something went wrong. Please try again." };
}

function logInternalError(context, error) {
  console.error(`[${context}]`, {
    message: error?.message,
    statusCode: error?.statusCode || error?.status,
    stack: error?.stack,
  });
}

function sendJsonError(res, error, fallbackMessage, { key = "message", context = "route" } = {}) {
  const { statusCode, message } = resolveClientError(error, fallbackMessage);
  if (statusCode >= 500 || (error?.message && !isUserSafeMessage(error.message) && error?.exposeToClient !== true)) {
    logInternalError(context, error);
  }
  return res.status(statusCode).json({ [key]: message });
}

module.exports = {
  createUserError,
  isUserSafeMessage,
  logInternalError,
  resolveClientError,
  sendJsonError,
};
