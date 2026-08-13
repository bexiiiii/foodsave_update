ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER;
UPDATE products SET sort_order = 0 WHERE sort_order IS NULL;
ALTER TABLE products ALTER COLUMN sort_order SET DEFAULT 0;
ALTER TABLE products ALTER COLUMN sort_order SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_store_sort_order ON products (store_id, sort_order, created_at DESC);
