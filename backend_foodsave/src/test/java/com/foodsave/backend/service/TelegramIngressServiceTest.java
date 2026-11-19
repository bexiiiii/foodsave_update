package com.foodsave.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodsave.backend.dto.telegram.TelegramUpdate;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.Callable;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@EnabledIfEnvironmentVariable(named = "FOODSAVE_INGRESS_TEST_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:.*")
class TelegramIngressServiceTest {
    JdbcTemplate jdbc;
    TelegramWebhookService webhook;
    TelegramIngressService ingress;
    ObjectMapper mapper = new ObjectMapper();

    @BeforeEach void setup() throws Exception {
        var ds = new DriverManagerDataSource(System.getenv("FOODSAVE_INGRESS_TEST_URL"));
        jdbc = new JdbcTemplate(ds);
        jdbc.execute(Files.readString(Path.of("src/main/resources/db/migration/V20261113_1__telegram_inbound_events.sql")));
        jdbc.execute("TRUNCATE telegram_inbound_events");
        webhook = mock(TelegramWebhookService.class);
        ingress = new TelegramIngressService(jdbc, mapper, webhook);
        ReflectionTestUtils.setField(ingress, "acceptAfterUpdateId", 100L);
    }

    void receive(String json) throws Exception { ingress.receive(mapper.readTree(json)); }
    String status(long id) {
        return jdbc.queryForObject("SELECT status FROM telegram_inbound_events WHERE update_id=?", String.class, id);
    }

    @Test void publicWalkAcceptsDifferentUsersButHoldsOrdersAndPreLaunchEvents() throws Exception {
        ReflectionTestUtils.setField(ingress, "walkOnly", true);
        ReflectionTestUtils.setField(ingress, "walkStartedAt", 200L);
        for (long actor : new long[]{88,99}) {
            receive("{\"update_id\":"+(actor+1000)+",\"message\":{\"from\":{\"id\":"+actor+"},\"chat\":{\"id\":"+actor+",\"type\":\"private\"},\"date\":210,\"text\":\"/start walk_en\"}}");
        }
        verify(webhook,times(2)).handleUpdate(any());
        clearInvocations(webhook);
        for (String json : new String[]{
                "{\"update_id\":201,\"callback_query\":{\"data\":\"order:pickup:123\"}}",
                "{\"update_id\":202,\"message\":{\"from\":{\"id\":88},\"chat\":{\"id\":88,\"type\":\"private\"},\"date\":210,\"web_app_data\":{\"data\":\"booking\"}}}",
                "{\"update_id\":203,\"message\":{\"from\":{\"id\":88},\"chat\":{\"id\":88,\"type\":\"private\"},\"date\":199,\"text\":\"/start walk_ru\"}}"
        }) receive(json);
        verifyNoInteractions(webhook);
        for (int id=201;id<=203;id++) assertEquals("QUARANTINED",status(id));
    }

    @Test void publicModeWithoutLaunchBoundaryHoldsEverything() throws Exception {
        ReflectionTestUtils.setField(ingress, "walkOnly", true);
        receive("""
                {"update_id":301,"message":{"from":{"id":88},"chat":{"id":88,"type":"private"},"date":210,"text":"/start walk_ru"}}
                """);
        assertEquals("QUARANTINED",status(301));
        verifyNoInteractions(webhook);
    }

    @Test void personalPilotHoldsOtherPeopleOrdersAndOldShares() throws Exception {
        ReflectionTestUtils.setField(ingress, "testChatId", 77L);
        ReflectionTestUtils.setField(ingress, "testStartedAt", 200L);
        long id = 110;
        for (String fields : new String[]{
                "\"from\":{\"id\":88},\"chat\":{\"id\":88,\"type\":\"private\"},\"date\":210,\"text\":\"/start walk_ru\"",
                "\"from\":{\"id\":77},\"chat\":{\"id\":77,\"type\":\"private\"},\"date\":199,\"text\":\"/start walk_ru\"",
                "\"from\":{\"id\":77},\"chat\":{\"id\":77,\"type\":\"private\"},\"date\":210,\"text\":\"/start walk_ru\",\"web_app_data\":{\"data\":\"booking\"}",
                "\"from\":{\"id\":77},\"chat\":{\"id\":77,\"type\":\"private\"},\"date\":210,\"text\":\"/help\""
        }) {
            receive("{\"update_id\":" + id + ",\"message\":{" + fields + "}}");
            assertEquals("QUARANTINED", status(id++));
        }
        receive("{\"update_id\":120,\"callback_query\":{\"from\":{\"id\":77},\"data\":\"order:pickup:123\"}}");
        assertEquals("QUARANTINED", status(120));
        verifyNoInteractions(webhook);
    }

    @Test void personalPilotAllowsOnlyFreshPrivateWalkCommandsAndLocation() throws Exception {
        ReflectionTestUtils.setField(ingress, "testChatId", 77L);
        ReflectionTestUtils.setField(ingress, "testStartedAt", 200L);
        receive("""
                {"update_id":121,"message":{"from":{"id":77},"chat":{"id":77,"type":"private"},"date":210,"text":"/start walk_ru"}}
                """);
        receive("""
                {"update_id":122,"edited_message":{"from":{"id":77},"chat":{"id":77,"type":"private"},"date":210,"location":{"latitude":51.1,"longitude":71.4,"live_period":900}}}
                """);
        verify(webhook,times(2)).handleUpdate(any());
        assertEquals("DONE", status(121));
        assertEquals("DONE", status(122));
    }

    @Test void oldPickupAndReservationAreArchivedWithoutCallingOrderHandler() throws Exception {
        receive("""
                {"update_id":99,"callback_query":{"id":"old","data":"order:pickup:123"}}
                """);
        String reservation = """
                {"update_id":100,"message":{"web_app_data":{"data":"old booking"},"unknown_field":"preserved"}}
                """;
        receive(reservation);
        verifyNoInteractions(webhook);
        assertEquals("QUARANTINED", status(99));
        assertEquals("QUARANTINED", status(100));
        assertEquals(mapper.readTree(reservation), mapper.readTree(jdbc.queryForObject(
                "SELECT payload FROM telegram_inbound_events WHERE update_id=100", String.class)));
    }

    @Test void missingBoundaryHoldsNewEventsToo() throws Exception {
        ReflectionTestUtils.setField(ingress, "acceptAfterUpdateId", -1L);
        receive("{\"update_id\":999}");
        assertEquals("QUARANTINED", status(999));
        verifyNoInteractions(webhook);
    }

    @Test void concurrentDuplicatesAndRestartInvokeHandlerOnce() throws Exception {
        var payload = mapper.readTree("{\"update_id\":101,\"message\":{\"text\":\"/help\"}}");
        var executor = Executors.newFixedThreadPool(6);
        try {
            var tasks = new ArrayList<Callable<Void>>();
            for (int i=0; i<24; i++) tasks.add(() -> { ingress.receive(payload); return null; });
            for (var result : executor.invokeAll(tasks)) result.get();
        } finally { executor.shutdownNow(); }
        var restarted = new TelegramIngressService(jdbc, mapper, webhook);
        ReflectionTestUtils.setField(restarted, "acceptAfterUpdateId", 100L);
        restarted.receive(payload);
        verify(webhook, times(1)).handleUpdate(any());
        assertEquals("DONE", status(101));
    }

    @Test void ambiguousOrderFailureIsHeldOnRetry() throws Exception {
        doThrow(new IllegalStateException("simulated failure after side effect")).when(webhook).handleUpdate(any());
        var payload = mapper.readTree("{\"update_id\":102,\"callback_query\":{\"data\":\"order:pickup:123\"}}");
        assertThrows(ResponseStatusException.class, () -> ingress.receive(payload));
        ingress.receive(payload);
        verify(webhook, times(1)).handleUpdate(any());
        assertEquals("NEEDS_REVIEW", status(102));
    }

    @Test void interruptedProcessingIsNotRepeated() throws Exception {
        jdbc.update("INSERT INTO telegram_inbound_events(update_id,payload,status) VALUES(103,'{}','PROCESSING')");
        receive("{\"update_id\":103}");
        verifyNoInteractions(webhook);
        assertEquals("PROCESSING", status(103));
    }

    @Test void missingAndInvalidIdsCannotExecuteAnything() throws Exception {
        for (String json : new String[]{"{}", "{\"update_id\":-1}", "{\"update_id\":1.5}", "{\"update_id\":\"101\"}"}) {
            var payload = mapper.readTree(json);
            assertThrows(ResponseStatusException.class, () -> ingress.receive(payload));
        }
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM telegram_inbound_events", Integer.class));
        verifyNoInteractions(webhook);
    }

    @Test void failedStorageDoesNotAcknowledgeOrExecute() throws Exception {
        jdbc.execute("DROP TABLE telegram_inbound_events");
        try {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> ingress.receive(mapper.readTree("{\"update_id\":104}")));
            verifyNoInteractions(webhook);
        } finally {
            jdbc.execute(Files.readString(Path.of("src/main/resources/db/migration/V20261113_1__telegram_inbound_events.sql")));
        }
    }

    @Test void freshPickupKeepsItsExistingHandler() throws Exception {
        receive("""
                {"update_id":105,"callback_query":{"id":"fresh","data":"order:pickup:123"}}
                """);
        verify(webhook).handleUpdate(argThat(update -> "order:pickup:123".equals(update.callbackQuery().data())));
        assertEquals("DONE", status(105));
    }
}
