import {
  ConversationAvatar,
} from "./ChatProductCard.jsx";
import {
  getConversationSubtitle,
  getConversationTitle,
} from "../../services/chatService.js";
import { formatConversationListTime } from "../../utils/chatFormatting.js";

export default function ConversationListItem({
  conversation,
  active = false,
  mode = "customer",
  onSelect,
}) {
  const title = getConversationTitle(conversation, mode);
  const subtitle = getConversationSubtitle(conversation);
  const unreadCount = Number(conversation?.unreadCount) || 0;
  const hasUnread = unreadCount > 0;
  const lastActivityAt = conversation?.lastMessageAt || conversation?.updated || conversation?.created;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(conversation.id)}
      className={`flex w-full border-b border-gray-100 text-left transition ${
        active ? "bg-gray-100/90" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3">
        <ConversationAvatar conversation={conversation} mode={mode} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
          {subtitle ? (
            <p className="truncate text-xs text-gray-500">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div
        className={`flex shrink-0 flex-col items-end justify-center gap-1 self-stretch px-3 py-3 ${
          hasUnread ? "bg-red-500 text-white" : "bg-transparent"
        }`}
      >
        {hasUnread ? (
          <span className="min-w-[1.25rem] rounded-full bg-white/15 px-2 py-0.5 text-center text-[11px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
        <time
          className={`text-[11px] font-medium ${hasUnread ? "text-white/90" : "text-gray-400"}`}
          dateTime={lastActivityAt}
        >
          {formatConversationListTime(lastActivityAt)}
        </time>
      </div>
    </button>
  );
}
