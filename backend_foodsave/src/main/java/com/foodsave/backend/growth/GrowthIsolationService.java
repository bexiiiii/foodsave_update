package com.foodsave.backend.growth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.function.Supplier;

/** Coordinates enrollment with legacy marketing without affecting uninvolved users. */
@Service
public class GrowthIsolationService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final boolean enabled;

    public GrowthIsolationService(JdbcTemplate jdbc, PlatformTransactionManager manager,
                                  @Value("${notifications.growth.enabled:false}") boolean enabled) {
        this.jdbc = jdbc;
        this.enabled = enabled;
        this.transaction = new TransactionTemplate(manager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);
    }

    public <T> T runForNonParticipant(long userId, Supplier<T> action, T skipped) {
        // Disabling new growth sends must not release existing participants during D14.
        // A pre-migration default-off deployment has no participants to suppress.
        if (!enabled && !Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT to_regclass('growth_assignments') IS NOT NULL", Boolean.class))) return action.get();
        return transaction.execute(status -> {
            // Enrollment and growth dispatch use this same per-user database row lock.
            jdbc.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", Long.class, userId);
            Boolean participant = jdbc.queryForObject("""
                    SELECT EXISTS (SELECT 1 FROM growth_assignments
                      WHERE user_id = ? AND assigned_at <= statement_timestamp()
                      AND assigned_at + INTERVAL '14 days' > statement_timestamp())
                    """, Boolean.class, userId);
            // Deliberately independent of arm and experiment enabled state: pausing a test
            // must not expose its holdout during D7/D14 follow-up.
            return Boolean.TRUE.equals(participant) ? skipped : action.get();
        });
    }
}
