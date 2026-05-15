const { refreshSellerDashboard } = require("./sellerShared.cjs");

module.exports = function sellerRoutes(deps) {
  const { app, pool, isAuthenticatedAnIisValid } = deps;

  app.get("/api/seller/dashboard", async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, "nothing");
      if (!auth?.userId) return;

      const snapshot = await refreshSellerDashboard(pool, auth.userId);
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

  app.post("/api/seller/dashboard/refresh", async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, "nothing");
      if (!auth?.userId) return;

      const snapshot = await refreshSellerDashboard(pool, auth.userId);
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
};
