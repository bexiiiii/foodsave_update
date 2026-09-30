package com.foodsave.backend.growth;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GrowthIsolationServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final PlatformTransactionManager manager = mock(PlatformTransactionManager.class);

    @Test
    void defaultOffLeavesOrdinaryMarketingUntouchedAndDoesNotNeedMigration() {
        AtomicInteger sent = new AtomicInteger();
        int result = new GrowthIsolationService(jdbc, manager, false)
                .runForNonParticipant(1, sent::incrementAndGet, 0);
        assertEquals(1, result);
        verify(jdbc).queryForObject("SELECT to_regclass('growth_assignments') IS NOT NULL", Boolean.class);
        verifyNoInteractions(manager);
    }

    @Test
    void switchingGlobalFlagOffDoesNotReleaseExistingParticipants() {
        when(jdbc.queryForObject("SELECT to_regclass('growth_assignments') IS NOT NULL", Boolean.class)).thenReturn(true);
        when(manager.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq(3L))).thenReturn(3L);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(3L))).thenReturn(true);
        AtomicInteger sent = new AtomicInteger();
        assertEquals(0, new GrowthIsolationService(jdbc, manager, false)
                .runForNonParticipant(3, sent::incrementAndGet, 0));
        assertEquals(0, sent.get());
    }

    @Test
    void nonParticipantStillReceivesOrdinaryMarketing() {
        when(manager.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq(2L))).thenReturn(2L);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(2L))).thenReturn(false);
        AtomicInteger sent = new AtomicInteger();
        assertEquals(1, new GrowthIsolationService(jdbc, manager, true)
                .runForNonParticipant(2, sent::incrementAndGet, 0));
        verify(manager).commit(any());
    }

    @Test
    void enrolledParticipantsDoNotReceiveLegacyMarketingRegardlessOfArm() {
        when(manager.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq(3L))).thenReturn(3L);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(3L))).thenReturn(true);
        AtomicInteger sent = new AtomicInteger();
        assertEquals(0, new GrowthIsolationService(jdbc, manager, true)
                .runForNonParticipant(3, sent::incrementAndGet, 0));
        assertEquals(0, sent.get());
        verify(jdbc).queryForObject(argThat(sql -> sql.contains("14 days") && !sql.contains("arm")
                && !sql.contains("enabled")), eq(Boolean.class), eq(3L));
    }

    @Test
    void missingMigrationFailsClosedWhenGrowthIsExplicitlyEnabled() {
        when(manager.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq(4L))).thenReturn(4L);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(4L)))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("synthetic"));
        AtomicInteger sent = new AtomicInteger();
        assertThrows(org.springframework.dao.DataAccessException.class,
                () -> new GrowthIsolationService(jdbc, manager, true)
                        .runForNonParticipant(4, sent::incrementAndGet, 0));
        assertEquals(0, sent.get());
        verify(manager).rollback(any());
    }
}
