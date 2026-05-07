module.exports = function paymentController(deps) {
    const { app, calculateTax } = deps;

    app.post("/api/payment/tax", async (req, res) => {
        return calculateTax(req, res);
    });
}