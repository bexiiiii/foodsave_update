ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS order_notification_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_orders_order_notification_sent_at
    ON orders (order_notification_sent_at)
    WHERE order_notification_sent_at IS NULL;
