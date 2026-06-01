import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import pb from "../../services/pocketbaseClient.js";
import { ensureChatAuthSession } from "../../services/chatAuthService.js";
import {
  getConversationSubtitle,
  getConversationTitle,
} from "../../services/chatService.js";
import {
  formatChatTime,
  formatConversationStartedAt,
  groupMessagesByDay,
} from "../../utils/chatFormatting.js";
import { ChatProductCard, ConversationAvatar } from "./ChatProductCard.jsx";

const INITIAL_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LENGTH = 2000;

function getCurrentUserId() {
  return pb.authStore.model?.id || "";
}

function getCreatedTime(message) {
  const timestamp = new Date(message?.created || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mergeMessages(existingMessages, incomingMessages) {
  const byId = new Map(existingMessages.map((message) => [message.id, message]));

  for (const message of incomingMessages) {
    if (message?.id) {
      byId.set(message.id, message);
    }
  }

  return Array.from(byId.values()).sort((a, b) => getCreatedTime(a) - getCreatedTime(b));
}

function buildProductSnapshot(conversation) {
  if (!conversation?.productId) {
    return null;
  }

  return {
    productId: conversation.productId,
    productName: conversation.productName,
    productImage: conversation.productImage,
    productPrice: conversation.productPrice,
    shopName: conversation.shopName,
    sellerDbId: conversation.sellerDbId,
  };
}

function getMessageProductContext(message, conversation, isFirstMessage) {
  const messageProductId = message?.product_id ?? message?.productId;
  if (messageProductId) {
    return {
      productId: messageProductId,
      productName: message?.product_name ?? message?.productName ?? conversation?.productName,
      productImage: message?.product_image ?? message?.productImage ?? conversation?.productImage,
      productPrice: message?.product_price ?? message?.productPrice ?? conversation?.productPrice,
      shopName: message?.shop_name ?? message?.shopName ?? conversation?.shopName,
      sellerDbId: conversation?.sellerDbId,
    };
  }

  if (isFirstMessage && conversation?.productId) {
    return buildProductSnapshot(conversation);
  }

  return null;
}

async function createChatMessage({ conversationId, senderId, text, productSnapshot }) {
  const basePayload = {
    conversation: conversationId,
    senderId,
    text,
  };

  if (!productSnapshot?.productId) {
    return pb.collection("messages").create(basePayload);
  }

  try {
    return await pb.collection("messages").create({
      ...basePayload,
      product_id: productSnapshot.productId,
      product_name: productSnapshot.productName || "",
      product_image: productSnapshot.productImage || "",
      product_price: productSnapshot.productPrice ?? null,
      shop_name: productSnapshot.shopName || "",
    });
  } catch {
    return pb.collection("messages").create(basePayload);
  }
}

export default function ChatThread({
  conversation,
  conversationId,
  currentUserId: providedCurrentUserId = "",
  mode = "customer",
}) {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [authStoreUserId, setAuthStoreUserId] = useState(getCurrentUserId);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const resolvedConversationId = conversationId || conversation?.id || "";
  const firstMessageId = messages[0]?.id || null;

  useEffect(() => {
    const removeAuthListener = pb.authStore.onChange((_token, model) => {
      setAuthStoreUserId(model?.id || getCurrentUserId());
    }, true);

    return removeAuthListener;
  }, []);

  function scrollToBottom(behavior = "auto") {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }

  useEffect(() => {
    if (isLoading) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToBottom(messages.length > 1 ? "smooth" : "auto");
    });
  }, [messages, isLoading, resolvedConversationId]);

  useEffect(() => {
    if (!resolvedConversationId) {
      setMessages([]);
      setError("Missing conversation.");
      return undefined;
    }

    let isActive = true;
    let unsubscribeFromMessages;

    async function loadMessagesAndSubscribe() {
      setIsLoading(true);
      setError("");
      setMessages([]);

      try {
        await ensureChatAuthSession();
        const result = await pb.collection("messages").getList(1, INITIAL_MESSAGE_LIMIT, {
          filter: pb.filter("conversation = {:conversationId}", { conversationId: resolvedConversationId }),
          sort: "created",
        });

        if (!isActive) return;
        setMessages(result.items);
      } catch (fetchError) {
        if (!isActive || fetchError?.isAbort) return;
        setError("Unable to load messages. Please try again.");
        console.error("Failed to load chat messages:", fetchError);
      } finally {
        if (isActive) setIsLoading(false);
      }

      try {
        unsubscribeFromMessages = await pb.collection("messages").subscribe("*", (event) => {
          if (!isActive || event.action !== "create") return;
          if (event.record?.conversation !== resolvedConversationId) return;

          setMessages((currentMessages) => mergeMessages(currentMessages, [event.record]));
        });
      } catch (subscribeError) {
        if (!isActive) return;
        setError("Live updates paused. Refresh if new messages do not appear.");
        console.error("Failed to subscribe to chat messages:", subscribeError);
      }
    }

    loadMessagesAndSubscribe();

    return () => {
      isActive = false;
      if (unsubscribeFromMessages) {
        unsubscribeFromMessages().catch((unsubscribeError) => {
          console.error("Failed to unsubscribe from chat messages:", unsubscribeError);
        });
      }
    };
  }, [resolvedConversationId]);

  const currentUserId = providedCurrentUserId || authStoreUserId;
  const groupedMessages = groupMessagesByDay(messages);
  const title = getConversationTitle(conversation || {}, mode);
  const subtitle = getConversationSubtitle(conversation || {});
  const startedAtLabel = formatConversationStartedAt(conversation?.created);

  async function sendMessage(event) {
    event.preventDefault();

    const trimmedText = messageText.trim();
    const senderId = currentUserId;

    if (!resolvedConversationId || !trimmedText || isSending) return;

    if (!senderId) {
      setError("Sign in to send messages.");
      return;
    }

    setIsSending(true);
    setError("");

    const isFirstMessage = messages.length === 0;
    const productSnapshot = isFirstMessage ? buildProductSnapshot(conversation) : null;

    try {
      await ensureChatAuthSession();
      const createdMessage = await createChatMessage({
        conversationId: resolvedConversationId,
        senderId,
        text: trimmedText,
        productSnapshot,
      });

      setMessages((currentMessages) => mergeMessages(currentMessages, [createdMessage]));
      setMessageText("");
      requestAnimationFrame(() => scrollToBottom("smooth"));
    } catch (sendError) {
      if (sendError?.status === 403) {
        setError("You are not allowed to send messages in this conversation.");
      } else {
        setError("Unable to send your message. Please try again.");
      }
      console.error("Failed to send chat message:", sendError);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="flex h-[min(760px,calc(100dvh-6rem))] min-h-[520px] w-full flex-col overflow-hidden rounded-[28px] border border-gray-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <header className="border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-5">
        <div className="flex items-start gap-3">
          <ConversationAvatar conversation={conversation || {}} mode={mode} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-gray-900">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-gray-500">
                {conversation?.shopName && mode === "customer" && conversation?.sellerDbId ? (
                  <>
                    by{" "}
                    <Link
                      to={`/shop/${conversation.sellerDbId}`}
                      className="font-medium text-gray-700 transition hover:text-orange-600"
                    >
                      {conversation.shopName}
                    </Link>
                  </>
                ) : (
                  subtitle
                )}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_18%,#f8fafc_100%)] px-3 py-4 sm:px-5"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div className="max-w-sm rounded-3xl border border-dashed border-orange-200 bg-white/90 px-5 py-6 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Start the conversation</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Ask about print options, timing, sizing, or anything related to this listing.
              </p>
              {startedAtLabel ? (
                <p className="mt-3 text-xs text-gray-400">Started {startedAtLabel}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {startedAtLabel ? (
              <div className="flex justify-center pb-1 pt-1">
                <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-medium text-gray-500 shadow-sm ring-1 ring-gray-200/80">
                  Chat started {startedAtLabel}
                </span>
              </div>
            ) : null}
            {groupedMessages.map((entry) => {
              if (entry.type === "day") {
                return (
                  <div key={entry.id} className="flex justify-center py-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 shadow-sm ring-1 ring-gray-200/80">
                      {entry.label}
                    </span>
                  </div>
                );
              }

              const message = entry.message;
              const isOwnMessage = message.senderId === currentUserId;
              const isFirstMessage = message.id === firstMessageId;
              const productContext = getMessageProductContext(message, conversation, isFirstMessage);

              return (
                <article
                  key={entry.id}
                  className={`flex flex-col gap-2 ${isOwnMessage ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-[22px] px-4 py-3 shadow-sm sm:max-w-[72%] ${
                      isOwnMessage
                        ? "rounded-br-md bg-gray-950 text-white"
                        : "rounded-bl-md border border-gray-200 bg-white text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {message.text}
                    </p>
                    <time
                      className={`mt-1 block text-right text-[11px] ${
                        isOwnMessage ? "text-gray-300" : "text-gray-400"
                      }`}
                      dateTime={message.created}
                    >
                      {formatChatTime(message.created)}
                    </time>
                  </div>
                  {productContext ? (
                    <div className={`max-w-[88%] sm:max-w-[72%] ${isOwnMessage ? "pr-1" : "pl-1"}`}>
                      <ChatProductCard conversation={productContext} compact />
                    </div>
                  ) : null}
                </article>
              );
            })}
            <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden="true" />
          </div>
        )}
      </div>

      {error ? (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={sendMessage} className="border-t border-gray-100 bg-white p-3 sm:p-4">
        <div className="flex items-end gap-2 sm:gap-3">
          <label htmlFor="chat-message" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-message"
            value={messageText}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setMessageText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(event);
              }
            }}
            placeholder={currentUserId ? "Write a message..." : "Sign in to send messages"}
            disabled={!resolvedConversationId || !currentUserId || isSending}
            rows={1}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || !resolvedConversationId || !currentUserId || isSending}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300 sm:px-5"
          >
            {isSending ? "..." : "Send"}
          </button>
        </div>
        <p className="mt-2 text-right text-xs text-gray-400">
          {messageText.length}/{MAX_MESSAGE_LENGTH}
        </p>
      </form>
    </section>
  );
}
