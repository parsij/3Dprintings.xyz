const DEFAULT_MARKETPLACE_ORIGIN = "https://3dprintings.xyz";
const DEFAULT_SELLER_ORIGIN = "https://seller.3dprintings.xyz";
const LOCAL_MARKETPLACE_ORIGIN = "http://localhost:5173";
const LOCAL_SELLER_ORIGIN = "http://seller.localhost:5173";

function isTruthyEnv(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function isLocalHostname(hostname = "") {
  const host = String(hostname).toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
}

export function isLocalDevRuntime() {
  if (typeof window !== "undefined") {
    return isLocalHostname(window.location.hostname);
  }
  return Boolean(import.meta.env.DEV);
}

export function isSellerHostname(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  const host = String(hostname).toLowerCase();
  if (host.startsWith("seller.")) return true;
  if (host === "seller.localhost") return true;
  return false;
}

function resolveMarketplaceOrigin() {
  if (import.meta.env.VITE_MARKETPLACE_ORIGIN) {
    return String(import.meta.env.VITE_MARKETPLACE_ORIGIN).replace(/\/+$/, "");
  }

  if (isLocalDevRuntime()) return LOCAL_MARKETPLACE_ORIGIN;

  if (typeof window !== "undefined") {
    if (isSellerHostname(window.location.hostname)) {
      if (window.location.hostname.endsWith(".localhost")) {
        return LOCAL_MARKETPLACE_ORIGIN;
      }
      return DEFAULT_MARKETPLACE_ORIGIN;
    }
    return window.location.origin;
  }

  return DEFAULT_MARKETPLACE_ORIGIN;
}

function resolveSellerSiteOrigin() {
  if (import.meta.env.VITE_SELLER_SITE_ORIGIN) {
    return String(import.meta.env.VITE_SELLER_SITE_ORIGIN).replace(/\/+$/, "");
  }

  if (isLocalDevRuntime()) {
    if (typeof window !== "undefined" && isSellerHostname(window.location.hostname)) {
      return window.location.origin;
    }
    return LOCAL_SELLER_ORIGIN;
  }

  if (typeof window !== "undefined" && isSellerHostname(window.location.hostname)) {
    return window.location.origin;
  }

  return DEFAULT_SELLER_ORIGIN;
}

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
export const IS_LOCAL_DEV = isLocalDevRuntime();
export const MARKETPLACE_ORIGIN = resolveMarketplaceOrigin();
export const SELLER_SITE_ORIGIN = resolveSellerSiteOrigin();
export const BECOME_SELLER_URL = `${MARKETPLACE_ORIGIN}/become-seller`;
export const MARKETPLACE_HOME_URL = `${MARKETPLACE_ORIGIN}/home`;
