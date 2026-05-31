const { ensureChatUserForDbUser } = require("./chatShared.cjs");

module.exports = function chatRoutes(deps) {
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
};
