import pb from "./pocketbaseClient.js";

export function getChatCurrentUserId(user) {
  return pb.authStore.model?.id || user?.pocketBaseId || user?.pocketbaseId || (user?.id ? String(user.id) : "");
}

export function getConversationTitle(conversation, currentUserId, mode = "customer") {
  const isSellerView = mode === "seller";
  const otherParticipantId = isSellerView ? conversation?.buyer : conversation?.seller;

  if (!otherParticipantId) return "Conversation";
  if (String(otherParticipantId) === String(currentUserId)) return "Conversation";

  return `${isSellerView ? "Buyer" : "Shop"} ${otherParticipantId}`;
}

export async function listConversationsForUser({ userId, mode = "customer" }) {
  if (!userId) return [];

  const filter =
    mode === "seller"
      ? pb.filter("seller = {:userId}", { userId })
      : pb.filter("buyer = {:userId} || seller = {:userId}", { userId });

  const result = await pb.collection("conversations").getList(1, 100, {
    filter,
    sort: "-updated",
  });

  return result.items;
}

export async function getOrCreateConversationWithSeller({ buyerId, sellerId }) {
  const normalizedBuyerId = String(buyerId || "").trim();
  const normalizedSellerId = String(sellerId || "").trim();

  if (!normalizedBuyerId) {
    throw new Error("Sign in before messaging a shop.");
  }

  if (!normalizedSellerId) {
    throw new Error("This shop is not available for messages yet.");
  }

  if (normalizedBuyerId === normalizedSellerId) {
    throw new Error("You cannot message your own shop.");
  }

  const existing = await pb.collection("conversations").getList(1, 1, {
    filter: pb.filter("buyer = {:buyerId} && seller = {:sellerId}", {
      buyerId: normalizedBuyerId,
      sellerId: normalizedSellerId,
    }),
  });

  if (existing.items.length > 0) {
    return existing.items[0];
  }

  return pb.collection("conversations").create({
    buyer: normalizedBuyerId,
    seller: normalizedSellerId,
  });
}
