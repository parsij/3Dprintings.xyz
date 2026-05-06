module.exports = function likesSavesRoutes(deps) {
  const { app, pool, getAuthUserFromRequest } = deps;

  function mapProductRow(p) {
    const firstImage =
      Array.isArray(p.img_path) && p.img_path.length > 0 ? p.img_path[0] : null;
    return {
      ...p,
      image_url: firstImage
        ? `http://localhost:3000/imgUploads/${firstImage}`
        : null,
    };
  }

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

  // Full product rows for liked list (used by Liked Products page)
  app.get('/api/likes/liked-products', async (req, res) => {
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

      const likedIdsRaw = userResult.rows[0].liked_products || [];
      const likedIds = Array.isArray(likedIdsRaw)
        ? likedIdsRaw
            .map((id) => parseInt(id, 10))
            .filter((id) => Number.isInteger(id) && id > 0)
        : [];
      if (likedIds.length === 0) {
        return res.json({ products: [] });
      }

      const result = await pool.query(
        `SELECT p.*, u.username as creator_name
         FROM products p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ANY($1::int[])`,
        [likedIds]
      );

      const byId = new Map(result.rows.map((row) => [row.id, row]));
      const orderedRows = likedIds.map((id) => byId.get(id)).filter(Boolean);

      res.json({ products: orderedRows.map(mapProductRow) });
    } catch (error) {
      console.error('Error fetching liked products (full):', error);
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

  // Full product rows for saved list (used by Saved Products page)
  app.get('/api/likes/saved-products', async (req, res) => {
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

      const savedIdsRaw = userResult.rows[0].saved_products || [];
      const savedIds = Array.isArray(savedIdsRaw)
        ? savedIdsRaw
            .map((id) => parseInt(id, 10))
            .filter((id) => Number.isInteger(id) && id > 0)
        : [];
      if (savedIds.length === 0) {
        return res.json({ products: [] });
      }

      const result = await pool.query(
        `SELECT p.*, u.username as creator_name
         FROM products p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ANY($1::int[])`,
        [savedIds]
      );

      const byId = new Map(result.rows.map((row) => [row.id, row]));
      const orderedRows = savedIds.map((id) => byId.get(id)).filter(Boolean);

      res.json({ products: orderedRows.map(mapProductRow) });
    } catch (error) {
      console.error('Error fetching saved products (full):', error);
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

