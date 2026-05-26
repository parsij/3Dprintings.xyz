const { isTestMode } = require("./envShared.cjs");

function getAuthCookieDomains(isProduction, authCookieDomain, hostname = "") {
  const domains = new Set([undefined]);

  if (authCookieDomain) {
    domains.add(authCookieDomain);
  }

  if (isProduction || isTestMode()) {
    domains.add(".3dprintings.xyz");
    domains.add("3dprintings.xyz");
  }

  if (!isProduction || isTestMode()) {
    domains.add("localhost");
    domains.add(".localhost");
  }

  const normalizedHost = String(hostname || "").trim().toLowerCase();
  if (normalizedHost && normalizedHost !== "localhost" && normalizedHost !== "127.0.0.1") {
    domains.add(normalizedHost);
    if (!normalizedHost.startsWith(".")) {
      domains.add(`.${normalizedHost}`);
    }
  }

  return [...domains];
}

function expireCookie(res, name, options) {
  res.clearCookie(name, options);
  res.cookie(name, "", {
    ...options,
    expires: new Date(0),
    maxAge: 0,
  });
}

function clearAuthCookie(res, { isProduction, authCookieDomain, hostname = "" }) {
  const secureVariants = [
    { httpOnly: true, sameSite: "lax", path: "/", secure: false },
    { httpOnly: true, sameSite: "lax", path: "/", secure: true },
  ];

  for (const variant of secureVariants) {
    for (const domain of getAuthCookieDomains(isProduction, authCookieDomain, hostname)) {
      const options = domain ? { ...variant, domain } : variant;
      expireCookie(res, "token", options);
    }
  }
}

module.exports = {
  clearAuthCookie,
};
