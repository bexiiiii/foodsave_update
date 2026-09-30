package com.foodsave.backend.growth;

import com.foodsave.backend.domain.enums.OrderStatus;
import org.junit.jupiter.api.Test;
import java.time.Duration;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

class GrowthCohortTest {
    private final Instant now = Instant.parse("2026-09-30T12:00:00Z");
    @Test void neverCleanHasNoRegistrationAgeRestriction() {
        assertEquals(GrowthCohort.NEVER_CLEAN, GrowthCohort.classify(0, null, now).orElseThrow());
    }
    @Test void eightDayBoundaryIsLapsedAndCohortsAreExclusive() {
        Instant boundary = now.minus(Duration.ofDays(8));
        assertEquals(GrowthCohort.ONE_CLEAN_RECENT, GrowthCohort.classify(1, boundary.plusNanos(1), now).orElseThrow());
        assertEquals(GrowthCohort.ONE_CLEAN_LAPSED, GrowthCohort.classify(1, boundary, now).orElseThrow());
        assertEquals(GrowthCohort.REPEAT_LAPSED, GrowthCohort.classify(2, boundary, now).orElseThrow());
        assertTrue(GrowthCohort.classify(2, boundary.plusNanos(1), now).isEmpty());
    }
    @Test void onlyThreeCancellationStatusesAreExcluded() {
        for (OrderStatus status : OrderStatus.values()) {
            boolean expected = status != OrderStatus.CANCELLED && status != OrderStatus.CANCELLED_BY_USER
                    && status != OrderStatus.CANCELLED_BY_PARTNER;
            assertEquals(expected, GrowthCohort.isClean(status.name()), status.name());
        }
        assertFalse(GrowthCohort.isClean(null));
    }
    @Test void inconsistentBaselinesFailClosed() {
        assertThrows(IllegalArgumentException.class, () -> GrowthCohort.classify(-1, null, now));
        assertThrows(IllegalArgumentException.class, () -> GrowthCohort.classify(1, null, now));
        assertThrows(IllegalArgumentException.class, () -> GrowthCohort.classify(0, now, now));
        assertThrows(IllegalArgumentException.class, () -> GrowthCohort.classify(1, now.plusSeconds(1), now));
    }
}
