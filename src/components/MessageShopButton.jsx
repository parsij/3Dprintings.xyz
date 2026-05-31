import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getChatCurrentUserId, getOrCreateConversationWithSeller } from "../services/chatService.js";

export default function MessageShopButton({
  sellerId,
  user,
  className = "",
  label = "Message",
  iconOnly = false,
}) {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);

  async function handleMessageShop() {
    if (!user) {
      navigate("/signin");
      return;
    }

    const buyerId = getChatCurrentUserId(user);

    setIsStarting(true);
    try {
      const conversation = await getOrCreateConversationWithSeller({
        buyerId,
        sellerId,
      });

      navigate(`/messages?conversation=${encodeURIComponent(conversation.id)}`);
    } catch (error) {
      const status = error?.status;
      if (status === 403) {
        alert("You are not allowed to start a conversation with this shop.");
      } else {
        alert(error?.message || "Unable to start this conversation.");
      }
      console.error("Failed to start shop conversation:", error);
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleMessageShop}
      disabled={isStarting || !sellerId}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      aria-label="Message shop"
      title="Message shop"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4.75 5.75A3 3 0 0 1 7.75 2.75h8.5a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3H10l-4.25 4v-4.18a3 3 0 0 1-1-2.23V5.75Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.25 8.25h7.5M8.25 11.25h4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {iconOnly ? null : <span>{isStarting ? "Opening..." : label}</span>}
    </button>
  );
}
