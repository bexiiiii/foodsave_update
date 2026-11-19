package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.NotificationWindowType;
import com.foodsave.backend.domain.enums.StoreStatus;
import com.foodsave.backend.domain.enums.OrderStatus;
import com.foodsave.backend.domain.enums.UserRole;
import com.foodsave.backend.dto.ProductDTO;
import com.foodsave.backend.entity.*;
import com.foodsave.backend.repository.*;
import com.foodsave.backend.security.AuthorizationService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ContextConfiguration;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:nearby;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = ProductStatsRepositoryTest.Config.class)
@Import({NotificationGroupService.class, NotificationService.class, NearbyWalkService.class})
class NearbyBoxNotificationTest {
    @Autowired NotificationGroupService service;
    @Autowired UserNotificationPreferencesRepository preferences;
    @Autowired NotificationService notifications;
    @Autowired NearbyWalkService walks;
    @MockBean com.foodsave.backend.security.SecurityUtils securityUtils;
    @Autowired NotificationGroupRepository groups;
    @Autowired NotificationRepository inbox;
    @Autowired EntityManager em;
    @MockBean TelegramBotService bot;
    @MockBean ProductEventService events;
    @MockBean AuthorizationService access;
    User user;
    Product box;
    NotificationSettings settings;

    @BeforeEach void setUp() {
        user = new User();
        user.setEmail("nearby@example.test"); user.setFirstName("Test"); user.setLastName("User");
        user.setPassword("fixture"); user.setRole(UserRole.CUSTOMER); user.setTelegramUser(true); user.setTelegramUserId(77L);
        user.setLastLatitude(51.13); user.setLastLongitude(71.43); user.setLastLocationUpdatedAt(LocalDateTime.now());
        em.persist(user);
        settings = new NotificationSettings();
        settings.setUser(user); settings.setPromotions(true); settings.setNearbyOnly(true); em.persist(settings);
        var store = new Store();
        store.setName("Кофейня & <тест>"); store.setAddress("Test"); store.setPhone("0000000"); store.setCategory("Test");
        store.setLatitude(51.131); store.setLongitude(71.43); store.setActive(true);
        store.setOwner(user); store.setStatus(StoreStatus.ACTIVE); em.persist(store);
        var category = new Category(); category.setName("Coffee"); em.persist(category);
        box = new Product();
        box.setStore(store); box.setCategory(category); box.setName("Круассан"); box.setPrice(BigDecimal.valueOf(750));
        box.setOriginalPrice(BigDecimal.valueOf(1500)); box.setActive(true); box.setStockQuantity(1); em.persist(box);
        var preferences = new UserNotificationPreferences();
        preferences.setUser(user);
        // Use a short quiet interval outside the current moment, including during night test runs.
        LocalTime quiet = LocalTime.now(com.foodsave.backend.util.ProductAvailability.BUSINESS_ZONE).withNano(0).plusHours(6);
        preferences.setQuietHoursStart(quiet); preferences.setQuietHoursEnd(quiet.plusMinutes(1)); em.persist(preferences);
        for (var window : NotificationWindowType.values()) {
            var schedule = new NotificationScheduleSetting();
            schedule.setNotificationWindowType(window); schedule.setStartTime(LocalTime.MIN);
            schedule.setEndTime(LocalTime.of(23,59,59)); schedule.setSendTime(LocalTime.NOON);
            schedule.setQuietHoursStart(quiet); schedule.setQuietHoursEnd(quiet.plusMinutes(1));
            em.persist(schedule);
        }
        em.flush();
        when(bot.sendOfferOnce(anyLong(),any())).thenReturn(true);
        when(bot.sendMarketingMessage(anyLong(),any(),anyBoolean())).thenAnswer(inv -> {
            boolean sent = inv.getArgument(2, Boolean.class)
                    ? bot.sendOfferOnce(inv.getArgument(0), inv.getArgument(1))
                    : bot.sendMessage(inv.getArgument(0), inv.getArgument(1));
            return sent ? TelegramBotService.DeliveryResult.SENT : TelegramBotService.DeliveryResult.FAILED;
        });
        when(access.isCurrentUser(user.getId())).thenReturn(true);
    }

    @Test void personalWalkCanTestDuringUnopenedPauseWithoutResettingIt() throws Exception {
        var frequency = new NotificationFrequencyState();
        frequency.setUser(user);
        var pause = LocalDateTime.now().plusDays(3);
        frequency.setSuppressedUntil(pause);
        em.persist(frequency); em.flush();
        walkUpdate(81, 81, false, 30, "\"text\":\"/start walk_ru\"");
        walkUpdate(82, 82, false, 29, HERE);
        verify(bot, never()).sendOfferOnce(anyLong(), any());
        Object target = org.springframework.test.util.AopTestUtils.getTargetObject(service);
        org.springframework.test.util.ReflectionTestUtils.setField(target, "personalWalkTestChatId", 77L);
        try {
            walkUpdate(83, 83, false, 20, "\"text\":\"/start walk_ru\"");
            walkUpdate(84, 84, false, 19, HERE);
            walkUpdate(85, 84, true, 19, HERE);
            verify(bot,times(1)).sendOfferOnce(anyLong(), any());
            em.flush(); em.clear();
            assertEquals(pause, em.find(NotificationFrequencyState.class, frequency.getId()).getSuppressedUntil());
        } finally {
            org.springframework.test.util.ReflectionTestUtils.setField(target, "personalWalkTestChatId", 0L);
        }
    }

    private void walkUpdate(long updateId, long messageId, boolean edited, long secondsAgo, String fields) throws Exception {
        long date = java.time.Instant.now().getEpochSecond() - secondsAgo;
        String json = """
                {"update_id":%d,"%s":{"message_id":%d,"from":{"id":77},"chat":{"id":77,"type":"private"},
                "date":%d,%s}}
                """.formatted(updateId, edited ? "edited_message" : "message", messageId, date, fields);
        walks.handle(new com.fasterxml.jackson.databind.ObjectMapper().readValue(json,
                com.foodsave.backend.dto.telegram.TelegramUpdate.class));
    }

    private static final String HERE = "\"location\":{\"latitude\":51.131,\"longitude\":71.43,\"live_period\":3600}";
    private static final String AWAY = "\"location\":{\"latitude\":52.5,\"longitude\":71.43,\"live_period\":3600}";
    private static final String STOP = "\"location\":{\"latitude\":51.131,\"longitude\":71.43}";

    @ParameterizedTest @CsvSource({"ru,Посмотреть бокс", "kk,Боксты көру", "en,View box"})
    void walkSendsOnApproachOnceAndKeepsCoordinatesOffTheProfile(String lang, String button) throws Exception {
        settings.setNearbyOnly(false);
        user.setLastLatitude(50.0);
        walkUpdate(1, 10, false, 15, "\"text\":\"/start walk_" + lang + "\"");
        walkUpdate(2, 11, false, 10, AWAY);
        verify(bot, never()).sendOfferOnce(anyLong(), any());
        walkUpdate(3, 11, true, 10, HERE);
        walkUpdate(3, 11, true, 10, HERE);
        walkUpdate(4, 11, true, 10, HERE);
        verify(bot, times(1)).sendOfferOnce(eq(77L), argThat(m -> m.buttonText().equals(button)
                && m.text().contains("750") && m.text().contains("Круассан") && m.buttonUrl().contains("notification_")));
        assertEquals(1, inbox.count());
        assertEquals("SENT", groups.findAll().get(0).getStatus().name());
        assertEquals(50.0, user.getLastLatitude());
    }

    @Test void walkIgnoresStaticPinsStoppedSharesAndUnrequestedUpdates() throws Exception {
        walkUpdate(1, 10, false, 25, HERE);
        walkUpdate(2, 11, false, 24, "\"text\":\"/start walk_ru\"");
        walkUpdate(3, 12, false, 20, STOP);
        walkUpdate(4, 13, false, 19, AWAY);
        walkUpdate(6, 13, true, 19, STOP);
        walkUpdate(5, 13, true, 19, HERE);
        verify(bot, never()).sendOfferOnce(anyLong(), any());
        assertEquals(0, inbox.count());
    }

    @Test void walkSkipsInaccurateFixesUnavailableBoxesAndMutedAccounts() throws Exception {
        walkUpdate(1, 10, false, 20, "\"text\":\"/start walk_ru\"");
        walkUpdate(2, 11, false, 10, HERE.replace("3600", "3600,\"horizontal_accuracy\":800"));
        box.setStockQuantity(0);
        walkUpdate(3, 11, true, 10, HERE);
        box.setStockQuantity(1); settings.setPromotions(false);
        walkUpdate(4, 11, true, 10, HERE);
        verify(bot, never()).sendOfferOnce(anyLong(), any());
        assertEquals(0, inbox.count());
    }

    @Test void walkFailureIsRecordedWithoutRetryingTheSameShare() throws Exception {
        when(bot.sendOfferOnce(anyLong(), any())).thenReturn(false);
        walkUpdate(1, 10, false, 20, "\"text\":\"/start walk_ru\"");
        walkUpdate(2, 11, false, 10, HERE);
        walkUpdate(2, 11, false, 10, HERE);
        verify(bot, times(1)).sendOfferOnce(anyLong(), any());
        assertEquals("FAILED", groups.findAll().get(0).getStatus().name());
        assertEquals(1, inbox.count());
    }

    @Test void walkExpiresAndIgnoresOtherChats() throws Exception {
        walkUpdate(1, 10, false, 20, "\"text\":\"/start walk_ru\"");
        var session = em.find(NearbyWalk.class, user.getId());
        session.setStartedAt(java.time.Instant.now().getEpochSecond() - 3601);
        walkUpdate(2, 11, false, 10, HERE);
        verify(bot, never()).sendOfferOnce(anyLong(), any());
        walkUpdate(3, 12, false, 5, "\"text\":\"/start walk_ru\"");
        String inGroup = """
                {"update_id":4,"message":{"message_id":13,"from":{"id":77},"chat":{"id":-88,"type":"group"},
                "date":%d,%s}}
                """.formatted(java.time.Instant.now().getEpochSecond(), HERE);
        walks.handle(new com.fasterxml.jackson.databind.ObjectMapper().readValue(inGroup,
                com.foodsave.backend.dto.telegram.TelegramUpdate.class));
        verify(bot, never()).sendOfferOnce(anyLong(), any());
    }

    @ParameterizedTest @org.junit.jupiter.params.provider.EnumSource(value = TelegramBotService.DeliveryResult.class,
            names = {"BLOCKED", "DEACTIVATED", "CHAT_NOT_FOUND"})
    void permanentlyUnavailableChatIsExcludedUntilNewInboundMessage(TelegramBotService.DeliveryResult result) {
        var group = due();
        doReturn(result).when(bot).sendMarketingMessage(anyLong(), any(), anyBoolean());
        service.processDueGroups();
        assertEquals(result.name(), preferences.findByUser(user).orElseThrow().getTelegramDeliveryFailure());
        assertEquals("Telegram delivery: " + result.name(), groups.findById(group.getId()).orElseThrow().getErrorMessage());
        assertEquals(Boolean.FALSE, org.springframework.test.util.ReflectionTestUtils.invokeMethod((Object) org.springframework.test.util.AopTestUtils.getTargetObject(service), "isMarketingEnabled", user));
        preferences.clearDeliveryFailure(user.getTelegramUserId());
        em.flush(); em.clear();
        assertNull(preferences.findByUser(user).orElseThrow().getTelegramDeliveryFailure());
    }

    @Test void temporaryFailureDoesNotExcludeRecipient() {
        due();
        doReturn(TelegramBotService.DeliveryResult.FAILED).when(bot).sendMarketingMessage(anyLong(), any(), anyBoolean());
        service.processDueGroups();
        assertNull(preferences.findByUser(user).orElseThrow().getTelegramDeliveryFailure());
    }

    void collect() {
        var dto = new ProductDTO(); dto.setId(box.getId()); service.collectNewProduct(dto);
    }

    NotificationGroup due() {
        collect(); collect();
        assertEquals(1,groups.count());
        var group = groups.findAll().get(0);
        assertEquals(1,group.getItems().size());
        group.setScheduledAt(LocalDateTime.now(com.foodsave.backend.util.ProductAvailability.BUSINESS_ZONE).minusSeconds(1));
        em.flush(); em.clear();
        return group;
    }

    @Test void sendsOnceAndOpensOnlyAnAvailableBox() {
        var group = due();
        service.processDueGroups(); service.processDueGroups();
        var notice = inbox.findAll().get(0);
        assertEquals("Круассан за 750 ₸", notice.getTitle());
        assertTrue(notice.getMessage().contains("В «Кофейня & <тест>» остался один."));
        assertEquals(group.getId(), notice.getOfferGroupId());
        var sent = org.mockito.ArgumentCaptor.forClass(TelegramBotService.TelegramMessagePayload.class);
        verify(bot,times(1)).sendOfferOnce(eq(77L),sent.capture());
        assertTrue(sent.getValue().text().contains("«Кофейня &amp; &lt;тест&gt;»"));
        assertTrue(sent.getValue().buttonUrl().endsWith("notification_"+group.getId()));
        assertEquals(box.getId(),service.getMiniAppGroup(group.getId()).items().get(0).boxId());
        service.markOpened(group.getId());
        assertTrue(notice.isRead());
        em.find(Product.class,box.getId()).setStockQuantity(0); em.flush();
        assertTrue(service.getMiniAppGroup(group.getId()).items().isEmpty());
        when(access.isCurrentUser(user.getId())).thenReturn(false);
        assertThrows(com.foodsave.backend.exception.AccessDeniedException.class,()->service.getMiniAppGroup(group.getId()));
    }

    @ParameterizedTest
    @CsvSource({"kk,Круассан — 750 ₸,Боксты көру", "en,Круассан for 750 ₸,View box", "ru,Круассан за 750 ₸,Посмотреть бокс"})
    void sendsUsingLatestMiniAppLanguage(String language, String title, String button) {
        user.setTelegramLanguageCode("uk");
        var group = due();
        when(securityUtils.getCurrentUser()).thenReturn(user);
        notifications.updateLanguage(language);
        em.flush();
        em.clear();
        service.processDueGroups();
        var notice = inbox.findByOfferGroupIdAndUser(group.getId(), user).orElseThrow();
        assertEquals(title, notice.getTitle());
        var sent = org.mockito.ArgumentCaptor.forClass(TelegramBotService.TelegramMessagePayload.class);
        verify(bot).sendOfferOnce(eq(77L), sent.capture());
        assertEquals(button, sent.getValue().buttonText());
        assertEquals((title + "\n" + notice.getMessage()).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), sent.getValue().text());
    }

    @Test void soldOutBetweenCollectionAndDelivery() {
        due(); em.find(Product.class,box.getId()).setStockQuantity(0);
        service.processDueGroups();
        verifyNoInteractions(bot); assertEquals(0,inbox.count());
    }

    @Test void turningOffNearbyCancelsQueuedOffer() {
        due(); em.find(NotificationSettings.class,settings.getId()).setNearbyOnly(false);
        service.processDueGroups(); verifyNoInteractions(bot); assertEquals(0,inbox.count());
    }

    @Test void staleLocationIsNeverUsed() {
        due(); em.find(User.class,user.getId()).setLastLocationUpdatedAt(LocalDateTime.now().minusHours(25));
        service.processDueGroups(); verifyNoInteractions(bot); assertEquals(0,inbox.count());
    }

    @Test void respectsQuietHours() {
        var group = due();
        var prefs = em.createQuery("FROM UserNotificationPreferences WHERE user.id = :user",
                UserNotificationPreferences.class).setParameter("user",user.getId()).getSingleResult();
        var now = LocalTime.now(com.foodsave.backend.util.ProductAvailability.BUSINESS_ZONE).withNano(0);
        prefs.setQuietHoursStart(now.minusMinutes(10)); prefs.setQuietHoursEnd(now.plusMinutes(10));
        service.processDueGroups(); verifyNoInteractions(bot); assertEquals(0,inbox.count());
        assertEquals(com.foodsave.backend.domain.enums.NotificationGroupStatus.CANCELLED,
                groups.findById(group.getId()).orElseThrow().getStatus());
    }

    @Test void respectsDailyLimit() {
        due();
        var state = new NotificationFrequencyState();
        state.setUser(em.find(User.class,user.getId()));
        state.setMarketingSentDate(java.time.LocalDate.now(com.foodsave.backend.util.ProductAvailability.BUSINESS_ZONE));
        state.setMarketingSentToday(2); em.persist(state);
        service.processDueGroups(); verifyNoInteractions(bot); assertEquals(0,inbox.count());
    }

    @Test void blockedBotDoesNotLoseInboxOfferOrRetrySendingIt() {
        due();
        when(bot.sendOfferOnce(anyLong(),any())).thenReturn(false);
        service.processDueGroups(); service.processDueGroups();
        assertEquals(1,inbox.count()); verify(bot,times(1)).sendOfferOnce(eq(77L),any());
    }

    @Test void onlyNearbyFavoritesWinAndInvalidLocationsAreSkipped() {
        var nearby = item(box.getStore(),1L);
        var farther = new Store(); farther.setId(98L); farther.setLongitude(71.44); farther.setLatitude(51.13); farther.setName("Favourite");
        var favorite = item(farther,2L);
        var now = LocalDateTime.now();
        var chosen = NotificationGroupService.selectNearby(user,List.of(nearby,favorite),Set.of(98L),new NearbyDishHistory(List.of()),now);
        assertEquals(favorite,chosen.item()); assertTrue(chosen.copy("ru",0).body().contains("избранном"));
        farther.setLongitude(72.0);
        chosen = NotificationGroupService.selectNearby(user,List.of(favorite,nearby),Set.of(98L),new NearbyDishHistory(List.of()),now);
        assertEquals(nearby,chosen.item()); assertTrue(chosen.copy("ru",0).body().contains("100 м"));
        assertFalse(chosen.copy("ru",0).body().contains("Остался один"));
        assertTrue(chosen.copy("ru",0).title().contains("Muffin за 10 ₸"));
        user.setLastLocationAccuracyMeters(900.0);
        assertNull(NotificationGroupService.selectNearby(user,List.of(nearby),Set.of(),new NearbyDishHistory(List.of()),now));
        user.setLastLocationAccuracyMeters(20.0); user.setLastLongitude(Double.NaN);
        assertNull(NotificationGroupService.selectNearby(user,List.of(nearby),Set.of(),new NearbyDishHistory(List.of()),now));
    }

    @Test void offerCopyUsesCurrentPricesStockAndDistance() {
        var sample = item(box.getStore(),2L);
        sample.setPrice(new BigDecimal("1250.50"));
        sample.setOriginalPrice(new BigDecimal("2501"));
        var offer = new NotificationGroupService.NearbyOffer(sample,0.25,false);
        assertEquals(NotificationGroupService.NearbyReason.DEAL,offer.reason());
        for (String lang : List.of("ru","kk","en")) {
            assertTrue(offer.copy(lang,0).title().contains("1 250.5 ₸"));
            assertTrue(offer.copy(lang,0).body().contains("2 501 ₸"));
            assertTrue(offer.copy(lang,0).body().contains("250"));
        }
        sample.setOriginalPrice(new BigDecimal("2500"));
        assertEquals(NotificationGroupService.NearbyReason.CLOSE,offer.reason());
        sample.setOriginalPrice(null);
        assertEquals(NotificationGroupService.NearbyReason.NEARBY,
                new NotificationGroupService.NearbyOffer(sample,0.35,false).reason());
        sample.setAvailableQuantity(1);
        assertEquals(NotificationGroupService.NearbyReason.LAST,offer.reason());
        assertTrue(new NotificationGroupService.NearbyOffer(sample,0.25,true).copy("ru",0).body().contains("Остался один бокс."));
    }

    @Test void eachReasonHasThreeDistinctMessagesInEachLanguage() {
        for (var reason : NotificationGroupService.NearbyReason.values()) {
            var sample = item(box.getStore(),2L);
            if (reason == NotificationGroupService.NearbyReason.DEAL) sample.setOriginalPrice(BigDecimal.valueOf(25));
            if (reason == NotificationGroupService.NearbyReason.LAST) sample.setAvailableQuantity(1);
            var offer = new NotificationGroupService.NearbyOffer(sample,
                    reason == NotificationGroupService.NearbyReason.CLOSE ? 0.25 : 1.0,
                    reason == NotificationGroupService.NearbyReason.FAVORITE);
            assertEquals(reason,offer.reason());
            for (String lang : List.of("ru","kk","en")) {
                Set<String> bodies = new java.util.HashSet<>();
                for (int i = 0; i < 3; i++) {
                    var copy = offer.copy(lang,i);
                    assertTrue(bodies.add(copy.body()));
                    String full = copy.title() + copy.body();
                    assertTrue(full.contains(sample.getBranch().getName()) && full.contains("Muffin") && full.contains("10 ₸"));
                }
            }
        }
    }

    @Test void continuesRotationAfterPreviousNotificationsOfSameKind() {
        for (int variant : List.of(0,1)) {
            var previous = new Notification();
            previous.setUser(user); previous.setTitle("test"); previous.setMessage("test");
            previous.setType("NEARBY_BOX"); previous.setNearbyReason("LAST"); previous.setNearbyVariant(variant);
            inbox.saveAndFlush(previous);
        }
        var group = due();
        service.processDueGroups(); service.processDueGroups();
        var delivered = inbox.findByOfferGroupIdAndUser(group.getId(),user).orElseThrow();
        assertEquals(2,delivered.getNearbyVariant());
        assertTrue(delivered.getMessage().startsWith("Ещё один можно забрать"));
        verify(bot,times(1)).sendOfferOnce(eq(77L),any());
    }

    @Test void skipsUnspecifiedBoxesAndKeepsPortionInformation() {
        var item = item(box.getStore(), 2L);
        item.getBox().setName("Сладкий бокс №2");
        item.getBox().setDescription("Нет описания");
        assertNull(NotificationGroupService.selectNearby(user, List.of(item), Set.of(),
                new NearbyDishHistory(List.of()), LocalDateTime.now()));
        item.getBox().setDescription("🎁 В комплект входит: маффин — 2 шт.; тарт — 1 шт.");
        var offer = new NotificationGroupService.NearbyOffer(item, 0.5, false);
        for (String lang : List.of("ru", "kk", "en")) {
            assertTrue(offer.copy(lang, 0).title().contains("маффин — 2 шт.; тарт — 1 шт."));
            assertTrue(offer.copy(lang, 0).title().contains("10 ₸"));
            assertTrue(offer.copy(lang, 0).body().contains("500"));
        }
    }

    @Test void actualPurchasesRankDishesInsideNewListings() {
        Product cake = new Product();
        cake.setName("Чизкейк"); cake.setCategory(box.getCategory()); cake.setStore(box.getStore());
        cake.setPrice(BigDecimal.TEN); cake.setStockQuantity(1); em.persist(cake);
        purchase(user, cake, OrderStatus.COMPLETED);
        purchase(user, cake, OrderStatus.PICKED_UP);
        purchase(user, box, OrderStatus.DELIVERED);
        purchase(user, box, OrderStatus.CANCELLED_BY_USER);
        purchase(user, box, OrderStatus.NO_SHOW);
        var stranger = new User();
        stranger.setEmail("another@example.test"); stranger.setPassword("fixture"); stranger.setRole(UserRole.CUSTOMER);
        stranger.setFirstName("Test"); stranger.setLastName("Two"); em.persist(stranger);
        purchase(stranger, box, OrderStatus.COMPLETED);
        purchase(stranger, box, OrderStatus.COMPLETED);
        Product mix = new Product();
        mix.setName("Бокс №2"); mix.setDescription("Состав: Чизкейк; маффин");
        mix.setCategory(box.getCategory()); mix.setStore(box.getStore()); mix.setPrice(BigDecimal.valueOf(900));
        mix.setStockQuantity(2); mix.setActive(true); em.persist(mix);
        collect();
        var dto = new ProductDTO(); dto.setId(mix.getId()); service.collectNewProduct(dto);
        var group = groups.findAll().get(0);
        assertEquals(2, group.getItems().size());
        group.setScheduledAt(LocalDateTime.now(com.foodsave.backend.util.ProductAvailability.BUSINESS_ZONE).minusSeconds(1));
        em.flush(); em.clear();
        service.processDueGroups();
        var notice = inbox.findAll().get(0);
        assertEquals("Чизкейк; маффин за 900 ₸", notice.getTitle());
        assertTrue(notice.getMessage().contains("100 м"));
        assertEquals(mix.getId(),service.getMiniAppGroup(group.getId()).items().get(0).boxId());
    }

    private void purchase(User buyer, Product product, OrderStatus status) {
        Order order = new Order(); order.setUser(buyer); order.setStore(product.getStore()); order.setStatus(status);
        order.setContactPhone("test"); order.setSubtotal(BigDecimal.TEN); order.setTotal(BigDecimal.TEN);
        order.setOrderNumber(java.util.UUID.randomUUID().toString());
        order.setPaymentMethod(com.foodsave.backend.domain.enums.PaymentMethod.CASH);
        em.persist(order);
        OrderItem line = new OrderItem(); line.setOrder(order); line.setProduct(product); line.setQuantity(1);
        line.setUnitPrice(BigDecimal.TEN); line.setTotalPrice(BigDecimal.TEN); em.persist(line);
    }

    private NotificationGroupItem item(Store store,long id) {
        var p = new Product(); p.setId(id); p.setName("Muffin");
        var i = new NotificationGroupItem(); i.setBox(p); i.setBranch(store); i.setAvailableQuantity(3); i.setPrice(BigDecimal.TEN);
        return i;
    }
}
