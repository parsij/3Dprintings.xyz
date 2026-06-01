const { ensureChatUserForDbUser } = require("./chatShared.cjs");
const {
  ensureChatConversationContextTable,
  ensureChatConversationReadsTable,
  ensureChatOrderContextColumns,
  listConversationsForAccount,
  markConversationRead,
  startConversation,
  startOrderConversation,
  loadSellerProfiles,
} = require("./chatConversationsShared.cjs");

function chatRoutes(deps) {
  const { app, pool, getAuthUserFromRequest } = deps;

  app.post("/api/messages/session", async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser?.id) {
        return res.status(401).json({ message: "Sign in before starting chat." });
      }

      const userResult = await pool.query(
        `SELECT id, email, username, pocketbase_id
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: "Sign in before starting chat." });
      }

      const session = await ensureChatUserForDbUser(pool, userResult.rows[0]);

      return res.json({
        token: session.token,
        record: session.record,
        pocketbaseId: session.pocketbaseId,
      });
    } catch (error) {
      console.error("Chat session error:", error?.message || error);
      return res.status(500).json({ message: "Unable to start chat for this account right now." });
    }
  });

  app.get("/api/messages/conversations", async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser?.id) {
        return res.status(401).json({ message: "Sign in before viewing messages." });
      }

      const userResult = await pool.query(
        `SELECT id, email, username, pocketbase_id
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: "Sign in before viewing messages." });
      }

      const mode = String(req.query.mode || "customer").trim().toLowerCase() === "seller"
        ? "seller"
        : "customer";

      const conversations = await listConversationsForAccount(pool, userResult.rows[0], mode);

      return res.json({ conversations });
    } catch (error) {
      console.error("Chat conversations list error:", error?.message || error);
      return res.status(500).json({ message: "Unable to load conversations right now." });
    }
  });

  app.post("/api/messages/conversations/:conversationId/read", async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser?.id) {
        return res.status(401).json({ message: "Sign in before viewing messages." });
      }

      const conversationId = String(req.params.conversationId || "").trim();
      if (!conversationId) {
        return res.status(400).json({ message: "Missing conversation." });
      }

      const userResult = await pool.query(
        `SELECT id, email, username, pocketbase_id
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: "Sign in before viewing messages." });
      }

      const session = await ensureChatUserForDbUser(pool, userResult.rows[0]);

      await markConversationRead(pool, {
        conversationId,
        userDbId: authUser.id,
        userPbId: session.pocketbaseId,
        token: session.token,
      });

      return res.json({ ok: true });
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 500;
      if (statusCode >= 500) {
        console.error("Chat conversation read error:", error?.message || error);
      }
      return res.status(statusCode).json({
        message: statusCode === 404
          ? "Conversation not found."
          : "Unable to update read status right now.",
      });
    }
  });

  app.get("/api/orders/:orderId/message-targets", async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser?.id) {
        return res.status(401).json({ message: "Sign in before viewing order messages." });
      }

      const orderId = String(req.params.orderId || "").trim();
      if (!UUID_REGEX.test(orderId)) {
        return res.status(400).json({ message: "Invalid order id." });
      }

      const orderResult = await pool.query(
        `SELECT id, customer_id, tracking, items
         FROM orders
         WHERE id = $1
           AND customer_id = $2
         LIMIT 1`,
        [orderId, authUser.id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ message: "Order not found." });
      }

      const orderRow = orderResult.rows[0];
      const sellerIds = collectOrderSellerIds(orderRow);
      const profiles = await loadSellerProfiles(pool, sellerIds);
      const targets = sellerIds.map((sellerDbId) => {
        const profile = profiles.get(Number(sellerDbId));
        return {
          sellerDbId,
          sellerName: profile?.shopName || "Seller",
          trackingCode: getTrackingCodeForSeller(orderRow.tracking, sellerDbId),
        };
      });

      return res.json({ targets });
    } catch (error) {
      console.error("Order message targets error:", error?.message || error);
      return res.status(500).json({ message: "Unable to load order message targets right now." });
    }
  });

  app.post("/api/messages/conversations/start", async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser?.id) {
        return res.status(401).json({ message: "Sign in before messaging a shop." });
      }

      const userResult = await pool.query(
        `SELECT id, email, username, pocketbase_id
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: "Sign in before messaging a shop." });
      }

      const {
        sellerDbId,
        productId,
        contextType,
        productName,
        productImage,
        shopName,
        orderId,
      } = req.body || {};

      const result = orderId
        ? await startOrderConversation(pool, {
          buyerUser: userResult.rows[0],
          sellerDbId,
          orderId,
        })
        : await startConversation(pool, {
          buyerUser: userResult.rows[0],
          sellerDbId,
          productId,
          contextType,
          productName,
          productImage,
          shopName,
        });

      return res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 500;
      if (statusCode >= 500) {
        console.error("Chat conversation start error:", error?.message || error);
      }
      return res.status(statusCode).json({
        message: error?.message || "Unable to start this conversation.",
      });
    }
  });
};

chatRoutes.ensureChatConversationContextTable = ensureChatConversationContextTable;
chatRoutes.ensureChatConversationReadsTable = ensureChatConversationReadsTable;
chatRoutes.ensureChatOrderContextColumns = ensureChatOrderContextColumns;

module.exports = chatRoutes;
