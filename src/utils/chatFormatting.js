export function formatChatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatConversationListTime(value) {
  if (!value) return "New";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "New";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();

  if (sameDay) {
    return formatChatTime(value);
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function formatConversationStartedAt(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMessageDayLabel(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday - startOfDate) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function groupMessagesByDay(messages) {
  const groups = [];
  let currentDay = null;

  for (const message of messages) {
    const dayKey = String(message?.created || "").slice(0, 10);
    if (dayKey !== currentDay) {
      currentDay = dayKey;
      groups.push({
        type: "day",
        id: `day-${dayKey || groups.length}`,
        label: formatMessageDayLabel(message?.created),
        created: message?.created,
      });
    }

    groups.push({
      type: "message",
      id: message.id,
      message,
    });
  }

  return groups;
}

export function buildProductImageUrl(imagePath, apiBase = "") {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith("/")) return `${apiBase}${imagePath}`;
  return `${apiBase}/api/imgUploads/${String(imagePath).replace(/^\/+/, "")}`;
}

export function formatProductPrice(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(2);
}
