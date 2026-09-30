package com.foodsave.backend.growth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Explicit admin-driven experiments. No scheduler, sender, automatic enrollment, or JPA DDL.
 * Draft enrollment is allowed; delivery has independent disabled-by-default guards.
 * All identities and baselines are immutable in both the application and PostgreSQL.
 */
@Repository
public class GrowthExperimentStore {
    private static final String CANCELLED = "('CANCELLED', 'CANCELLED_BY_USER', 'CANCELLED_BY_PARTNER')";
    private static final RowMapper<Experiment> EXPERIMENT_MAPPER = (rs, row) -> new Experiment(
            rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("seed"),
            rs.getInt("holdout_bps"), rs.getBoolean("enabled"), instant(rs, "created_at"),
            rs.getLong("created_by"), rs.getString("legacy_order_zone"), rs.getString("measurement_zone"));
    private static final RowMapper<Assignment> ASSIGNMENT_MAPPER = (rs, row) -> new Assignment(
            rs.getObject("experiment_id", UUID.class), rs.getLong("user_id"),
            GrowthCohort.valueOf(rs.getString("cohort")), Arm.valueOf(rs.getString("arm")),
            instant(rs, "assigned_at"), rs.getLong("baseline_clean_count"),
            instant(rs, "baseline_last_clean_at"), rs.getLong("assigned_by"));
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final ZoneId legacyOrderZone;
    private final ZoneId measurementZone;

    @Autowired
    public GrowthExperimentStore(JdbcTemplate jdbc,
            @Value("${notifications.growth.legacy-order-zone:Asia/Almaty}") String legacyOrderZone,
            @Value("${notifications.growth.measurement-zone:Asia/Almaty}") String measurementZone) {
        this(jdbc, Clock.systemUTC(), ZoneId.of(legacyOrderZone), ZoneId.of(measurementZone));
    }

    GrowthExperimentStore(JdbcTemplate jdbc, Clock clock, ZoneId legacyOrderZone, ZoneId measurementZone) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.legacyOrderZone = legacyOrderZone;
        this.measurementZone = measurementZone;
    }

    @Transactional
    public Experiment create(String name, String seed, int holdoutBps, long actorUserId) {
        if (name == null || name.isBlank() || name.length() > 120 || seed == null || seed.isBlank()
                || seed.length() > 255 || holdoutBps < 0 || holdoutBps > 10000 || actorUserId <= 0) {
            throw new IllegalArgumentException("A name, immutable seed, holdout 0..10000 bps and actor are required");
        }
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO growth_experiments
                    (id,name,seed,holdout_bps,enabled,created_at,created_by,updated_by,legacy_order_zone,measurement_zone)
                VALUES (?,?,?,?,FALSE,?,?,?,?,?)
                """, id, name.trim(), seed, holdoutBps, Timestamp.from(clock.instant()), actorUserId, actorUserId,
                legacyOrderZone.getId(), measurementZone.getId());
        return find(id);
    }

    @Transactional(readOnly = true)
    public Experiment find(UUID id) {
        return jdbc.query("SELECT * FROM growth_experiments WHERE id = ?", EXPERIMENT_MAPPER, id)
                .stream().findFirst().orElseThrow(() -> new IllegalArgumentException("Experiment not found"));
    }

    @Transactional(readOnly = true)
    public List<Experiment> list(int limit) {
        if (limit < 1 || limit > 100) throw new IllegalArgumentException("Limit must be 1..100");
        return jdbc.query("SELECT * FROM growth_experiments ORDER BY created_at DESC, id LIMIT ?",
                EXPERIMENT_MAPPER, limit);
    }

    @Transactional
    public Experiment setEnabled(UUID id, boolean enabled, long actorUserId) {
        if (actorUserId <= 0) throw new IllegalArgumentException("Actor is required");
        Experiment current = lockExperiment(id);
        if (current.enabled() != enabled) {
            jdbc.update("UPDATE growth_experiments SET enabled = ?, updated_by = ? WHERE id = ?",
                    enabled, actorUserId, id);
        }
        return find(id);
    }

    @Transactional(readOnly = true)
    public Optional<Assignment> assignment(UUID experimentId, long userId) {
        return jdbc.query("SELECT * FROM growth_assignments WHERE experiment_id = ? AND user_id = ?",
                ASSIGNMENT_MAPPER, experimentId, userId).stream().findFirst();
    }

    /** Read-only preview. The API uses server time; callers cannot choose a favorable baseline. */
    @Transactional(readOnly = true)
    public Preview preview(UUID experimentId, long userId) {
        Experiment experiment = find(experimentId);
        Optional<Assignment> frozen = assignment(experimentId, userId);
        if (frozen.isPresent()) return Preview.of(frozen.get());
        requireUser(userId, false);
        Instant at = clock.instant();
        Baseline baseline = baseline(userId, at, experiment.legacyOrderZone());
        return preview(experiment, userId, baseline, at);
    }

    /**
     * Locks are always experiment then user. The PK plus ON CONFLICT makes repeated/concurrent
     * enrollment idempotent; the DB trigger disallows replacing any frozen assignment.
     */
    @Transactional
    public Assignment assign(UUID experimentId, long userId, long actorUserId) {
        if (actorUserId <= 0) throw new IllegalArgumentException("Actor is required");
        Experiment experiment = lockExperiment(experimentId);
        requireUser(userId, true);
        Optional<Assignment> frozen = assignment(experimentId, userId);
        if (frozen.isPresent()) return frozen.get();
        Instant at = clock.instant();
        Long overlapping = jdbc.queryForObject("""
                SELECT COUNT(*) FROM growth_assignments WHERE user_id = ? AND experiment_id <> ?
                    AND assigned_at + INTERVAL '14 days' > ?
                """, Long.class, userId, experimentId, Timestamp.from(at));
        if (overlapping != null && overlapping > 0) {
            throw new IllegalArgumentException("User has an active assignment in another experiment");
        }
        Baseline baseline = baseline(userId, at, experiment.legacyOrderZone());
        GrowthCohort cohort = GrowthCohort.classify(baseline.cleanCount(), baseline.lastCleanAt(), at)
                .orElseThrow(() -> new IllegalArgumentException("User is not in an eligible cohort"));
        Arm arm = deterministicArm(experimentId, experiment.seed(), userId, experiment.holdoutBps());
        jdbc.update("""
                INSERT INTO growth_assignments
                    (experiment_id,user_id,cohort,arm,assigned_at,baseline_clean_count,baseline_last_clean_at,assigned_by)
                VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (experiment_id,user_id) DO NOTHING
                """, experimentId, userId, cohort.name(), arm.name(), Timestamp.from(at), baseline.cleanCount(),
                timestamp(baseline.lastCleanAt()), actorUserId);
        return assignment(experimentId, userId).orElseThrow();
    }

    /** Bounded IDs and a complete count, without writing assignments or using registration age. */
    @Transactional(readOnly = true)
    public CandidatePreview candidatePreview(UUID experimentId, GrowthCohort cohort, int limit) {
        if (cohort == null || limit < 1 || limit > 500) throw new IllegalArgumentException("Cohort and limit 1..500 required");
        Experiment experiment = find(experimentId);
        Instant at = clock.instant();
        String sql = """
                WITH latest AS (
                    SELECT DISTINCT ON (l.order_id) l.*
                    FROM growth_order_status_ledger l WHERE l.observed_at <= ?
                    ORDER BY l.order_id,l.observed_at DESC,l.id DESC
                ), baseline AS (
                    SELECT user_id, COUNT(*) AS clean_count,
                        MAX(order_created_at AT TIME ZONE ?) AS last_clean_at
                    FROM latest WHERE status NOT IN %s
                        AND order_created_at AT TIME ZONE ? <= ? GROUP BY user_id
                ), candidates AS (
                    SELECT u.id AS user_id, a.cohort AS frozen_cohort, a.arm AS frozen_arm, a.assigned_at,
                        a.assigned_by, COALESCE(a.baseline_clean_count,b.clean_count,0) AS clean_count,
                        CASE WHEN a.user_id IS NOT NULL THEN a.baseline_last_clean_at ELSE b.last_clean_at END AS last_clean_at,
                        COALESCE(a.cohort, CASE
                            WHEN COALESCE(b.clean_count,0) = 0 THEN 'NEVER_CLEAN'
                            WHEN b.clean_count = 1 AND b.last_clean_at > ? THEN 'ONE_CLEAN_RECENT'
                            WHEN b.clean_count = 1 THEN 'ONE_CLEAN_LAPSED'
                            WHEN b.clean_count >= 2 AND b.last_clean_at <= ? THEN 'REPEAT_LAPSED'
                        END) AS cohort
                    FROM users u LEFT JOIN baseline b ON b.user_id = u.id
                    LEFT JOIN growth_assignments a ON a.user_id = u.id AND a.experiment_id = ?
                    WHERE a.user_id IS NOT NULL OR NOT EXISTS (
                        SELECT 1 FROM growth_assignments other WHERE other.user_id = u.id
                            AND other.experiment_id <> ? AND other.assigned_at + INTERVAL '14 days' > ?)
                )
                SELECT *, COUNT(*) OVER () AS total_candidates FROM candidates WHERE cohort = ? ORDER BY user_id LIMIT ?
                """.formatted(CANCELLED);
        List<CandidateRow> rows = jdbc.query(sql, (rs, n) -> {
            long userId = rs.getLong("user_id");
            boolean frozen = rs.getString("frozen_cohort") != null;
            Preview item = frozen
                    ? new Preview(userId, cohort, Arm.valueOf(rs.getString("frozen_arm")), rs.getLong("clean_count"),
                        instant(rs, "last_clean_at"), instant(rs, "assigned_at"), true)
                    : preview(experiment, userId, new Baseline(rs.getLong("clean_count"), instant(rs, "last_clean_at")), at);
            return new CandidateRow(item, rs.getLong("total_candidates"));
        }, Timestamp.from(at), experiment.legacyOrderZone(), experiment.legacyOrderZone(), Timestamp.from(at),
                Timestamp.from(at.minus(Duration.ofDays(8))), Timestamp.from(at.minus(Duration.ofDays(8))),
                experimentId, experimentId, Timestamp.from(at), cohort.name(), limit);
        return new CandidatePreview(cohort, rows.isEmpty() ? 0 : rows.get(0).total(), at,
                rows.stream().map(CandidateRow::preview).toList());
    }

    /** Complete ITT denominator, including HOLDOUT, skipped, failed and never-dispatched users. */
    @Transactional(readOnly = true)
    public List<Measure> measure(UUID experimentId) {
        Experiment experiment = find(experimentId);
        Instant asOf = clock.instant();
        String sql = """
                SELECT a.*, COALESCE(o.d7_clean_orders,0) AS d7_clean_orders,
                    COALESCE(o.d14_retained_orders,0) AS d14_retained_orders,
                    COALESCE(o.d7_pickups,0) AS d7_pickups, COALESCE(o.d14_pickups,0) AS d14_pickups,
                    COALESCE(o.d7_clean_days,0) AS d7_clean_days,
                    COALESCE(o.d7_different_baseline_day,FALSE) AS d7_different_baseline_day
                FROM growth_assignments a
                LEFT JOIN LATERAL (
                    WITH first_seen AS (
                        SELECT DISTINCT ON (l.order_id) l.order_id,l.order_created_at,l.observed_at
                        FROM growth_order_status_ledger l WHERE l.user_id = a.user_id
                        ORDER BY l.order_id,l.observed_at,l.id
                    ), window_orders AS (
                        SELECT f.order_id, f.order_created_at AT TIME ZONE ? AS created_at
                        FROM first_seen f
                        WHERE f.order_created_at AT TIME ZONE ? >= a.assigned_at
                            AND f.order_created_at AT TIME ZONE ? < a.assigned_at + INTERVAL '7 days'
                            AND f.observed_at < a.assigned_at + INTERVAL '7 days'
                    ), states AS (
                        SELECT w.*, s7.status AS status_d7, s14.status AS status_d14,
                            s7.picked_up_at AT TIME ZONE ? AS pickup_d7,
                            s14.picked_up_at AT TIME ZONE ? AS pickup_d14
                        FROM window_orders w
                        LEFT JOIN LATERAL (
                            SELECT l.status,l.picked_up_at FROM growth_order_status_ledger l
                            WHERE l.order_id = w.order_id AND l.observed_at < a.assigned_at + INTERVAL '7 days'
                            ORDER BY l.observed_at DESC,l.id DESC LIMIT 1
                        ) s7 ON TRUE
                        LEFT JOIN LATERAL (
                            SELECT l.status,l.picked_up_at FROM growth_order_status_ledger l
                            WHERE l.order_id = w.order_id AND l.observed_at < a.assigned_at + INTERVAL '14 days'
                            ORDER BY l.observed_at DESC,l.id DESC LIMIT 1
                        ) s14 ON TRUE
                    )
                    SELECT COUNT(*) FILTER (WHERE status_d7 NOT IN %s) AS d7_clean_orders,
                        COUNT(*) FILTER (WHERE status_d7 NOT IN %s AND status_d14 NOT IN %s) AS d14_retained_orders,
                        COUNT(*) FILTER (WHERE pickup_d7 >= a.assigned_at
                            AND pickup_d7 < a.assigned_at + INTERVAL '7 days') AS d7_pickups,
                        COUNT(*) FILTER (WHERE pickup_d14 >= a.assigned_at
                            AND pickup_d14 < a.assigned_at + INTERVAL '14 days') AS d14_pickups,
                        COUNT(DISTINCT (created_at AT TIME ZONE ?)::date)
                            FILTER (WHERE status_d7 NOT IN %s) AS d7_clean_days,
                        BOOL_OR((created_at AT TIME ZONE ?)::date <>
                            (a.baseline_last_clean_at AT TIME ZONE ?)::date)
                            FILTER (WHERE status_d7 NOT IN %s) AS d7_different_baseline_day
                    FROM states
                ) o ON TRUE
                WHERE a.experiment_id = ? AND a.assigned_at <= ? ORDER BY a.cohort,a.arm,a.user_id
                """.formatted(CANCELLED, CANCELLED, CANCELLED, CANCELLED, CANCELLED);
        List<Outcome> outcomes = jdbc.query(sql, (rs, row) -> new Outcome(ASSIGNMENT_MAPPER.mapRow(rs, row),
                rs.getLong("d7_clean_orders"), rs.getLong("d14_retained_orders"), rs.getLong("d7_pickups"),
                rs.getLong("d14_pickups"), rs.getLong("d7_clean_days"), rs.getBoolean("d7_different_baseline_day")),
                experiment.legacyOrderZone(), experiment.legacyOrderZone(), experiment.legacyOrderZone(),
                experiment.legacyOrderZone(), experiment.legacyOrderZone(), experiment.measurementZone(),
                experiment.measurementZone(), experiment.measurementZone(), experimentId, Timestamp.from(asOf));
        return aggregate(outcomes, asOf);
    }

    static List<Measure> aggregate(List<Outcome> outcomes, Instant asOf) {
        Map<String, MutableMeasure> groups = new LinkedHashMap<>();
        for (Outcome outcome : outcomes) {
            Assignment a = outcome.assignment();
            MutableMeasure group = groups.computeIfAbsent(a.cohort() + ":" + a.arm(),
                    key -> new MutableMeasure(a.cohort(), a.arm()));
            group.assigned++;
            boolean matureD7 = !asOf.isBefore(a.assignedAt().plus(Duration.ofDays(7)));
            boolean matureD14 = !asOf.isBefore(a.assignedAt().plus(Duration.ofDays(14)));
            if (matureD7) {
                group.d7Mature++;
                if (outcome.d7CleanOrders() > 0) {
                    group.d7Converted++;
                    if (a.baselineCleanCount() + outcome.d7CleanOrders() >= 2) group.d7AnySecondOrNext++;
                    if (outcome.d7CleanDays() >= 2 || outcome.d7DifferentBaselineDay()) group.d7DifferentDayRepeat++;
                }
                group.d7CleanOrders += outcome.d7CleanOrders();
                group.d7PickupOrders += outcome.d7Pickups();
                if (outcome.d7Pickups() > 0) group.d7PickupUsers++;
            }
            if (matureD14) {
                group.d14Mature++;
                if (outcome.d14RetainedOrders() > 0) group.d14Retained++;
                group.d14RetainedOrders += outcome.d14RetainedOrders();
                group.d14CancelledOrders += outcome.d7CleanOrders() - outcome.d14RetainedOrders();
                group.d14PickupOrders += outcome.d14Pickups();
                if (outcome.d14Pickups() > 0) group.d14PickupUsers++;
            }
        }
        return groups.values().stream().map(g -> g.result(asOf)).toList();
    }

    /** SHA-256 v1: canonical UTF-8 string; first 32 bits unsigned modulo 10000. */
    public static Arm deterministicArm(UUID experimentId, String seed, long userId, int holdoutBps) {
        Objects.requireNonNull(experimentId, "Experiment is required");
        if (seed == null || seed.isBlank() || userId <= 0 || holdoutBps < 0 || holdoutBps > 10000) {
            throw new IllegalArgumentException("Invalid deterministic allocation input");
        }
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(
                    ("foodsave-growth-v1\n" + experimentId + "\n" + seed + "\n" + userId)
                            .getBytes(StandardCharsets.UTF_8));
            long value = Long.parseUnsignedLong(HexFormat.of().formatHex(hash, 0, 4), 16);
            return value % 10000 < holdoutBps ? Arm.HOLDOUT : Arm.TREATMENT;
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Required SHA-256 unavailable", e);
        }
    }

    private Experiment lockExperiment(UUID id) {
        return jdbc.query("SELECT * FROM growth_experiments WHERE id = ? FOR UPDATE", EXPERIMENT_MAPPER, id)
                .stream().findFirst().orElseThrow(() -> new IllegalArgumentException("Experiment not found"));
    }

    private void requireUser(long userId, boolean lock) {
        if (userId <= 0 || jdbc.queryForList("SELECT id FROM users WHERE id = ?" + (lock ? " FOR UPDATE" : ""),
                Long.class, userId).isEmpty()) throw new IllegalArgumentException("User not found");
    }

    private Baseline baseline(long userId, Instant at, String zone) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) AS clean_count, MAX(order_created_at AT TIME ZONE ?) AS last_clean_at
                FROM (SELECT DISTINCT ON (order_id) * FROM growth_order_status_ledger
                    WHERE user_id = ? AND observed_at <= ? ORDER BY order_id,observed_at DESC,id DESC) latest
                WHERE status NOT IN %s AND order_created_at AT TIME ZONE ? <= ?
                """.formatted(CANCELLED), (rs, row) -> new Baseline(rs.getLong("clean_count"), instant(rs, "last_clean_at")),
                zone, userId, Timestamp.from(at), zone, Timestamp.from(at));
    }

    private Preview preview(Experiment experiment, long userId, Baseline baseline, Instant at) {
        return new Preview(userId, GrowthCohort.classify(baseline.cleanCount(), baseline.lastCleanAt(), at).orElse(null),
                deterministicArm(experiment.id(), experiment.seed(), userId, experiment.holdoutBps()),
                baseline.cleanCount(), baseline.lastCleanAt(), at, false);
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private static Timestamp timestamp(Instant value) { return value == null ? null : Timestamp.from(value); }

    public enum Arm { TREATMENT, HOLDOUT }
    public record Experiment(UUID id, String name, String seed, int holdoutBps, boolean enabled,
                             Instant createdAt, long createdBy, String legacyOrderZone, String measurementZone) { }
    public record Assignment(UUID experimentId, long userId, GrowthCohort cohort, Arm arm, Instant assignedAt,
                             long baselineCleanCount, Instant baselineLastCleanAt, long assignedBy) { }
    public record Preview(long userId, GrowthCohort cohort, Arm arm, long baselineCleanCount,
                          Instant baselineLastCleanAt, Instant assignedAt, boolean frozen) {
        static Preview of(Assignment a) {
            return new Preview(a.userId(), a.cohort(), a.arm(), a.baselineCleanCount(), a.baselineLastCleanAt(), a.assignedAt(), true);
        }
        public boolean eligible() { return cohort != null; }
    }
    public record CandidatePreview(GrowthCohort cohort, long totalCandidates, Instant asOf, List<Preview> candidates) { }
    /** Rates are null until every assigned user in the group has matured, never delivery-conditioned. */
    public record Measure(GrowthCohort cohort, Arm arm, Instant asOf, long assignedUsers,
                          long d7MatureUsers, long d7ImmatureUsers, long d7ConvertedUsers,
                          long d7CleanOrders, long d7AnySecondOrNextUsers, long d7DifferentDayRepeatUsers,
                          Double d7IttRate, long d14MatureUsers, long d14ImmatureUsers,
                          long d14RetainedUsers, long d14RetainedOrders, long d14CancelledOrders,
                          Double d14IttRate, long d7PickupUsers, long d7PickupOrders,
                          long d14PickupUsers, long d14PickupOrders) { }
    private record Baseline(long cleanCount, Instant lastCleanAt) { }
    private record CandidateRow(Preview preview, long total) { }
    record Outcome(Assignment assignment, long d7CleanOrders, long d14RetainedOrders, long d7Pickups,
                   long d14Pickups, long d7CleanDays, boolean d7DifferentBaselineDay) { }
    private static final class MutableMeasure {
        private final GrowthCohort cohort;
        private final Arm arm;
        private long assigned, d7Mature, d7Converted, d7CleanOrders, d7AnySecondOrNext, d7DifferentDayRepeat;
        private long d14Mature, d14Retained, d14RetainedOrders, d14CancelledOrders;
        private long d7PickupUsers, d7PickupOrders, d14PickupUsers, d14PickupOrders;
        private MutableMeasure(GrowthCohort cohort, Arm arm) { this.cohort = cohort; this.arm = arm; }
        private Measure result(Instant at) {
            return new Measure(cohort, arm, at, assigned, d7Mature, assigned - d7Mature, d7Converted,
                    d7CleanOrders, d7AnySecondOrNext, d7DifferentDayRepeat,
                    assigned > 0 && d7Mature == assigned ? (double) d7Converted / assigned : null,
                    d14Mature, assigned - d14Mature, d14Retained, d14RetainedOrders, d14CancelledOrders,
                    assigned > 0 && d14Mature == assigned ? (double) d14Retained / assigned : null,
                    d7PickupUsers, d7PickupOrders, d14PickupUsers, d14PickupOrders);
        }
    }
}
