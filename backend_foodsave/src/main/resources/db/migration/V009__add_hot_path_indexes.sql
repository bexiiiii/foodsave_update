CREATE INDEX IF NOT EXISTS idx_products_admin_created_at
    ON products (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_active_available_created_at
    ON products (active, status, created_at DESC)
    WHERE active = true AND status = 'AVAILABLE';

CREATE INDEX IF NOT EXISTS idx_products_store_available_created_at
    ON products (store_id, active, status, created_at DESC)
    WHERE active = true AND status = 'AVAILABLE';

CREATE INDEX IF NOT EXISTS idx_products_store_created_at
    ON products (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_expiry_date
    ON products (expiry_date)
    WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_created_at
    ON orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_status_created_at
    ON orders (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_store_created_at
    ON orders (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_store_status_created_at
    ON orders (store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
    ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created_at
    ON notifications (user_id, created_at DESC)
    WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_stores_active_status
    ON stores (active, status);
