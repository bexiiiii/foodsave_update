package com.foodsave.backend.growth;

import com.foodsave.backend.service.TelegramBotService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Opt-in disposable PostgreSQL only; never loads application properties or contacts Telegram. */
@EnabledIfEnvironmentVariable(named = "GROWTH_TEST_JDBC_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:.*")
class GrowthPostgresIntegrationTest {
    private JdbcTemplate jdbc;
    private JdbcTemplate admin;
    private DataSourceTransactionManager manager;
    private TransactionTemplate tx;
    private String schema;
    private final Instant now = Instant.parse("2026-09-30T10:00:00Z");
    private final ZoneId zone = ZoneId.of("Asia/Almaty");
    private TelegramBotService telegram;

    @BeforeEach void setup() throws Exception {
        String url = System.getenv("GROWTH_TEST_JDBC_URL");
        DriverManagerDataSource root = new DriverManagerDataSource(url, System.getenv().getOrDefault("GROWTH_TEST_DB_USER", "postgres"), "");
        admin = new JdbcTemplate(root);
        schema = "growth_test_" + UUID.randomUUID().toString().replace("-", "");
        admin.execute("CREATE SCHEMA " + schema);
        DriverManagerDataSource ds = new DriverManagerDataSource(url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema, System.getenv().getOrDefault("GROWTH_TEST_DB_USER", "postgres"), "");
        jdbc = new JdbcTemplate(ds);
        manager = new DataSourceTransactionManager(ds);
        tx = new TransactionTemplate(manager);
        jdbc.execute("""
            CREATE TABLE users (id BIGINT PRIMARY KEY, role VARCHAR(30) DEFAULT 'USER', enabled BOOLEAN DEFAULT TRUE,
              active BOOLEAN DEFAULT TRUE, blacklisted BOOLEAN DEFAULT FALSE, telegram_user_id BIGINT,
              last_latitude DOUBLE PRECISION, last_longitude DOUBLE PRECISION, last_location_updated_at TIMESTAMP);
            CREATE TABLE stores (id BIGINT PRIMARY KEY, name TEXT, active BOOLEAN, status TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION);
            CREATE TABLE products (id BIGINT PRIMARY KEY, store_id BIGINT REFERENCES stores(id), name TEXT,
              active BOOLEAN, status TEXT, stock_quantity INTEGER, expiry_date TIMESTAMP, price NUMERIC, discount_percentage DOUBLE PRECISION);
            CREATE TABLE orders (id BIGINT PRIMARY KEY, user_id BIGINT, created_at TIMESTAMP, status VARCHAR(40), picked_up_at TIMESTAMP);
            CREATE TABLE user_notification_preferences (user_id BIGINT PRIMARY KEY, telegram_notifications_enabled BOOLEAN,
              nearby_offers_enabled BOOLEAN, maximum_messages_per_day INTEGER, max_distance_km DOUBLE PRECISION,
              quiet_hours_start TIME, quiet_hours_end TIME, timezone TEXT, max_price NUMERIC, min_discount_percent INTEGER);
            CREATE TABLE notification_settings (user_id BIGINT PRIMARY KEY, promotions BOOLEAN);
            CREATE TABLE notification_groups (user_id BIGINT, status TEXT, sent_at TIMESTAMP, created_at TIMESTAMP);
            CREATE TABLE notifications (user_id BIGINT, type TEXT, created_at TIMESTAMP);
            CREATE TABLE notification_frequency_states (user_id BIGINT PRIMARY KEY, marketing_sent_today INTEGER,
              marketing_sent_date DATE, last_marketing_sent_at TIMESTAMP, consecutive_unopened_count INTEGER,
              suppressed_until TIMESTAMP, last_opened_at TIMESTAMP, engagement_score INTEGER, created_at TIMESTAMP, updated_at TIMESTAMP);
            INSERT INTO users (id,role) VALUES (99,'SUPER_ADMIN');
            INSERT INTO users(id,telegram_user_id,last_latitude,last_longitude,last_location_updated_at)
              SELECT n, n+10000, 43.25, 76.95, TIMESTAMP '2026-09-30 10:00:00' FROM generate_series(1,10) n;
            INSERT INTO stores VALUES (1,'Synthetic store',TRUE,'ACTIVE',43.25,76.95);
            INSERT INTO products VALUES (1,1,'Synthetic offer',TRUE,'AVAILABLE',10,TIMESTAMP '2026-10-01 23:00:00',1000,50);
            INSERT INTO user_notification_preferences SELECT n,TRUE,TRUE,2,8,TIME '22:00',TIME '09:00','Asia/Almaty',NULL,NULL FROM generate_series(1,10) n;
            INSERT INTO notification_settings SELECT n,TRUE FROM generate_series(1,10) n;
            """);
        for (String file : List.of("V020__growth_experiments.sql", "V021__growth_dispatch.sql")) {
            String sql = new ClassPathResource("db/migration/" + file).getContentAsString(StandardCharsets.UTF_8);
            tx.executeWithoutResult(s -> jdbc.execute(sql));
        }
        telegram = mock(TelegramBotService.class);
        when(telegram.sendMessageOnceDetailed(anyLong(), any())).thenReturn(new TelegramBotService.TelegramSendResult(true, null, 1));
    }
    @AfterEach void cleanup() { if (admin != null && schema != null) admin.execute("DROP SCHEMA " + schema + " CASCADE"); }
    private GrowthExperimentStore store(Instant at) { return new GrowthExperimentStore(jdbc, Clock.fixed(at, ZoneOffset.UTC), zone, zone); }
    private GrowthDispatchService dispatch(boolean global, boolean legacy) { return new GrowthDispatchService(jdbc, manager, telegram, global, legacy, Clock.fixed(now, ZoneOffset.UTC), GrowthDispatchPolicy.Config.defaults(), ZoneOffset.UTC); }
    private GrowthExperimentStore.Experiment experiment(int holdout) { return tx.execute(s -> store(now).create("Synthetic", "fixed-seed", holdout, 99)); }
    private GrowthExperimentStore.Assignment assign(UUID id, long user, Instant at) { return tx.execute(s -> store(at).assign(id, user, 99)); }
    private void enable(UUID id) { tx.executeWithoutResult(s -> store(now).setEnabled(id, true, 99)); }
    private void window() { dispatch(false, true).verifyPickupWindow(1, now, now.plusSeconds(7200), 99); }
    private long count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Long.class); }

    @Test void migrationsCreateNoExperimentsOrSendsAndLedgerCapturesOrderChanges() {
        assertEquals(0, count("growth_experiments")); assertEquals(0,count("growth_assignments")); assertEquals(0,count("growth_dispatches"));
        jdbc.update("INSERT INTO orders VALUES (1,1,?,'PENDING',NULL)", LocalDateTime.ofInstant(now,zone));
        jdbc.update("UPDATE orders SET status='CANCELLED_BY_USER' WHERE id=1");
        assertEquals(2,count("growth_order_status_ledger"));
        assertThrows(Exception.class, () -> jdbc.update("DELETE FROM growth_order_status_ledger"));
        verifyNoInteractions(telegram);
    }
    @Test void previewIsReadOnlyAssignmentsImmutableAndConcurrentEnrollmentIdempotent() throws Exception {
        var e = experiment(2000);
        var preview = store(now).preview(e.id(),1);
        assertEquals(GrowthCohort.NEVER_CLEAN,preview.cohort()); assertEquals(0,count("growth_assignments"));
        ExecutorService pool = Executors.newFixedThreadPool(6);
        try {
            List<Future<GrowthExperimentStore.Assignment>> jobs = new ArrayList<>();
            for(int n=0;n<12;n++) jobs.add(pool.submit(() -> assign(e.id(),1,now)));
            for(var job:jobs) assertEquals(preview.arm(),job.get(15,TimeUnit.SECONDS).arm());
        } finally { pool.shutdownNow(); }
        assertEquals(1,count("growth_assignments"));
        assertThrows(Exception.class,() -> jdbc.update("UPDATE growth_assignments SET arm='HOLDOUT' WHERE user_id=1"));
        assertThrows(Exception.class,() -> jdbc.update("UPDATE growth_experiments SET seed='changed' WHERE id=?",e.id()));
        assertThrows(Exception.class,() -> jdbc.update("DELETE FROM growth_experiment_audit"));
        verifyNoInteractions(telegram);
    }
    @Test void defaultOffHoldoutAndOptOutFailClosedWithoutSending() {
        var e=experiment(0); assign(e.id(),1,now); window();
        var off=dispatch(false,true).preview(e.id(),1,1);
        assertTrue(off.reasons().contains(GrowthDispatchPolicy.Reason.GLOBAL_DISABLED));
        assertTrue(off.reasons().contains(GrowthDispatchPolicy.Reason.EXPERIMENT_DISABLED));
        assertEquals(0,count("growth_dispatches")); enable(e.id());
        assertEquals(GrowthDispatchService.Status.BLOCKED,dispatch(false,true).dispatch(e.id(),1,1,99).status());
        jdbc.update("UPDATE notification_settings SET promotions=FALSE WHERE user_id=1");
        assertEquals(GrowthDispatchService.Status.BLOCKED,dispatch(true,true).dispatch(e.id(),1,1,99).status());
        var holdout=experiment(10000); assign(holdout.id(),2,now); enable(holdout.id());
        assertTrue(dispatch(true,true).preview(holdout.id(),2,1).reasons().contains(GrowthDispatchPolicy.Reason.HOLDOUT));
        assertEquals(0,count("growth_dispatches")); verifyNoInteractions(telegram);
    }
    @Test void concurrentDispatchIsAtMostOnceAndLegacyMarketingMayRemainEnabled() throws Exception {
        var e=experiment(0); assign(e.id(),1,now); enable(e.id()); window();
        assertTrue(dispatch(true,true).preview(e.id(),1,1).eligible());
        ExecutorService pool=Executors.newFixedThreadPool(6);
        try {
            List<Future<GrowthDispatchService.DispatchResult>> jobs=new ArrayList<>();
            for(int n=0;n<12;n++) jobs.add(pool.submit(() -> dispatch(true,true).dispatch(e.id(),1,1,99)));
            for(var job:jobs) assertNotEquals(GrowthDispatchService.Status.BLOCKED,job.get(15,TimeUnit.SECONDS).status());
        } finally {pool.shutdownNow();}
        assertEquals(1,count("growth_dispatches")); verify(telegram,times(1)).sendMessageOnceDetailed(eq(10001L),any());
        assertEquals(1,jdbc.queryForObject("SELECT marketing_sent_today FROM notification_frequency_states WHERE user_id=1",Integer.class));
        assertThrows(Exception.class,() -> jdbc.update("DELETE FROM growth_dispatches"));
    }
    @Test void ambiguousTransportIsTerminalAndNonAdminCannotClaim() {
        var e=experiment(0);assign(e.id(),1,now);enable(e.id());window();
        assertThrows(org.springframework.security.access.AccessDeniedException.class,() -> dispatch(true,true).dispatch(e.id(),1,1,1));
        when(telegram.sendMessageOnceDetailed(anyLong(),any())).thenThrow(new RuntimeException("synthetic"));
        assertEquals(GrowthDispatchService.Status.UNKNOWN,dispatch(true,true).dispatch(e.id(),1,1,99).status());
        assertEquals(GrowthDispatchService.Status.UNKNOWN,dispatch(true,true).dispatch(e.id(),1,1,99).status());
        verify(telegram,times(1)).sendMessageOnceDetailed(anyLong(),any());
    }
    @Test void d7AndD14AreFrozenByLedgerAndUseFullAssignedDenominator() {
        Instant assigned=now.minus(Duration.ofDays(20));var e=experiment(0);
        assign(e.id(),1,assigned);assign(e.id(),2,assigned);
        // D7 contains PENDING and EXPIRED, both clean by the agreed cancellation-only definition.
        ledger(1,1,assigned.plusSeconds(60),"PENDING",assigned.plusSeconds(60));
        ledger(2,1,assigned.plusSeconds(120),"EXPIRED",assigned.plusSeconds(120));
        ledger(1,1,assigned.plusSeconds(60),"CANCELLED_BY_PARTNER",assigned.plus(Duration.ofDays(10)));
        // A post-D14 cancellation must not rewrite the already matured D14 result.
        ledger(2,1,assigned.plusSeconds(120),"CANCELLED",assigned.plus(Duration.ofDays(15)));
        var m=store(now).measure(e.id()).get(0);
        assertEquals(2,m.assignedUsers());assertEquals(1,m.d7ConvertedUsers());assertEquals(.5,m.d7IttRate());
        assertEquals(2,m.d7CleanOrders());assertEquals(1,m.d14RetainedOrders());assertEquals(1,m.d14CancelledOrders());
        assertEquals(0,m.d7DifferentDayRepeatUsers());assertEquals(0,m.d7PickupUsers());
        assertEquals(0,count("growth_dispatches"));
    }
    @Test void calendarDayRepeatUsesFrozenBusinessZoneAndOnlyThreeCancelledStatusesAreExcluded() {
        Instant assigned=now.minus(Duration.ofDays(20));var e=experiment(0);assign(e.id(),1,assigned);
        Instant beforeMidnight=assigned.atZone(zone).toLocalDate().atTime(23,59).atZone(zone).toInstant();
        ledger(1,1,beforeMidnight,"REFUNDED",beforeMidnight);
        ledger(2,1,beforeMidnight.plusSeconds(120),"NO_SHOW",beforeMidnight.plusSeconds(120));
        ledger(3,1,beforeMidnight.plusSeconds(130),"CANCELLED_BY_USER",beforeMidnight.plusSeconds(130));
        var m=store(now).measure(e.id()).get(0);
        assertEquals(2,m.d7CleanOrders());assertEquals(1,m.d7DifferentDayRepeatUsers());
        assertEquals(2,m.d14RetainedOrders());
    }
    @Test void participantSuppressionSurvivesGlobalPauseAndUsesStatementTimeAfterEnrollment() throws Exception {
        var e=experiment(10000);
        ExecutorService pool=Executors.newSingleThreadExecutor();
        CountDownLatch started=new CountDownLatch(1), enrolled=new CountDownLatch(1);
        try {
            Future<Integer> marketing=pool.submit(() -> tx.execute(ignored -> {
                // Deliberately start this transaction BEFORE enrollment is committed.
                jdbc.queryForObject("SELECT transaction_timestamp()", java.sql.Timestamp.class);
                started.countDown();
                try { if(!enrolled.await(10,TimeUnit.SECONDS)) throw new AssertionError("enrollment timeout"); }
                catch(InterruptedException ex) { throw new RuntimeException(ex); }
                return new GrowthIsolationService(jdbc,manager,false).runForNonParticipant(1,() -> 1,0);
            }));
            assertTrue(started.await(10,TimeUnit.SECONDS));
            assign(e.id(),1,Instant.now()); enrolled.countDown();
            assertEquals(0,marketing.get(10,TimeUnit.SECONDS));
            assertEquals(1,new GrowthIsolationService(jdbc,manager,false).runForNonParticipant(2,() -> 1,0));
        } finally { enrolled.countDown();pool.shutdownNow(); }
        verifyNoInteractions(telegram);
    }
    @Test void overlapIsRejectedUntilD14AndBothArmsAreIsolated() {
        var a=experiment(0);var b=experiment(10000);
        assign(a.id(),1,Instant.now());assign(b.id(),2,Instant.now());
        assertThrows(IllegalArgumentException.class,() -> assign(b.id(),1,Instant.now()));
        var isolation=new GrowthIsolationService(jdbc,manager,false);
        assertEquals(0,isolation.runForNonParticipant(1,() -> 1,0));
        assertEquals(0,isolation.runForNonParticipant(2,() -> 1,0));
        assign(a.id(),3,Instant.now().minus(Duration.ofDays(15)));
        assertEquals(1,isolation.runForNonParticipant(3,() -> 1,0));
        assertNotNull(assign(b.id(),3,Instant.now()));
    }

    @Test void almatyLegacyGpsAndFrequencyTimestampsAreInterpretedWithoutFiveHourShift() {
        var e=experiment(0);assign(e.id(),1,now);enable(e.id());window();
        jdbc.update("UPDATE users SET last_location_updated_at=? WHERE id=1",LocalDateTime.ofInstant(now,zone));
        jdbc.update("INSERT INTO notification_frequency_states(user_id,marketing_sent_today,marketing_sent_date,last_marketing_sent_at,consecutive_unopened_count) VALUES(1,0,?,?,0)",
                now.atZone(zone).toLocalDate(),LocalDateTime.ofInstant(now.minus(Duration.ofHours(5)),zone));
        var service=new GrowthDispatchService(jdbc,manager,telegram,true,true,Clock.fixed(now,ZoneOffset.UTC),GrowthDispatchPolicy.Config.defaults(),zone);
        assertTrue(service.preview(e.id(),1,1).eligible());
        assertEquals(GrowthDispatchService.Status.SENT,service.dispatch(e.id(),1,1,99).status());
        assertEquals(LocalDateTime.ofInstant(now,zone),jdbc.queryForObject("SELECT last_marketing_sent_at FROM notification_frequency_states WHERE user_id=1",LocalDateTime.class));
    }
    @Test void candidatePreviewUsesExclusiveCohortsAndDoesNotEnroll() {
        var e=experiment(2000);
        ledger(1,2,now.minus(Duration.ofDays(7)),"PENDING",now.minus(Duration.ofDays(7)));
        ledger(2,3,now.minus(Duration.ofDays(8)),"EXPIRED",now.minus(Duration.ofDays(8)));
        ledger(3,4,now.minus(Duration.ofDays(9)),"COMPLETED",now.minus(Duration.ofDays(9)));
        ledger(4,4,now.minus(Duration.ofDays(8)),"NO_SHOW",now.minus(Duration.ofDays(8)));
        ledger(5,5,now.minus(Duration.ofDays(9)),"CANCELLED",now.minus(Duration.ofDays(9)));
        assertEquals(1,store(now).candidatePreview(e.id(),GrowthCohort.ONE_CLEAN_RECENT,100).totalCandidates());
        assertEquals(1,store(now).candidatePreview(e.id(),GrowthCohort.ONE_CLEAN_LAPSED,100).totalCandidates());
        assertEquals(1,store(now).candidatePreview(e.id(),GrowthCohort.REPEAT_LAPSED,100).totalCandidates());
        assertEquals(8,store(now).candidatePreview(e.id(),GrowthCohort.NEVER_CLEAN,100).totalCandidates());
        assertEquals(0,count("growth_assignments"));verifyNoInteractions(telegram);
    }

    private void ledger(long order,long user,Instant created,String status,Instant observed) {
        jdbc.update("INSERT INTO growth_order_status_ledger(order_id,user_id,order_created_at,status,observed_at,event_kind) VALUES(?,?,?,?,?,'UPDATE')",
                order,user,LocalDateTime.ofInstant(created,zone),status,observed.atOffset(ZoneOffset.UTC));
    }
}
