-- Additive, PostgreSQL-only. Apply explicitly using the existing migration procedure.
-- This migration snapshots all orders and builds indexes; budget lock/disk time before rollout.
-- It intentionally creates no experiments, no assignments and no sends.
CREATE TABLE growth_experiments (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL CHECK (length(btrim(name)) > 0),
    seed VARCHAR(255) NOT NULL CHECK (length(btrim(seed)) > 0),
    holdout_bps INTEGER NOT NULL CHECK (holdout_bps BETWEEN 0 AND 10000),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    legacy_order_zone VARCHAR(80) NOT NULL DEFAULT 'Asia/Almaty',
    measurement_zone VARCHAR(80) NOT NULL DEFAULT 'Asia/Almaty',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by BIGINT NOT NULL REFERENCES users(id),
    updated_by BIGINT NOT NULL REFERENCES users(id)
);

CREATE TABLE growth_experiment_audit (
    id BIGSERIAL PRIMARY KEY,
    experiment_id UUID NOT NULL REFERENCES growth_experiments(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATED', 'ENABLED', 'DISABLED')),
    actor_user_id BIGINT NOT NULL REFERENCES users(id),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE growth_assignments (
    experiment_id UUID NOT NULL REFERENCES growth_experiments(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    cohort VARCHAR(32) NOT NULL CHECK (cohort IN
        ('NEVER_CLEAN', 'ONE_CLEAN_RECENT', 'ONE_CLEAN_LAPSED', 'REPEAT_LAPSED')),
    arm VARCHAR(16) NOT NULL CHECK (arm IN ('TREATMENT', 'HOLDOUT')),
    assigned_at TIMESTAMPTZ NOT NULL,
    baseline_clean_count BIGINT NOT NULL CHECK (baseline_clean_count >= 0),
    baseline_last_clean_at TIMESTAMPTZ,
    assigned_by BIGINT NOT NULL REFERENCES users(id),
    PRIMARY KEY (experiment_id, user_id),
    CHECK ((cohort = 'NEVER_CLEAN' AND baseline_clean_count = 0 AND baseline_last_clean_at IS NULL)
        OR (cohort IN ('ONE_CLEAN_RECENT', 'ONE_CLEAN_LAPSED') AND baseline_clean_count = 1
            AND baseline_last_clean_at IS NOT NULL)
        OR (cohort = 'REPEAT_LAPSED' AND baseline_clean_count >= 2 AND baseline_last_clean_at IS NOT NULL))
);
CREATE INDEX idx_growth_assignments_user_window ON growth_assignments (user_id, assigned_at);
CREATE INDEX idx_growth_assignments_reporting ON growth_assignments (experiment_id, cohort, arm, assigned_at);

CREATE FUNCTION growth_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Growth audit and assignments are immutable';
END;
$$;
CREATE TRIGGER growth_assignments_immutable BEFORE UPDATE OR DELETE ON growth_assignments
    FOR EACH ROW EXECUTE FUNCTION growth_reject_mutation();
CREATE TRIGGER growth_experiment_audit_immutable BEFORE UPDATE OR DELETE ON growth_experiment_audit
    FOR EACH ROW EXECUTE FUNCTION growth_reject_mutation();

CREATE FUNCTION growth_audit_experiment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Growth experiments cannot be deleted';
    END IF;
    IF TG_OP = 'INSERT' THEN
        IF NEW.enabled THEN
            RAISE EXCEPTION 'New growth experiments must be disabled';
        END IF;
        INSERT INTO growth_experiment_audit (experiment_id, action, actor_user_id)
        VALUES (NEW.id, 'CREATED', NEW.created_by);
    ELSE
        IF (NEW.id, NEW.name, NEW.seed, NEW.holdout_bps, NEW.legacy_order_zone,
            NEW.measurement_zone, NEW.created_at, NEW.created_by)
            IS DISTINCT FROM
           (OLD.id, OLD.name, OLD.seed, OLD.holdout_bps, OLD.legacy_order_zone,
            OLD.measurement_zone, OLD.created_at, OLD.created_by) THEN
            RAISE EXCEPTION 'Growth experiment identity, allocation and time zones are immutable';
        END IF;
        IF NEW.enabled IS DISTINCT FROM OLD.enabled THEN
            INSERT INTO growth_experiment_audit (experiment_id, action, actor_user_id)
            VALUES (NEW.id, CASE WHEN NEW.enabled THEN 'ENABLED' ELSE 'DISABLED' END, NEW.updated_by);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
-- AFTER INSERT is required for the audit row's foreign key. Exceptions roll back the mutation.
CREATE TRIGGER growth_experiments_audited AFTER INSERT OR UPDATE OR DELETE ON growth_experiments
    FOR EACH ROW EXECUTE FUNCTION growth_audit_experiment();

-- A growth-only status ledger captures every database status/pickup change, including older
-- write paths that do not append order_status_history. No contact data, prices, or messages.
-- Legacy created_at/picked_up_at are local timestamps, interpreted using the frozen experiment zone.
-- Initial snapshots do not assert historical states before this migration.
CREATE TABLE growth_order_status_ledger (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    order_created_at TIMESTAMP NOT NULL,
    status VARCHAR(40) NOT NULL,
    picked_up_at TIMESTAMP,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    event_kind VARCHAR(12) NOT NULL CHECK (event_kind IN ('BASELINE', 'INSERT', 'UPDATE', 'DELETE'))
);
CREATE INDEX idx_growth_order_ledger_user_asof
    ON growth_order_status_ledger (user_id, order_id, observed_at DESC, id DESC);
CREATE INDEX idx_growth_order_ledger_order_asof
    ON growth_order_status_ledger (order_id, observed_at DESC, id DESC);
CREATE TRIGGER growth_order_status_ledger_immutable BEFORE UPDATE OR DELETE ON growth_order_status_ledger
    FOR EACH ROW EXECUTE FUNCTION growth_reject_mutation();

-- Prevent writes during the one-time snapshot so there is no snapshot/trigger installation gap.
LOCK TABLE orders IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO growth_order_status_ledger
    (order_id, user_id, order_created_at, status, picked_up_at, observed_at, event_kind)
SELECT id, user_id, created_at, status, picked_up_at, statement_timestamp(), 'BASELINE' FROM orders;

CREATE FUNCTION growth_capture_order_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO growth_order_status_ledger
            (order_id, user_id, order_created_at, status, picked_up_at, event_kind)
        VALUES (OLD.id, OLD.user_id, OLD.created_at, OLD.status, OLD.picked_up_at, 'DELETE');
        RETURN OLD;
    END IF;
    IF TG_OP = 'INSERT' OR (NEW.status, NEW.picked_up_at, NEW.user_id, NEW.created_at)
        IS DISTINCT FROM (OLD.status, OLD.picked_up_at, OLD.user_id, OLD.created_at) THEN
        INSERT INTO growth_order_status_ledger
            (order_id, user_id, order_created_at, status, picked_up_at, event_kind)
        VALUES (NEW.id, NEW.user_id, NEW.created_at, NEW.status, NEW.picked_up_at, TG_OP);
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER growth_orders_captured AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION growth_capture_order_state();
