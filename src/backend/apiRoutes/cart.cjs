module.exports = function cartRoutes(deps) {
  const { app, pool, isAuthenticatedAnIisValid, getAuthUserFromRequest } = deps;

  app.post('/api/cart', async (req, res) => {
    try {
      console.log('[POST /api/cart] Request body:', req.body);
      const userId = getAuthUserFromRequest(req)?.id;
      console.log('[POST /api/cart] userId:', userId);
      if (!userId) return res.status(401).json({ message: 'User not authenticated' });
      const { productId, quantity } = req.body;
      console.log('[POST /api/cart] productId:', productId, 'quantity:', quantity);
      // normalize productId and quantity; accept numeric strings too
      const productIdNum = Number(productId);
      if (!Number.isInteger(productIdNum) || productIdNum <= 0) {
        console.log('[POST /api/cart] Invalid productId');
        return res.status(400).json({ message: 'Invalid productId' });
      }
      const rawQty = quantity === undefined ? 1 : Number(quantity);
      const qty = Number.isInteger(rawQty) && rawQty > 0 ? rawQty : 1;
      console.log('[POST /api/cart] Normalized qty:', qty);

      // Fetch current cart
      const selectQuery = `SELECT cart_json FROM users WHERE id = $1`;
      const selectValues = [userId];
      const selectResult = await pool.query(selectQuery, selectValues);
      let cart = selectResult.rows[0]?.cart_json || {};
      console.log('[POST /api/cart] Current cart:', cart);

      // If product already in cart, increment quantity, else set to qty
      const key = String(productIdNum);
      const current = Number(cart[key]) || 0;
      cart[key] = current + qty;
      console.log('[POST /api/cart] Updated cart:', cart);

      // Update cart in DB
      const updateQuery = `
        UPDATE users
        SET cart_json = $1
        WHERE id = $2
      `;
      const updateValues = [cart, userId];
      await pool.query(updateQuery, updateValues);
      console.log('[POST /api/cart] Cart saved to DB');

      return res.status(200).json({ message: 'Added to cart.', cart });
    } catch (error) {
      console.error('[POST /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/cart', async (req, res) => {
    try {
      console.log('[DELETE /api/cart] Request body:', req.body);
      const userId = getAuthUserFromRequest(req)?.id;
      console.log('[DELETE /api/cart] userId:', userId);
      if (!userId) return res.status(401).json({ message: 'User not authenticated' });
      const { productId } = req.body;
      console.log('[DELETE /api/cart] productId:', productId);
      const productIdNum = Number(productId);
      if (!Number.isInteger(productIdNum) || productIdNum <= 0) {
        console.log('[DELETE /api/cart] Invalid productId');
        return res.status(400).json({ message: 'Invalid productId' });
      }

      // Fetch current cart
      const selectQuery = `SELECT cart_json FROM users WHERE id = $1`;
      const selectValues = [userId];
      const selectResult = await pool.query(selectQuery, selectValues);
      let cart = selectResult.rows[0]?.cart_json || {};
      console.log('[DELETE /api/cart] Current cart:', cart);

      const key = String(productIdNum);
      if (!cart[key]) {
        console.log('[DELETE /api/cart] Product not found in cart');
        return res.status(404).json({ message: 'Product not found in cart.' });
      }
      // Remove entire product
      delete cart[key];
      console.log('[DELETE /api/cart] Updated cart:', cart);

      // Update cart in DB
      const updateQuery = `
        UPDATE users
        SET cart_json = $1
        WHERE id = $2
      `;
      const updateValues = [cart, userId];
      await pool.query(updateQuery, updateValues);
      console.log('[DELETE /api/cart] Cart saved to DB');

      return res.status(200).json({ message: 'Product removed from cart successfully.', cart });
    } catch (error) {
      console.error('[DELETE /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/cart', async (req, res) => {
    try {
      console.log('[PATCH /api/cart] Request body:', req.body);
      const userId = getAuthUserFromRequest(req)?.id;
      console.log('[PATCH /api/cart] userId:', userId);
      if (!userId) return res.status(401).json({ message: 'User not authenticated' });
      const { productId, quantity } = req.body;
      console.log('[PATCH /api/cart] productId:', productId, 'quantity:', quantity);
      const productIdNum = Number(productId);
      if (!Number.isInteger(productIdNum) || productIdNum <= 0) {
        console.log('[PATCH /api/cart] Invalid productId');
        return res.status(400).json({ message: 'Invalid productId' });
      }
      const rawQty = Number(quantity);
      const qty = Number.isInteger(rawQty) && rawQty > 0 ? rawQty : 1;
      console.log('[PATCH /api/cart] Normalized qty:', qty);

      // Fetch current cart
      const selectQuery = `SELECT cart_json FROM users WHERE id = $1`;
      const selectValues = [userId];
      const selectResult = await pool.query(selectQuery, selectValues);
      let cart = selectResult.rows[0]?.cart_json || {};
      console.log('[PATCH /api/cart] Current cart:', cart);

      const key = String(productIdNum);
      if (!cart[key]) {
        console.log('[PATCH /api/cart] Product not found in cart');
        return res.status(404).json({ message: 'Product not found in cart.' });
      }
      // Set exact quantity
      cart[key] = qty;
      console.log('[PATCH /api/cart] Updated cart:', cart);

      // Update cart in DB
      const updateQuery = `
        UPDATE users
        SET cart_json = $1
        WHERE id = $2
      `;
      const updateValues = [cart, userId];
      await pool.query(updateQuery, updateValues);
      console.log('[PATCH /api/cart] Cart saved to DB');

      return res.status(200).json({ message: 'Quantity updated successfully.', cart });
    } catch (error) {
      console.error('[PATCH /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/cart', async (req, res) => {
    try {
      console.log('[GET /api/cart] Request received');
      const userId = getAuthUserFromRequest(req)?.id;
      console.log('[GET /api/cart] userId:', userId);
      if (!userId) return res.status(401).json({ message: 'User not authenticated' });
      const query = `SELECT cart_json FROM users WHERE id = $1`;
      const values = [userId];
      const dbResult = await pool.query(query, values);
      console.log('[GET /api/cart] Query result rows:', dbResult.rows.length);
      if (dbResult.rows.length === 0) {
        console.log('[GET /api/cart] No cart found');
        return res.status(404).json({ message: 'Cart not found.' });
      }
      console.log('[GET /api/cart] Returning cart:', dbResult.rows[0].cart_json);
      return res.status(200).json({ cart: dbResult.rows[0].cart_json || {} });
    } catch (error) {
      console.error('[GET /api/cart] Error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};
