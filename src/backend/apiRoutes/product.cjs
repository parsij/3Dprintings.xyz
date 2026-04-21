module.exports = function productRoutes(deps) {
  const { app, pool } = deps;

  app.get('/api/products', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `SELECT p.*, u.username as creator_name
         FROM products p
         LEFT JOIN users u ON p.user_id = u.id
         ORDER BY p.id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const products = result.rows.map(p => {
        // img_path is the array you saved in create.cjs
        // We take the first image if it exists
        const firstImage = Array.isArray(p.img_path) && p.img_path.length > 0 
          ? p.img_path[0] 
          : null;

        return {
          ...p,
          // We provide the full URL for the frontend
          image_url: firstImage ? `http://localhost:3000/imgUploads/${firstImage}` : null
        };
      });

      res.json({
        products,
        hasMore: result.rows.length === limit
      });
    } catch (err) {
      console.error('Error fetching products:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });
};
