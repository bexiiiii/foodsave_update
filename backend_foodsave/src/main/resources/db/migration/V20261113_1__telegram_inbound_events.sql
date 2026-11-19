CREATE TABLE IF NOT EXISTS telegram_inbound_events (
    update_id bigint PRIMARY KEY,
    payload text NOT NULL,
    status varchar(32) NOT NULL,
    received_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at timestamp with time zone
);
