module.exports = function paymentController(deps) {
    const { app, pool, isAuthenticatedAnIisValid, stripe } = deps;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const ORDER_PAYMENT_POLL_INTERVAL_MS = 10_000;
    const ORDER_PAYMENT_TIMEOUT_MS = 2 * 60 * 60 * 1000;
    const orderPaymentPollers = new Map();
    const normalizeAddress = (address = {}) => ({
        line1: String(address.line1 || '').trim(),
        line2: String(address.line2 || '').trim(),
        city: String(address.city || '').trim(),
        state: String(address.state || '').trim().toUpperCase(),
        zip: String(address.zip || '').trim(),
        country: String(address.country || '').trim().toUpperCase(),
    });
    const parseIntInRange = (value, field, min, max) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
            return { error: `Invalid ${field}. Must be an integer between ${min} and ${max}.` };
        }
        return { value: parsed };
    };
    const getPaymentTypeFromSession = (session, fallback = "card") => {
        if (Array.isArray(session?.payment_method_types) && session.payment_method_types[0]) {
            return session.payment_method_types[0];
        }
        return fallback;
    };
    const clearCartForOrderCustomer = async (orderId) => {
         if (!orderId) return;

         const ownerResult = await pool.query(
             `SELECT customer_id FROM orders WHERE id = $1`,
             [orderId]
         );
         const customerId = ownerResult.rows[0]?.customer_id;
         if (!customerId) return;

         await pool.query(
             `UPDATE users SET cart_json = '{}'::jsonb WHERE id = $1`,
             [customerId]
         );
     };

     const decrementProductInventory = async (orderId) => {
         if (!orderId) return;

         const orderResult = await pool.query(
             `SELECT items FROM orders WHERE id = $1`,
             [orderId]
         );

         if (orderResult.rows.length === 0) return;

         const order = orderResult.rows[0];
         const items = order.items?.items || [];

         if (!Array.isArray(items) || items.length === 0) return;

         for (const item of items) {
             const productId = item.id || item.productId;
             const quantity = Number(item.quantity) || 0;

             if (productId && quantity > 0) {
                 await pool.query(
                     `UPDATE products 
                      SET quantity = GREATEST(0, quantity - $1)
                      WHERE id = $2`,
                     [quantity, productId]
                 );
             }
         }
     };

    const stopOrderPaymentPolling = (orderId) => {
        const existingInterval = orderPaymentPollers.get(orderId);
        if (existingInterval) {
            clearInterval(existingInterval);
            orderPaymentPollers.delete(orderId);
        }
    };

    const runOrderPaymentCheck = async (orderId) => {
        const result = await pool.query(
            `SELECT id, status, created_at, stripe_session_id, payment_type
             FROM orders
             WHERE id = $1`,
            [orderId]
        );

        if (result.rows.length === 0) {
            stopOrderPaymentPolling(orderId);
            return;
        }

        const order = result.rows[0];
        if (order.status !== "pending") {
            stopOrderPaymentPolling(orderId);
            return;
        }

        const createdAtMs = new Date(order.created_at).getTime();
        if (!Number.isFinite(createdAtMs)) {
            stopOrderPaymentPolling(orderId);
            return;
        }

        const ageMs = Date.now() - createdAtMs;
        if (ageMs >= ORDER_PAYMENT_TIMEOUT_MS) {
            await pool.query(
                `UPDATE orders
                 SET status = 'cancelled',
                     updated_at = NOW()
                 WHERE id = $1 AND status = 'pending'`,
                [orderId]
            );
            stopOrderPaymentPolling(orderId);
            return;
        }

        if (!order.stripe_session_id) {
            return;
        }

        let session;
        try {
            session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
        } catch (error) {
            console.error(`Stripe session check failed for order ${orderId}:`, error.message || error);
            return;
        }

        if (session?.payment_status !== "paid") {
            return;
        }

         const paymentType = getPaymentTypeFromSession(session, order.payment_type || "card");
         await pool.query(
             `UPDATE orders
              SET status = 'completed',
                  payment_type = COALESCE(payment_type, $2),
                  updated_at = NOW()
              WHERE id = $1 AND status = 'pending'`,
             [orderId, paymentType]
         );
         await decrementProductInventory(orderId);
         await clearCartForOrderCustomer(orderId);
         stopOrderPaymentPolling(orderId);
    };

    const startOrderPaymentPolling = (orderId) => {
        if (!orderId || orderPaymentPollers.has(orderId)) return;

        // Run first check immediately, then every 10 seconds.
        runOrderPaymentCheck(orderId).catch((error) => {
            console.error(`Initial payment check failed for order ${orderId}:`, error);
        });

        const intervalId = setInterval(() => {
            runOrderPaymentCheck(orderId).catch((error) => {
                console.error(`Payment polling failed for order ${orderId}:`, error);
            });
        }, ORDER_PAYMENT_POLL_INTERVAL_MS);

        orderPaymentPollers.set(orderId, intervalId);
    };

    const bootstrapPendingOrderPolling = async () => {
        try {
            await pool.query(
                `UPDATE orders
                 SET status = 'cancelled',
                     updated_at = NOW()
                 WHERE status = 'pending' AND created_at <= NOW() - INTERVAL '2 hours'`
            );

            const pending = await pool.query(
                `SELECT id
                 FROM orders
                 WHERE status = 'pending' AND created_at > NOW() - INTERVAL '2 hours'`
            );

            for (const row of pending.rows) {
                startOrderPaymentPolling(row.id);
            }
        } catch (error) {
            console.error("Error bootstrapping order payment polling:", error);
        }
    };

    // List orders for authenticated user (supports pagination via ?page=&limit=)
    app.get("/api/orders", async (req, res) => {
        try {
            const auth = isAuthenticatedAnIisValid(req, res, "nothing");
            if (!auth?.userId) return; // isAuthenticatedAnIisValid already sent a response on failure

            const pageResult = parseIntInRange(req.query.page ?? "1", "page", 1, 1000000);
            if (pageResult.error) return res.status(400).json({ error: pageResult.error });
            const limitResult = parseIntInRange(req.query.limit ?? "10", "limit", 1, 50);
            if (limitResult.error) return res.status(400).json({ error: limitResult.error });

            const page = pageResult.value;
            const limit = limitResult.value;
            const offset = (page - 1) * limit;

            const result = await pool.query(
                `SELECT id, status, total_amount, items, payment_type, created_at, updated_at
                 FROM orders
                 WHERE customer_id = $1
                 ORDER BY created_at DESC, id DESC
                 LIMIT $2 OFFSET $3`,
                [auth.userId, limit + 1, offset]
            );

            const hasMore = result.rows.length > limit;
            const orders = hasMore ? result.rows.slice(0, limit) : result.rows;

            res.json({
                page,
                limit,
                hasMore,
                orders,
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
            if (!UUID_REGEX.test(orderId)) {
                return res.status(400).json({ error: "Invalid order id" });
            }

            const result = await pool.query(
                `SELECT id, customer_id, status, total_amount, items, shipping_address_id, payment_type, created_at, updated_at 
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
            const auth = isAuthenticatedAnIisValid(req, res, "nothing");
            if (!auth?.userId) return;

            const { orderId } = req.params;
            if (!UUID_REGEX.test(orderId)) {
                return res.status(400).json({ error: "Invalid order id" });
            }

            const result = await pool.query(
                `UPDATE orders SET status = 'cancelled' WHERE id = $1 AND customer_id = $2 AND status = 'pending' RETURNING *`,
                [orderId, auth.userId]
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
            const auth = isAuthenticatedAnIisValid(req, res, "nothing");
            if (!auth?.userId) return;

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
            const auth = isAuthenticatedAnIisValid(req, res, "nothing");
            if (!auth?.userId) return;
            const authUser = { id: auth.userId };
            const userResult = await pool.query(`SELECT email FROM users WHERE id = $1`, [auth.userId]);
            const userEmail = userResult.rows[0]?.email;

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

            // Create Stripe checkout session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items,
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL || 'https://3dprintings.xyz:5173'}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
                cancel_url: `${process.env.FRONTEND_URL || 'https://3dprintings.xyz:5173'}/cancel?order_id=${orderId}`,
                ...(userEmail ? { customer_email: userEmail } : {}),
                metadata: {
                    orderId,
                    userId: authUser.id,
                },
            });

            await pool.query(
                `UPDATE orders SET stripe_session_id = $1, updated_at = NOW() WHERE id = $2`,
                [session.id, orderId]
            );
            startOrderPaymentPolling(orderId);

            res.json({ url: session.url, orderId });
        } catch (error) {
            console.error('Error creating checkout session:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Verify order ownership and payment status using Stripe directly
    app.get("/api/payment/order-status/:orderId", async (req, res) => {
        try {
            const auth = isAuthenticatedAnIisValid(req, res, "nothing");
            if (!auth?.userId) return;

            const { orderId } = req.params;
            if (!UUID_REGEX.test(orderId)) {
                return res.status(400).json({ error: "Invalid order id" });
            }

            const orderResult = await pool.query(
                `SELECT id, customer_id, status, total_amount, payment_type, created_at, updated_at, stripe_session_id
                 FROM orders WHERE id = $1`,
                [orderId]
            );
            if (orderResult.rows.length === 0) {
                return res.status(404).json({ error: "Order not found" });
            }
            if (String(orderResult.rows[0].customer_id) !== String(auth.userId)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const existingOrder = orderResult.rows[0];
            if (existingOrder.status === "completed") {
                await clearCartForOrderCustomer(orderId);
                return res.json({
                    order: existingOrder,
                    paymentStatus: "paid",
                    paymentVerified: true,
                });
            }

            if (!existingOrder.stripe_session_id) {
                return res.json({
                    order: existingOrder,
                    paymentStatus: "unavailable",
                    paymentVerified: existingOrder.status === "completed",
                });
            }

            const session = await stripe.checkout.sessions.retrieve(existingOrder.stripe_session_id);
            if (session.payment_status !== 'paid') {
                return res.json({
                    order: existingOrder,
                    paymentStatus: session.payment_status,
                    paymentVerified: false,
                });
            }

            let paymentType = existingOrder.payment_type;
            if (!paymentType) {
                const methodType = Array.isArray(session.payment_method_types) ? session.payment_method_types[0] : "";
                paymentType = methodType || "card";
            }

            const updatedOrder = await pool.query(
                `UPDATE orders
                 SET status = 'completed',
                     updated_at = NOW(),
                     payment_type = COALESCE(payment_type, $2)
                 WHERE id = $1
                 RETURNING id, customer_id, status, total_amount, payment_type, created_at, updated_at, stripe_session_id`,
                [orderId, paymentType]
            );
            await clearCartForOrderCustomer(orderId);

            return res.json({
                order: updatedOrder.rows[0] || existingOrder,
                paymentStatus: session.payment_status,
                paymentVerified: true,
            });
        } catch (error) {
            console.error('Error checking payment order status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // The Stripe webhook handler has been moved to server.cjs BEFORE express.json()
    bootstrapPendingOrderPolling();
}
