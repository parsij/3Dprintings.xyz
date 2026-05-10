const { normalizeNumericArray, ensureLikesColumns } = require('./likesShared.cjs');

module.exports = function reviewsRoutes(deps) {
  const { app, pool, getAuthUserFromRequest, isAuthenticatedAnIisValid } = deps;

  app.get('/api/products/:id/reviews', async (req, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      const authUser = getAuthUserFromRequest(req);
      let likedReviewIds = [];

      if (authUser?.id) {
        await ensureLikesColumns(pool);

        const likedResult = await pool.query(
          `SELECT COALESCE(liked_reviews, '[]'::jsonb) AS liked_reviews
           FROM users
           WHERE id = $1`,
          [authUser.id]
        );

        if (likedResult.rows.length > 0) {
          likedReviewIds = normalizeNumericArray(likedResult.rows[0].liked_reviews);
        }
      }

      const reviewsResult = await pool.query(
        `SELECT r.id, r.product_id, r.user_id, r.rating, r.content, r.created_at, u.username
         FROM reviews r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.product_id = $1
         ORDER BY r.created_at DESC, r.id DESC`,
        [productId]
      );

      const reviews = reviewsResult.rows.map((review) => ({
        ...review,
        isLiked: likedReviewIds.includes(review.id),
      }));

      return res.json({ reviews });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/products/:id/reviews', async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, 'reviews');
      if (!auth?.userId) return;

      const productId = parseInt(req.params.id, 10);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      const rating = auth.rating;
      const contentValue = auth.content;

      const productResult = await pool.query(
        'SELECT id FROM products WHERE id = $1',
        [productId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const insertResult = await pool.query(
        `INSERT INTO reviews (product_id, user_id, rating, content)
         VALUES ($1, $2, $3, $4)
         RETURNING id, product_id, user_id, rating, content, created_at`,
        [productId, auth.userId, rating, contentValue || null]
      );

      const aggregateResult = await pool.query(
        `SELECT COALESCE(AVG(rating), 0)::numeric(3,2) AS average_rating,
                COUNT(*)::int AS reviews_count
         FROM reviews
         WHERE product_id = $1`,
        [productId]
      );

      const averageRating = Number(aggregateResult.rows[0]?.average_rating || 0);
      const reviewsCount = Number(aggregateResult.rows[0]?.reviews_count || 0);

      await pool.query(
        'UPDATE products SET rating = $1 WHERE id = $2',
        [averageRating, productId]
      );

      const usernameResult = await pool.query(
        'SELECT username FROM users WHERE id = $1',
        [auth.userId]
      );

      return res.status(201).json({
        message: 'Review submitted',
        review: {
          ...insertResult.rows[0],
          username: usernameResult.rows[0]?.username || null,
          isLiked: false,
        },
        averageRating,
        reviewsCount,
      });
    } catch (error) {
      console.error('Error submitting review:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};