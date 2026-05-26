const { normalizeNumericArray, ensureLikesColumns } = require('./likesShared.cjs');
const { notifySellerOfNewReview } = require('./sellerNotifications.cjs');

module.exports = function reviewsRoutes(deps) {
  const { app, pool, getAuthUserFromRequest, isAuthenticatedAnIisValid, enqueueWrite } = deps;

  const readProductRatingStats = async (productId) => {
    const aggregateResult = await pool.query(
      `SELECT COALESCE(AVG(rating), 0)::numeric(3,2) AS average_rating,
              COUNT(*)::int AS reviews_count
       FROM reviews
       WHERE product_id = $1`,
      [productId]
    );

    return {
      averageRating: Number(aggregateResult.rows[0]?.average_rating || 0),
      reviewsCount: Number(aggregateResult.rows[0]?.reviews_count || 0),
    };
  };

  const scheduleProductRatingUpdate = async (productId) => {
    await enqueueWrite(
      'products.updateRating',
      { productId },
      { jobKey: `product-rating:${productId}` }
    );
  };

   app.get('/api/user/reviews', async (req, res) => {
     try {
       const auth = getAuthUserFromRequest(req);
       if (!auth?.id) {
         return res.status(401).json({ message: 'Unauthorized' });
       }

       const reviewsResult = await pool.query(
         `SELECT r.id, r.product_id, r.user_id, r.rating, r.content, r.created_at, u.username, p.name as product_name, p.img_path as image_url
          FROM reviews r
          LEFT JOIN users u ON r.user_id = u.id
          LEFT JOIN products p ON r.product_id = p.id
          WHERE r.user_id = $1
          ORDER BY r.created_at DESC, r.id DESC`,
         [auth.id]
       );

       const reviews = reviewsResult.rows;

       return res.json({ reviews });
     } catch (error) {
       console.error('Error fetching user reviews:', error);
       return res.status(500).json({ message: 'Server error' });
     }
   });

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
         `SELECT r.id, r.product_id, r.user_id, r.rating, r.content, r.created_at, r.seller_reply, r.seller_reply_updated_at, u.username
          FROM reviews r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE r.product_id = $1
          ORDER BY r.created_at DESC, r.id DESC`,
         [productId]
       );

       const reviews = reviewsResult.rows.map((review) => ({
         ...review,
         isLiked: likedReviewIds.includes(review.id),
         sellerReply: review.seller_reply || "",
         sellerReplyUpdatedAt: review.seller_reply_updated_at || null,
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

      const reviewCountResult = await pool.query(
        'SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND user_id = $2',
        [productId, auth.userId]
      );
      if (parseInt(reviewCountResult.rows[0].count, 10) >= 5) {
        return res.status(400).json({ message: 'You cannot leave more than 5 reviews per item.' });
      }

      const insertResult = await pool.query(
        `INSERT INTO reviews (product_id, user_id, rating, content)
         VALUES ($1, $2, $3, $4)
         RETURNING id, product_id, user_id, rating, content, created_at`,
        [productId, auth.userId, rating, contentValue || null]
      );

      await scheduleProductRatingUpdate(productId);
      const { averageRating, reviewsCount } = await readProductRatingStats(productId);

      const usernameResult = await pool.query(
        'SELECT username FROM users WHERE id = $1',
        [auth.userId]
      );

      notifySellerOfNewReview(pool, {
        productId,
        rating,
        content: contentValue,
        reviewerUsername: usernameResult.rows[0]?.username,
      }).catch((error) => {
        console.error(`Failed to send seller review notification for product ${productId}:`, error);
      });

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

  app.put('/api/products/:productId/reviews/:reviewId', async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, 'reviews');
      if (!auth?.userId) return;

      const productId = parseInt(req.params.productId, 10);
      const reviewId = parseInt(req.params.reviewId, 10);

      if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(reviewId) || reviewId <= 0) {
        return res.status(400).json({ message: 'Invalid product or review ID' });
      }

      const existingReviewResult = await pool.query(
        `SELECT r.id, r.product_id, r.user_id, r.rating, r.content, r.created_at, u.username
         FROM reviews r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.id = $1 AND r.product_id = $2`,
        [reviewId, productId]
      );

      if (existingReviewResult.rows.length === 0) {
        return res.status(404).json({ message: 'Review not found' });
      }

      const existingReview = existingReviewResult.rows[0];
      if (Number(existingReview.user_id) !== Number(auth.userId)) {
        return res.status(403).json({ message: 'You can only edit your own reviews' });
      }

      const updateResult = await pool.query(
        `UPDATE reviews
         SET rating = $1, content = $2
         WHERE id = $3 AND product_id = $4
         RETURNING id, product_id, user_id, rating, content, created_at`,
        [auth.rating, auth.content || null, reviewId, productId]
      );
      await scheduleProductRatingUpdate(productId);
      const { averageRating, reviewsCount } = await readProductRatingStats(productId);

      return res.json({
        message: 'Review updated',
        review: {
          ...updateResult.rows[0],
          username: existingReview.username || null,
        },
        averageRating,
        reviewsCount,
      });
    } catch (error) {
      console.error('Error updating review:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/products/:productId/reviews/:reviewId', async (req, res) => {
    try {
      const auth = isAuthenticatedAnIisValid(req, res, 'nothing');
      if (!auth?.userId) return;

      const productId = parseInt(req.params.productId, 10);
      const reviewId = parseInt(req.params.reviewId, 10);

      if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(reviewId) || reviewId <= 0) {
        return res.status(400).json({ message: 'Invalid product or review ID' });
      }

      const existingReviewResult = await pool.query(
        'SELECT id, user_id FROM reviews WHERE id = $1 AND product_id = $2',
        [reviewId, productId]
      );

      if (existingReviewResult.rows.length === 0) {
        return res.status(404).json({ message: 'Review not found' });
      }

      const existingReview = existingReviewResult.rows[0];
      if (Number(existingReview.user_id) !== Number(auth.userId)) {
        return res.status(403).json({ message: 'You can only delete your own reviews' });
      }

      await pool.query(
        'DELETE FROM reviews WHERE id = $1 AND product_id = $2',
        [reviewId, productId]
      );
      await scheduleProductRatingUpdate(productId);
      const { averageRating, reviewsCount } = await readProductRatingStats(productId);

      return res.json({
        message: 'Review deleted',
        deletedReviewId: reviewId,
        averageRating,
        reviewsCount,
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};
