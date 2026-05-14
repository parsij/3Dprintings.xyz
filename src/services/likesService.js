import axios from "axios";

const API_BASE = `https://3dprintings.xyz`;

export const toggleLike = async (productId) => {
  try {
    const response = await axios.post(
      `${API_BASE}/api/products/${productId}/like`,
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error.response?.data || { message: "Failed to toggle like" };
  }
};

export const toggleReviewLike = async (reviewId) => {
  try {
    const response = await axios.post(
      `${API_BASE}/api/reviews/${reviewId}/like`,
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error toggling review like:", error);
    throw error.response?.data || { message: "Failed to toggle review like" };
  }
};

export const toggleSave = async (productId) => {
  try {
    const response = await axios.post(
      `${API_BASE}/api/products/${productId}/save`,
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error toggling save:", error);
    throw error.response?.data || { message: "Failed to toggle save" };
  }
};

export const getLikedProducts = async () => {
  try {
    const response = await axios.get(
      `${API_BASE}/api/user/liked`,
      { withCredentials: true }
    );
    return response.data.likedProducts || [];
  } catch (error) {
    console.error("Error fetching liked products:", error);
    return [];
  }
};

export const getSavedProducts = async () => {
  try {
    const response = await axios.get(
      `${API_BASE}/api/user/saved`,
      { withCredentials: true }
    );
    return response.data.savedProducts || [];
  } catch (error) {
    console.error("Error fetching saved products:", error);
    return [];
  }
};

export const getProductStatus = async (productId) => {
  try {
    const response = await axios.get(
      `${API_BASE}/api/products/${productId}/status`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching product status:", error);
    return { isLiked: false, isSaved: false };
  }
};

