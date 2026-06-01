import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startOrderConversation } from "../services/chatService.js";
import { ensureChatAuthSession } from "../services/chatAuthService.js";

export default function MessageSellerOrderButton({
  sellerDbId,
  orderId,
  user,
  className = "",
  label = "Message seller",
}) {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);

  async function handleClick() {
    if (!user) {
      navigate("/signin");
      return;
    }

    const parsedSellerDbId = Number(sellerDbId);
    const normalizedOrderId = String(orderId || "").trim();

    if (!Number.isInteger(parsedSellerDbId) || parsedSellerDbId <= 0 || !normalizedOrderId) {
      return;
    }

    setIsStarting(true);
    try {
      await ensureChatAuthSession();
      const result = await startOrderConversation({
        sellerDbId: parsedSellerDbId,
        orderId: normalizedOrderId,
      });

      navigate(`/messages?conversation=${encodeURIComponent(result.conversationId)}`);
    } catch (error) {
      const status = error?.response?.status || error?.status;
      if (status === 403) {
        alert("You are not allowed to start this conversation.");
      } else {
        alert(error?.response?.data?.message || error?.message || "Unable to start this conversation.");
      }
      console.error("Failed to start order conversation:", error);
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isStarting || !sellerDbId || !orderId}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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
      <span>{isStarting ? "Opening..." : label}</span>
    </button>
  );
}
