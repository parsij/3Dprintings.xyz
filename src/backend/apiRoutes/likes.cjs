const {
  normalizeNumericArray,
  toggleNumericId,
  ensureLikesColumns,
} = require('./likesShared.cjs');
const { resolveShopLogoFromSources } = require('./sellerProfileShared.cjs');

module.exports = function likesSavesRoutes(deps) {
  const { app, pool, getAuthUserFromRequest } = deps;
  const IMAGE_BASE_URL = 'https://3dprintings.xyz/api/imgUploads';
  const SHOP_LOGO_SQL = `COALESCE(NULLIF(sp.shop_logo_url, ''), NULLIF(u.seller_preferences->>'shopLogoUrl', '')) AS shop_logo_url`;

  function mapProductRow(p) {
    const firstImage =
      Array.isArray(p.img_path) && p.img_path.length > 0 ? p.img_path[0] : null;
    return {
      ...p,
      image_url: firstImage
        ? `${IMAGE_BASE_URL}/${firstImage}`
        : null,
      seller_id: p.user_id,
      shop_name: p.shop_name || p.creator_name || '',
      shop_logo_url: resolveShopLogoFromSources(p.shop_logo_url) || null,
    };
  }

  // Toggle Like
  app.post('/api/products/:id/like', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const productId = parseInt(req.params.id, 10);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      const productResult = await pool.query(
        'SELECT id FROM products WHERE id = $1',
        [productId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      await ensureLikesColumns(pool);

      // Get user's current liked_products and liked_reviews
      const userResult = await pool.query(
        `SELECT COALESCE(liked_products, '[]'::jsonb) AS liked_products,
                COALESCE(liked_reviews, '[]'::jsonb) AS liked_reviews
         FROM users
         WHERE id = $1`,
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const toggledLike = toggleNumericId(userResult.rows[0].liked_products, productId);

      await pool.query(
        'UPDATE users SET liked_products = $1::jsonb WHERE id = $2',
        [JSON.stringify(toggledLike.ids), authUser.id]
      );

      res.json({
        message: toggledLike.isActive ? 'Product liked' : 'Product unliked',
        isLiked: toggledLike.isActive,
        likedCount: toggledLike.ids.length
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Toggle Review Like
  app.post('/api/reviews/:id/like', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const reviewId = parseInt(req.params.id, 10);
      if (!Number.isInteger(reviewId) || reviewId <= 0) {
        return res.status(400).json({ message: 'Invalid review ID' });
      }

      const reviewResult = await pool.query(
        'SELECT id FROM reviews WHERE id = $1',
        [reviewId]
      );

      if (reviewResult.rows.length === 0) {
        return res.status(404).json({ message: 'Review not found' });
      }

      await ensureLikesColumns(pool);

      // Read both columns to keep product/review likes in sync logic.
      const userResult = await pool.query(
        `SELECT COALESCE(liked_products, '[]'::jsonb) AS liked_products,
                COALESCE(liked_reviews, '[]'::jsonb) AS liked_reviews
         FROM users
         WHERE id = $1`,
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const toggledLike = toggleNumericId(userResult.rows[0].liked_reviews, reviewId);

      await pool.query(
        'UPDATE users SET liked_reviews = $1::jsonb WHERE id = $2',
        [JSON.stringify(toggledLike.ids), authUser.id]
      );

      return res.json({
        message: toggledLike.isActive ? 'Review liked' : 'Review unliked',
        isLiked: toggledLike.isActive,
        likedCount: toggledLike.ids.length,
      });
    } catch (error) {
      console.error('Error toggling review like:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Toggle Save
  app.post('/api/products/:id/save', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const productId = parseInt(req.params.id, 10);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      await ensureLikesColumns(pool);

      // Get user's current saved_products
      const userResult = await pool.query(
        'SELECT saved_products FROM users WHERE id = $1',
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const toggledSave = toggleNumericId(userResult.rows[0].saved_products, productId);

      await pool.query(
        'UPDATE users SET saved_products = $1::jsonb WHERE id = $2',
        [JSON.stringify(toggledSave.ids), authUser.id]
      );

      res.json({
        message: toggledSave.isActive ? 'Product saved' : 'Product unsaved',
        isSaved: toggledSave.isActive,
        savedCount: toggledSave.ids.length
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

      await ensureLikesColumns(pool);

      const userResult = await pool.query(
        'SELECT liked_products FROM users WHERE id = $1',
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const likedProducts = normalizeNumericArray(userResult.rows[0].liked_products);
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

      await ensureLikesColumns(pool);

      const userResult = await pool.query(
        'SELECT liked_products FROM users WHERE id = $1',
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const likedIds = normalizeNumericArray(userResult.rows[0].liked_products);
      if (likedIds.length === 0) {
        return res.json({ products: [] });
      }

      const result = await pool.query(
        `SELECT p.*, u.username as creator_name, sp.shop_name, ${SHOP_LOGO_SQL}
         FROM products p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN seller_profiles sp ON sp.seller_user_id = p.user_id
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

      await ensureLikesColumns(pool);

      const userResult = await pool.query(
        'SELECT saved_products FROM users WHERE id = $1',
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const savedProducts = normalizeNumericArray(userResult.rows[0].saved_products);
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

      await ensureLikesColumns(pool);

      const userResult = await pool.query(
        'SELECT saved_products FROM users WHERE id = $1',
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const savedIds = normalizeNumericArray(userResult.rows[0].saved_products);
      if (savedIds.length === 0) {
        return res.json({ products: [] });
      }

      const result = await pool.query(
        `SELECT p.*, u.username as creator_name, sp.shop_name, ${SHOP_LOGO_SQL}
         FROM products p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN seller_profiles sp ON sp.seller_user_id = p.user_id
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
      const productId = parseInt(req.params.id, 10);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      if (!authUser) {
        return res.json({ isLiked: false, isSaved: false });
      }

      await ensureLikesColumns(pool);

      const userResult = await pool.query(
        `SELECT COALESCE(liked_products, '[]'::jsonb) AS liked_products,
                COALESCE(saved_products, '[]'::jsonb) AS saved_products,
                COALESCE(liked_reviews, '[]'::jsonb) AS liked_reviews
         FROM users
         WHERE id = $1`,
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.json({ isLiked: false, isSaved: false });
      }

      const likedProducts = normalizeNumericArray(userResult.rows[0].liked_products);
      const savedProducts = normalizeNumericArray(userResult.rows[0].saved_products);
      const likedReviews = normalizeNumericArray(userResult.rows[0].liked_reviews);

      res.json({
        isLiked: likedProducts.includes(productId),
        isSaved: savedProducts.includes(productId),
        likedReviews,
      });
    } catch (error) {
      console.error('Error checking product status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
};
