import axios from "axios";

import { API_BASE } from "../config/api.js";
import { applyCsrfInterceptor } from "./csrf.js";
import { ensureChatAuthSession } from "./chatAuthService.js";
import pb from "./pocketbaseClient.js";

const apiClient = applyCsrfInterceptor(axios.create({
  baseURL: API_BASE,
  withCredentials: true,
}));

export function getChatCurrentUserId(user) {
  return pb.authStore.model?.id || user?.pocketBaseId || user?.pocketbaseId || "";
}

export function conversationBelongsToMode(conversation, userPbId, mode = "customer") {
  if (!conversation || !userPbId) {
    return false;
  }

  if (mode === "seller") {
    return String(conversation.seller || "") === String(userPbId);
  }

  return String(conversation.buyer || "") === String(userPbId);
}

export function getConversationTitle(conversation, mode = "customer") {
  if (conversation?.title) {
    return conversation.title;
  }

  const isSellerView = mode === "seller";
  return isSellerView ? "Buyer inquiry" : "Shop conversation";
}

export function getConversationSubtitle(conversation) {
  if (conversation?.subtitle) {
    return conversation.subtitle;
  }

  if (conversation?.contextType === "product" && conversation?.shopName) {
    return `${conversation.shopName} shop`;
  }

  return conversation?.shopName ? `${conversation.shopName} shop` : "Marketplace chat";
}

export async function listConversationsForUser({ mode = "customer" }) {
  await ensureChatAuthSession();

  const response = await apiClient.get("/api/messages/conversations", {
    params: { mode },
  });

  return Array.isArray(response.data?.conversations) ? response.data.conversations : [];
}

export async function startConversationWithSeller({
  sellerDbId,
  productId = null,
  contextType = "shop",
  productName = "",
  productImage = "",
  shopName = "",
}) {
  await ensureChatAuthSession();

  const response = await apiClient.post("/api/messages/conversations/start", {
    sellerDbId: Number(sellerDbId),
    productId: productId ? Number(productId) : null,
    contextType,
    productName,
    productImage,
    shopName,
  });

  return response.data;
}

export async function getOrCreateConversationWithSeller({
  sellerDbId,
  sellerId,
  productId,
  contextType = "shop",
  productName = "",
  productImage = "",
  shopName = "",
}) {
  const resolvedSellerDbId = Number(sellerDbId || sellerId);
  if (!Number.isInteger(resolvedSellerDbId) || resolvedSellerDbId <= 0) {
    throw new Error("This shop is not available for messages yet.");
  }

  return startConversationWithSeller({
    sellerDbId: resolvedSellerDbId,
    productId,
    contextType,
    productName,
    productImage,
    shopName,
  });
}
