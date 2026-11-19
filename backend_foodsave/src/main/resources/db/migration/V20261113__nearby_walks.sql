CREATE TABLE IF NOT EXISTS nearby_walks (
    user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    command_id bigint NOT NULL,
    started_at bigint NOT NULL,
    location_message_id bigint,
    last_update_id bigint NOT NULL,
    finished boolean NOT NULL,
    language varchar(8) NOT NULL
);
