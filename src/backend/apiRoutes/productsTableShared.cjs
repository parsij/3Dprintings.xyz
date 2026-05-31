async function ensureProductsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      original_price NUMERIC(10,2) NOT NULL,
      current_price NUMERIC(10,2) NOT NULL,
      rating NUMERIC(2,1) DEFAULT 0,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      img_path TEXT[],
      category VARCHAR(255),
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      sales_count INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_products_user_id_id_desc
    ON products (user_id, id DESC)
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS img_path TEXT[]
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS category VARCHAR(255)
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS sales_count INTEGER NOT NULL DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1
  `);

  await pool.query(`
    UPDATE products
    SET quantity = 1
    WHERE quantity IS NULL
  `);

  await pool.query(`
    UPDATE products
    SET tags = '[]'::jsonb
    WHERE tags IS NULL
  `);
}

module.exports = {
  ensureProductsTable,
};
