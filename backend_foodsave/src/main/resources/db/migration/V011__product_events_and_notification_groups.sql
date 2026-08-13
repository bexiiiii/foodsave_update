ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN (
        'CREATED','PENDING','CONFIRMED','PREPARING','READY_FOR_PICKUP','PICKED_UP','COMPLETED',
        'OUT_FOR_DELIVERY','DELIVERED','CANCELLED','CANCELLED_BY_USER','CANCELLED_BY_PARTNER',
        'EXPIRED','NO_SHOW','REJECTED','REFUNDED'
    ));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(80);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_comment TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_actor_type VARCHAR(40);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_changed_by_user_id BIGINT REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_for_pickup_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_arrived_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS acquisition_source VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notification_id BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notification_group_id BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_post_id VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS start_param VARCHAR(255);

CREATE TABLE IF NOT EXISTS product_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    user_id BIGINT REFERENCES users(id),
    anonymous_session_id VARCHAR(120),
    telegram_user_id BIGINT,
    reservation_id BIGINT REFERENCES orders(id),
    partner_id BIGINT,
    branch_id BIGINT,
    box_id BIGINT,
    city_id BIGINT,
    district_id BIGINT,
    source VARCHAR(80),
    source_type VARCHAR(120),
    campaign_id VARCHAR(120),
    telegram_post_id VARCHAR(120),
    notification_id BIGINT,
    notification_group_id BIGINT,
    deep_link TEXT,
    start_param VARCHAR(255),
    session_id VARCHAR(120),
    platform VARCHAR(80),
    device_type VARCHAR(80),
    telegram_version VARCHAR(80),
    app_version VARCHAR(80),
    language VARCHAR(16),
    idempotency_key VARCHAR(180),
    metadata JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP NOT NULL DEFAULT now(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_events_idempotency_key
    ON product_events (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_events_event_type ON product_events (event_type);
CREATE INDEX IF NOT EXISTS idx_product_events_user_created_at ON product_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_created_at ON product_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_partner_created_at ON product_events (partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_branch_created_at ON product_events (branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_box_created_at ON product_events (box_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_source_created_at ON product_events (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_notification_id ON product_events (notification_id);
CREATE INDEX IF NOT EXISTS idx_product_events_notification_group_id ON product_events (notification_group_id);

CREATE TABLE IF NOT EXISTS notification_groups (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    city_id BIGINT,
    district_id BIGINT,
    status VARCHAR(40) NOT NULL DEFAULT 'COLLECTING',
    scheduled_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    failed_at TIMESTAMP,
    error_message TEXT,
    telegram_message_id VARCHAR(120),
    notification_type VARCHAR(40) NOT NULL DEFAULT 'MARKETING',
    trigger_type VARCHAR(60) NOT NULL DEFAULT 'NEW_BOX',
    time_window VARCHAR(40) NOT NULL DEFAULT 'LUNCH',
    total_partners INTEGER DEFAULT 0,
    total_boxes INTEGER DEFAULT 0,
    minimum_price NUMERIC(12,2),
    maximum_discount INTEGER DEFAULT 0,
    deep_link TEXT,
    campaign_id VARCHAR(120),
    idempotency_key VARCHAR(220),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_notification_groups_idempotency_key
    ON notification_groups (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_groups_status_scheduled_at ON notification_groups (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_groups_user_created_at ON notification_groups (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_groups_campaign ON notification_groups (campaign_id);

CREATE TABLE IF NOT EXISTS notification_group_items (
    id BIGSERIAL PRIMARY KEY,
    notification_group_id BIGINT NOT NULL REFERENCES notification_groups(id) ON DELETE CASCADE,
    partner_id BIGINT NOT NULL REFERENCES stores(id),
    branch_id BIGINT NOT NULL REFERENCES stores(id),
    box_id BIGINT REFERENCES products(id),
    available_quantity INTEGER DEFAULT 0,
    price NUMERIC(12,2),
    original_price NUMERIC(12,2),
    discount_percent INTEGER DEFAULT 0,
    pickup_end_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_notification_group_items_group_box
    ON notification_group_items (notification_group_id, box_id)
    WHERE box_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_group_items_box_id ON notification_group_items (box_id);
CREATE INDEX IF NOT EXISTS idx_notification_group_items_partner_id ON notification_group_items (partner_id);

CREATE TABLE IF NOT EXISTS notification_schedule_settings (
    id BIGSERIAL PRIMARY KEY,
    city_id BIGINT,
    notification_window_type VARCHAR(40) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    start_time TIME NOT NULL,
    send_time TIME NOT NULL,
    end_time TIME NOT NULL,
    minimum_total_boxes INTEGER NOT NULL DEFAULT 2,
    minimum_partners INTEGER NOT NULL DEFAULT 1,
    maximum_messages_per_user_per_day INTEGER NOT NULL DEFAULT 2,
    minimum_hours_between_messages INTEGER NOT NULL DEFAULT 4,
    quiet_hours_start TIME NOT NULL DEFAULT '22:00',
    quiet_hours_end TIME NOT NULL DEFAULT '09:00',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_notification_schedule_city_window
    ON notification_schedule_settings (COALESCE(city_id, -1), notification_window_type);

INSERT INTO notification_schedule_settings
    (city_id, notification_window_type, enabled, start_time, send_time, end_time, minimum_total_boxes, minimum_partners,
     maximum_messages_per_user_per_day, minimum_hours_between_messages, quiet_hours_start, quiet_hours_end)
VALUES
    (NULL, 'LUNCH', true, '10:30', '11:30', '12:30', 2, 1, 2, 4, '22:00', '09:00'),
    (NULL, 'EVENING', true, '16:30', '17:30', '19:30', 2, 1, 2, 4, '22:00', '09:00'),
    (NULL, 'LAST_CHANCE', true, '20:00', '20:30', '21:30', 3, 1, 2, 4, '22:00', '09:00')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    telegram_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    lunch_digest_enabled BOOLEAN NOT NULL DEFAULT true,
    evening_digest_enabled BOOLEAN NOT NULL DEFAULT true,
    last_chance_enabled BOOLEAN NOT NULL DEFAULT true,
    favorite_partner_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    nearby_offers_enabled BOOLEAN NOT NULL DEFAULT true,
    city_id BIGINT,
    district_ids JSONB DEFAULT '[]'::jsonb,
    category_ids JSONB DEFAULT '[]'::jsonb,
    favorite_partner_ids JSONB DEFAULT '[]'::jsonb,
    max_distance_km DOUBLE PRECISION DEFAULT 8.0,
    min_discount_percent INTEGER,
    max_price NUMERIC(12,2),
    maximum_messages_per_day INTEGER DEFAULT 2,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '09:00',
    timezone VARCHAR(80) DEFAULT 'Asia/Almaty',
    language VARCHAR(16) DEFAULT 'ru',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_frequency_states (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    last_marketing_sent_at TIMESTAMP,
    marketing_sent_today INTEGER DEFAULT 0,
    marketing_sent_date DATE,
    consecutive_unopened_count INTEGER DEFAULT 0,
    last_opened_at TIMESTAMP,
    suppressed_until TIMESTAMP,
    engagement_score DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_frequency_suppressed_until
    ON notification_frequency_states (suppressed_until)
    WHERE suppressed_until IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(60),
    new_status VARCHAR(60) NOT NULL,
    actor_type VARCHAR(40) NOT NULL DEFAULT 'SYSTEM',
    actor_user_id BIGINT REFERENCES users(id),
    cancellation_reason VARCHAR(80),
    cancellation_comment TEXT,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_created_at
    ON order_status_history (order_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_orders_attribution_created_at
    ON orders (notification_group_id, campaign_id, created_at DESC);
