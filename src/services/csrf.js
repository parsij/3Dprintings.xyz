import axios from "axios";
import { API_BASE } from "../config/api.js";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

function resolveRequestUrl(input, base = window.location.origin) {
  if (input instanceof Request) {
    return new URL(input.url, window.location.origin);
  }

  return new URL(String(input || ""), base || window.location.origin);
}

function isCsrfProtectedUrl(input, base) {
  try {
    const requestUrl = resolveRequestUrl(input, base);
    const appOrigin = window.location.origin;

    if (requestUrl.origin === appOrigin) {
      return requestUrl.pathname.startsWith("/api/");
    }

    if (!API_BASE) {
      return false;
    }

    const apiBaseUrl = new URL(API_BASE, appOrigin);
    return requestUrl.origin === apiBaseUrl.origin
      && requestUrl.pathname.startsWith(`${apiBaseUrl.pathname.replace(/\/+$/, "")}/api/`);
  } catch {
    return false;
  }
}

function getCsrfTokenFromCookie() {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function attachCsrfHeader(config) {
  const method = String(config.method || "get").toLowerCase();
  if (!["post", "put", "patch", "delete"].includes(method)) {
    return config;
  }

  if (!isCsrfProtectedUrl(config.url || "", config.baseURL)) {
    return config;
  }

  const token = getCsrfTokenFromCookie();
  if (!token) {
    return config;
  }

  config.headers = config.headers || {};
  config.headers[CSRF_HEADER_NAME] = token;
  return config;
}

export function applyCsrfInterceptor(axiosInstance) {
  axiosInstance.interceptors.request.use(attachCsrfHeader);
  return axiosInstance;
}

function withCsrfHeaders(input, init = {}) {
  const method = String(init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return init;
  }

  if (!isCsrfProtectedUrl(input)) {
    return init;
  }

  const token = getCsrfTokenFromCookie();
  if (!token) {
    return init;
  }

  const headers = new Headers(init.headers || {});
  headers.set(CSRF_HEADER_NAME, token);
  return { ...init, headers };
}

applyCsrfInterceptor(axios);

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => originalFetch(input, withCsrfHeaders(input, init));

export async function ensureCsrfToken(apiBase = "") {
  const response = await originalFetch(`${apiBase}/api/csrf-token`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to initialize CSRF token.");
  }

  return response.json();
}
