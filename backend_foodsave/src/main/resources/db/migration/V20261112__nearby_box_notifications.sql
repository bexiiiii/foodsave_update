ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS nearby_only boolean NOT NULL DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS offer_group_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_offer_group ON notifications (offer_group_id) WHERE offer_group_id IS NOT NULL;
