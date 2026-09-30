package com.foodsave.backend.growth;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import static com.foodsave.backend.growth.GrowthExperimentStore.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GrowthExperimentStoreTest {
    private final UUID id = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private final Instant assigned = Instant.parse("2026-09-01T12:00:00Z");
    @Test void hashIsDeterministicAndSupportsExactEndpoints() {
        Arm original = deterministicArm(id, "seed-v1", 42, 2000);
        for (int i = 0; i < 100; i++) assertEquals(original, deterministicArm(id, "seed-v1", 42, 2000));
        for (long user = 1; user <= 1000; user++) {
            assertEquals(Arm.TREATMENT, deterministicArm(id, "seed-v1", user, 0));
            assertEquals(Arm.HOLDOUT, deterministicArm(id, "seed-v1", user, 10000));
        }
        // Fixed canonical encoding test vector, independent from mutable clean-order counts.
        assertEquals(Arm.TREATMENT, deterministicArm(id, "seed-v1", 42, 1941));
        assertEquals(Arm.HOLDOUT, deterministicArm(id, "seed-v1", 42, 1942));
    }
    @Test void allAssignmentsRemainDenominatorRegardlessOfSendOrConversion() {
        List<Measure> result = aggregate(List.of(
                outcome(1, GrowthCohort.NEVER_CLEAN, Arm.TREATMENT, 0, 2, 1, 0, 0, 1, false),
                outcome(2, GrowthCohort.NEVER_CLEAN, Arm.TREATMENT, 0, 0, 0, 0, 0, 0, false),
                outcome(3, GrowthCohort.NEVER_CLEAN, Arm.HOLDOUT, 0, 1, 1, 1, 1, 1, false)),
                assigned.plus(Duration.ofDays(14)));
        Measure treatment = result.stream().filter(m -> m.arm() == Arm.TREATMENT).findFirst().orElseThrow();
        assertEquals(2, treatment.assignedUsers());
        assertEquals(1, treatment.d7ConvertedUsers());
        assertEquals(0.5, treatment.d7IttRate());
        assertEquals(1, treatment.d7AnySecondOrNextUsers());
        assertEquals(0, treatment.d7DifferentDayRepeatUsers(), "Two same-day orders are not different-day repeat");
        assertEquals(1, treatment.d14RetainedOrders());
        assertEquals(1, treatment.d14CancelledOrders());
        assertEquals(0, treatment.d7PickupUsers(), "Clean orders alone must not imply pickup");
        Measure holdout = result.stream().filter(m -> m.arm() == Arm.HOLDOUT).findFirst().orElseThrow();
        assertEquals(1, holdout.assignedUsers());
        assertEquals(1, holdout.d7PickupUsers());
    }
    @Test void immatureWindowsAreExplicitAndDoNotLeakFutureOutcomes() {
        Outcome later = new Outcome(new Assignment(id, 2, GrowthCohort.NEVER_CLEAN, Arm.TREATMENT,
                assigned.plus(Duration.ofDays(1)), 0, null, 99), 10, 10, 5, 5, 2, false);
        Measure m = aggregate(List.of(
                outcome(1, GrowthCohort.NEVER_CLEAN, Arm.TREATMENT, 0, 1, 1, 1, 1, 1, false), later),
                assigned.plus(Duration.ofDays(7))).get(0);
        assertEquals(2, m.assignedUsers());
        assertEquals(1, m.d7MatureUsers());
        assertEquals(1, m.d7ImmatureUsers());
        assertEquals(1, m.d7CleanOrders());
        assertEquals(1, m.d7PickupOrders());
        assertNull(m.d7IttRate());
        assertEquals(2, m.d14ImmatureUsers());
        assertEquals(0, m.d14RetainedOrders());
        assertNull(m.d14IttRate());
    }
    @Test void secondAndNextCleanUseFrozenBaselines() {
        List<Measure> result = aggregate(List.of(
                outcome(1, GrowthCohort.ONE_CLEAN_RECENT, Arm.TREATMENT, 1, 1, 1, 0, 0, 1, true),
                outcome(2, GrowthCohort.ONE_CLEAN_LAPSED, Arm.TREATMENT, 1, 1, 0, 0, 0, 1, true),
                outcome(3, GrowthCohort.REPEAT_LAPSED, Arm.TREATMENT, 5, 1, 1, 0, 0, 1, true)),
                assigned.plus(Duration.ofDays(14)));
        assertEquals(3, result.size());
        for (Measure m : result) {
            assertEquals(1, m.d7ConvertedUsers());
            assertEquals(1, m.d7AnySecondOrNextUsers());
            assertEquals(1, m.d7DifferentDayRepeatUsers());
        }
        assertEquals(0, result.stream().filter(m -> m.cohort() == GrowthCohort.ONE_CLEAN_LAPSED)
                .findFirst().orElseThrow().d14RetainedUsers());
    }
    @Test void previewOfFrozenAssignmentPerformsNoWritesOrReclassification() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        GrowthExperimentStore store = new GrowthExperimentStore(jdbc, Clock.fixed(assigned, ZoneOffset.UTC), ZoneOffset.UTC, ZoneOffset.UTC);
        Experiment experiment = new Experiment(id, "test", "seed-v1", 2000, false, assigned, 99, "UTC", "UTC");
        Assignment frozen = new Assignment(id, 1, GrowthCohort.NEVER_CLEAN, Arm.HOLDOUT, assigned, 0, null, 99);
        when(jdbc.query(eq("SELECT * FROM growth_experiments WHERE id = ?"), any(RowMapper.class), eq(id)))
                .thenReturn(List.of(experiment));
        when(jdbc.query(eq("SELECT * FROM growth_assignments WHERE experiment_id = ? AND user_id = ?"),
                any(RowMapper.class), eq(id), eq(1L))).thenReturn(List.of(frozen));
        Preview result = store.preview(id, 1);
        assertTrue(result.frozen());
        assertEquals(GrowthCohort.NEVER_CLEAN, result.cohort());
        assertEquals(Arm.HOLDOUT, result.arm());
        verify(jdbc).query(eq("SELECT * FROM growth_experiments WHERE id = ?"), any(RowMapper.class), eq(id));
        verify(jdbc).query(eq("SELECT * FROM growth_assignments WHERE experiment_id = ? AND user_id = ?"),
                any(RowMapper.class), eq(id), eq(1L));
        verifyNoMoreInteractions(jdbc);
    }
    private Outcome outcome(long user, GrowthCohort cohort, Arm arm, long baseline, long clean7, long retained14,
                            long pickups7, long pickups14, long days7, boolean differentDay) {
        return new Outcome(new Assignment(id, user, cohort, arm, assigned, baseline,
                baseline == 0 ? null : assigned.minus(Duration.ofDays(9)), 99),
                clean7, retained14, pickups7, pickups14, days7, differentDay);
    }
}
