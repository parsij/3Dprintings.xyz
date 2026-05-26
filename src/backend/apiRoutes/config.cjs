module.exports = function configRoutes(deps) {
  const { app, setCsrfCookie } = deps;

  app.get("/api/csrf-token", (req, res) => {
    const token = setCsrfCookie(res);
    return res.json({ token });
  });

  app.get("/api/config", (req, res) => {
    const rawHost = req.get("host") || "";
    const host = rawHost.split(":")[0].toLowerCase();

    if (
      host === "seller.3dprintings.xyz"
      || host === "seller.localhost"
      || (host.startsWith("seller.") && host.endsWith(".localhost"))
    ) {
      return res.json({ mode: "seller", theme: "dark" });
    }

    return res.json({ mode: "customer", theme: "light" });
  });
};
