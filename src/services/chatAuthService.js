import axios from "axios";
import pb from "./pocketbaseClient.js";
import { API_BASE } from "../config/api.js";

let sessionPromise = null;

export async function ensureChatAuthSession() {
  if (pb.authStore.isValid && pb.authStore.model?.id) {
    return pb.authStore.model;
  }

  if (!sessionPromise) {
    sessionPromise = axios
      .post(`${API_BASE}/api/chat/session`, {}, { withCredentials: true })
      .then((response) => {
        const { token, record } = response.data || {};
        if (!token || !record?.id) {
          throw new Error("Chat session response was incomplete.");
        }

        pb.authStore.save(token, record);
        return record;
      })
      .finally(() => {
        sessionPromise = null;
      });
  }

  return sessionPromise;
}

export function clearChatAuthSession() {
  sessionPromise = null;
  pb.authStore.clear();
}
