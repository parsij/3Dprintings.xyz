module.exports = function cartRoutes(deps) {
  const { app, pool, isAuthenticatedAnIisValid } = deps;

  app.post('/api/cart', async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, "cart");
      if (!auth?.userId) return;
      const userId = auth.userId;
      const productIdNum = Number(auth.productId);
      const qty = auth.quantity === undefined ? 1 : Number(auth.quantity);

      const key = String(productIdNum);
      const result = await pool.query(
        `UPDATE users
         SET cart_json = jsonb_set(
           COALESCE(cart_json::jsonb, '{}'::jsonb),
           ARRAY[$1::text],
           to_jsonb(COALESCE((cart_json::jsonb->>$1::text)::int, 0) + $2::int)
         )
         WHERE id = $3
         RETURNING cart_json`,
        [key, qty, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }

      return res.status(200).json({ message: 'Added to cart.', cart: result.rows[0].cart_json || {} });
    } catch (error) {
      console.error('[POST /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/cart', async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, "cart");
      if (!auth?.userId) return;
      const userId = auth.userId;
      const productIdNum = Number(auth.productId);

      const key = String(productIdNum);
      const result = await pool.query(
        `UPDATE users
         SET cart_json = COALESCE(cart_json::jsonb, '{}'::jsonb) - $1::text
         WHERE id = $2 AND COALESCE(cart_json::jsonb, '{}'::jsonb) ? $1::text
         RETURNING cart_json`,
        [key, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Product not found in cart.' });
      }

      return res.status(200).json({ message: 'Product removed from cart successfully.', cart: result.rows[0].cart_json || {} });
    } catch (error) {
      console.error('[DELETE /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/cart', async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, "cart");
      if (!auth?.userId) return;
      const userId = auth.userId;
      const productIdNum = Number(auth.productId);
      const qty = auth.quantity === undefined ? 1 : Number(auth.quantity);

      const key = String(productIdNum);
      const result = await pool.query(
        `UPDATE users
         SET cart_json = jsonb_set(
           COALESCE(cart_json::jsonb, '{}'::jsonb),
           ARRAY[$1::text],
           to_jsonb($2::int)
         )
         WHERE id = $3 AND COALESCE(cart_json::jsonb, '{}'::jsonb) ? $1::text
         RETURNING cart_json`,
        [key, qty, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Product not found in cart.' });
      }

      return res.status(200).json({ message: 'Quantity updated successfully.', cart: result.rows[0].cart_json || {} });
    } catch (error) {
      console.error('[PATCH /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/cart', async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, "nothing");
      if (!auth?.userId) return;
      const userId = auth.userId;

      const result = await pool.query(
        `SELECT COALESCE(cart_json::jsonb, '{}'::jsonb) as cart_json FROM users WHERE id = $1`,
        [userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Cart not found.' });
      }

      return res.status(200).json({ cart: result.rows[0].cart_json || {} });
    } catch (error) {
      console.error('[GET /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/cart/clear', async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, "nothing");
      if (!auth?.userId) return;

      const result = await pool.query(
        `UPDATE users
         SET cart_json = '{}'::jsonb
         WHERE id = $1
         RETURNING COALESCE(cart_json::jsonb, '{}'::jsonb) AS cart_json`,
        [auth.userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }

      return res.status(200).json({
        message: 'Cart cleared successfully.',
        cart: result.rows[0].cart_json || {},
      });
    } catch (error) {
      console.error('[POST /api/cart/clear] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};
