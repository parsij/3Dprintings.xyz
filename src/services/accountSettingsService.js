import axios from "axios";
import { applyCsrfInterceptor, ensureCsrfToken } from "./csrf.js";
import { API_BASE } from "../config/api.js";
import { getUserFacingError } from "../utils/userFacingError.js";

const apiClient = applyCsrfInterceptor(axios.create({
  withCredentials: true,
}));

export async function updateAccountProfile({ username, email, phone_number }) {
  try {
    const response = await apiClient.put(`${API_BASE}/api/account/profile`, {
      username: username.trim(),
      email: email.trim(),
      phone_number: phone_number ? phone_number.trim() : null,
    });

    return response.data;
  } catch (error) {
    throw new Error(getUserFacingError(error, "Could not update your profile right now. Please try again."));
  }
}

export async function changeAccountPassword({ oldPassword, newPassword }) {
  try {
    const response = await apiClient.put(`${API_BASE}/api/account/password`, {
      oldPassword,
      newPassword,
    });

    return response.data;
  } catch (error) {
    throw new Error(getUserFacingError(error, "Could not change your password right now. Please try again."));
  }
}

export async function signOutAccount() {
  try {
    await ensureCsrfToken(API_BASE);
    const response = await apiClient.post(`${API_BASE}/api/signout`, {});

    if (response.data?.message !== "Signed out") {
      throw new Error(getUserFacingError(null, "Sign out did not complete."));
    }

    return response.data;
  } catch (error) {
    throw new Error(getUserFacingError(error, "Could not sign you out right now. Please try again."));
  }
}

export async function getAccountAddress() {
  try {
    const response = await apiClient.get(`${API_BASE}/api/account/address`);

    return response.data;
  } catch (error) {
    throw new Error(getUserFacingError(error, "Could not load your address right now. Please try again."));
  }
}

export async function updateAccountAddress(address) {
  try {
    const response = await apiClient.put(`${API_BASE}/api/account/address`, address);

    return response.data;
  } catch (error) {
    throw new Error(getUserFacingError(error, "Could not update your address right now. Please try again."));
  }
}

export async function suggestAccountAddress(query, { limit = 5, signal } = {}) {
  try {
    const response = await apiClient.get(`${API_BASE}/api/address/autocomplete`, {
      params: { q: query, limit },
      signal,
    });
    return response.data;
  } catch (error) {
    throw new Error(getUserFacingError(error, "Could not suggest an address right now. Please try again."));
  }
}
