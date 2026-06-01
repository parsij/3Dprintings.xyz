import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ConversationListItem from "../components/chat/ConversationListItem.jsx";
import ChatThread from "../components/chat/ChatThread.jsx";
import Navbar from "../components/NavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import SellerNavBar from "../seller/components/SellerNavBar.jsx";
import {
  conversationBelongsToMode,
  getChatCurrentUserId,
  listConversationsForUser,
} from "../services/chatService.js";
import { ensureChatAuthSession } from "../services/chatAuthService.js";
import pb from "../services/pocketbaseClient.js";

export default function Messages({ user, mode = "customer" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authStoreUserId, setAuthStoreUserId] = useState(() => pb.authStore.model?.id || "");
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const currentUserId = authStoreUserId || getChatCurrentUserId(user);
  const selectedConversationId = searchParams.get("conversation") || "";
  const isSellerMode = mode === "seller";

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    return pb.authStore.onChange((_token, model) => {
      setAuthStoreUserId(model?.id || "");
    }, true);
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      setMobileShowThread(true);
    }
  }, [selectedConversationId]);

  const refreshConversations = useCallback(async () => {
    const items = await listConversationsForUser({ mode });
    setConversations(items);
    return items;
  }, [mode]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      setError("Sign in to view your messages.");
      return undefined;
    }

    let active = true;
    let unsubscribeFromConversations;
    let unsubscribeFromMessages;

    async function initializeInbox() {
      setLoading(true);
      setError("");

      try {
        await ensureChatAuthSession();
        const resolvedUserId = pb.authStore.model?.id || getChatCurrentUserId(user);
        if (!resolvedUserId) {
          if (!active) return;
          setError("Chat is not ready for this account.");
          setConversations([]);
          return;
        }

        setAuthStoreUserId(resolvedUserId);
        const items = await refreshConversations();
        if (!active) return;

        const currentConversationId = new URLSearchParams(window.location.search).get("conversation") || "";
        if (!currentConversationId && items[0]?.id) {
          setSearchParams({ conversation: items[0].id }, { replace: true });
        }

        unsubscribeFromConversations = await pb.collection("conversations").subscribe("*", (event) => {
          const record = event.record;
          if (!active || !conversationBelongsToMode(record, resolvedUserId, mode)) {
            return;
          }

          void refreshConversations();
        });

        unsubscribeFromMessages = await pb.collection("messages").subscribe("*", (event) => {
          if (!active || event.action !== "create") return;
          void refreshConversations();
        });
      } catch (loadError) {
        if (!active || loadError?.isAbort) return;
        setError("Unable to load messages.");
        console.error("Failed to load conversations:", loadError);
      } finally {
        if (active) setLoading(false);
      }
    }

    initializeInbox();

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
  }, [user, mode, refreshConversations, setSearchParams]);

  function handleSelectConversation(conversationId) {
    setSearchParams({ conversation: conversationId });
    setMobileShowThread(true);
  }

  function handleBackToInbox() {
    setMobileShowThread(false);
  }

  const pageContent = (
    <main className="mx-auto max-w-7xl px-3 pb-8 pt-20 sm:px-4 lg:px-[5vw] lg:pt-24">
      <div className="mb-5 sm:mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600 sm:text-sm">
          {isSellerMode ? "Seller inbox" : "Messages"}
        </p>
        <h1 className="mt-2 text-2xl font-black text-gray-900 sm:text-3xl">
          {isSellerMode ? "Customer conversations" : "Your conversations"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          {isSellerMode
            ? "Only buyers who contacted your shop appear here."
            : "Only your buyer conversations with shops appear here."}
        </p>
      </div>

      {!user || !currentUserId ? (
        <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm">
          <p className="text-gray-700">Sign in to your account before viewing messages.</p>
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
        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-5">
          <aside
            className={`overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)] ${
              mobileShowThread ? "hidden lg:block" : "block"
            }`}
          >
            <div className="border-b border-gray-100 px-4 py-4">
              <h2 className="font-bold text-gray-900">Inbox</h2>
              <p className="mt-1 text-xs text-gray-500">
                {isSellerMode ? "Buyer inquiries" : "Shops you contacted"}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              </div>
            ) : error ? (
              <p className="p-4 text-sm text-red-600">{error}</p>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                No conversations yet. Message a shop from a product or shop page to start chatting.
              </div>
            ) : (
              <div className="max-h-[min(720px,calc(100dvh-12rem))] overflow-y-auto">
                {conversations.map((conversation) => (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === selectedConversationId}
                    mode={mode}
                    onSelect={handleSelectConversation}
                  />
                ))}
              </div>
            )}
          </aside>

          <div className={`${mobileShowThread ? "block" : "hidden lg:block"}`}>
            {selectedConversationId && selectedConversation ? (
              <div>
                <button
                  type="button"
                  onClick={handleBackToInbox}
                  className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 lg:hidden"
                >
                  ← Back to inbox
                </button>
                <ChatThread
                  conversation={selectedConversation}
                  conversationId={selectedConversationId}
                  currentUserId={currentUserId}
                  mode={mode}
                />
              </div>
            ) : (
              <section className="flex min-h-[520px] items-center justify-center rounded-[28px] border border-dashed border-gray-300 bg-white/80 p-8 text-center text-gray-500 shadow-sm">
                Select a conversation to view messages.
              </section>
            )}
          </div>
        </div>
      )}
    </main>
  );

  if (isSellerMode) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_28%)] text-gray-900">
        <SellerNavBar pageName="Messages" />
        <SideMenu role="seller" title="Seller Options" />
        {pageContent}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_28%)]">
      <Navbar isSignedIn={!!user} />
      {pageContent}
    </div>
  );
}
