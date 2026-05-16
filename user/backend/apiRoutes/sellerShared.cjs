const IMAGE_BASE_URL = process.env.SELLER_DASHBOARD_IMAGE_BASE_URL || "/api/imgUploads";

function formatMoney(value) {
  const num = Number(value || 0);
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatMonthOverMonth(currentValue, previousValue) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);

  if (previous === 0 && current === 0) {
    return "No change month over month";
  }
  if (previous === 0 && current > 0) {
    return "New this month";
  }

  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.abs(pct).toFixed(0);
  return `${pct >= 0 ? "+" : "-"}${rounded}% month over month`;
}

function toImageUrl(imageName) {
  if (!imageName) return "";
  if (IMAGE_BASE_URL.endsWith("/")) return `${IMAGE_BASE_URL}${imageName}`;
  return `${IMAGE_BASE_URL}/${imageName}`;
}

const SELLER_LINE_ITEMS_CTE = `
  WITH seller_line_items AS (
    SELECT
      o.id AS order_id,
      o.created_at,
      CASE
        WHEN COALESCE(item->>'id', '') ~ '^\\d+$' THEN (item->>'id')::int
        WHEN COALESCE(item->>'productId', '') ~ '^\\d+$' THEN (item->>'productId')::int
        ELSE NULL
      END AS product_id,
      CASE
        WHEN COALESCE(item->>'quantity', '') ~ '^\\d+$' THEN (item->>'quantity')::int
        ELSE 0
      END AS quantity,
      CASE
        WHEN COALESCE(item->>'current_price', '') ~ '^\\d+(\\.\\d+)?$' THEN (item->>'current_price')::numeric
        WHEN COALESCE(item->>'price', '') ~ '^\\d+(\\.\\d+)?$' THEN (item->>'price')::numeric
        ELSE NULL
      END AS item_price
    FROM orders o
    JOIN LATERAL jsonb_array_elements(COALESCE(o.items->'items', '[]'::jsonb)) AS item ON TRUE
    WHERE o.status = 'completed'
  )
`;

async function ensureSellerDashboardTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seller_dashboard_metrics (
      seller_user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      lifetime_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
      lifetime_units_sold INTEGER NOT NULL DEFAULT 0,
      lifetime_orders INTEGER NOT NULL DEFAULT 0,
      total_reviews INTEGER NOT NULL DEFAULT 0,
      average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
      revenue_this_month NUMERIC(12,2) NOT NULL DEFAULT 0,
      revenue_last_month NUMERIC(12,2) NOT NULL DEFAULT 0,
      sales_this_month INTEGER NOT NULL DEFAULT 0,
      sales_last_month INTEGER NOT NULL DEFAULT 0,
      reviews_this_month INTEGER NOT NULL DEFAULT 0,
      reviews_last_month INTEGER NOT NULL DEFAULT 0,
      daily_sales JSONB NOT NULL DEFAULT '[]'::jsonb,
      monthly_revenue JSONB NOT NULL DEFAULT '[]'::jsonb,
      top_products JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function computeSellerDashboardSnapshot(pool, sellerUserId) {
  const aggregateResult = await pool.query(
    `
      ${SELLER_LINE_ITEMS_CTE}
      SELECT
        COALESCE(SUM(li.quantity), 0)::int AS lifetime_units_sold,
        COALESCE(SUM(li.quantity * COALESCE(li.item_price, p.current_price, 0)), 0)::numeric(12,2) AS lifetime_revenue,
        COALESCE(COUNT(DISTINCT li.order_id), 0)::int AS lifetime_orders,
        COALESCE(SUM(
          CASE WHEN date_trunc('month', li.created_at) = date_trunc('month', CURRENT_DATE)
               THEN li.quantity * COALESCE(li.item_price, p.current_price, 0)
               ELSE 0
          END
        ), 0)::numeric(12,2) AS revenue_this_month,
        COALESCE(SUM(
          CASE WHEN date_trunc('month', li.created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
               THEN li.quantity * COALESCE(li.item_price, p.current_price, 0)
               ELSE 0
          END
        ), 0)::numeric(12,2) AS revenue_last_month,
        COALESCE(SUM(
          CASE WHEN date_trunc('month', li.created_at) = date_trunc('month', CURRENT_DATE)
               THEN li.quantity ELSE 0
          END
        ), 0)::int AS sales_this_month,
        COALESCE(SUM(
          CASE WHEN date_trunc('month', li.created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
               THEN li.quantity ELSE 0
          END
        ), 0)::int AS sales_last_month
      FROM seller_line_items li
      JOIN products p ON p.id = li.product_id
      WHERE p.user_id = $1
    `,
    [sellerUserId]
  );
  const aggregates = aggregateResult.rows[0] || {};

  const reviewsResult = await pool.query(
    `
      SELECT
        COALESCE(COUNT(*), 0)::int AS total_reviews,
        COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)::numeric(3,2) AS average_rating,
        COALESCE(COUNT(*) FILTER (
          WHERE date_trunc('month', r.created_at) = date_trunc('month', CURRENT_DATE)
        ), 0)::int AS reviews_this_month,
        COALESCE(COUNT(*) FILTER (
          WHERE date_trunc('month', r.created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        ), 0)::int AS reviews_last_month
      FROM reviews r
      JOIN products p ON p.id = r.product_id
      WHERE p.user_id = $1
    `,
    [sellerUserId]
  );
  const reviews = reviewsResult.rows[0] || {};

  const dailySalesResult = await pool.query(
    `
      ${SELLER_LINE_ITEMS_CTE},
      days AS (
        SELECT generate_series(
          (CURRENT_DATE - INTERVAL '7 day')::date,
          CURRENT_DATE::date,
          INTERVAL '1 day'
        )::date AS day
      ),
      sales AS (
        SELECT
          date_trunc('day', li.created_at)::date AS day,
          COALESCE(SUM(li.quantity), 0)::int AS units
        FROM seller_line_items li
        JOIN products p ON p.id = li.product_id
        WHERE p.user_id = $1
        GROUP BY 1
      )
      SELECT
        to_char(d.day, 'DD Mon') AS day,
        COALESCE(s.units, 0)::int AS sales
      FROM days d
      LEFT JOIN sales s ON s.day = d.day
      ORDER BY d.day
    `,
    [sellerUserId]
  );
  const dailySales = dailySalesResult.rows.map((row) => ({
    day: row.day,
    sales: Number(row.sales || 0),
  }));

  const monthlyRevenueResult = await pool.query(
    `
      ${SELLER_LINE_ITEMS_CTE},
      months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '11 month',
          date_trunc('month', CURRENT_DATE),
          INTERVAL '1 month'
        )::date AS month_start
      ),
      revenue AS (
        SELECT
          date_trunc('month', li.created_at)::date AS month_start,
          COALESCE(SUM(li.quantity * COALESCE(li.item_price, p.current_price, 0)), 0)::numeric(12,2) AS amount
        FROM seller_line_items li
        JOIN products p ON p.id = li.product_id
        WHERE p.user_id = $1
        GROUP BY 1
      )
      SELECT
        to_char(m.month_start, 'Mon') AS month,
        COALESCE(r.amount, 0)::numeric(12,2) AS revenue
      FROM months m
      LEFT JOIN revenue r ON r.month_start = m.month_start
      ORDER BY m.month_start
    `,
    [sellerUserId]
  );
  const monthlyRevenue = monthlyRevenueResult.rows.map((row) => ({
    month: row.month,
    revenue: Number(row.revenue || 0),
  }));

  const topProductsResult = await pool.query(
    `
      ${SELLER_LINE_ITEMS_CTE}
      SELECT
        p.id,
        p.name,
        COALESCE(p.current_price, 0)::numeric(10,2) AS price,
        COALESCE(SUM(li.quantity), 0)::int AS sales,
        COALESCE(SUM(li.quantity * COALESCE(li.item_price, p.current_price, 0)), 0)::numeric(12,2) AS total,
        CASE
          WHEN array_length(p.img_path, 1) >= 1 THEN p.img_path[1]
          ELSE NULL
        END AS image_name
      FROM products p
      LEFT JOIN seller_line_items li ON li.product_id = p.id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY total DESC, sales DESC, p.id DESC
      LIMIT 3
    `,
    [sellerUserId]
  );

  const topProducts = topProductsResult.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    price: Number(row.price || 0),
    sales: Number(row.sales || 0),
    total: Number(row.total || 0),
    image: toImageUrl(row.image_name),
  }));

  const snapshot = {
    sellerUserId: Number(sellerUserId),
    lifetimeRevenue: Number(aggregates.lifetime_revenue || 0),
    lifetimeUnitsSold: Number(aggregates.lifetime_units_sold || 0),
    lifetimeOrders: Number(aggregates.lifetime_orders || 0),
    totalReviews: Number(reviews.total_reviews || 0),
    averageRating: Number(reviews.average_rating || 0),
    revenueThisMonth: Number(aggregates.revenue_this_month || 0),
    revenueLastMonth: Number(aggregates.revenue_last_month || 0),
    salesThisMonth: Number(aggregates.sales_this_month || 0),
    salesLastMonth: Number(aggregates.sales_last_month || 0),
    reviewsThisMonth: Number(reviews.reviews_this_month || 0),
    reviewsLastMonth: Number(reviews.reviews_last_month || 0),
    dailySales,
    monthlyRevenue,
    topProducts,
    metrics: [
      {
        title: "Total revenue of this month",
        value: formatMoney(aggregates.revenue_this_month),
        subtext: formatMonthOverMonth(aggregates.revenue_this_month, aggregates.revenue_last_month),
      },
      {
        title: "Total reviews",
        value: formatNumber(reviews.total_reviews),
        subtext: formatMonthOverMonth(reviews.reviews_this_month, reviews.reviews_last_month),
      },
      {
        title: "All time sales",
        value: formatNumber(aggregates.lifetime_units_sold),
        subtext: formatMonthOverMonth(aggregates.sales_this_month, aggregates.sales_last_month),
      },
    ],
  };

  return snapshot;
}

async function saveSellerDashboardSnapshot(pool, snapshot) {
  await pool.query(
    `
      INSERT INTO seller_dashboard_metrics (
        seller_user_id,
        lifetime_revenue,
        lifetime_units_sold,
        lifetime_orders,
        total_reviews,
        average_rating,
        revenue_this_month,
        revenue_last_month,
        sales_this_month,
        sales_last_month,
        reviews_this_month,
        reviews_last_month,
        daily_sales,
        monthly_revenue,
        top_products,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, NOW()
      )
      ON CONFLICT (seller_user_id) DO UPDATE SET
        lifetime_revenue = EXCLUDED.lifetime_revenue,
        lifetime_units_sold = EXCLUDED.lifetime_units_sold,
        lifetime_orders = EXCLUDED.lifetime_orders,
        total_reviews = EXCLUDED.total_reviews,
        average_rating = EXCLUDED.average_rating,
        revenue_this_month = EXCLUDED.revenue_this_month,
        revenue_last_month = EXCLUDED.revenue_last_month,
        sales_this_month = EXCLUDED.sales_this_month,
        sales_last_month = EXCLUDED.sales_last_month,
        reviews_this_month = EXCLUDED.reviews_this_month,
        reviews_last_month = EXCLUDED.reviews_last_month,
        daily_sales = EXCLUDED.daily_sales,
        monthly_revenue = EXCLUDED.monthly_revenue,
        top_products = EXCLUDED.top_products,
        updated_at = NOW()
    `,
    [
      snapshot.sellerUserId,
      snapshot.lifetimeRevenue,
      snapshot.lifetimeUnitsSold,
      snapshot.lifetimeOrders,
      snapshot.totalReviews,
      snapshot.averageRating,
      snapshot.revenueThisMonth,
      snapshot.revenueLastMonth,
      snapshot.salesThisMonth,
      snapshot.salesLastMonth,
      snapshot.reviewsThisMonth,
      snapshot.reviewsLastMonth,
      JSON.stringify(snapshot.dailySales || []),
      JSON.stringify(snapshot.monthlyRevenue || []),
      JSON.stringify(snapshot.topProducts || []),
    ]
  );
}

async function refreshSellerDashboard(pool, sellerUserId) {
  await ensureSellerDashboardTable(pool);
  const snapshot = await computeSellerDashboardSnapshot(pool, sellerUserId);
  await saveSellerDashboardSnapshot(pool, snapshot);
  return snapshot;
}

module.exports = {
  ensureSellerDashboardTable,
  computeSellerDashboardSnapshot,
  saveSellerDashboardSnapshot,
  refreshSellerDashboard,
};
