import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function getSellerDashboard() {
  const response = await axios.get(`${API_BASE}/api/seller/dashboard`, {
    withCredentials: true,
  });
  return response.data;
}

export async function refreshSellerDashboard() {
  const response = await axios.post(`${API_BASE}/api/seller/dashboard/refresh`, {}, {
    withCredentials: true,
  });
  return response.data;
}