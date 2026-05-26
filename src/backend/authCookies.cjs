const { isTestMode } = require("./envShared.cjs");

const CSRF_COOKIE_NAME = "csrf-token";

function dedupeCookieOptions(options) {
  const seen = new Set();

  return options.filter((option) => {
    const key = JSON.stringify(option);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildCookieClearOptions({ isProduction, authCookieDomain, httpOnly }) {
  const options = [];
  const base = { httpOnly, sameSite: "lax", path: "/" };

  if (isProduction) {
    const secureBase = { ...base, secure: true };
    if (authCookieDomain) {
      options.push({ ...secureBase, domain: authCookieDomain });
    }
    options.push({ ...secureBase });
  } else {
    const insecureBase = { ...base, secure: false };
    if (authCookieDomain) {
      options.push({ ...insecureBase, domain: authCookieDomain });
    }
    options.push({ ...insecureBase });
  }

  if (isTestMode()) {
    options.push({ ...base, secure: false });
    options.push({ ...base, secure: false, domain: "localhost" });
  }

  return dedupeCookieOptions(options);
}

function clearNamedCookie(res, name, clearOptions) {
  for (const options of clearOptions) {
    res.clearCookie(name, options);
  }
}

function clearAuthCookie(res, { isProduction, authCookieDomain }) {
  const clearOptions = buildCookieClearOptions({
    isProduction,
    authCookieDomain,
    httpOnly: true,
  });
  clearNamedCookie(res, "token", clearOptions);
}

function clearCsrfNamedCookie(res, { isProduction, authCookieDomain }) {
  const clearOptions = buildCookieClearOptions({
    isProduction,
    authCookieDomain,
    httpOnly: false,
  });
  clearNamedCookie(res, CSRF_COOKIE_NAME, clearOptions);
}

module.exports = {
  CSRF_COOKIE_NAME,
  buildCookieClearOptions,
  clearAuthCookie,
  clearCsrfNamedCookie,
  clearNamedCookie,
};
