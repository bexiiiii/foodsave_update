CREATE TABLE IF NOT EXISTS product_gallery_images (
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    image_type VARCHAR(20) NOT NULL,
    PRIMARY KEY (product_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_product_gallery_images_product
    ON product_gallery_images (product_id, display_order);
