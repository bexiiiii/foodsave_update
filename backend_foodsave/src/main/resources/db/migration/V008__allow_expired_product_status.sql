-- Allow EXPIRED value on products.status — added to ProductStatus enum but
-- the original CHECK constraint did not include it, so ProductExpiryScheduler
-- failed every 10 minutes on past-due products.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check
    CHECK (status IN ('AVAILABLE','OUT_OF_STOCK','DISCONTINUED','HIDDEN','EXPIRED'));
