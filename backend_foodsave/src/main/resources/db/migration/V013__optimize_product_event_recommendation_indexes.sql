CREATE INDEX IF NOT EXISTS idx_product_events_user_type_occurred_box
    ON product_events (user_id, event_type, occurred_at DESC, box_id)
    WHERE box_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_events_user_type_occurred_partner
    ON product_events (user_id, event_type, occurred_at DESC, partner_id)
    WHERE partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_events_session_type_occurred_box
    ON product_events (session_id, event_type, occurred_at DESC, box_id)
    WHERE session_id IS NOT NULL AND box_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_events_anonymous_session_type_occurred_box
    ON product_events (anonymous_session_id, event_type, occurred_at DESC, box_id)
    WHERE anonymous_session_id IS NOT NULL AND box_id IS NOT NULL;
