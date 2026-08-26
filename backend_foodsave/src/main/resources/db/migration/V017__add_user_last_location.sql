ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_latitude DOUBLE PRECISION;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_longitude DOUBLE PRECISION;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_location_accuracy_meters DOUBLE PRECISION;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_last_location_updated_at
    ON users (last_location_updated_at)
    WHERE last_latitude IS NOT NULL
      AND last_longitude IS NOT NULL;
