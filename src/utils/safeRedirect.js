function normalizeOrigin(origin) {
  const rawOrigin = String(origin || "").trim();
  if (!rawOrigin) return "";

  try {
    return new URL(rawOrigin, window.location.origin).origin;
  } catch {
    return "";
  }
}

export function getSafeRedirectUrl(rawUrl, {
  allowedHostnames = [],
  allowedOrigins = [],
} = {}) {
  if (typeof window === "undefined") return null;
  const rawRedirectUrl = String(rawUrl || "").trim();
  if (!rawRedirectUrl) return null;

  try {
    const url = new URL(rawRedirectUrl, window.location.origin);
    if (!["http:", "https:"].includes(url.protocol)) return null;

    if (url.origin === window.location.origin) {
      return url.href;
    }

    const normalizedAllowedOrigins = new Set(
      allowedOrigins.map((origin) => normalizeOrigin(origin)).filter(Boolean)
    );
    if (normalizedAllowedOrigins.has(url.origin)) {
      return url.href;
    }

    const hostname = url.hostname.toLowerCase();
    const allowedHostnameSet = new Set(
      allowedHostnames.map((host) => String(host || "").trim().toLowerCase()).filter(Boolean)
    );
    if (url.protocol === "https:" && allowedHostnameSet.has(hostname)) {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

export function redirectToAllowedUrl(rawUrl, options) {
  const safeUrl = getSafeRedirectUrl(rawUrl, options);
  if (!safeUrl) {
    throw new Error("Blocked unsafe redirect URL.");
  }
  window.location.assign(safeUrl);
}
