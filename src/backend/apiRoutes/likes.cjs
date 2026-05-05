module.exports = function likesSavesRoutes(deps) {
  const { app, pool, getAuthUserFromRequest } = deps;

  // Toggle Like
  app.post('/api/products/:id/like', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const productId = parseInt(req.params.id);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      // Get user's current liked_products
      const userResult = await pool.query(
        'SELECT liked_products FROM users WHERE id = $1',
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      let likedProducts = userResult.rows[0].liked_products || [];
      const isLiked = likedProducts.includes(productId);

      // Toggle like
      if (isLiked) {
        likedProducts = likedProducts.filter(id => id !== productId);
      } else {
        likedProducts.push(productId);
      }

       // Update database
       await pool.query(
         'UPDATE users SET liked_products = $1::jsonb WHERE id = $2',
         [JSON.stringify(likedProducts), authUser.id]
       );

      res.json({
        message: isLiked ? 'Product unliked' : 'Product liked',
        isLiked: !isLiked,
        likedCount: likedProducts.length
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Toggle Save
  app.post('/api/products/:id/save', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const productId = parseInt(req.params.id);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      // Get user's current saved_products
      const userResult = await pool.query(
        'SELECT saved_products FROM users WHERE id = $1',
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      let savedProducts = userResult.rows[0].saved_products || [];
      const isSaved = savedProducts.includes(productId);

      // Toggle save
      if (isSaved) {
        savedProducts = savedProducts.filter(id => id !== productId);
      } else {
        savedProducts.push(productId);
      }

       // Update database
       await pool.query(
         'UPDATE users SET saved_products = $1::jsonb WHERE id = $2',
         [JSON.stringify(savedProducts), authUser.id]
       );

      res.json({
        message: isSaved ? 'Product unsaved' : 'Product saved',
        isSaved: !isSaved,
        savedCount: savedProducts.length
      });
    } catch (error) {
      console.error('Error toggling save:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get Liked Products
  app.get('/api/user/liked', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const userResult = await pool.query(
        'SELECT liked_products FROM users WHERE id = $1',
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const likedProducts = userResult.rows[0].liked_products || [];
      res.json({ likedProducts });
    } catch (error) {
      console.error('Error fetching liked products:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get Saved Products
  app.get('/api/user/saved', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const userResult = await pool.query(
        'SELECT saved_products FROM users WHERE id = $1',
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const savedProducts = userResult.rows[0].saved_products || [];
      res.json({ savedProducts });
    } catch (error) {
      console.error('Error fetching saved products:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Check if product is liked/saved
  app.get('/api/products/:id/status', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      const productId = parseInt(req.params.id);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      if (!authUser) {
        return res.json({ isLiked: false, isSaved: false });
      }

      const userResult = await pool.query(
        'SELECT liked_products, saved_products FROM users WHERE id = $1',
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.json({ isLiked: false, isSaved: false });
      }

      const likedProducts = userResult.rows[0].liked_products || [];
      const savedProducts = userResult.rows[0].saved_products || [];

      res.json({
        isLiked: likedProducts.includes(productId),
        isSaved: savedProducts.includes(productId)
      });
    } catch (error) {
      console.error('Error checking product status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
};

