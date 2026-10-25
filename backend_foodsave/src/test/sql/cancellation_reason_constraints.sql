-- psql -X -v ON_ERROR_STOP=1 -f cancellation_reason_constraints.sql
-- TEMP tables shadow production names; nothing persistent is modified.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = pg_temp;

CREATE TEMP TABLE orders (
    cancellation_reason varchar(80),
    CONSTRAINT orders_cancellation_reason_check CHECK (cancellation_reason IN (
        'USER_CHANGED_MIND', 'USER_TOO_FAR', 'USER_WRONG_TIME',
        'USER_ORDERED_BY_MISTAKE', 'PARTNER_OUT_OF_STOCK', 'PARTNER_CLOSED',
        'PARTNER_CANNOT_PREPARE', 'PARTNER_WRONG_QUANTITY',
        'PARTNER_TECHNICAL_ERROR', 'PICKUP_TIME_EXPIRED',
        'CUSTOMER_DID_NOT_ARRIVE', 'DUPLICATE_RESERVATION', 'OTHER'
    ))
);
CREATE TEMP TABLE order_status_history (
    cancellation_reason varchar(80),
    CONSTRAINT order_status_history_cancellation_reason_check CHECK (
        cancellation_reason IS NULL OR cancellation_reason IN (
            'USER_CHANGED_MIND', 'USER_TOO_FAR', 'USER_WRONG_TIME',
            'USER_ORDERED_BY_MISTAKE', 'WRONG_PRODUCT', 'PARTNER_OUT_OF_STOCK',
            'PARTNER_CLOSED', 'PARTNER_CANNOT_PREPARE', 'PARTNER_WRONG_QUANTITY',
            'PARTNER_TECHNICAL_ERROR', 'PICKUP_TIME_EXPIRED',
            'CUSTOMER_DID_NOT_ARRIVE', 'DUPLICATE_RESERVATION', 'OTHER'
        )
    )
);
INSERT INTO orders VALUES ('USER_CHANGED_MIND'), (NULL);
INSERT INTO order_status_history VALUES ('WRONG_PRODUCT'), (NULL);

-- Reproduce the reported failure on both old constraints.
DO $$
DECLARE target_table text;
BEGIN
    FOREACH target_table IN ARRAY ARRAY['orders', 'order_status_history'] LOOP
        BEGIN
            EXECUTE format('INSERT INTO %I VALUES (%L)', target_table, 'WRONG_BRANCH');
            RAISE EXCEPTION 'Expected legacy constraint failure in %', target_table;
        EXCEPTION WHEN check_violation THEN NULL;
        END;
    END LOOP;
END $$;

\ir ../../main/resources/db/migration/V20261025__sync_cancellation_reason_constraints.sql
-- Reapplication must also be safe.
\ir ../../main/resources/db/migration/V20261025__sync_cancellation_reason_constraints.sql

DO $$
DECLARE
    target_table text;
    reason text;
    row_count bigint;
BEGIN
    FOREACH target_table IN ARRAY ARRAY['orders', 'order_status_history'] LOOP
        EXECUTE format('SELECT count(*) FROM %I', target_table) INTO row_count;
        IF row_count <> 2 THEN RAISE EXCEPTION 'Existing history changed'; END IF;
        FOREACH reason IN ARRAY ARRAY[
            'USER_CHANGED_MIND', 'USER_TOO_FAR', 'USER_WRONG_TIME',
            'USER_ORDERED_BY_MISTAKE', 'PARTNER_OUT_OF_STOCK', 'PARTNER_CLOSED',
            'PARTNER_CANNOT_PREPARE', 'PARTNER_WRONG_QUANTITY',
            'PARTNER_TECHNICAL_ERROR', 'PICKUP_TIME_EXPIRED',
            'CUSTOMER_DID_NOT_ARRIVE', 'DUPLICATE_RESERVATION',
            'OUT_OF_STOCK', 'SOLD_OFFLINE', 'TOO_FAR', 'EXPECTED_DELIVERY',
            'WRONG_BRANCH', 'WRONG_CITY', 'WRONG_PRODUCT', 'CANNOT_PICKUP_IN_TIME',
            'PARTNER_REJECTED', 'DUPLICATE_ORDER', 'OTHER', NULL
        ] LOOP
            EXECUTE format('INSERT INTO %I VALUES (%L)', target_table, reason);
        END LOOP;
        BEGIN
            EXECUTE format('INSERT INTO %I VALUES (%L)', target_table, 'INVALID_REASON');
            RAISE EXCEPTION 'Invalid reason accepted by %', target_table;
        EXCEPTION WHEN check_violation THEN NULL;
        END;
        EXECUTE format('SELECT count(*) FROM %I', target_table) INTO row_count;
        IF row_count <> 26 THEN RAISE EXCEPTION 'Reason coverage incomplete'; END IF;
    END LOOP;
END $$;
ROLLBACK;
