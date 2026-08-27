CREATE INDEX IF NOT EXISTS idx_order_items_product_order
    ON order_items (product_id, order_id);

CREATE INDEX IF NOT EXISTS idx_orders_status_id
    ON orders (status, id);
