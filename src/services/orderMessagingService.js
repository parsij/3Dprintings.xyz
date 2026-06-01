import axios from "axios";
import { API_BASE } from "../config/api.js";
import { applyCsrfInterceptor } from "./csrf.js";

const apiClient = applyCsrfInterceptor(axios.create({
  baseURL: API_BASE,
  withCredentials: true,
}));

export async function fetchOrderMessageTargets(orderId) {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    return [];
  }

  const response = await apiClient.get(`/api/orders/${encodeURIComponent(normalizedOrderId)}/message-targets`);
  return Array.isArray(response.data?.targets) ? response.data.targets : [];
}
