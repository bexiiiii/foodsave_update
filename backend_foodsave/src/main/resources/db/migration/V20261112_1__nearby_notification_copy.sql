ALTER TABLE notifications ADD COLUMN IF NOT EXISTS nearby_reason varchar(32);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS nearby_variant integer;
CREATE INDEX IF NOT EXISTS ix_notification_nearby_variant
    ON notifications (user_id, nearby_reason, id DESC) WHERE nearby_reason IS NOT NULL;
