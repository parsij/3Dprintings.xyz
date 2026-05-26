const DEFAULT_MARKETPLACE_ORIGIN = "https://3dprintings.xyz";
const DEFAULT_SELLER_ORIGIN = "https://seller.3dprintings.xyz";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export const MARKETPLACE_ORIGIN =
  import.meta.env.VITE_MARKETPLACE_ORIGIN
  ?? (typeof window !== "undefined" ? window.location.origin : DEFAULT_MARKETPLACE_ORIGIN);

export const SELLER_SITE_ORIGIN =
  import.meta.env.VITE_SELLER_SITE_ORIGIN ?? DEFAULT_SELLER_ORIGIN;
