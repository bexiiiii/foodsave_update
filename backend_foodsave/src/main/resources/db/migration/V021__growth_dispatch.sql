-- Manual-only growth dispatch. No backfill, enrollment, notification, or enablement occurs here.
CREATE TABLE growth_pickup_window_verifications (
    id UUID PRIMARY KEY,
    revision BIGSERIAL NOT NULL UNIQUE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    verified_by BIGINT NOT NULL REFERENCES users(id),
    verified_at TIMESTAMPTZ NOT NULL,
    CHECK (ends_at > starts_at),
    CHECK (ends_at <= starts_at + INTERVAL '12 hours')
);
CREATE INDEX idx_growth_pickup_verification_latest
    ON growth_pickup_window_verifications (product_id, revision DESC);

CREATE TABLE growth_dispatches (
    id UUID PRIMARY KEY,
    experiment_id UUID NOT NULL,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL REFERENCES products(id),
    pickup_verification_id UUID NOT NULL REFERENCES growth_pickup_window_verifications(id),
    requested_by BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(16) NOT NULL CHECK (status IN ('CLAIMED', 'SENT', 'FAILED', 'UNKNOWN')),
    claimed_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    failure_category VARCHAR(40),
    FOREIGN KEY (experiment_id, user_id) REFERENCES growth_assignments(experiment_id, user_id),
    UNIQUE (experiment_id, user_id),
    CHECK ((status = 'CLAIMED' AND finished_at IS NULL AND failure_category IS NULL)
        OR (status = 'SENT' AND finished_at IS NOT NULL AND failure_category IS NULL)
        OR (status IN ('FAILED', 'UNKNOWN') AND finished_at IS NOT NULL AND failure_category IS NOT NULL))
);
CREATE INDEX idx_growth_dispatch_user_claimed ON growth_dispatches (user_id, claimed_at DESC);

-- Audit evidence cannot be rewritten or removed by application operations.
CREATE FUNCTION growth_pickup_verification_immutable() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Pickup verification evidence is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER growth_pickup_verification_immutable
    BEFORE UPDATE OR DELETE ON growth_pickup_window_verifications
    FOR EACH ROW EXECUTE FUNCTION growth_pickup_verification_immutable();

CREATE FUNCTION growth_dispatch_guard() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Growth dispatch evidence cannot be deleted';
    END IF;
    IF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'CLAIMED' OR NOT EXISTS (
            SELECT 1 FROM growth_assignments a JOIN growth_experiments e ON e.id = a.experiment_id
            WHERE a.experiment_id = NEW.experiment_id AND a.user_id = NEW.user_id
              AND a.arm = 'TREATMENT' AND e.enabled
              AND a.assigned_at <= NEW.claimed_at AND a.assigned_at + INTERVAL '24 hours' > NEW.claimed_at
        ) THEN
            RAISE EXCEPTION 'Only enabled treatment assignments may be claimed';
        END IF;
        RETURN NEW;
    END IF;
    IF OLD.status <> 'CLAIMED' OR NEW.status NOT IN ('SENT', 'FAILED', 'UNKNOWN')
        OR ROW(NEW.id, NEW.experiment_id, NEW.user_id, NEW.product_id, NEW.pickup_verification_id, NEW.requested_by, NEW.claimed_at)
           IS DISTINCT FROM ROW(OLD.id, OLD.experiment_id, OLD.user_id, OLD.product_id, OLD.pickup_verification_id, OLD.requested_by, OLD.claimed_at) THEN
        RAISE EXCEPTION 'Growth dispatch claim is immutable and cannot be retried';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER growth_dispatch_guard BEFORE INSERT OR UPDATE OR DELETE ON growth_dispatches
    FOR EACH ROW EXECUTE FUNCTION growth_dispatch_guard();
