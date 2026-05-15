module.exports = function configRoutes(deps) {
  const { app } = deps;

  app.get("/api/config", (req, res) => {
    const rawHost = req.get("host") || "";
    const host = rawHost.split(":")[0].toLowerCase();

    if (host === "seller.3dprintings.xyz") {
      return res.json({ mode: "seller", theme: "dark" });
    }

    return res.json({ mode: "customer", theme: "light" });
  });
};
