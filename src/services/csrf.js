import axios from "axios";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

function getCsrfTokenFromCookie() {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function withCsrfHeaders(init = {}) {
  const method = String(init.method || "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
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

axios.interceptors.request.use((config) => {
  const method = String(config.method || "get").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(method)) {
    const token = getCsrfTokenFromCookie();
    if (token) {
      config.headers = config.headers || {};
      config.headers[CSRF_HEADER_NAME] = token;
    }
  }
  return config;
});

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => originalFetch(input, withCsrfHeaders(init));

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
