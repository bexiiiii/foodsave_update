package com.foodsave.backend.growth;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/** Mutually exclusive cohorts. Registration age deliberately plays no part. */
public enum GrowthCohort {
    NEVER_CLEAN,
    ONE_CLEAN_RECENT,
    ONE_CLEAN_LAPSED,
    REPEAT_LAPSED;

    public static Optional<GrowthCohort> classify(long cleanCount, Instant lastCleanAt, Instant at) {
        if (cleanCount < 0 || at == null || (cleanCount == 0) != (lastCleanAt == null)
                || (lastCleanAt != null && lastCleanAt.isAfter(at))) {
            throw new IllegalArgumentException("Inconsistent clean-order baseline");
        }
        if (cleanCount == 0) return Optional.of(NEVER_CLEAN);
        boolean lapsed = !lastCleanAt.plus(Duration.ofDays(8)).isAfter(at);
        if (cleanCount == 1) return Optional.of(lapsed ? ONE_CLEAN_LAPSED : ONE_CLEAN_RECENT);
        return lapsed ? Optional.of(REPEAT_LAPSED) : Optional.empty();
    }

    /** Do not reuse reservation cancellation helpers: EXPIRED/NO_SHOW/REJECTED still count. */
    public static boolean isClean(String status) {
        if (status == null) return false;
        return !status.equals("CANCELLED") && !status.equals("CANCELLED_BY_USER")
                && !status.equals("CANCELLED_BY_PARTNER");
    }
}
