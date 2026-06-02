module.exports = function productRoutes(deps) {
  const { app, pool } = deps;
  const path = require("path");
  const { resolveShopLogoFromSources } = require("./sellerProfileShared.cjs");
  const { ensureSellerAvatarIfNeeded } = require("./sellerAvatar.cjs");
  const { ensureChatUserPocketBaseId } = require("./chatShared.cjs");
  const IMAGE_BASE_URL = 'https://3dprintings.xyz/api/imgUploads';
  const sellerUploadDir = path.join(__dirname, "..", "imgUploads");
  const SHOP_LOGO_SQL = `COALESCE(NULLIF(sp.shop_logo_url, ''), NULLIF(u.seller_preferences->>'shopLogoUrl', '')) AS shop_logo_url`;

  const buildImageUrl = (req, fileName) => {
    if (!fileName) return null;
    const protocol = req.protocol || "https";
    const host = req.get("host");
    return `${protocol}://${host}/api/imgUploads/${fileName}`;
  };

  const normalizeProductRow = (p, includeImages = false) => {
    const images = Array.isArray(p.img_path) && p.img_path.length > 0
      ? p.img_path.map(img => `${IMAGE_BASE_URL}/${img}`)
      : [];
    const firstImage = images.length > 0 ? images[0] : null;

    let parsedTags = [];
    if (p.tags) {
      if (Array.isArray(p.tags)) parsedTags = p.tags;
      else if (typeof p.tags === 'string') {
        try { parsedTags = JSON.parse(p.tags); }
        catch { parsedTags = p.tags.split(',').map(t => t.trim()).filter(Boolean); }
      }
    }

    const category = typeof p.category === 'string' && p.category.trim().length > 0 ? p.category.trim() : null;

    return {
      ...p,
      image_url: firstImage,
      ...(includeImages ? { images } : {}),
      tags: parsedTags,
      category,
      seller_id: p.user_id,
      seller_pocketbase_id: p.seller_pocketbase_id || null,
      seller_chat_id: p.seller_pocketbase_id || null,
      shop_name: p.shop_name || p.creator_name || '',
      shop_logo_url: resolveShopLogoFromSources(p.shop_logo_url) || null,
    };
  };

  const mapShopRow = (row) => ({
    sellerId: Number(row.seller_user_id || row.id),
    sellerPocketBaseId: row.seller_pocketbase_id || null,
    sellerChatId: row.seller_pocketbase_id || null,
    username: row.username || '',
    shopName: row.shop_name || row.username || 'Shop',
    shopBio: row.shop_bio || '',
    shopLogoUrl: resolveShopLogoFromSources(row.shop_logo_url),
    primaryPrinterSpecialization: row.primary_printer_specialization || '',
    designSoftware: Array.isArray(row.design_software) ? row.design_software : [],
    externalPortfolioLink: row.external_portfolio_link || '',
  });

  async function attachSellerChatId(productRow) {
    const sellerUserId = Number(productRow?.user_id);
    if (!Number.isInteger(sellerUserId) || sellerUserId <= 0) {
      return productRow;
    }

    try {
      const sellerPocketBaseId = await ensureChatUserPocketBaseId(pool, sellerUserId);
      return {
        ...productRow,
        seller_pocketbase_id: sellerPocketBaseId,
      };
    } catch (error) {
      console.error("Failed to ensure seller chat account:", error?.message || error);
      return productRow;
    }
  }

  const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 12));
    return { page, limit, offset: (page - 1) * limit };
  };

  app.get('/api/products', async (req, res) => {
    try {
      const { page, limit, offset } = parsePagination(req.query);
      const sort = req.query.sort || 'relevant';

      let orderClause = 'ORDER BY p.id DESC';
      if (sort === 'price_asc') {
        orderClause = 'ORDER BY p.current_price ASC';
      } else if (sort === 'price_desc') {
        orderClause = 'ORDER BY p.current_price DESC';
      } else if (sort === 'sales') {
        orderClause = 'ORDER BY p.sales_count DESC';
      }

      const result = await pool.query(
        `SELECT p.*, u.username as creator_name,
                u.pocketbase_id AS seller_pocketbase_id,
                sp.shop_name,
                ${SHOP_LOGO_SQL},
                COALESCE(r.review_count, 0)::int AS reviews_count
         FROM products p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN seller_profiles sp ON sp.seller_user_id = p.user_id
         LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS review_count
            FROM reviews
            WHERE reviews.product_id = p.id
         ) r ON true
         ${orderClause}
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const products = result.rows.map((p) => normalizeProductRow(p));

      res.json({
        products,
        hasMore: result.rows.length === limit
      });
    } catch (err) {
      console.error('Error fetching products:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/products/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').slice(0, 200);
      const { page, limit, offset } = parsePagination(req.query);
      const sort = req.query.sort || 'relevant';

      let orderClause = 'ORDER BY p.id DESC';
      if (sort === 'price_asc') {
        orderClause = 'ORDER BY p.current_price ASC';
      } else if (sort === 'price_desc') {
        orderClause = 'ORDER BY p.current_price DESC';
      } else if (sort === 'sales') {
        orderClause = 'ORDER BY p.sales_count DESC';
      }

      const result = await pool.query(
        `SELECT p.*, u.username as creator_name,
                u.pocketbase_id AS seller_pocketbase_id,
                sp.shop_name,
                ${SHOP_LOGO_SQL},
                COALESCE(r.review_count, 0)::int AS reviews_count
         FROM products p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN seller_profiles sp ON sp.seller_user_id = p.user_id
         LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS review_count
            FROM reviews
            WHERE reviews.product_id = p.id
         ) r ON true
         WHERE p.name ILIKE $1
         ${orderClause}
         LIMIT $2 OFFSET $3`,
        [`%${q}%`, limit, offset]
      );

      const products = result.rows.map((p) => normalizeProductRow(p));

      res.json({
        products,
        hasMore: result.rows.length === limit
      });
    } catch (err) {
      console.error('Error searching products:', err);
      res.status(500).json({ message: 'Server error during search' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      const result = await pool.query(
        `SELECT p.*, u.username as creator_name,
                u.pocketbase_id AS seller_pocketbase_id,
                sp.shop_name,
                sp.shop_bio,
                ${SHOP_LOGO_SQL},
                sp.primary_printer_specialization,
                sp.design_software,
                sp.external_portfolio_link,
                COALESCE(r.review_count, 0)::int AS reviews_count
         FROM products p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN seller_profiles sp ON sp.seller_user_id = p.user_id
         LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS review_count
            FROM reviews
            WHERE reviews.product_id = p.id
         ) r ON true
         WHERE p.id = $1`,
        [productId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const productRow = await attachSellerChatId(result.rows[0]);
      const product = normalizeProductRow(productRow, true);

      res.json(product);
    } catch (err) {
      console.error('Error fetching product:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/shops/:shopIdentifier', async (req, res) => {
    try {
      const shopIdentifier = decodeURIComponent(String(req.params.shopIdentifier || "").trim());
      if (!shopIdentifier) {
        return res.status(400).json({ message: 'Invalid shop name' });
      }

      const numericId = /^\d+$/.test(shopIdentifier) ? parseInt(shopIdentifier, 10) : null;
      const shopResult = await pool.query(
        `SELECT u.id,
                u.username,
                u.pocketbase_id AS seller_pocketbase_id,
                sp.seller_user_id,
                sp.shop_name,
                sp.shop_bio,
                ${SHOP_LOGO_SQL},
                sp.primary_printer_specialization,
                sp.design_software,
                sp.external_portfolio_link
         FROM users u
         LEFT JOIN seller_profiles sp ON sp.seller_user_id = u.id
         WHERE lower(sp.shop_name) = lower($1)
            OR ($2::int IS NOT NULL AND u.id = $2)
         ORDER BY (lower(sp.shop_name) = lower($1)) DESC
         LIMIT 1`,
        [shopIdentifier, Number.isInteger(numericId) && numericId > 0 ? numericId : null]
      );

      if (shopResult.rows.length === 0) {
        return res.status(404).json({ message: 'Shop not found' });
      }

      const sellerId = Number(shopResult.rows[0].id);

      const shopRow = await attachSellerChatId({
        ...shopResult.rows[0],
        user_id: shopResult.rows[0].id,
      });
      const shopName = shopRow.shop_name || shopRow.username || "";
      let shopLogoUrl = resolveShopLogoFromSources(shopRow.shop_logo_url);

      if (shopName) {
        shopLogoUrl = await ensureSellerAvatarIfNeeded({
          pool,
          sellerId,
          shopName,
          currentLogoUrl: shopLogoUrl,
          uploadDir: sellerUploadDir,
          buildImageUrl,
          req,
        });
        shopRow.shop_logo_url = shopLogoUrl;
      }

      const productsResult = await pool.query(
        `SELECT p.*, u.username as creator_name,
                u.pocketbase_id AS seller_pocketbase_id,
                sp.shop_name,
                ${SHOP_LOGO_SQL},
                COALESCE(r.review_count, 0)::int AS reviews_count
         FROM products p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN seller_profiles sp ON sp.seller_user_id = p.user_id
         LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS review_count
            FROM reviews
            WHERE reviews.product_id = p.id
         ) r ON true
         WHERE p.user_id = $1
         ORDER BY p.id DESC`,
        [sellerId]
      );

      res.json({
        shop: mapShopRow(shopRow),
        products: productsResult.rows.map((p) => normalizeProductRow({
          ...p,
          shop_logo_url: shopLogoUrl || p.shop_logo_url,
        })),
      });
    } catch (err) {
      console.error('Error fetching shop:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });
};
// possible bug maybe when giving the full access to the photos for the frontend maybe it gets the whole data and use a lot more bandwidth and waste internet or give a lot of unnecessary access to the photos for the frontend
