const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const pool = require("../db.cjs");
const { ensureChatConversationContextTable } = require("../apiRoutes/chatConversationsShared.cjs");

async function run() {
  try {
    await ensureChatConversationContextTable(pool);
    console.log("Chat conversation context table ensured.");
  } catch (error) {
    console.error("Chat schema setup failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
