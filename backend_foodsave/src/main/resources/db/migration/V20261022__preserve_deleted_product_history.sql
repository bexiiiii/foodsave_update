-- Additive and safe to apply before deploying or rolling back the application.
-- No rows or historical relationships are removed.
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
