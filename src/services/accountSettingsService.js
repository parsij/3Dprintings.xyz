import axios from "axios";

const API_BASE = "http://localhost:3000";

export async function updateAccountProfile({ username, email, phone_number }) {
  try {
    const response = await axios.put(
      `${API_BASE}/api/account/profile`,
      {
        username: username.trim(),
        email: email.trim(),
        phone_number: phone_number ? phone_number.trim() : null,
      },
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Could not update your profile right now. Please try again.";
    throw new Error(message);
  }
}

export async function changeAccountPassword({ oldPassword, newPassword }) {
  try {
    const response = await axios.put(
      `${API_BASE}/api/account/password`,
      {
        oldPassword,
        newPassword,
      },
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Could not change your password right now. Please try again.";
    throw new Error(message);
  }
}

export async function signOutAccount() {
  try {
    const response = await axios.post(
      `${API_BASE}/api/signout`,
      {},
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Could not sign you out right now. Please try again.";
    throw new Error(message);
  }
}

export async function getAccountAddress() {
  try {
    const response = await axios.get(`${API_BASE}/api/account/address`, {
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Could not load your address right now. Please try again.";
    throw new Error(message);
  }
}

export async function updateAccountAddress(address) {
  try {
    const response = await axios.put(`${API_BASE}/api/account/address`, address, {
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Could not update your address right now. Please try again.";
    throw new Error(message);
  }
}

export async function suggestAccountAddress(query, { limit = 5, signal } = {}) {
  try {
    const response = await axios.get(`${API_BASE}/api/address/autocomplete`, {
      params: { q: query, limit },
      withCredentials: true,
      signal,
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Could not suggest an address right now. Please try again.";
    throw new Error(message);
  }
}
