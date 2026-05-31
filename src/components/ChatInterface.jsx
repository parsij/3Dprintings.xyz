import { useEffect, useRef, useState } from "react";
import pb from "../services/pocketbaseClient.js";

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

function formatMessageTime(created) {
  if (!created) return "";

  const date = new Date(created);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ChatInterface({ conversationId, currentUserId: providedCurrentUserId = "" }) {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [authStoreUserId, setAuthStoreUserId] = useState(getCurrentUserId);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const removeAuthListener = pb.authStore.onChange((_token, model) => {
      setAuthStoreUserId(model?.id || getCurrentUserId());
    }, true);

    return removeAuthListener;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) {
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
        const result = await pb.collection("messages").getList(1, INITIAL_MESSAGE_LIMIT, {
          filter: pb.filter("conversation = {:conversationId}", { conversationId }),
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
          if (event.record?.conversation !== conversationId) return;

          setMessages((currentMessages) => mergeMessages(currentMessages, [event.record]));
        });

        if (!isActive && unsubscribeFromMessages) {
          await unsubscribeFromMessages();
        }
      } catch (subscribeError) {
        if (!isActive) return;
        setError("Realtime chat connection failed. New messages may require a refresh.");
        console.error("Failed to subscribe to chat messages:", subscribeError);
      }
    }

    loadMessagesAndSubscribe();

    return () => {
      isActive = false;

      // PocketBase realtime subscriptions stay open until explicitly removed.
      // Calling the SDK unsubscribe function here prevents duplicate listeners,
      // stale conversation updates, and memory leaks after unmount or prop changes.
      if (unsubscribeFromMessages) {
        unsubscribeFromMessages().catch((unsubscribeError) => {
          console.error("Failed to unsubscribe from chat messages:", unsubscribeError);
        });
      }
    };
  }, [conversationId]);

  const currentUserId = providedCurrentUserId || authStoreUserId;

  async function sendMessage(event) {
    event.preventDefault();

    const trimmedText = messageText.trim();
    const senderId = currentUserId;

    if (!conversationId || !trimmedText || isSending) return;

    if (!senderId) {
      alert("You must be signed in before sending a message.");
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const createdMessage = await pb.collection("messages").create({
        conversation: conversationId,
        senderId,
        text: trimmedText,
      });

      setMessages((currentMessages) => mergeMessages(currentMessages, [createdMessage]));
      setMessageText("");
    } catch (sendError) {
      if (sendError?.status === 403) {
        alert("You are not allowed to send messages in this conversation.");
      } else {
        setError("Unable to send your message. Please try again.");
      }

      console.error("Failed to send chat message:", sendError);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="flex h-[min(720px,calc(100vh-7rem))] min-h-[480px] w-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
      <header className="border-b border-gray-200 bg-gradient-to-r from-gray-950 to-gray-800 px-5 py-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
          Marketplace chat
        </p>
        <h2 className="mt-1 text-xl font-bold">Conversation</h2>
      </header>

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-orange-50/50 to-gray-50 px-4 py-5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="max-w-sm rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-4 text-sm text-gray-500">
              No messages yet. Start the conversation with a clear question or update.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isOwnMessage = message.senderId === currentUserId;

              return (
                <article
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-3xl px-4 py-3 shadow-sm sm:max-w-[68%] ${
                      isOwnMessage
                        ? "rounded-br-md bg-orange-500 text-white"
                        : "rounded-bl-md border border-gray-200 bg-white text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {message.text}
                    </p>
                    <time
                      className={`mt-1 block text-right text-[11px] ${
                        isOwnMessage ? "text-orange-100" : "text-gray-400"
                      }`}
                      dateTime={message.created}
                    >
                      {formatMessageTime(message.created)}
                    </time>
                  </div>
                </article>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error ? (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={sendMessage} className="border-t border-gray-200 bg-white p-3">
        <div className="flex items-end gap-3">
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
            disabled={!conversationId || !currentUserId || isSending}
            rows={1}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || !conversationId || !currentUserId || isSending}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-gray-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSending ? "Sending" : "Send"}
          </button>
        </div>
        <p className="mt-2 text-right text-xs text-gray-400">
          {messageText.length}/{MAX_MESSAGE_LENGTH}
        </p>
      </form>
    </section>
  );
}
