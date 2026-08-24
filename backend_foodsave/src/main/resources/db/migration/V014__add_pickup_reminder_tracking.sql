ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_reminder_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_orders_pickup_reminder_candidates
    ON orders (pickup_reminder_sent_at, status, created_at)
    WHERE pickup_reminder_sent_at IS NULL;
