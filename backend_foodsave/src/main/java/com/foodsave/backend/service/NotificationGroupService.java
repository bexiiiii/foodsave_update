package com.foodsave.backend.service;

import com.foodsave.backend.domain.enums.*;
import com.foodsave.backend.dto.ProductDTO;
import com.foodsave.backend.dto.analytics.ProductEventRequest;
import com.foodsave.backend.dto.communications.NotificationGroupResponse;
import com.foodsave.backend.dto.communications.NotificationScheduleSettingDTO;
import com.foodsave.backend.entity.*;
import com.foodsave.backend.repository.*;
import com.foodsave.backend.util.ProductAvailability;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private static final long SCHEDULER_LOCK_ID = 884202608031130L;

    private final NotificationGroupRepository groupRepository;
    private final NotificationGroupItemRepository itemRepository;
    private final NotificationScheduleSettingRepository scheduleRepository;
    private final UserNotificationPreferencesRepository preferencesRepository;
    private final NotificationFrequencyStateRepository frequencyStateRepository;
    private final NotificationSettingsRepository notificationSettingsRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final TelegramBotService telegramBotService;
    private final ProductEventService productEventService;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public void collectNewProduct(ProductDTO productDTO) {
        if (productDTO == null || productDTO.getId() == null) return;
        Product product = productRepository.findById(productDTO.getId()).orElse(null);
        if (!isAvailable(product)) return;

        List<User> users = userRepository.findByTelegramUserTrue();
        if (users.isEmpty()) return;

        NotificationScheduleSetting setting = resolveSetting(NotificationWindowType.LUNCH, null);
        LocalDateTime scheduledAt = resolveNextScheduledAt(setting);

        for (User user : users) {
            if (!isMarketingEnabled(user)) continue;
            UserNotificationPreferences prefs = getOrCreatePreferences(user);
            if (!prefs.isTelegramNotificationsEnabled() || !prefs.isLunchDigestEnabled()) continue;

            NotificationGroup group = groupRepository
                    .findFirstByUserAndTimeWindowAndScheduledAtAndStatusIn(
                            user,
                            setting.getNotificationWindowType(),
                            scheduledAt,
                            List.of(NotificationGroupStatus.COLLECTING, NotificationGroupStatus.SCHEDULED)
                    )
                    .orElseGet(() -> createGroup(user, setting, scheduledAt));
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
            group.getItems().add(item);
            recalculateGroup(group);
            groupRepository.save(group);
        }
    }

    @Transactional(readOnly = true)
    public NotificationGroupResponse getMiniAppGroup(Long id) {
        NotificationGroup group = groupRepository.findWithItemsById(id)
                .orElseThrow(() -> new EntityNotFoundException("Notification group not found"));
        List<Long> ids = group.getItems().stream()
                .map(NotificationGroupItem::getBox)
                .filter(Objects::nonNull)
                .map(Product::getId)
                .toList();
        if (ids.isEmpty()) {
            return NotificationGroupResponse.fromEntity(group);
        }
        Set<Long> availableIds = productRepository.findActiveAvailableByIds(
                        ids, ProductAvailability.visibilityCutoff(), ProductAvailability.currentTimeText()).stream()
                .map(Product::getId)
                .collect(Collectors.toSet());
        group.setItems(group.getItems().stream()
                .filter(item -> item.getBox() != null && availableIds.contains(item.getBox().getId()))
                .collect(Collectors.toCollection(ArrayList::new)));
        return NotificationGroupResponse.fromEntity(group);
    }

    @Transactional
    public void markOpened(Long id) {
        groupRepository.findById(id).ifPresent(group -> {
            if (group.getOpenedAt() == null) {
                group.setOpenedAt(LocalDateTime.now());
                groupRepository.save(group);
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

    public void processDueGroups() {
        if (!tryLock()) {
            log.debug("Notification scheduler skipped: lock is held by another instance");
            return;
        }
        try {
            List<NotificationGroup> dueGroups = groupRepository.findDueGroups(
                    NotificationGroupStatus.SCHEDULED, LocalDateTime.now(), PageRequest.of(0, 100));
            for (NotificationGroup group : dueGroups) {
                try {
                    sendGroup(group.getId());
                } catch (Exception e) {
                    log.error("Notification group {} processing failed", group.getId(), e);
                }
            }
        } finally {
            unlock();
        }
    }

    @Transactional
    public void sendGroup(Long groupId) {
        NotificationGroup group = groupRepository.findWithItemsById(groupId)
                .orElseThrow(() -> new EntityNotFoundException("Notification group not found"));
        if (group.getStatus() != NotificationGroupStatus.SCHEDULED) return;
        group.setStatus(NotificationGroupStatus.PROCESSING);
        groupRepository.save(group);

        try {
            List<NotificationGroupItem> availableItems = filterAvailableItems(group);
            group.setItems(new ArrayList<>(availableItems));
            recalculateGroup(group);

            NotificationScheduleSetting setting = resolveSetting(group.getTimeWindow(), group.getCityId());
            if (availableItems.isEmpty() || !passesMinimums(group, setting) || !canSendMarketing(group.getUser(), setting)) {
                group.setStatus(NotificationGroupStatus.CANCELLED);
                groupRepository.save(group);
                return;
            }

            String text = buildMessage(group, resolveLanguage(group.getUser()));
            String deepLink = buildMiniAppDeepLink("notification_" + group.getId());
            group.setDeepLink(deepLink);
            boolean sent = telegramBotService.sendMessage(group.getUser().getTelegramUserId(),
                    new TelegramBotService.TelegramMessagePayload(text, null, resolveButtonText(group), deepLink));
            if (!sent) {
                group.setStatus(NotificationGroupStatus.FAILED);
                group.setFailedAt(LocalDateTime.now());
                group.setErrorMessage("Telegram API returned failure");
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
                    null, "backend", null, null, null, resolveLanguage(group.getUser()),
                    "notification-sent-" + group.getId(), Map.of("notificationGroupId", group.getId())
            ));
        } catch (Exception e) {
            group.setStatus(NotificationGroupStatus.FAILED);
            group.setFailedAt(LocalDateTime.now());
            group.setErrorMessage(e.getMessage());
            groupRepository.save(group);
            throw e;
        }
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

    private NotificationGroup createGroup(User user, NotificationScheduleSetting setting, LocalDateTime scheduledAt) {
        NotificationGroup group = new NotificationGroup();
        group.setUser(user);
        group.setCityId(setting.getCityId());
        group.setStatus(NotificationGroupStatus.SCHEDULED);
        group.setScheduledAt(scheduledAt);
        group.setTimeWindow(setting.getNotificationWindowType());
        group.setTriggerType(setting.getNotificationWindowType() == NotificationWindowType.LAST_CHANCE
                ? NotificationTriggerType.LAST_CHANCE : NotificationTriggerType.NEW_BOX);
        group.setCampaignId(setting.getNotificationWindowType().name().toLowerCase(Locale.ROOT) + "-" + LocalDate.now(DEFAULT_ZONE));
        group.setIdempotencyKey(user.getId() + ":" + setting.getNotificationWindowType() + ":" + scheduledAt);
        return groupRepository.save(group);
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

    private List<NotificationGroupItem> filterAvailableItems(NotificationGroup group) {
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
                .peek(item -> {
                    Product product = products.get(item.getBox().getId());
                    item.setAvailableQuantity(product.getStockQuantity());
                    item.setPrice(product.getPrice());
                    item.setOriginalPrice(product.getOriginalPrice());
                    item.setDiscountPercent(product.getDiscountPercentage() != null ? product.getDiscountPercentage().intValue() : 0);
                    item.setPickupEndAt(product.getExpiryDate());
                })
                .toList();
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
        UserNotificationPreferences prefs = getOrCreatePreferences(user);
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
        int maxPerDay = prefs.getMaximumMessagesPerDay() != null ? prefs.getMaximumMessagesPerDay() : setting.getMaximumMessagesPerUserPerDay();
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
                .map(entry -> "• " + entry.getKey() + " — " + entry.getValue() + " бокса")
                .toList();

        String partners = String.join("\n", partnerLines);
        String price = formatPrice(group.getMinimumPrice());
        return switch (group.getTimeWindow()) {
            case EVENING -> "🔥 Вечерний FoodSave Drop\n\n" + partners
                    + "\n\nВсего " + group.getTotalBoxes() + " боксов со скидкой до "
                    + group.getMaximumDiscount() + "%.\nУспейте забрать сегодня.";
            case LAST_CHANCE -> "⏳ Последний шанс на сегодня\n\nРядом осталось "
                    + group.getTotalBoxes() + " боксов.\nНекоторые предложения скоро закончатся.";
            default -> "🍽 Что забрать на обед?\n\n" + partners
                    + "\n\nЦены от " + price + "\nРядом с вами доступно " + group.getTotalBoxes() + " боксов.";
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
        return notificationSettingsRepository.findByUser(user)
                .map(NotificationSettings::isPromotions)
                .orElse(true);
    }

    private UserNotificationPreferences getOrCreatePreferences(User user) {
        return preferencesRepository.findByUser(user).orElseGet(() -> {
            UserNotificationPreferences prefs = new UserNotificationPreferences();
            prefs.setUser(user);
            prefs.setLanguage(resolveLanguage(user));
            return preferencesRepository.save(prefs);
        });
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

    private boolean tryLock() {
        Boolean locked = jdbcTemplate.queryForObject("SELECT pg_try_advisory_lock(?)", Boolean.class, SCHEDULER_LOCK_ID);
        return Boolean.TRUE.equals(locked);
    }

    private void unlock() {
        try {
            jdbcTemplate.queryForObject("SELECT pg_advisory_unlock(?)", Boolean.class, SCHEDULER_LOCK_ID);
        } catch (Exception e) {
            log.warn("Failed to release notification scheduler lock", e);
        }
    }

    private String formatPrice(BigDecimal value) {
        if (value == null) return "0 ₸";
        return String.format(Locale.US, "%,.0f ₸", value.doubleValue()).replace(',', ' ');
    }
}
