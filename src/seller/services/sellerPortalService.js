import axios from "axios";
import { applyCsrfInterceptor } from "../../services/csrf.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const apiClient = applyCsrfInterceptor(axios.create({
  baseURL: API_BASE,
  withCredentials: true,
}));

export async function getSellerPreferences() {
  const response = await apiClient.get("/api/seller/preferences");
  return response.data;
}

export async function updateSellerPreferences(payload) {
  const response = await apiClient.put("/api/seller/preferences", payload);
  return response.data;
}

export async function uploadSellerProfileImage(formData) {
  const response = await apiClient.post("/api/seller/preferences/profile-image", formData);
  return response.data;
}

export async function getSellerOrders(status = "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiClient.get(`/api/seller/orders${query}`);
  return response.data;
}

export async function getSellerOrderLabelViewUrl(orderId) {
  const response = await apiClient.get(`/api/seller/orders/${encodeURIComponent(orderId)}/label`);
  const viewPath = response.data?.viewUrl;
  if (!viewPath) {
    throw new Error("Shipping label is unavailable.");
  }
  return `${API_BASE}${viewPath}`;
}

export async function downloadSellerOrderLabel(orderId) {
  const response = await apiClient.get(
    `/api/seller/orders/${encodeURIComponent(orderId)}/label/file`,
    {
      params: { download: "1" },
      responseType: "blob",
    }
  );

  const blob = new Blob([response.data], { type: response.headers["content-type"] || "application/pdf" });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `shipping-label-${orderId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function getSellerProducts() {
  const response = await apiClient.get("/api/seller/products");
  return response.data;
}

export async function updateSellerProduct(productId, payload) {
  const response = await apiClient.put(`/api/seller/products/${productId}`, payload);
  return response.data;
}

export async function getSellerReviews() {
  const response = await apiClient.get("/api/seller/reviews");
  return response.data;
}

export async function updateSellerReviewReply(reviewId, reply) {
  const response = await apiClient.put(
    `/api/seller/reviews/${reviewId}/reply`,
    { reply }
  );
  return response.data;
}
