ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS telegram_delivery_failure varchar(32);
