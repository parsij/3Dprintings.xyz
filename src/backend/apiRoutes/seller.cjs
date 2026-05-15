const { refreshSellerDashboard } = require("./sellerShared.cjs");

module.exports = function sellerRoutes(deps) {
  const { app, pool, getAuthUserFromRequest } = deps;

  const attachAuthenticatedUser = async (req, res, next) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser?.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }

      const userResult = await pool.query(
        "SELECT id, username, email, COALESCE(role, 'customer') AS role FROM users WHERE id = $1",
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: "User not authenticated." });
      }

      req.user = {
        id: Number(userResult.rows[0].id),
        username: userResult.rows[0].username,
        email: userResult.rows[0].email,
        role: userResult.rows[0].role,
      };
      return next();
    } catch (error) {
      console.error("Failed to attach authenticated user:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };

  const isSeller = (req, res, next) => {
    if (req.user && req.user.role === "seller") {
      return next();
    }
    return res.status(403).json({ message: "Access denied. Sellers only." });
  };

  app.post("/api/seller/become", attachAuthenticatedUser, async (req, res) => {
    try {
      if (req.user.role === "seller") {
        return res.status(200).json({
          message: "You already have seller access.",
          user: { ...req.user, role: "seller" },
        });
      }

      const updatedUserResult = await pool.query(
        `UPDATE users
         SET role = 'seller'
         WHERE id = $1
         RETURNING id, username, email, role`,
        [req.user.id]
      );

      if (updatedUserResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const updatedUser = updatedUserResult.rows[0];
      return res.status(200).json({
        message: "Seller access granted.",
        user: {
          id: Number(updatedUser.id),
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      console.error("Failed to promote user to seller:", error);
      return res.status(500).json({ message: "Failed to grant seller access." });
    }
  });

  app.get("/api/seller/dashboard", attachAuthenticatedUser, isSeller, async (req, res) => {
    try {
      const snapshot = await refreshSellerDashboard(pool, req.user.id);
      return res.status(200).json({
        metrics: snapshot.metrics,
        salesData: snapshot.dailySales,
        products: snapshot.topProducts,
        revenueData: snapshot.monthlyRevenue,
        averageScore: snapshot.averageRating,
        totals: {
          lifetimeRevenue: snapshot.lifetimeRevenue,
          lifetimeUnitsSold: snapshot.lifetimeUnitsSold,
          lifetimeOrders: snapshot.lifetimeOrders,
          totalReviews: snapshot.totalReviews,
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error loading seller dashboard:", error);
      return res.status(500).json({ message: "Failed to load seller dashboard." });
    }
  });

  app.post("/api/seller/dashboard/refresh", attachAuthenticatedUser, isSeller, async (req, res) => {
    try {
      const snapshot = await refreshSellerDashboard(pool, req.user.id);
      return res.status(200).json({
        message: "Seller dashboard metrics refreshed.",
        updatedAt: new Date().toISOString(),
        totals: {
          lifetimeRevenue: snapshot.lifetimeRevenue,
          lifetimeUnitsSold: snapshot.lifetimeUnitsSold,
          lifetimeOrders: snapshot.lifetimeOrders,
          totalReviews: snapshot.totalReviews,
        },
      });
    } catch (error) {
      console.error("Error refreshing seller dashboard:", error);
      return res.status(500).json({ message: "Failed to refresh seller dashboard." });
    }
  });

  app.get("/api/seller/orders", attachAuthenticatedUser, isSeller, async (req, res) => {
    try {
      const sellerId = req.user.id;
      const requestedStatus = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "";
      const allowedStatuses = new Set(["pending", "completed", "cancelled"]);
      const statusFilter = allowedStatuses.has(requestedStatus) ? requestedStatus : null;

      const ordersResult = await pool.query(
        `
          WITH expanded_items AS (
            SELECT
              o.id AS order_id,
              o.customer_id,
              o.status,
              o.total_amount,
              o.created_at,
              o.updated_at,
              item,
              CASE
                WHEN COALESCE(item->>'id', '') ~ '^\\d+$' THEN (item->>'id')::int
                WHEN COALESCE(item->>'productId', '') ~ '^\\d+$' THEN (item->>'productId')::int
                ELSE NULL
              END AS product_id,
              CASE
                WHEN COALESCE(item->>'quantity', '') ~ '^\\d+$' THEN (item->>'quantity')::int
                ELSE 0
              END AS quantity,
              CASE
                WHEN COALESCE(item->>'current_price', '') ~ '^\\d+(\\.\\d+)?$' THEN (item->>'current_price')::numeric
                WHEN COALESCE(item->>'price', '') ~ '^\\d+(\\.\\d+)?$' THEN (item->>'price')::numeric
                ELSE NULL
              END AS unit_price
            FROM orders o
            JOIN LATERAL jsonb_array_elements(COALESCE(o.items->'items', '[]'::jsonb)) AS item ON TRUE
          )
          SELECT
            e.order_id,
            e.customer_id,
            e.status,
            e.total_amount,
            e.created_at,
            e.updated_at,
            p.id AS product_id,
            p.name AS product_name,
            e.quantity,
            COALESCE(e.unit_price, p.current_price, 0)::numeric(12,2) AS unit_price,
            (COALESCE(e.quantity, 0) * COALESCE(e.unit_price, p.current_price, 0))::numeric(12,2) AS line_total,
            u.username AS customer_username,
            u.email AS customer_email
          FROM expanded_items e
          JOIN products p ON p.id = e.product_id
          LEFT JOIN users u ON u.id = e.customer_id
          WHERE p.user_id = $1
            AND ($2::text IS NULL OR e.status = $2::text)
          ORDER BY e.created_at DESC, e.order_id, p.id
        `,
        [sellerId, statusFilter]
      );

      const ordersMap = new Map();
      for (const row of ordersResult.rows) {
        const key = String(row.order_id);
        if (!ordersMap.has(key)) {
          ordersMap.set(key, {
            id: row.order_id,
            customerId: Number(row.customer_id),
            customerUsername: row.customer_username || null,
            customerEmail: row.customer_email || null,
            status: row.status,
            totalAmount: Number(row.total_amount || 0),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            sellerSubtotal: 0,
            items: [],
          });
        }

        const lineTotal = Number(row.line_total || 0);
        const order = ordersMap.get(key);
        order.items.push({
          productId: Number(row.product_id),
          productName: row.product_name,
          quantity: Number(row.quantity || 0),
          unitPrice: Number(row.unit_price || 0),
          lineTotal,
        });
        order.sellerSubtotal += lineTotal;
      }

      return res.status(200).json({
        orders: Array.from(ordersMap.values()),
      });
    } catch (error) {
      console.error("Error loading seller orders:", error);
      return res.status(500).json({ message: "Failed to load seller orders." });
    }
  });
};
