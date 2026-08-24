CREATE TABLE IF NOT EXISTS favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT,
    date_added TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE favorites ADD COLUMN IF NOT EXISTS store_id BIGINT;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS type VARCHAR(20);
ALTER TABLE favorites ALTER COLUMN product_id DROP NOT NULL;

UPDATE favorites SET type = 'PRODUCT' WHERE type IS NULL AND product_id IS NOT NULL;
UPDATE favorites SET type = 'STORE' WHERE type IS NULL AND store_id IS NOT NULL;
DELETE FROM favorites WHERE type IS NULL;

ALTER TABLE favorites ALTER COLUMN type SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites_user_product
    ON favorites(user_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites_user_store
    ON favorites(user_id, store_id) WHERE store_id IS NOT NULL;
