module.exports = function cartRoutes(deps) {
  const { app, pool, isAuthenticatedAnIisValid} = deps;

  app.post('/api/cart', async (req, res) => {
    try {
      const result = isAuthenticatedAnIisValid(req, res, "cart");
      if (!result || result.userId == null) return;
      const { productId, userId, quantity } = result;
      const qty = quantity && Number.isInteger(quantity) && quantity > 0 ? quantity : 1;

      // Fetch current cart
      const selectQuery = `SELECT cart_json FROM users WHERE id = $1`;
      const selectValues = [userId];
      const selectResult = await pool.query(selectQuery, selectValues);
      let cart = selectResult.rows[0]?.cart_json || {};

      // If product already in cart, increment quantity, else set to qty
      cart[productId] = (cart[productId] || 0) + qty;

      // Update cart in DB
      const updateQuery = `
        UPDATE users
        SET cart_json = $1
        WHERE id = $2
      `;
      const updateValues = [cart, userId];
      await pool.query(updateQuery, updateValues);

      return res.status(200).json({ message: 'Added to cart.', cart });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/cart', async (req, res) => {
    try {
      const result = isAuthenticatedAnIisValid(req, res, "cart");
      if (!result || result.userId == null) return;
      const { productId, userId } = result;
      const productIdInt = parseInt(productId, 10);
      const { quantity } = req.body;
      const qty = quantity && Number.isInteger(quantity) && quantity > 0 ? quantity : 1;

      // Fetch current cart
      const selectQuery = `SELECT cart_json FROM users WHERE id = $1`;
      const selectValues = [userId];
      const selectResult = await pool.query(selectQuery, selectValues);
      let cart = selectResult.rows[0]?.cart_json || {};

      if (!cart[productIdInt]) {
        return res.status(404).json({ message: 'Product not found in cart.' });
      }
      // Decrement or remove
      if (cart[productIdInt] > qty) {
        cart[productIdInt] -= qty;
      } else {
        delete cart[productIdInt];
      }

      // Update cart in DB
      const updateQuery = `
        UPDATE users
        SET cart_json = $1
        WHERE id = $2
      `;
      const updateValues = [cart, userId];
      await pool.query(updateQuery, updateValues);

      return res.status(200).json({ message: 'Product removed from cart successfully.', cart });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/cart', async (req, res) => {
    try {
      const result = isAuthenticatedAnIisValid(req, res, "cart");
      if (!result || result.userId == null) return;
      const { userId } = result;
      const query = `SELECT cart_json FROM users WHERE id = $1`;
      const values = [userId];
      const dbResult = await pool.query(query, values);
      if (dbResult.rows.length === 0) {
        return res.status(404).json({ message: 'Cart not found.' });
      }
      return res.status(200).json({ cart: dbResult.rows[0].cart_json || {} });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};
