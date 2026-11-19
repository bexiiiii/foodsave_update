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
class TelegramCombinedFlowTest {
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

    @Test void signedHttpRoutesNewWalkWhileOldOrdersNeverReachBusinessHandlers() throws Exception {
        var bot = mock(TelegramBotService.class);
        var walks = mock(NearbyWalkService.class);
        var orderService = mock(OrderService.class);
        var products = mock(ProductService.class);
        var prefs = mock(com.foodsave.backend.repository.UserNotificationPreferencesRepository.class);
        var realWebhook = new TelegramWebhookService(bot, walks, mapper,
                mock(com.foodsave.backend.repository.UserRepository.class), prefs,
                mock(com.foodsave.backend.repository.OrderRepository.class), products,
                mock(TelegramOrderNotificationService.class), orderService);
        var guarded = new TelegramIngressService(jdbc, mapper, realWebhook);
        ReflectionTestUtils.setField(guarded, "acceptAfterUpdateId", 100L);
        var controller = new com.foodsave.backend.controller.TelegramWebhookController(guarded,
                mock(TelegramStoreManagerBotService.class));
        ReflectionTestUtils.setField(controller, "clientWebhookSecret", "local-only-secret");
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(controller).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/telegram/webhook")
                .header("X-Telegram-Bot-Api-Secret-Token", "local-only-secret")
                .contentType("application/json").content("{}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
        String old = """
                {"update_id":99,"callback_query":{"id":"old","data":"order:pickup:123"}}
                """;
        String oldReservation = """
                {"update_id":100,"message":{"web_app_data":{"data":"old booking"}}}
                """;
        for (String payload : new String[]{old, oldReservation}) {
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/telegram/webhook")
                    .header("X-Telegram-Bot-Api-Secret-Token", "local-only-secret")
                    .contentType("application/json").content(payload))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        }
        verifyNoInteractions(orderService, products, walks, bot);
        assertEquals("QUARANTINED", status(99));
        assertEquals("QUARANTINED", status(100));
        String fresh = """
                {"update_id":101,"message":{"message_id":7,"date":2000000000,
                 "text":"/start walk_ru","from":{"id":77},"chat":{"id":77,"type":"private"}}}
                """;
        when(walks.handle(any())).thenReturn(true);
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/telegram/webhook")
                .header("X-Telegram-Bot-Api-Secret-Token", "wrong")
                .contentType("application/json").content(fresh))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM telegram_inbound_events", Integer.class));
        for (int repeat=0;repeat<2;repeat++) {
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/telegram/webhook")
                    .header("X-Telegram-Bot-Api-Secret-Token", "local-only-secret")
                    .contentType("application/json").content(fresh))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        }
        verify(walks,times(1)).handle(argThat(u -> u.updateId().equals(101L)));
        verifyNoInteractions(orderService, products);
        assertEquals("DONE", status(101));
        String edited = """
                {"update_id":102,"edited_message":{"message_id":7,"date":2000000000,
                 "edit_date":2000000010,"from":{"id":77},"chat":{"id":77,"type":"private"},
                 "location":{"latitude":51.13,"longitude":71.43,"live_period":900}}}
                """;
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/telegram/webhook")
                .header("X-Telegram-Bot-Api-Secret-Token", "local-only-secret")
                .contentType("application/json").content(edited))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        verify(walks).handle(argThat(u -> u.editedMessage() != null && u.editedMessage().location() != null));
        verifyNoInteractions(orderService, products);
        assertEquals("DONE", status(102));

    }
}
