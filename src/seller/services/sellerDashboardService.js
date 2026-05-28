import axios from "axios";

import { API_BASE } from "../../config/api.js";

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