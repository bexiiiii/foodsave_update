-- Run transactionally. Hibernate ddl-auto=update does not update existing enum
-- CHECK constraints when Java enum constants are added. Both the order and its
-- history must accept the same reasons, or cancellation rolls back entirely.
-- No orders, history, inventory or notifications are changed by this migration.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
    target_table text;
    constraint_name text;
    allowed_reasons text[] := ARRAY[
        'USER_CHANGED_MIND', 'USER_TOO_FAR', 'USER_WRONG_TIME',
        'USER_ORDERED_BY_MISTAKE', 'PARTNER_OUT_OF_STOCK', 'PARTNER_CLOSED',
        'PARTNER_CANNOT_PREPARE', 'PARTNER_WRONG_QUANTITY',
        'PARTNER_TECHNICAL_ERROR', 'PICKUP_TIME_EXPIRED',
        'CUSTOMER_DID_NOT_ARRIVE', 'DUPLICATE_RESERVATION',
        'OUT_OF_STOCK', 'SOLD_OFFLINE', 'TOO_FAR', 'EXPECTED_DELIVERY',
        'WRONG_BRANCH', 'WRONG_CITY', 'WRONG_PRODUCT', 'CANNOT_PICKUP_IN_TIME',
        'PARTNER_REJECTED', 'DUPLICATE_ORDER', 'OTHER'
    ];
BEGIN
    FOREACH target_table IN ARRAY ARRAY['orders', 'order_status_history'] LOOP
        constraint_name := target_table || '_cancellation_reason_check';
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
                       target_table, constraint_name);
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I CHECK (cancellation_reason IS NULL OR cancellation_reason::text = ANY (%L::text[]))',
            target_table, constraint_name, allowed_reasons
        );
    END LOOP;
END $$;
