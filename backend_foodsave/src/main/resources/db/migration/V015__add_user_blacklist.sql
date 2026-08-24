ALTER TABLE users
    ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_blacklisted
    ON users (blacklisted)
    WHERE blacklisted = TRUE;
