import PocketBase from "pocketbase";

export const CHAT_POCKETBASE_URL =
  import.meta.env.VITE_CHAT_POCKETBASE_URL || "https://3dprintings.xyz/api/chat/";

export const pb = new PocketBase(CHAT_POCKETBASE_URL);

export default pb;
