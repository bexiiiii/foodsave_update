package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.*;
import com.foodsave.backend.dto.ProductDTO;
import com.foodsave.backend.dto.telegram.TelegramLocation;
import com.foodsave.backend.dto.analytics.ProductEventRequest;
import com.foodsave.backend.dto.communications.NotificationGroupResponse;
import com.foodsave.backend.dto.communications.NotificationScheduleSettingDTO;
import com.foodsave.backend.entity.*;
import com.foodsave.backend.repository.*;
import com.foodsave.backend.util.ProductAvailability;
import com.foodsave.backend.security.AuthorizationService;
import com.foodsave.backend.exception.AccessDeniedException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.util.HtmlUtils;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationGroupService {

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Almaty");
    private static final double NEARBY_RADIUS_KM = 2.0;
    @Value("${telegram.ingress.test-chat-id:0}")
    private long personalWalkTestChatId;


    private final NotificationGroupRepository groupRepository;
    private final NotificationGroupItemRepository itemRepository;
    private final NotificationScheduleSettingRepository scheduleRepository;
    private final UserNotificationPreferencesRepository preferencesRepository;
    private final NotificationFrequencyStateRepository frequencyStateRepository;
    private final NotificationSettingsRepository notificationSettingsRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final NearbyWalkProductRepository walkProducts;
    private final OrderItemRepository orderItemRepository;
    private final TelegramBotService telegramBotService;
    private final ProductEventService productEventService;
    private final NotificationRepository notificationRepository;
    private final FavoriteRepository favoriteRepository;
    private final TransactionTemplate transactions;
    private final AuthorizationService authorizationService;

    @Transactional
    public void collectNewProduct(ProductDTO productDTO) {
        if (productDTO == null || productDTO.getId() == null) return;
        Product product = productRepository.findById(productDTO.getId()).orElse(null);
        if (!isAvailable(product)) return;

        List<User> users = userRepository.findByTelegramUserTrue();
        if (users.isEmpty()) return;

        NotificationScheduleSetting lunch = resolveSetting(NotificationWindowType.LUNCH, null);
        NotificationScheduleSetting evening = resolveSetting(NotificationWindowType.EVENING, null);
        LocalDateTime lunchAt = resolveNextScheduledAt(lunch);
        LocalDateTime eveningAt = resolveNextScheduledAt(evening);

        users.sort(Comparator.comparing(User::getId));
        for (User user : users) {
            if (!user.isEnabled() || !user.isActive() || user.isBlacklisted()) continue;
            NotificationSettings settings = notificationSettingsRepository.findByUser(user).orElse(null);
            if (settings != null && !settings.isPromotions()) continue;
            boolean nearby = settings != null && settings.isNearbyOnly();
            UserNotificationPreferences prefs = preferencesFor(user);
            if (!prefs.isTelegramNotificationsEnabled()) continue;
            if (nearby && (!prefs.isNearbyOffersEnabled()
                    || !Double.isFinite(nearbyDistance(user, product.getStore(), LocalDateTime.now())))) continue;
            boolean lunchEnabled = lunch.isEnabled() && prefs.isLunchDigestEnabled();
            boolean useEvening = nearby && evening.isEnabled() && prefs.isEveningDigestEnabled()
                    && (!lunchEnabled || eveningAt.isBefore(lunchAt));
            if (!useEvening && !lunchEnabled) continue;
            NotificationScheduleSetting setting = useEvening ? evening : lunch;
            LocalDateTime scheduledAt = useEvening ? eveningAt : lunchAt;

            String key = user.getId() + ":" + setting.getNotificationWindowType() + ":" + scheduledAt;
            String window = setting.getNotificationWindowType().name();
            groupRepository.ensureScheduled(user.getId(), window, scheduledAt,
                    nearby ? "NEARBY_OFFERS" : "NEW_BOX", window.toLowerCase(Locale.ROOT) + "-" + scheduledAt.toLocalDate(), key);
            NotificationGroup group = groupRepository.lockForCollection(key).orElse(null);
            if (group == null || group.getStatus() != NotificationGroupStatus.SCHEDULED) continue;
            if (itemRepository.existsByNotificationGroupAndBoxId(group, product.getId())) continue;

            NotificationGroupItem item = new NotificationGroupItem();
            item.setNotificationGroup(group);
            item.setPartner(product.getStore());
            item.setBranch(product.getStore());
            item.setBox(product);
            item.setAvailableQuantity(product.getStockQuantity() != null ? product.getStockQuantity() : 0);
            item.setPrice(product.getPrice());
            item.setOriginalPrice(product.getOriginalPrice());
            item.setDiscountPercent(product.getDiscountPercentage() != null ? product.getDiscountPercentage().intValue() : 0);
            item.setPickupEndAt(product.getExpiryDate());
            group.getItems().add(itemRepository.save(item));
            recalculateGroup(group);
        }
    }

    @Transactional(readOnly = true)
    public NotificationGroupResponse getMiniAppGroup(Long id) {
        NotificationGroup group = groupRepository.findWithItemsById(id)
                .orElseThrow(() -> new EntityNotFoundException("Notification group not found"));
        requireGroupAccess(group);
        return NotificationGroupResponse.fromEntity(group, filterAvailableItems(group, group.getTriggerType() == NotificationTriggerType.NEARBY_OFFERS));
    }

    @Transactional
    public void markOpened(Long id) {
        groupRepository.findById(id).ifPresent(group -> {
            requireGroupAccess(group);
            if (group.getOpenedAt() != null) return;
            group.setOpenedAt(LocalDateTime.now());
            groupRepository.save(group);
            if (group.getTriggerType() == NotificationTriggerType.NEARBY_OFFERS) {
                notificationRepository.findByOfferGroupIdAndUser(id, group.getUser()).ifPresent(n -> n.setRead(true));
            }
            NotificationFrequencyState state = getOrCreateFrequencyState(group.getUser());
            state.setLastOpenedAt(LocalDateTime.now());
            state.setConsecutiveUnopenedCount(0);
            state.setEngagementScore(Math.min(100.0, (state.getEngagementScore() != null ? state.getEngagementScore() : 0.0) + 5.0));
            frequencyStateRepository.save(state);
            productEventService.trackAsync(new ProductEventRequest(
                    ProductEventType.NOTIFICATION_OPENED, null,
                    group.getUser() != null ? group.getUser().getTelegramUserId() : null,
                    null, null, null, null, group.getCityId(), group.getDistrictId(),
                    ProductEventSource.telegram_notification, null, group.getCampaignId(), null,
                    null, group.getId(), group.getDeepLink(), "notification_" + group.getId(),
                    null, "miniapp", null, null, null,
                    group.getUser() != null ? group.getUser().getTelegramLanguageCode() : null,
                    "notification-opened-" + group.getId(),
                    Map.of("notificationGroupId", group.getId())
            ));
        });
    }

    private void requireGroupAccess(NotificationGroup group) {
        if (group.getUser() == null
                || (!authorizationService.isSuperAdmin()
                && !authorizationService.isCurrentUser(group.getUser().getId()))) {
            throw new AccessDeniedException("You do not have access to this notification group");
        }
    }

    public void processDueGroups() {
        List<NotificationGroup> due = groupRepository.findDueGroups(NotificationGroupStatus.SCHEDULED,
                LocalDateTime.now(DEFAULT_ZONE), PageRequest.of(0, 100));
        for (NotificationGroup group : due) {
            // Commit the claim before calling Telegram: a second worker must not send the same offer.
            if (groupRepository.changeStatus(group.getId(), NotificationGroupStatus.SCHEDULED,
                    NotificationGroupStatus.PROCESSING) != 1) continue;
            try {
                transactions.executeWithoutResult(status -> sendClaimedGroup(group.getId()));
            } catch (Exception ex) {
                groupRepository.changeStatus(group.getId(), NotificationGroupStatus.PROCESSING, NotificationGroupStatus.FAILED);
                log.error("Notification group {} processing failed", group.getId(), ex);
            }
        }
    }

    private void sendClaimedGroup(Long groupId) {
        NotificationGroup group = groupRepository.findWithItemsById(groupId)
                .orElseThrow(() -> new EntityNotFoundException("Notification group not found"));
        List<NotificationGroupItem> availableItems = filterAvailableItems(group, false);
        User user = userRepository.lockForNotificationDelivery(group.getUser().getId()).orElseThrow();
        boolean nearby = notificationSettingsRepository.findByUser(user)
                .map(NotificationSettings::isNearbyOnly).orElse(false);
        if (!nearby && group.getTriggerType() == NotificationTriggerType.NEARBY_OFFERS) {
            group.setStatus(NotificationGroupStatus.CANCELLED);
            return;
        }
        String language = resolveLanguage(user);
        NearbyOffer offer = null;
        if (nearby) {
            var savedPreferences = preferencesRepository.findByUser(user);
            UserNotificationPreferences prefs = savedPreferences.orElseGet(UserNotificationPreferences::new);
            String selected = savedPreferences.map(UserNotificationPreferences::getLanguage).orElse(language);
            language = Locale.forLanguageTag(selected.replace('_', '-')).getLanguage();
            offer = prefs.isNearbyOffersEnabled() ? selectNearby(user, availableItems,
                    favoriteRepository.findFavoriteStoreIds(user.getId()),
                    new NearbyDishHistory(orderItemRepository.findPurchasedDishes(user.getId(),
                            Set.of(OrderStatus.PICKED_UP, OrderStatus.COMPLETED, OrderStatus.DELIVERED),
                            LocalDateTime.now().minusDays(90))), LocalDateTime.now()) : null;
            if (offer == null) {
                group.setStatus(NotificationGroupStatus.CANCELLED);
                return;
            }
            group.setTriggerType(NotificationTriggerType.NEARBY_OFFERS);
            availableItems = List.of(offer.item());
        }
        Set<Long> retainedIds = availableItems.stream().map(NotificationGroupItem::getId).collect(Collectors.toSet());
        group.getItems().removeIf(item -> !retainedIds.contains(item.getId()));
        recalculateGroup(group);

        NotificationScheduleSetting setting = resolveSetting(group.getTimeWindow(), group.getCityId());
        LocalDateTime localNow = LocalDateTime.now(DEFAULT_ZONE);
        boolean missedWindow = nearby && (!localNow.toLocalDate().equals(group.getScheduledAt().toLocalDate())
                || localNow.toLocalTime().isAfter(setting.getEndTime()));
        if (missedWindow || !setting.isEnabled() || !user.isActive() || !user.isEnabled() || user.isBlacklisted()
                || availableItems.isEmpty() || (!nearby && !passesMinimums(group, setting)) || !canSendMarketing(group.getUser(), setting)) {
            group.setStatus(NotificationGroupStatus.CANCELLED);
            groupRepository.save(group);
            return;
        }

        String text;
        String deepLink = buildMiniAppDeepLink("notification_" + group.getId());
        group.setDeepLink(deepLink);
        if (nearby) {
            String reason = offer.reason().name();
            int variant = notificationRepository.findFirstByUserAndNearbyReasonOrderByIdDesc(user, reason)
                    .map(Notification::getNearbyVariant).map(last -> (last + 1) % NearbyOffer.VARIANTS).orElse(0);
            OfferCopy copy = offer.copy(language, variant);
            Notification notice = new Notification();
            notice.setUser(user);
            notice.setType("NEARBY_BOX");
            notice.setOfferGroupId(groupId);
            notice.setNearbyReason(reason);
            notice.setNearbyVariant(variant);
            notice.setTitle(copy.title());
            notice.setMessage(copy.body());
            notificationRepository.save(notice);
            text = HtmlUtils.htmlEscape(copy.title() + "\n" + copy.body(), java.nio.charset.StandardCharsets.UTF_8.name());
        } else {
            text = buildMessage(group, language);
        }
        var message = new TelegramBotService.TelegramMessagePayload(text, null,
                nearby ? offer.button(language) : resolveButtonText(group), deepLink);
        var delivery = telegramBotService.sendMarketingMessage(user.getTelegramUserId(), message, nearby);
        if (delivery.recipientUnavailable()) {
            var preferences = preferencesRepository.findByUser(user).orElseGet(() -> {
                var created = new UserNotificationPreferences();
                created.setUser(user);
                return created;
            });
            preferences.setTelegramDeliveryFailure(delivery.name());
            preferencesRepository.save(preferences);
        }
        if (delivery != TelegramBotService.DeliveryResult.SENT) {
            if (nearby) updateFrequencyAfterSent(user); // The offer is already in the Mini App inbox.
            group.setStatus(NotificationGroupStatus.FAILED);
            group.setFailedAt(LocalDateTime.now());
            group.setErrorMessage("Telegram delivery: " + delivery.name());
            groupRepository.save(group);
            return;
        }

        group.setStatus(NotificationGroupStatus.SENT);
        group.setSentAt(LocalDateTime.now());
        groupRepository.save(group);
        updateFrequencyAfterSent(group.getUser());
        productEventService.trackAsync(new ProductEventRequest(
                ProductEventType.NOTIFICATION_SENT, null, group.getUser().getTelegramUserId(),
                null, null, null, null, group.getCityId(), group.getDistrictId(),
                ProductEventSource.telegram_notification, null, group.getCampaignId(), null,
                null, group.getId(), deepLink, "notification_" + group.getId(),
                null, "backend", null, null, null, language,
                "notification-sent-" + group.getId(), Map.of("notificationGroupId", group.getId())
        ));
    }

    @Transactional
    public List<NotificationScheduleSettingDTO> getScheduleSettings() {
        ensureDefaultSettings();
        return scheduleRepository.findAll().stream()
                .map(NotificationScheduleSettingDTO::fromEntity)
                .toList();
    }

    @Transactional
    public NotificationScheduleSettingDTO upsertScheduleSetting(NotificationScheduleSettingDTO dto) {
        NotificationScheduleSetting setting = dto.id() != null
                ? scheduleRepository.findById(dto.id()).orElse(new NotificationScheduleSetting())
                : scheduleRepository.findByCityIdAndNotificationWindowType(dto.cityId(), dto.notificationWindowType())
                    .orElse(new NotificationScheduleSetting());
        setting.setCityId(dto.cityId());
        setting.setNotificationWindowType(dto.notificationWindowType());
        setting.setEnabled(dto.enabled());
        setting.setStartTime(dto.startTime());
        setting.setSendTime(dto.sendTime());
        setting.setEndTime(dto.endTime());
        setting.setMinimumTotalBoxes(dto.minimumTotalBoxes());
        setting.setMinimumPartners(dto.minimumPartners());
        setting.setMaximumMessagesPerUserPerDay(dto.maximumMessagesPerUserPerDay());
        setting.setMinimumHoursBetweenMessages(dto.minimumHoursBetweenMessages());
        setting.setQuietHoursStart(dto.quietHoursStart());
        setting.setQuietHoursEnd(dto.quietHoursEnd());
        return NotificationScheduleSettingDTO.fromEntity(scheduleRepository.save(setting));
    }

    private void recalculateGroup(NotificationGroup group) {
        Map<Long, Integer> byPartner = new HashMap<>();
        int totalBoxes = 0;
        BigDecimal minPrice = null;
        int maxDiscount = 0;
        for (NotificationGroupItem item : group.getItems()) {
            Long partnerId = item.getPartner() != null ? item.getPartner().getId() : null;
            if (partnerId != null) byPartner.put(partnerId, 1);
            int qty = item.getAvailableQuantity() != null ? item.getAvailableQuantity() : 0;
            totalBoxes += qty;
            if (item.getPrice() != null && (minPrice == null || item.getPrice().compareTo(minPrice) < 0)) {
                minPrice = item.getPrice();
            }
            maxDiscount = Math.max(maxDiscount, item.getDiscountPercent() != null ? item.getDiscountPercent() : 0);
        }
        group.setTotalPartners(byPartner.size());
        group.setTotalBoxes(totalBoxes);
        group.setMinimumPrice(minPrice);
        group.setMaximumDiscount(maxDiscount);
    }

    private List<NotificationGroupItem> filterAvailableItems(NotificationGroup group, boolean requireOriginalBranch) {
        List<Long> boxIds = group.getItems().stream()
                .map(NotificationGroupItem::getBox)
                .filter(Objects::nonNull)
                .map(Product::getId)
                .toList();
        if (boxIds.isEmpty()) {
            return List.of();
        }
        Map<Long, Product> products = productRepository.findActiveAvailableByIds(
                        boxIds, ProductAvailability.visibilityCutoff(), ProductAvailability.currentTimeText()).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        return group.getItems().stream()
                .filter(item -> item.getBox() != null && products.containsKey(item.getBox().getId()))
                .filter(item -> !requireOriginalBranch || item.getBranch() != null && item.getBranch().getId()
                        .equals(products.get(item.getBox().getId()).getStore().getId()))
                .peek(item -> {
                    Product product = products.get(item.getBox().getId());
                    item.setBranch(product.getStore());
                    item.setPartner(product.getStore());
                    item.setAvailableQuantity(product.getStockQuantity());
                    item.setPrice(product.getPrice());
                    item.setOriginalPrice(product.getOriginalPrice());
                    item.setDiscountPercent(product.getDiscountPercentage() != null ? product.getDiscountPercentage().intValue() : 0);
                    item.setPickupEndAt(product.getExpiryDate());
                })
                .toList();
    }

    boolean walkMessagesEnabled(User user) {
        var prefs = preferencesFor(user);
        return isMarketingEnabled(user) && prefs.isTelegramNotificationsEnabled() && prefs.isNearbyOffersEnabled();
    }

    record WalkDelivery(long groupId, TelegramBotService.TelegramMessagePayload message) {}

    private boolean canSendWalkNotification(User user, NotificationScheduleSetting setting) {
        if (personalWalkTestChatId <= 0 || !Long.valueOf(personalWalkTestChatId).equals(user.getTelegramUserId())) {
            return canSendMarketing(user, setting);
        }
        // An explicitly started personal test may bypass the unattended-marketing cooldown.
        // Keep opt-in and quiet hours, without resetting the user's stored frequency state.
        var prefs = preferencesRepository.findByUser(user).orElseGet(UserNotificationPreferences::new);
        LocalTime now = LocalTime.now(resolveZone(prefs.getTimezone()));
        return walkMessagesEnabled(user)
                && !isWithinQuietHours(now, prefs.getQuietHoursStart(), prefs.getQuietHoursEnd())
                && !isWithinQuietHours(now, setting.getQuietHoursStart(), setting.getQuietHoursEnd());
    }

    WalkDelivery prepareWalkDelivery(User user, TelegramLocation fix, NearbyWalk walk) {
        var setting = resolveSetting(NotificationWindowType.LUNCH, null);
        var prefs = preferencesFor(user);
        if (!prefs.isNearbyOffersEnabled() || !setting.isEnabled() || !canSendWalkNotification(user, setting)) return null;
        // A bounding box restricts the query to local branches; selectNearby checks the exact radius.
        double lat = fix.latitude(), lon = fix.longitude();
        double deltaLat = NEARBY_RADIUS_KM / 110.0;
        double deltaLon = deltaLat / Math.max(0.001, Math.cos(Math.toRadians(lat)));
        LocalDateTime now = LocalDateTime.now();
        User point = new User();
        point.setLastLatitude(lat);
        point.setLastLongitude(lon);
        point.setLastLocationAccuracyMeters(fix.accuracy());
        point.setLastLocationUpdatedAt(now);
        List<NotificationGroupItem> items = walkProducts.findWalkCandidates(lat - deltaLat, lat + deltaLat,
                        lon - deltaLon, lon + deltaLon).stream()
                .filter(ProductAvailability::isAvailable)
                .map(p -> {
                    var item = new NotificationGroupItem();
                    item.setPartner(p.getStore());
                    item.setBranch(p.getStore());
                    item.setBox(p);
                    item.setPrice(p.getPrice());
                    item.setOriginalPrice(p.getOriginalPrice());
                    item.setAvailableQuantity(p.getStockQuantity());
                    item.setPickupEndAt(p.getExpiryDate());
                    return item;
                }).toList();
        if (items.isEmpty()) return null;
        var history = new NearbyDishHistory(orderItemRepository.findPurchasedDishes(user.getId(),
                Set.of(OrderStatus.PICKED_UP, OrderStatus.COMPLETED, OrderStatus.DELIVERED), now.minusDays(90)));
        var offer = selectNearby(point, items, favoriteRepository.findFavoriteStoreIds(user.getId()), history, now);
        if (offer == null) return null;

        var group = new NotificationGroup();
        group.setUser(user);
        group.setScheduledAt(LocalDateTime.now(DEFAULT_ZONE));
        group.setStatus(NotificationGroupStatus.PROCESSING);
        group.setTriggerType(NotificationTriggerType.NEARBY_OFFERS);
        group.setCampaignId("nearby-walk");
        group.setIdempotencyKey("walk:" + user.getId() + ":" + walk.getCommandId());
        offer.item().setNotificationGroup(group);
        group.getItems().add(offer.item());
        recalculateGroup(group);
        groupRepository.save(group);
        String link = buildMiniAppDeepLink("notification_" + group.getId());
        group.setDeepLink(link);
        String reason = offer.reason().name();
        int variant = notificationRepository.findFirstByUserAndNearbyReasonOrderByIdDesc(user, reason)
                .map(Notification::getNearbyVariant).map(last -> (last + 1) % NearbyOffer.VARIANTS).orElse(0);
        var copy = offer.copy(walk.getLanguage(), variant);
        var notice = new Notification();
        notice.setUser(user);
        notice.setType("NEARBY_BOX");
        notice.setOfferGroupId(group.getId());
        notice.setNearbyReason(reason);
        notice.setNearbyVariant(variant);
        notice.setTitle(copy.title());
        notice.setMessage(copy.body());
        notificationRepository.save(notice);
        updateFrequencyAfterSent(user);
        return new WalkDelivery(group.getId(), new TelegramBotService.TelegramMessagePayload(
                HtmlUtils.htmlEscape(copy.title() + "\n" + copy.body(), java.nio.charset.StandardCharsets.UTF_8.name()), null, offer.button(walk.getLanguage()), link));
    }

    @Transactional
    public void finishWalkDelivery(long id, boolean accepted) {
        var group = groupRepository.findById(id).orElseThrow();
        if (accepted) {
            group.setSentAt(LocalDateTime.now());
            group.setStatus(NotificationGroupStatus.SENT);
        } else {
            group.setFailedAt(LocalDateTime.now());
            group.setErrorMessage("Telegram delivery unconfirmed");
            group.setStatus(NotificationGroupStatus.FAILED);
        }
    }

    static double nearbyDistance(User user, Store store, LocalDateTime now) {
        LocalDateTime fix = user.getLastLocationUpdatedAt();
        Double accuracy = user.getLastLocationAccuracyMeters();
        if (fix == null || fix.isAfter(now) || fix.isBefore(now.minusHours(24)) || store == null
                || !coordinate(user.getLastLatitude(), 90) || !coordinate(user.getLastLongitude(), 180)
                || !coordinate(store.getLatitude(), 90) || !coordinate(store.getLongitude(), 180)
                || (accuracy != null && (!Double.isFinite(accuracy) || accuracy < 0 || accuracy > 500))) {
            return Double.POSITIVE_INFINITY;
        }
        double lat = Math.toRadians(user.getLastLatitude());
        double otherLat = Math.toRadians(store.getLatitude());
        double dLon = Math.toRadians(store.getLongitude() - user.getLastLongitude());
        double h = Math.pow(Math.sin((otherLat - lat) / 2), 2)
                + Math.cos(lat) * Math.cos(otherLat) * Math.pow(Math.sin(dLon / 2), 2);
        double km = 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
        return km + (accuracy == null ? 0 : accuracy / 1000) <= NEARBY_RADIUS_KM ? km : Double.POSITIVE_INFINITY;
    }

    private static boolean coordinate(Double value, int limit) {
        return value != null && Double.isFinite(value) && Math.abs(value) <= limit;
    }

    static NearbyOffer selectNearby(User user, List<NotificationGroupItem> items, Set<Long> favoriteStores, NearbyDishHistory history, LocalDateTime now) {
        return items.stream().filter(item -> item.getBox() != null && ReportMoney.validAmount(item.getPrice())
                        && item.getPrice().signum() > 0 && item.getAvailableQuantity() > 0 && item.getBranch() != null)
                .map(item -> new NearbyOffer(item, nearbyDistance(user, item.getBranch(), now),
                        favoriteStores.contains(item.getBranch().getId())))
                .filter(offer -> Double.isFinite(offer.km()) && !NearbyDishHistory.dishText(
                        offer.item().getBox().getName(), offer.item().getBox().getDescription()).isBlank())
                .min(Comparator.<NearbyOffer>comparingInt(o -> history.dishScore(o.item().getBox())).reversed()
                        .thenComparing(Comparator.<NearbyOffer>comparingInt(o -> history.storeFrequency(o.item().getBranch().getId())).reversed())
                        .thenComparing(NearbyOffer::favorite, Comparator.reverseOrder())
                        .thenComparingDouble(NearbyOffer::km).thenComparing(offer -> offer.item().getBox().getId()))
                .orElse(null);
    }

    record OfferCopy(String title, String body) {}

    enum NearbyReason { FAVORITE, LAST, DEAL, CLOSE, NEARBY }

    record NearbyOffer(NotificationGroupItem item, double km, boolean favorite) {
        NearbyReason reason() {
            if (favorite) return NearbyReason.FAVORITE;
            if (item.getAvailableQuantity() == 1) return NearbyReason.LAST;
            BigDecimal original = item.getOriginalPrice();
            if (ReportMoney.validAmount(original) && original.compareTo(item.getPrice().multiply(BigDecimal.valueOf(2))) >= 0)
                return NearbyReason.DEAL;
            return km <= 0.3 ? NearbyReason.CLOSE : NearbyReason.NEARBY;
        }

        private long metres() {
            return Math.max(50, Math.round(km * 20) * 50);
        }

        static final int VARIANTS = 3;

        OfferCopy copy(String language, int variant) {
            Locale locale = switch (language) {
                case "kk", "en" -> Locale.forLanguageTag(language);
                default -> Locale.ROOT;
            };
            ResourceBundle bundle = ResourceBundle.getBundle("notifications.nearby", locale,
                    ResourceBundle.Control.getNoFallbackControl(ResourceBundle.Control.FORMAT_PROPERTIES));
            NearbyReason reason = reason();
            String key = reason.name() + "." + variant;
            String last = reason == NearbyReason.FAVORITE && item.getAvailableQuantity() == 1
                    ? " " + bundle.getString("last") : "";
            String dish = shortText(NearbyDishHistory.dishText(item.getBox().getName(), item.getBox().getDescription()), 110);
            String title = bundle.getString("title").formatted(dish, money(item.getPrice()));
            String body = bundle.getString(key + ".body").formatted(shortText(item.getBranch().getName(), 85),
                    metres(), reason == NearbyReason.DEAL ? money(item.getOriginalPrice()) : "", last);
            return new OfferCopy(title, body);
        }

        private static String shortText(String text, int limit) {
            String value = text.replaceAll("(?U)\\s+", " ").strip();
            if (value.codePointCount(0, value.length()) <= limit) return value;
            return value.substring(0, value.offsetByCodePoints(0, limit - 1)).stripTrailing() + "…";
        }

        private static String money(BigDecimal amount) {
            String[] parts = amount.stripTrailingZeros().toPlainString().split("\\.");
            String whole = String.format(Locale.US, "%,d", amount.toBigInteger()).replace(',', ' ');
            return whole + (parts.length == 2 ? "." + parts[1] : "") + " ₸";
        }

        String button(String language) {
            return switch (language) {
                case "kk" -> "Боксты көру";
                case "en" -> "View box";
                default -> "Посмотреть бокс";
            };
        }
    }

    private boolean passesMinimums(NotificationGroup group, NotificationScheduleSetting setting) {
        boolean favorite = group.getTriggerType() == NotificationTriggerType.FAVORITE_PARTNER;
        if (favorite) return group.getTotalBoxes() != null && group.getTotalBoxes() > 0;
        return (group.getTotalBoxes() != null && group.getTotalBoxes() >= setting.getMinimumTotalBoxes())
                && (group.getTotalPartners() != null && group.getTotalPartners() >= setting.getMinimumPartners());
    }

    private boolean canSendMarketing(User user, NotificationScheduleSetting setting) {
        if (user == null || user.getTelegramUserId() == null) return false;
        if (!isMarketingEnabled(user)) return false;
        UserNotificationPreferences prefs = preferencesFor(user);
        if (!prefs.isTelegramNotificationsEnabled()) return false;

        ZoneId zone = resolveZone(prefs.getTimezone());
        LocalTime now = LocalTime.now(zone);
        if (isWithinQuietHours(now, prefs.getQuietHoursStart(), prefs.getQuietHoursEnd())
                || isWithinQuietHours(now, setting.getQuietHoursStart(), setting.getQuietHoursEnd())) {
            return false;
        }

        NotificationFrequencyState state = getOrCreateFrequencyState(user);
        LocalDate today = LocalDate.now(zone);
        if (!today.equals(state.getMarketingSentDate())) {
            state.setMarketingSentDate(today);
            state.setMarketingSentToday(0);
        }
        if (state.getSuppressedUntil() != null && state.getSuppressedUntil().isAfter(LocalDateTime.now(zone))) {
            return false;
        }
        int maxPerDay = setting.getMaximumMessagesPerUserPerDay();
        if (prefs.getMaximumMessagesPerDay() != null) maxPerDay = Math.min(maxPerDay, prefs.getMaximumMessagesPerDay());
        if (state.getConsecutiveUnopenedCount() != null && state.getConsecutiveUnopenedCount() >= 5) {
            maxPerDay = Math.min(maxPerDay, 1);
        }
        if (state.getMarketingSentToday() != null && state.getMarketingSentToday() >= maxPerDay) {
            return false;
        }
        if (state.getLastMarketingSentAt() != null
                && state.getLastMarketingSentAt().plusHours(setting.getMinimumHoursBetweenMessages()).isAfter(LocalDateTime.now())) {
            return false;
        }
        return true;
    }

    private void updateFrequencyAfterSent(User user) {
        NotificationFrequencyState state = getOrCreateFrequencyState(user);
        LocalDate today = LocalDate.now(DEFAULT_ZONE);
        if (!today.equals(state.getMarketingSentDate())) {
            state.setMarketingSentDate(today);
            state.setMarketingSentToday(0);
        }
        state.setMarketingSentToday((state.getMarketingSentToday() != null ? state.getMarketingSentToday() : 0) + 1);
        state.setLastMarketingSentAt(LocalDateTime.now());
        state.setConsecutiveUnopenedCount((state.getConsecutiveUnopenedCount() != null ? state.getConsecutiveUnopenedCount() : 0) + 1);
        if (state.getConsecutiveUnopenedCount() >= 10) {
            state.setSuppressedUntil(LocalDateTime.now().plusDays(7));
        }
        frequencyStateRepository.save(state);
    }

    private String buildMessage(NotificationGroup group, String language) {
        List<String> partnerLines = group.getItems().stream()
                .collect(Collectors.groupingBy(item -> item.getPartner().getName(),
                        LinkedHashMap::new,
                        Collectors.summingInt(item -> item.getAvailableQuantity() != null ? item.getAvailableQuantity() : 0)))
                .entrySet().stream()
                .limit(5)
                .map(entry -> "• " + HtmlUtils.htmlEscape(entry.getKey()) + " — " + entry.getValue() + " бокса")
                .toList();

        String partners = String.join("\n", partnerLines);
        String price = formatPrice(group.getMinimumPrice());
        return switch (group.getTimeWindow()) {
            case EVENING -> "🔥 Вечерний FoodSave Drop\n\n" + partners
                    + "\n\nВсего " + group.getTotalBoxes() + " боксов со скидкой до "
                    + group.getMaximumDiscount() + "%.\nУспейте забрать сегодня.";
            case LAST_CHANCE -> "⏳ Последний шанс на сегодня\n\nОсталось "
                    + group.getTotalBoxes() + " боксов.\nНекоторые предложения скоро закончатся.";
            default -> "🍽 Что забрать на обед?\n\n" + partners
                    + "\n\nЦены от " + price + "\nВ подборке доступно " + group.getTotalBoxes() + " боксов.";
        };
    }

    private String resolveButtonText(NotificationGroup group) {
        return switch (group.getTimeWindow()) {
            case EVENING -> "Выбрать бокс";
            case LAST_CHANCE -> "Посмотреть остатки";
            default -> "Посмотреть боксы";
        };
    }

    public String buildMiniAppDeepLink(String startParam) {
        return "https://t.me/FoodSave_bot?startapp=" + startParam;
    }

    private NotificationScheduleSetting resolveSetting(NotificationWindowType type, Long cityId) {
        ensureDefaultSettings();
        if (cityId != null) {
            Optional<NotificationScheduleSetting> citySetting = scheduleRepository.findByCityIdAndNotificationWindowType(cityId, type);
            if (citySetting.isPresent()) return citySetting.get();
        }
        return scheduleRepository.findFirstByCityIdIsNullAndNotificationWindowType(type)
                .orElseThrow(() -> new IllegalStateException("Default notification setting is missing: " + type));
    }

    private void ensureDefaultSettings() {
        createDefault(NotificationWindowType.LUNCH, LocalTime.of(10, 30), LocalTime.of(11, 30), LocalTime.of(12, 30), 2, 1);
        createDefault(NotificationWindowType.EVENING, LocalTime.of(16, 30), LocalTime.of(17, 30), LocalTime.of(19, 30), 2, 1);
        createDefault(NotificationWindowType.LAST_CHANCE, LocalTime.of(20, 0), LocalTime.of(20, 30), LocalTime.of(21, 30), 3, 1);
    }

    private void createDefault(NotificationWindowType type, LocalTime start, LocalTime send, LocalTime end, int minBoxes, int minPartners) {
        if (scheduleRepository.findFirstByCityIdIsNullAndNotificationWindowType(type).isPresent()) return;
        NotificationScheduleSetting setting = new NotificationScheduleSetting();
        setting.setNotificationWindowType(type);
        setting.setEnabled(true);
        setting.setStartTime(start);
        setting.setSendTime(send);
        setting.setEndTime(end);
        setting.setMinimumTotalBoxes(minBoxes);
        setting.setMinimumPartners(minPartners);
        setting.setMaximumMessagesPerUserPerDay(2);
        setting.setMinimumHoursBetweenMessages(4);
        setting.setQuietHoursStart(LocalTime.of(22, 0));
        setting.setQuietHoursEnd(LocalTime.of(9, 0));
        scheduleRepository.save(setting);
    }

    private LocalDateTime resolveNextScheduledAt(NotificationScheduleSetting setting) {
        LocalDate today = LocalDate.now(DEFAULT_ZONE);
        LocalDateTime scheduled = LocalDateTime.of(today, setting.getSendTime());
        if (scheduled.isBefore(LocalDateTime.now(DEFAULT_ZONE))) {
            scheduled = scheduled.plusDays(1);
        }
        return scheduled;
    }

    private boolean isAvailable(Product product) {
        return ProductAvailability.isAvailable(product);
    }

    private boolean isMarketingEnabled(User user) {
        if (preferencesRepository.findByUser(user).map(p -> p.getTelegramDeliveryFailure() != null).orElse(false)) return false;
        return notificationSettingsRepository.findByUser(user)
                .map(NotificationSettings::isPromotions)
                .orElse(true);
    }

    private UserNotificationPreferences preferencesFor(User user) {
        return preferencesRepository.findByUser(user).orElseGet(UserNotificationPreferences::new);
    }

    private NotificationFrequencyState getOrCreateFrequencyState(User user) {
        return frequencyStateRepository.findByUser(user).orElseGet(() -> {
            NotificationFrequencyState state = new NotificationFrequencyState();
            state.setUser(user);
            state.setMarketingSentDate(LocalDate.now(DEFAULT_ZONE));
            return frequencyStateRepository.save(state);
        });
    }

    private String resolveLanguage(User user) {
        return user != null && user.getTelegramLanguageCode() != null ? user.getTelegramLanguageCode() : "ru";
    }

    private ZoneId resolveZone(String timezone) {
        try {
            return timezone != null ? ZoneId.of(timezone) : DEFAULT_ZONE;
        } catch (Exception ignored) {
            return DEFAULT_ZONE;
        }
    }

    private boolean isWithinQuietHours(LocalTime now, LocalTime start, LocalTime end) {
        if (start == null || end == null) return false;
        if (start.equals(end)) return false;
        if (start.isBefore(end)) {
            return !now.isBefore(start) && now.isBefore(end);
        }
        return !now.isBefore(start) || now.isBefore(end);
    }

    private String formatPrice(BigDecimal value) {
        if (value == null) return "0 ₸";
        return String.format(Locale.US, "%,.0f ₸", value.doubleValue()).replace(',', ' ');
    }
}
