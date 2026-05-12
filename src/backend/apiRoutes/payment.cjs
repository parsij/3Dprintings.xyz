module.exports = function paymentController(deps) {
    const { app, pool, getAuthUserFromRequest, isAuthenticatedAnIisValid, stripe } = deps;
    const express = require('express');
    const normalizeAddress = (address = {}) => ({
        line1: String(address.line1 || '').trim(),
        line2: String(address.line2 || '').trim(),
        city: String(address.city || '').trim(),
        state: String(address.state || '').trim().toUpperCase(),
        zip: String(address.zip || '').trim(),
        country: String(address.country || '').trim().toUpperCase(),
    });

    // List orders for authenticated user (supports pagination via ?page=&limit=)
    app.get("/api/orders", async (req, res) => {
        try {
            const auth = isAuthenticatedAnIisValid(req, res, "nothing");
            if (!auth?.userId) return; // isAuthenticatedAnIisValid already sent a response on failure

            const page = Math.max(1, parseInt(req.query.page || '1', 10));
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
            const offset = (page - 1) * limit;

            const result = await pool.query(
                `SELECT id, status, total_amount, items, payment_type, created_at, updated_at
                 FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
                [auth.userId, limit, offset]
            );

            res.json({
                page,
                limit,
                orders: result.rows,
            });
        } catch (error) {
            console.error('Error listing orders:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get order details endpoint
    app.get("/api/orders/:orderId", async (req, res) => {
        try {
            const auth = isAuthenticatedAnIisValid(req, res, "nothing");
            if (!auth?.userId) return;

            const { orderId } = req.params;
            const result = await pool.query(
                `SELECT id, customer_id, status, total_amount, items, shipping_address_id, created_at, updated_at 
                 FROM orders WHERE id = $1 AND customer_id = $2`,
                [orderId, auth.userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Order not found" });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error fetching order:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Cancel order endpoint
    app.post("/api/orders/:orderId/cancel", async (req, res) => {
        try {
            const authUser = getAuthUserFromRequest(req);
            if (!authUser) return res.status(401).json({ error: "Unauthorized" });

            const { orderId } = req.params;
            const result = await pool.query(
                `UPDATE orders SET status = 'cancelled' WHERE id = $1 AND customer_id = $2 AND status = 'pending' RETURNING *`,
                [orderId, authUser.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Order not found or cannot be cancelled" });
            }

            res.json({ message: "Order cancelled successfully", order: result.rows[0] });
        } catch (error) {
            console.error('Error cancelling order:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Calculate tax and shipping for checkout
    app.post("/api/payment/calculate-totals", async (req, res) => {
        try {
            const authUser = getAuthUserFromRequest(req);
            if (!authUser) return res.status(401).json({ error: "Unauthorized" });

            const { items, address } = req.body;
            const safeAddress = normalizeAddress(address);
            if (!items || !items.length) {
                return res.status(400).json({ error: "No items provided" });
            }

            if (!safeAddress.zip || !safeAddress.state || !safeAddress.country) {
                return res.status(400).json({ error: "Invalid shipping address" });
            }

            // Calculate subtotal in cents
            const subtotalCents = Math.round(
                items.reduce((sum, item) => sum + (item.current_price * item.quantity), 0) * 100
            );

            try {
                // Use Stripe Tax API to calculate tax
                const calculation = await stripe.tax.calculations.create({
                    currency: 'usd',
                    line_items: items.map((item, idx) => ({
                        amount: Math.round(item.current_price * 100) * item.quantity,
                        reference: `item_${idx}`,
                        tax_code: 'txcd_99999999', // Physical goods
                    })),
                    customer_details: {
                        address: {
                            line1: safeAddress.line1,
                            line2: safeAddress.line2,
                            city: safeAddress.city,
                            state: safeAddress.state,
                            postal_code: safeAddress.zip,
                            country: safeAddress.country,
                        },
                        address_source: 'shipping',
                    },
                });

                const taxCents = calculation.tax_amount_exclusive || 0;
                // Fixed shipping for now (in cents, i.e., $5.00 = 500)
                const shippingCents = 500;
                const totalCents = subtotalCents + taxCents + shippingCents;

                res.json({
                    subtotal: subtotalCents / 100,
                    tax: taxCents / 100,
                    shipping: shippingCents / 100,
                    total: totalCents / 100,
                    subtotalCents,
                    taxCents,
                    shippingCents,
                    totalCents,
                });
            } catch (taxError) {
                console.warn('Tax calculation failed, using default:', taxError.message);
                // Fallback: simple tax calculation (8% tax)
                const taxCents = Math.round(subtotalCents * 0.08);
                const shippingCents = 500; // $5 shipping
                const totalCents = subtotalCents + taxCents + shippingCents;

                res.json({
                    subtotal: subtotalCents / 100,
                    tax: taxCents / 100,
                    shipping: shippingCents / 100,
                    total: totalCents / 100,
                    subtotalCents,
                    taxCents,
                    shippingCents,
                    totalCents,
                });
            }
        } catch (error) {
            console.error('Error calculating totals:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create checkout session
    app.post("/api/payment/create-checkout-session", async (req, res) => {
        try {
            const authUser = getAuthUserFromRequest(req);
            if (!authUser) return res.status(401).json({ error: "Unauthorized" });

            const { items, address } = req.body;
            const safeAddress = normalizeAddress(address);
            if (!items || !items.length) {
                return res.status(400).json({ error: "No items to checkout" });
            }

            if (!safeAddress.zip || !safeAddress.state || !safeAddress.country) {
                return res.status(400).json({ error: "Invalid shipping address" });
            }

            // Recalculate totals on backend for security
            const subtotalCents = Math.round(
                items.reduce((sum, item) => sum + (item.current_price * item.quantity), 0) * 100
            );

            let taxCents = 0;
            let shippingCents = 500; // $5 fixed shipping

            try {
                // Use Stripe Tax API
                const calculation = await stripe.tax.calculations.create({
                    currency: 'usd',
                    line_items: items.map((item, idx) => ({
                        amount: Math.round(item.current_price * 100) * item.quantity,
                        reference: `item_${idx}`,
                        tax_code: 'txcd_99999999',
                    })),
                    customer_details: {
                        address: {
                            line1: safeAddress.line1,
                            line2: safeAddress.line2,
                            city: safeAddress.city,
                            state: safeAddress.state,
                            postal_code: safeAddress.zip,
                            country: safeAddress.country,
                        },
                        address_source: 'shipping',
                    },
                });
                taxCents = calculation.tax_amount_exclusive || 0;
            } catch (taxError) {
                console.warn('Tax calculation warning:', taxError.message);
                // Fallback to 8% tax
                taxCents = Math.round(subtotalCents * 0.08);
            }

            const totalCents = subtotalCents + taxCents + shippingCents;

            // Create line items for Stripe
            const line_items = items.map(item => {
                const product_data = {
                    name: item.name,
                    images: item.image_url ? [item.image_url] : [],
                };

                if (item.description) {
                    product_data.description = item.description;
                }

                return {
                    price_data: {
                        currency: 'usd',
                        product_data,
                        unit_amount: Math.round(item.current_price * 100),
                    },
                    quantity: item.quantity,
                };
            });

            // Add tax as a line item
            if (taxCents > 0) {
                line_items.push({
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Sales Tax',
                        },
                        unit_amount: Math.round(taxCents / 100) * 100, // This gets the tax amount; Stripe will show it separately
                    },
                    quantity: 1,
                });
            }

            // Add shipping as a line item
            line_items.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Shipping',
                    },
                    unit_amount: shippingCents,
                },
                quantity: 1,
            });

            // Create order in database with pending status
            const orderInsert = await pool.query(
                `INSERT INTO orders (customer_id, items, status, total_amount, shipping_address_id) 
                 VALUES ($1, $2, 'pending', $3, $4) RETURNING id`,
                [
                    authUser.id,
                    JSON.stringify({
                        items,
                        subtotal: subtotalCents / 100,
                        tax: taxCents / 100,
                        shipping: shippingCents / 100,
                        total: totalCents / 100,
                    }),
                    totalCents / 100,
                    null, // Will store address data if needed
                ]
            );

            const orderId = orderInsert.rows[0].id;

            // Automatic cancellation after 2 hours if still pending
            setTimeout(async () => {
                try {
                    const checkResult = await pool.query(
                        `SELECT status FROM orders WHERE id = $1`,
                        [orderId]
                    );
                    if (checkResult.rows.length > 0 && checkResult.rows[0].status === 'pending') {
                        await pool.query(
                            `UPDATE orders SET status = 'cancelled' WHERE id = $1 AND status = 'pending'`,
                            [orderId]
                        );
                        console.log(`Order ${orderId} automatically cancelled after 2 hours.`);
                    }
                } catch (e) {
                    console.error("Error auto-cancelling order:", e);
                }
            }, 2 * 60 * 60 * 1000);

            // Create Stripe checkout session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items,
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel?order_id=${orderId}`,
                customer_email: authUser.email,
                metadata: {
                    orderId,
                    userId: authUser.id,
                },
            });

            res.json({ url: session.url, orderId });
        } catch (error) {
            console.error('Error creating checkout session:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Confirm payment from success page as a fallback to webhook delivery issues
    app.post("/api/payment/confirm-success", async (req, res) => {
        try {
            const authUser = getAuthUserFromRequest(req);
            if (!authUser) return res.status(401).json({ error: "Unauthorized" });

            const { sessionId, orderId } = req.body || {};
            if (!sessionId || !orderId) {
                return res.status(400).json({ error: "Missing sessionId or orderId" });
            }

            const orderResult = await pool.query(
                `SELECT id, customer_id, status FROM orders WHERE id = $1`,
                [orderId]
            );
            if (orderResult.rows.length === 0) {
                return res.status(404).json({ error: "Order not found" });
            }
            if (String(orderResult.rows[0].customer_id) !== String(authUser.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const session = await stripe.checkout.sessions.retrieve(sessionId);
            const sessionOrderId = session.metadata?.orderId;
            if (!sessionOrderId || String(sessionOrderId) !== String(orderId)) {
                return res.status(400).json({ error: "Session does not match order" });
            }

            if (session.payment_status !== 'paid') {
                return res.json({
                    updated: false,
                    status: orderResult.rows[0].status,
                    paymentStatus: session.payment_status,
                });
            }

            await pool.query(
                `UPDATE orders
                 SET status = 'completed',
                     updated_at = NOW(),
                     payment_type = COALESCE(payment_type, 'card')
                 WHERE id = $1 AND status = 'pending'`,
                [orderId]
            );

            const updatedOrder = await pool.query(
                `SELECT id, status FROM orders WHERE id = $1`,
                [orderId]
            );

            return res.json({
                updated: true,
                status: updatedOrder.rows[0]?.status || 'completed',
                paymentStatus: session.payment_status,
            });
        } catch (error) {
            console.error('Error confirming checkout success:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // The Stripe webhook handler has been moved to server.cjs BEFORE express.json()
}
