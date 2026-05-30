module.exports = function paymentController(deps) {
    const { app, pool, isAuthenticatedAnIisValid, stripe, enqueueWrite } = deps;
    const { fulfillPaidOrder } = require("./orderFulfillment.cjs");
    const {
        assertValidShippingTier,
        calculateEasyPostShippingQuote,
        createInitialTrackingPayload,
        DEFAULT_SHIPPING_TIER,
        extractShippingAddressFromOrderItems,
        normalizeAddressPayload,
        normalizeSellerAddressFromRow,
        resolveVerifiedShippingAddress,
    } = require("./shippingShared.cjs");
    const {
        bootstrapPendingOrderPolling,
        clearCartForOrderCustomer,
        getPaymentTypeFromSession,
        scheduleOrderPaymentPoll,
    } = require("./orderPaymentPolling.cjs");
    const {
        assertCheckoutTotalsAreValid,
        assertSellerCanReceivePayments,
        buildCheckoutPaymentIntentData,
        calculatePlatformFeeCents,
    } = require("./sellerStripeShared.cjs");
    const { getFrontendUrl } = require("../envShared.cjs");
    const { createUserError, sendJsonError } = require("../apiErrorShared.cjs");
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const ORDER_PAYMENT_TIMEOUT_MS = 2 * 60 * 60 * 1000;
    const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || "https://3dprintings.xyz/api/imgUploads";
    const CHECKOUT_ITEM_KEYS = new Set(["id", "productId", "product_id", "quantity"]);
    const FORBIDDEN_CHECKOUT_BODY_KEYS = new Set([
        "subtotal",
        "subtotalCents",
        "tax",
        "taxCents",
        "shipping",
        "shippingCents",
        "shippingAndHandling",
        "total",
        "totalCents",
        "shippingQuote",
        "unit_amount",
        "current_price",
        "price",
        "originalShipping",
        "originalShippingCents",
        "markupRate",
    ]);
    const parseIntInRange = (value, field, min, max) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
            return { error: `Invalid ${field}. Must be an integer between ${min} and ${max}.` };
        }
        return { value: parsed };
    };
    const getProductImageUrl = (imgPath) => {
        if (!Array.isArray(imgPath) || imgPath.length === 0 || !imgPath[0]) return "";
        return `${IMAGE_BASE_URL}/${imgPath[0]}`;
    };

    const normalizeCheckoutItemsFromDatabase = async (items = []) => {
        const quantitiesByProductId = new Map();
        for (const item of items) {
            const productId = Number(item?.id || item?.productId || item?.product_id);
            const quantity = Number(item?.quantity);
            if (!Number.isInteger(productId) || productId <= 0) {
                const error = new Error("Invalid checkout item.");
                error.statusCode = 400;
                throw error;
            }
            if (!Number.isInteger(quantity) || quantity <= 0) {
                const error = new Error("Invalid checkout quantity.");
                error.statusCode = 400;
                throw error;
            }
            quantitiesByProductId.set(productId, (quantitiesByProductId.get(productId) || 0) + quantity);
        }

        const productIds = [...quantitiesByProductId.keys()];
        if (productIds.length === 0) return [];

        const productsResult = await pool.query(
            `
              SELECT
                p.id,
                p.name,
                p.description,
                p.current_price,
                p.quantity,
                p.user_id AS seller_id,
                p.img_path,
                p.model_weight_g,
                p.model_height_mm,
                p.model_width_mm,
                p.model_length_mm,
                p.days_to_prepare,
                u.username AS seller_username,
                u.email AS seller_email,
                u.phone_number AS seller_phone_number,
                u.street_address AS seller_street_address,
                u.city AS seller_city,
                u.state_province AS seller_state_province,
                u.postal_code AS seller_postal_code,
                u.country_code AS seller_country_code,
                sp.shop_name,
                COALESCE(sp.sellersaddres, '{}'::jsonb) AS sellersaddres
              FROM products p
              LEFT JOIN users u ON u.id = p.user_id
              LEFT JOIN seller_profiles sp ON sp.seller_user_id = p.user_id
              WHERE p.id = ANY($1::int[])
            `,
            [productIds]
        );

        const productsById = new Map(productsResult.rows.map((row) => [Number(row.id), row]));
        const normalizedItems = [];
        for (const productId of productIds) {
            const product = productsById.get(productId);
            if (!product) {
                const error = new Error(`Product ${productId} was not found.`);
                error.statusCode = 400;
                throw error;
            }

            const requestedQuantity = quantitiesByProductId.get(productId);
            const availableQuantity = Number(product.quantity || 0);
            if (requestedQuantity > availableQuantity) {
                const error = new Error(`Not enough stock for item: ${product.name || productId}`);
                error.statusCode = 400;
                throw error;
            }

            if (![product.model_weight_g, product.model_height_mm, product.model_width_mm, product.model_length_mm]
                .every((value) => Number.isFinite(Number(value)) && Number(value) > 0)) {
                const error = new Error(`Shipping dimensions are missing for item: ${product.name || productId}`);
                error.statusCode = 400;
                throw error;
            }

            const sellerAddress = normalizeSellerAddressFromRow(product);
            normalizedItems.push({
                id: Number(product.id),
                productId: Number(product.id),
                name: product.name,
                description: product.description || "",
                current_price: Number(product.current_price || 0),
                quantity: requestedQuantity,
                image_url: getProductImageUrl(product.img_path),
                sellerId: Number(product.seller_id),
                seller_id: Number(product.seller_id),
                sellerName: product.shop_name || product.seller_username || `Seller ${product.seller_id}`,
                sellerAddress,
                model_weight_g: Number(product.model_weight_g),
                model_height_mm: Number(product.model_height_mm),
                model_width_mm: Number(product.model_width_mm),
                model_length_mm: Number(product.model_length_mm),
                days_to_prepare: Number(product.days_to_prepare) || 1,
                daysToPrepare: Number(product.days_to_prepare) || 1,
            });
        }

        return normalizedItems;
    };

    const loadSellerStripeAccounts = async (orderItems) => {
        const sellerIds = [...new Set(
            orderItems
                .map((item) => Number(item.sellerId || item.seller_id))
                .filter((sellerId) => Number.isInteger(sellerId) && sellerId > 0)
        )];

        const sellerAccountById = new Map();
        for (const sellerId of sellerIds) {
            const accountId = await assertSellerCanReceivePayments(pool, stripe, sellerId);
            sellerAccountById.set(sellerId, accountId);
        }
        return sellerAccountById;
    };

    const getOrderItemsPayload = (order) => {
        if (!order?.items || typeof order.items !== "object" || Array.isArray(order.items)) {
            return { items: [] };
        }
        return order.items;
    };

    const assertCheckoutRequestHasNoClientPricing = (body = {}) => {
        const forbidden = Object.keys(body).filter((key) => FORBIDDEN_CHECKOUT_BODY_KEYS.has(key));
        if (forbidden.length > 0) {
            throw createUserError("Checkout totals must be calculated server-side.");
        }
    };

    const pickCheckoutItemsFromRequest = (items = []) => {
        if (!Array.isArray(items) || items.length === 0) {
            throw createUserError("No items provided");
        }

        return items.map((item, index) => {
            const extraKeys = Object.keys(item || {}).filter((key) => !CHECKOUT_ITEM_KEYS.has(key));
            if (extraKeys.length > 0) {
                throw createUserError(
                    `Checkout item ${index + 1} includes unsupported fields. Prices are calculated server-side.`
                );
            }

            return {
                id: item.id || item.productId || item.product_id,
                quantity: item.quantity,
            };
        });
    };

    const parseCheckoutRequestFromBody = (body = {}) => {
        assertCheckoutRequestHasNoClientPricing(body);
        return {
            items: pickCheckoutItemsFromRequest(body.items),
            address: body.address,
            shippingTier: body.shippingTier,
        };
    };

    const buildStripeLineItemsFromTotals = ({ normalizedItems, taxCents, shippingCents }) => {
        const line_items = normalizedItems.map((item) => {
            const product_data = {
                name: item.name || "Item",
                images: item.image_url ? [item.image_url] : [],
            };

            if (item.description) {
                product_data.description = item.description;
            }

            return {
                price_data: {
                    currency: "usd",
                    product_data,
                    unit_amount: Math.round(Number(item.current_price || 0) * 100),
                },
                quantity: Number(item.quantity || 1),
            };
        });

        const normalizedTaxCents = Math.max(0, Math.round(Number(taxCents) || 0));
        const normalizedShippingCents = Math.max(0, Math.round(Number(shippingCents) || 0));

        if (normalizedTaxCents > 0) {
            line_items.push({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Sales Tax",
                    },
                    unit_amount: normalizedTaxCents,
                },
                quantity: 1,
            });
        }

        line_items.push({
            price_data: {
                currency: "usd",
                product_data: {
                    name: "Shipping and handling",
                },
                unit_amount: normalizedShippingCents,
            },
            quantity: 1,
        });

        return line_items;
    };

    const assertStripeLineItemsMatchTotal = (line_items, totalCents) => {
        const lineItemsTotal = line_items.reduce((sum, item) => {
            return sum + Math.round(Number(item.price_data?.unit_amount || 0) * Number(item.quantity || 1));
        }, 0);

        if (lineItemsTotal !== Math.round(Number(totalCents))) {
            const error = new Error("Checkout total mismatch. Please refresh and try again.");
            error.statusCode = 500;
            throw error;
        }
    };

    const buildOrderItemsSnapshot = (totals) => {
        const orderItems = totals.normalizedItems.map(({ sellerAddress, ...item }) => item);
        return {
            items: orderItems,
            shippingAddress: totals.safeAddress,
            subtotal: totals.subtotalCents / 100,
            tax: totals.taxCents / 100,
            shipping: totals.shippingCents / 100,
            shippingAndHandling: totals.shippingCents / 100,
            shippingTier: totals.shippingTier,
            shippingQuote: totals.shippingQuote,
            total: totals.totalCents / 100,
        };
    };

    const refreshPendingOrderCheckoutSnapshot = async (orderId, totals) => {
        const itemsSnapshot = buildOrderItemsSnapshot(totals);
        const trackingPayload = createInitialTrackingPayload(totals.shippingQuote);
        await pool.query(
            `UPDATE orders
             SET items = $1,
                 total_amount = $2,
                 tracking = $3::jsonb,
                 updated_at = NOW()
             WHERE id = $4
               AND status = 'pending'`,
            [
                JSON.stringify(itemsSnapshot),
                totals.totalCents / 100,
                JSON.stringify(trackingPayload),
                orderId,
            ]
        );
    };

    const recalculateTotalsFromOrderPayload = async (itemsPayload) => {
        const orderItems = Array.isArray(itemsPayload?.items) ? itemsPayload.items : [];
        const address = extractShippingAddressFromOrderItems(itemsPayload);
        if (!address) {
            const error = new Error("Order is missing a shipping address.");
            error.statusCode = 400;
            throw error;
        }

        return calculateCheckoutAmounts({
            items: orderItems.map((item) => ({
                id: item.id || item.productId || item.product_id,
                quantity: item.quantity,
            })),
            address,
            shippingTier: itemsPayload?.shippingTier,
        });
    };

    const createCheckoutSessionForOrder = async ({ orderId, userId, itemsPayload, userEmail }) => {
        const totals = await recalculateTotalsFromOrderPayload(itemsPayload);
        if (totals.normalizedItems.length === 0) {
            const error = new Error("Order has no items.");
            error.statusCode = 400;
            throw error;
        }

        await refreshPendingOrderCheckoutSnapshot(orderId, totals);

        const line_items = buildStripeLineItemsFromTotals(totals);
        const { totalCents, normalizedItems } = totals;

        assertCheckoutTotalsAreValid(totalCents);
        assertStripeLineItemsMatchTotal(line_items, totalCents);
        const sellerAccountById = await loadSellerStripeAccounts(normalizedItems);
        const connectConfig = buildCheckoutPaymentIntentData({
            totalCents,
            orderItems: normalizedItems,
            sellerAccountById,
        });

        const sessionPayload = {
            payment_method_types: ["card"],
            line_items,
            mode: "payment",
            success_url: `${getFrontendUrl()}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
            cancel_url: `${getFrontendUrl()}/cancel?order_id=${orderId}`,
            ...(userEmail ? { customer_email: userEmail } : {}),
            payment_intent_data: {
                transfer_group: String(orderId),
            },
            metadata: {
                orderId,
                userId: String(userId),
                multiSeller: "1",
                platformFeeCents: String(connectConfig.platformFeeCents),
            },
        };

        const session = await stripe.checkout.sessions.create(sessionPayload);

        await pool.query(
            `UPDATE orders SET stripe_session_id = $1, updated_at = NOW() WHERE id = $2`,
            [session.id, orderId]
        );
        scheduleOrderPaymentPoll(enqueueWrite, orderId);

        return session;
    };

    const calculateCheckoutAmounts = async ({ items, address, shippingTier = DEFAULT_SHIPPING_TIER }) => {
        const validatedShippingTier = assertValidShippingTier(shippingTier);
        const normalizedItems = await normalizeCheckoutItemsFromDatabase(items);
        if (normalizedItems.length === 0) {
            const error = new Error("No items provided");
            error.statusCode = 400;
            throw error;
        }

        const subtotalCents = normalizedItems.reduce((sum, item) => {
            return sum + Math.round(Number(item.current_price || 0) * 100) * Number(item.quantity || 1);
        }, 0);

        const totalItemsCount = normalizedItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
        if (totalItemsCount > 30) {
            const error = new Error("Order limit of 30 items exceeded.");
            error.statusCode = 400;
            throw error;
        }
        if (subtotalCents > 200000) {
            const error = new Error("Spend limit of $2,000 exceeded.");
            error.statusCode = 400;
            throw error;
        }

        const safeAddress = await resolveVerifiedShippingAddress(address, {
            name: "3D Printings Customer",
        });

        let taxCents = 0;
        try {
            const calculation = await stripe.tax.calculations.create({
                currency: 'usd',
                line_items: normalizedItems.map((item, idx) => ({
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
            taxCents = Math.round(subtotalCents * 0.08);
        }

        const shippingQuote = await calculateEasyPostShippingQuote({
            pool,
            items: normalizedItems,
            toAddress: safeAddress,
            shippingTier: validatedShippingTier,
            verifiedDestination: safeAddress,
        });
        const shippingCents = shippingQuote.shippingCents;
        const totalCents = subtotalCents + taxCents + shippingCents;

        return {
            normalizedItems,
            safeAddress,
            subtotalCents,
            taxCents,
            shippingCents,
            totalCents,
            shippingQuote,
            shippingTier: validatedShippingTier,
        };
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
                `SELECT id, status, total_amount, items, payment_type, tracking, created_at, updated_at
                 FROM orders
                 WHERE customer_id = $1
                 ORDER BY created_at DESC, id DESC
                 LIMIT $2 OFFSET $3`,
                [auth.userId, limit + 1, offset]
            );

            const hasMore = result.rows.length > limit;
            let orders = hasMore ? result.rows.slice(0, limit) : result.rows;
            orders = orders.map(sanitizeOrderItems);

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
                `SELECT id, customer_id, status, total_amount, items, shipping_address_id, payment_type, tracking, created_at, updated_at 
                 FROM orders WHERE id = $1 AND customer_id = $2`,
                [orderId, auth.userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Order not found" });
            }

            res.json(sanitizeOrderItems(result.rows[0]));
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
                `UPDATE orders
                 SET status = 'cancelled',
                     updated_at = NOW()
                 WHERE id = $1 AND customer_id = $2 AND status = 'pending'
                 RETURNING *`,
                [orderId, auth.userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Order not found or cannot be cancelled" });
            }

            res.json({
                message: "Order cancelled successfully",
                order: result.rows[0],
            });
        } catch (error) {
            console.error('Error cancelling order:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Resume payment for an existing pending order
    app.post("/api/orders/:orderId/pay", async (req, res) => {
        try {
            const auth = isAuthenticatedAnIisValid(req, res, "nothing");
            if (!auth?.userId) return;

            const { orderId } = req.params;
            if (!UUID_REGEX.test(orderId)) {
                return res.status(400).json({ error: "Invalid order id" });
            }

            const orderResult = await pool.query(
                `SELECT id, customer_id, status, total_amount, items, stripe_session_id, created_at
                 FROM orders
                 WHERE id = $1 AND customer_id = $2`,
                [orderId, auth.userId]
            );

            if (orderResult.rows.length === 0) {
                return res.status(404).json({ error: "Order not found" });
            }

            const order = orderResult.rows[0];
            if (order.status !== "pending") {
                return res.status(400).json({ error: "Order is not pending payment." });
            }

            const createdAtMs = new Date(order.created_at).getTime();
            if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs >= ORDER_PAYMENT_TIMEOUT_MS) {
                await pool.query(
                    `UPDATE orders
                     SET status = 'cancelled',
                         updated_at = NOW()
                     WHERE id = $1 AND status = 'pending'`,
                    [orderId]
                );
                return res.status(400).json({ error: "This order has expired. Please place a new order." });
            }

            if (order.stripe_session_id) {
                try {
                    const existingSession = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
                    if (existingSession.payment_status === "paid") {
                        return res.status(400).json({ error: "This order has already been paid." });
                    }
                    if (existingSession.status === "open" && existingSession.url) {
                        scheduleOrderPaymentPoll(enqueueWrite, orderId);
                        return res.json({ checkout_url: existingSession.url });
                    }
                } catch (sessionError) {
                    console.warn(`Could not reuse Stripe session for order ${orderId}:`, sessionError.message || sessionError);
                }
            }

            const userResult = await pool.query(`SELECT email FROM users WHERE id = $1`, [auth.userId]);
            const userEmail = userResult.rows[0]?.email;
            const itemsPayload = getOrderItemsPayload(order);
            const session = await createCheckoutSessionForOrder({
                orderId,
                userId: auth.userId,
                itemsPayload,
                userEmail,
            });

            return res.json({ checkout_url: session.url });
        } catch (error) {
            return sendJsonError(res, error, "Failed to process payment.", {
                key: "error",
                context: "orders-pay",
            });
        }
    });

    // Calculate tax and shipping for checkout
    app.post("/api/payment/calculate-totals", async (req, res) => {
        let authUserId = null;
        try {
            const auth = isAuthenticatedAnIisValid(req, res, "nothing");
            if (!auth?.userId) return;
            authUserId = auth.userId;

            const { items, address, shippingTier } = parseCheckoutRequestFromBody(req.body);

            const totals = await calculateCheckoutAmounts({ items, address, shippingTier });
            assertCheckoutTotalsAreValid(totals.totalCents);
            await loadSellerStripeAccounts(totals.normalizedItems);

            res.json({
                subtotal: totals.subtotalCents / 100,
                tax: totals.taxCents / 100,
                shipping: totals.shippingCents / 100,
                shippingAndHandling: totals.shippingCents / 100,
                total: totals.totalCents / 100,
                subtotalCents: totals.subtotalCents,
                taxCents: totals.taxCents,
                shippingCents: totals.shippingCents,
                totalCents: totals.totalCents,
                shippingTier: totals.shippingTier,
                shippingOptions: totals.shippingQuote.shippingOptions.map((option) => ({
                    tier: option.tier,
                    label: option.label,
                    shipping: option.shipping,
                    shippingCents: option.shippingCents,
                    deliveryWindow: option.deliveryWindow,
                })),
                shippingQuote: {
                    shippingTier: totals.shippingQuote.shippingTier,
                    originalShipping: totals.shippingQuote.originalShipping,
                    originalShippingCents: totals.shippingQuote.originalShippingCents,
                    markupRate: totals.shippingQuote.markupRate,
                    shipments: totals.shippingQuote.shipments,
                },
                verifiedShippingAddress: totals.safeAddress,
            });
        } catch (error) {
            console.error(
                "[calculate-totals] request failed",
                JSON.stringify({
                    userId: authUserId,
                    shippingTier: req.body?.shippingTier || null,
                    itemCount: Array.isArray(req.body?.items) ? req.body.items.length : 0,
                    items: Array.isArray(req.body?.items) ? req.body.items : null,
                    address: req.body?.address || null,
                    errorMessage: error?.message || null,
                    statusCode: error?.statusCode || error?.status || null,
                    exposeToClient: error?.exposeToClient === true,
                }, null, 2)
            );
            return sendJsonError(res, error, "Failed to calculate checkout totals.", {
                key: "error",
                context: "payment-calculate-totals",
            });
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

            const { items, address, shippingTier } = parseCheckoutRequestFromBody(req.body);

            const totals = await calculateCheckoutAmounts({ items, address, shippingTier });
            const { totalCents, shippingQuote } = totals;
            const line_items = buildStripeLineItemsFromTotals(totals);
            const itemsSnapshot = buildOrderItemsSnapshot(totals);

            assertCheckoutTotalsAreValid(totalCents);
            assertStripeLineItemsMatchTotal(line_items, totalCents);

            const trackingPayload = createInitialTrackingPayload(shippingQuote);
            const orderInsert = await pool.query(
                `INSERT INTO orders (customer_id, items, status, total_amount, shipping_address_id, tracking) 
                 VALUES ($1, $2, 'pending', $3, $4, $5::jsonb) RETURNING id`,
                [
                    authUser.id,
                    JSON.stringify(itemsSnapshot),
                    totalCents / 100,
                    null,
                    JSON.stringify(trackingPayload),
                ]
            );

            const orderId = orderInsert.rows[0].id;

            const sellerAccountById = await loadSellerStripeAccounts(totals.normalizedItems);
            const connectConfig = buildCheckoutPaymentIntentData({
                totalCents,
                orderItems: totals.normalizedItems,
                sellerAccountById,
            });

            const sessionPayload = {
                payment_method_types: ['card'],
                line_items,
                mode: 'payment',
                success_url: `${getFrontendUrl()}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
                cancel_url: `${getFrontendUrl()}/cancel?order_id=${orderId}`,
                ...(userEmail ? { customer_email: userEmail } : {}),
                payment_intent_data: {
                    transfer_group: String(orderId),
                },
                metadata: {
                    orderId,
                    userId: String(authUser.id),
                    multiSeller: '1',
                    platformFeeCents: String(connectConfig.platformFeeCents),
                },
            };

            const session = await stripe.checkout.sessions.create(sessionPayload);

            await pool.query(
                `UPDATE orders SET stripe_session_id = $1, updated_at = NOW() WHERE id = $2`,
                [session.id, orderId]
            );
            scheduleOrderPaymentPoll(enqueueWrite, orderId);

            res.json({ url: session.url, orderId });
        } catch (error) {
            return sendJsonError(res, error, "Checkout failed. Please try again.", {
                key: "error",
                context: "payment-create-checkout-session",
            });
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

            const fulfillment = await fulfillPaidOrder(pool, orderId, paymentType);
            await clearCartForOrderCustomer(pool, orderId);

            return res.json({
                order: fulfillment.order || { ...existingOrder, status: 'completed', payment_type: paymentType },
                paymentStatus: session.payment_status,
                paymentVerified: true,
            });
        } catch (error) {
            console.error('Error checking payment order status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // The Stripe webhook handler has been moved to server.cjs BEFORE express.json()
    bootstrapPendingOrderPolling(pool, enqueueWrite);
}

function sanitizeOrderItems(order) {
    if (order && order.items && Array.isArray(order.items.items)) {
        order.items.items = order.items.items.map(item => {
            const newItem = { ...item };
            const productId = Number(newItem.id ?? newItem.productId ?? newItem.product_id);
            if (Number.isFinite(productId) && productId > 0) {
                newItem.productId = productId;
            }
            delete newItem.id;
            delete newItem.product_id;
            delete newItem.sellerId;
            delete newItem.seller_id;
            delete newItem.sellerAddress;
            return newItem;
        });
    }
    return order;
}
