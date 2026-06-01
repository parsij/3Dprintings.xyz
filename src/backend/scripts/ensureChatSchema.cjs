const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const pool = require("../db.cjs");
const { ensureChatConversationContextTable, ensureChatConversationReadsTable, ensureChatOrderContextColumns } = require("../apiRoutes/chatConversationsShared.cjs");

async function run() {
  try {
    await ensureChatConversationContextTable(pool);
    await ensureChatConversationReadsTable(pool);
    await ensureChatOrderContextColumns(pool);
    console.log("Chat conversation context, read-state, and order context columns ensured.");
  } catch (error) {
    console.error("Chat schema setup failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
