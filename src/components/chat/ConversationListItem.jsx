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

  return (
    <button
      type="button"
      onClick={() => onSelect?.(conversation.id)}
      className={`w-full border-b border-gray-100 px-4 py-3 text-left transition ${
        active
          ? "bg-orange-50/90 shadow-[inset_3px_0_0_0_rgb(249,115,22)]"
          : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <ConversationAvatar conversation={conversation} mode={mode} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
              <p className="truncate text-xs text-gray-500">{subtitle}</p>
            </div>
            <time className="shrink-0 text-[11px] font-medium text-gray-400">
              {formatConversationListTime(conversation.updated || conversation.created)}
            </time>
          </div>

        </div>
      </div>
    </button>
  );
}
