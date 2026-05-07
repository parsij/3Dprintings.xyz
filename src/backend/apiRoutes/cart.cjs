module.exports = function cartRoutes(deps) {
  const { app, pool, isAuthenticatedAnIisValid } = deps;

  app.post('/api/cart', async (req, res) => {
    try {
      console.log('[POST /api/cart] Request body:', req.body);
      const auth = isAuthenticatedAnIisValid(req, res, "cart");
      if (!auth?.userId) return;
      const userId = auth.userId;
      const productIdNum = Number(auth.productId);
      const qty = auth.quantity === undefined ? 1 : Number(auth.quantity);
      console.log('[POST /api/cart] userId:', userId);
      console.log('[POST /api/cart] productId:', productIdNum, 'quantity:', qty);

      // Atomic JSONB Upsert/Increment
      const key = String(productIdNum);
      const updateQuery = `
        UPDATE users
        SET cart_json = jsonb_set(
          COALESCE(cart_json::jsonb, '{}'::jsonb),
          ARRAY[$1::text],
          to_jsonb(COALESCE((cart_json::jsonb->>$1::text)::int, 0) + $2::int)
        )
        WHERE id = $3
        RETURNING cart_json
      `;
      const updateValues = [key, qty, userId];
      const result = await pool.query(updateQuery, updateValues);
      const cart = result.rows[0]?.cart_json || {};
      console.log('[POST /api/cart] Cart saved atomically to DB:', cart);

      return res.status(200).json({ message: 'Added to cart.', cart });
    } catch (error) {
      console.error('[POST /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/cart', async (req, res) => {
    try {
      console.log('[DELETE /api/cart] Request body:', req.body);
      const auth = isAuthenticatedAnIisValid(req, res, "cart");
      if (!auth?.userId) return;
      const userId = auth.userId;
      const productIdNum = Number(auth.productId);
      console.log('[DELETE /api/cart] userId:', userId);
      console.log('[DELETE /api/cart] productId:', productIdNum);

      // Atomic JSONB Delete
      const key = String(productIdNum);
      const updateQuery = `
        UPDATE users
        SET cart_json = COALESCE(cart_json::jsonb, '{}'::jsonb) - $1::text
        WHERE id = $2 AND COALESCE(cart_json::jsonb, '{}'::jsonb) ? $1::text
        RETURNING cart_json
      `;
      const updateValues = [key, userId];
      const result = await pool.query(updateQuery, updateValues);

      if (result.rowCount === 0) {
        console.log('[DELETE /api/cart] Product not found in cart or user invalid');
        return res.status(404).json({ message: 'Product not found in cart.' });
      }
      
      const cart = result.rows[0].cart_json;
      console.log('[DELETE /api/cart] Cart atomic delete saved to DB:', cart);

      return res.status(200).json({ message: 'Product removed from cart successfully.', cart });
    } catch (error) {
      console.error('[DELETE /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/cart', async (req, res) => {
    try {
      console.log('[PATCH /api/cart] Request body:', req.body);
      const auth = isAuthenticatedAnIisValid(req, res, "cart");
      if (!auth?.userId) return;
      const userId = auth.userId;
      const productIdNum = Number(auth.productId);
      const qty = auth.quantity === undefined ? 1 : Number(auth.quantity);
      console.log('[PATCH /api/cart] userId:', userId);
      console.log('[PATCH /api/cart] productId:', productIdNum, 'quantity:', qty);

      // Atomic JSONB Exact Set
      const key = String(productIdNum);
      const updateQuery = `
        UPDATE users
        SET cart_json = jsonb_set(
          COALESCE(cart_json::jsonb, '{}'::jsonb),
          ARRAY[$1::text],
          to_jsonb($2::int)
        )
        WHERE id = $3 AND COALESCE(cart_json::jsonb, '{}'::jsonb) ? $1::text
        RETURNING cart_json
      `;
      const updateValues = [key, qty, userId];
      const result = await pool.query(updateQuery, updateValues);

      if (result.rowCount === 0) {
        console.log('[PATCH /api/cart] Product not found in cart');
        return res.status(404).json({ message: 'Product not found in cart.' });
      }
      
      const cart = result.rows[0].cart_json;
      console.log('[PATCH /api/cart] Cart atomic set saved to DB:', cart);

      return res.status(200).json({ message: 'Quantity updated successfully.', cart });
    } catch (error) {
      console.error('[PATCH /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/cart', async (req, res) => {
    try {
      console.log('[GET /api/cart] Request received');
      const auth = isAuthenticatedAnIisValid(req, res, "nothing");
      if (!auth?.userId) return;
      const userId = auth.userId;
      console.log('[GET /api/cart] userId:', userId);
      
      const query = `SELECT COALESCE(cart_json::jsonb, '{}'::jsonb) as cart_json FROM users WHERE id = $1`;
      const values = [userId];
      const dbResult = await pool.query(query, values);
      
      console.log('[GET /api/cart] Query result rows:', dbResult.rows.length);
      if (dbResult.rows.length === 0) {
        console.log('[GET /api/cart] No cart found');
        return res.status(404).json({ message: 'Cart not found.' });
      }
      
      const cart = dbResult.rows[0].cart_json || {};
      console.log('[GET /api/cart] Returning cart:', cart);
      return res.status(200).json({ cart });
    } catch (error) {
      console.error('[GET /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};
