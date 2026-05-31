import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ChatInterface from "../components/ChatInterface.jsx";
import Navbar from "../components/NavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import SellerNavBar from "../seller/components/SellerNavBar.jsx";
import {
  getChatCurrentUserId,
  getConversationTitle,
  listConversationsForUser,
} from "../services/chatService.js";
import pb from "../services/pocketbaseClient.js";

export default function Messages({ user, mode = "customer" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authStoreUserId, setAuthStoreUserId] = useState(() => pb.authStore.model?.id || "");
  const currentUserId = authStoreUserId || getChatCurrentUserId(user);
  const selectedConversationId = searchParams.get("conversation") || "";
  const isSellerMode = mode === "seller";

  useEffect(() => {
    return pb.authStore.onChange((_token, model) => {
      setAuthStoreUserId(model?.id || "");
    }, true);
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setConversations([]);
      setLoading(false);
      setError("Chat is not ready for this account.");
      return undefined;
    }

    let active = true;
    let unsubscribeFromConversations;
    let unsubscribeFromMessages;

    async function loadConversations() {
      setLoading(true);
      setError("");

      try {
        const items = await listConversationsForUser({ userId: currentUserId, mode });
        if (!active) return;
        setConversations(items);

        if (!selectedConversationId && items[0]?.id) {
          setSearchParams({ conversation: items[0].id }, { replace: true });
        }
      } catch (loadError) {
        if (!active || loadError?.isAbort) return;
        setError("Unable to load messages.");
        console.error("Failed to load conversations:", loadError);
      } finally {
        if (active) setLoading(false);
      }
    }

    async function subscribeToConversations() {
      try {
        unsubscribeFromConversations = await pb.collection("conversations").subscribe("*", (event) => {
          const record = event.record;
          const belongsToUser =
            String(record?.buyer || "") === String(currentUserId) ||
            String(record?.seller || "") === String(currentUserId);

          if (!active || !belongsToUser) return;

          setConversations((current) => {
            if (event.action === "delete") {
              return current.filter((conversation) => conversation.id !== record.id);
            }

            const next = new Map(current.map((conversation) => [conversation.id, conversation]));
            next.set(record.id, record);
            return Array.from(next.values()).sort((left, right) =>
              String(right.updated || "").localeCompare(String(left.updated || ""))
            );
          });
        });

        if (!active && unsubscribeFromConversations) {
          await unsubscribeFromConversations();
        }
      } catch (subscribeError) {
        if (!active) return;
        console.error("Failed to subscribe to conversations:", subscribeError);
      }
    }

    async function subscribeToMessages() {
      try {
        unsubscribeFromMessages = await pb.collection("messages").subscribe("*", (event) => {
          if (!active || event.action !== "create") return;

          const conversationId = event.record?.conversation;
          if (!conversationId) return;

          setConversations((current) => {
            if (!current.some((conversation) => conversation.id === conversationId)) {
              return current;
            }

            return current
              .map((conversation) =>
                conversation.id === conversationId
                  ? { ...conversation, updated: event.record.created || conversation.updated }
                  : conversation
              )
              .sort((left, right) =>
                String(right.updated || "").localeCompare(String(left.updated || ""))
              );
          });
        });

        if (!active && unsubscribeFromMessages) {
          await unsubscribeFromMessages();
        }
      } catch (subscribeError) {
        if (!active) return;
        console.error("Failed to subscribe to inbox messages:", subscribeError);
      }
    }

    loadConversations();
    subscribeToConversations();
    subscribeToMessages();

    return () => {
      active = false;
      if (unsubscribeFromConversations) {
        unsubscribeFromConversations().catch((unsubscribeError) => {
          console.error("Failed to unsubscribe from conversations:", unsubscribeError);
        });
      }
      if (unsubscribeFromMessages) {
        unsubscribeFromMessages().catch((unsubscribeError) => {
          console.error("Failed to unsubscribe from inbox messages:", unsubscribeError);
        });
      }
    };
  }, [currentUserId, mode, selectedConversationId, setSearchParams]);

  const pageContent = (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 lg:px-[5vw]">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
          {isSellerMode ? "Seller messages" : "Messages"}
        </p>
        <h1 className="mt-2 text-3xl font-black text-gray-900">Conversations</h1>
      </div>

      {!currentUserId ? (
        <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
          <p className="text-gray-700">
            Sign in to your chat account before viewing messages.
          </p>
          {!user ? (
            <Link
              to="/signin"
              className="mt-4 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="font-bold text-gray-900">Inbox</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              </div>
            ) : error ? (
              <p className="p-4 text-sm text-red-600">{error}</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">
                No conversations yet.
              </p>
            ) : (
              <div className="max-h-[640px] overflow-y-auto">
                {conversations.map((conversation) => {
                  const active = conversation.id === selectedConversationId;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSearchParams({ conversation: conversation.id })}
                      className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition ${
                        active ? "bg-orange-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="block font-semibold text-gray-900">
                        {getConversationTitle(conversation, currentUserId, mode)}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        {conversation.updated
                          ? new Date(conversation.updated).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "New conversation"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {selectedConversationId ? (
            <ChatInterface conversationId={selectedConversationId} currentUserId={currentUserId} />
          ) : (
            <section className="flex min-h-[480px] items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              Select a conversation to view or send messages.
            </section>
          )}
        </div>
      )}
    </main>
  );

  if (isSellerMode) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <SellerNavBar pageName="Messages" />
        <SideMenu role="seller" title="Seller Options" />
        {pageContent}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar isSignedIn={!!user} />
      {pageContent}
    </div>
  );
}
