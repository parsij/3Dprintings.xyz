import axios from "axios";
import { applyCsrfInterceptor } from "../../services/csrf.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const apiClient = applyCsrfInterceptor(axios.create({
  baseURL: API_BASE,
  withCredentials: true,
}));

export async function getSellerOnboardingStatus() {
  const response = await apiClient.get("/api/seller/onboarding/status");
  return response.data;
}

export async function saveSellerShopOnboarding(payload) {
  const response = await apiClient.post("/api/seller/onboarding/shop", payload);
  return response.data;
}

export async function createStripeConnectLink() {
  const response = await apiClient.post("/api/seller/onboarding/stripe-link");
  return response.data;
}

export async function verifyStripeConnectOnboarding() {
  const response = await apiClient.post("/api/seller/onboarding/stripe-verify");
  return response.data;
}

export async function saveSellerShippingOrigin(payload) {
  const response = await apiClient.post("/api/seller/onboarding/shipping", payload);
  return response.data;
}

export async function saveSellerFirstBox(payload) {
  const response = await apiClient.post("/api/seller/onboarding/first-box", payload);
  return response.data;
}
