import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function getSellerPreferences() {
  const response = await axios.get(`${API_BASE}/api/seller/preferences`, {
    withCredentials: true,
  });
  return response.data;
}

export async function updateSellerPreferences(payload) {
  const response = await axios.put(`${API_BASE}/api/seller/preferences`, payload, {
    withCredentials: true,
  });
  return response.data;
}

export async function getSellerProducts() {
  const response = await axios.get(`${API_BASE}/api/seller/products`, {
    withCredentials: true,
  });
  return response.data;
}

export async function updateSellerProduct(productId, payload) {
  const response = await axios.put(`${API_BASE}/api/seller/products/${productId}`, payload, {
    withCredentials: true,
  });
  return response.data;
}

export async function getSellerReviews() {
  const response = await axios.get(`${API_BASE}/api/seller/reviews`, {
    withCredentials: true,
  });
  return response.data;
}

export async function updateSellerReviewReply(reviewId, reply) {
  const response = await axios.put(
    `${API_BASE}/api/seller/reviews/${reviewId}/reply`,
    { reply },
    { withCredentials: true }
  );
  return response.data;
}
