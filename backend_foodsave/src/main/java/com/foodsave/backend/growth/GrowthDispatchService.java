package com.foodsave.backend.growth;

import com.foodsave.backend.service.TelegramBotService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static com.foodsave.backend.growth.GrowthDispatchPolicy.*;

/**
 * Manually invoked only. A durable, non-retryable claim and capacity reservation commit BEFORE
 * transport. A crash can lose a message, but a retry can never send the same assignment again.
 * No ambient caller transaction can roll back the claim. No scheduler/startup enrollment exists.
 */
@Service
public class GrowthDispatchService {
    private final JdbcTemplate jdbc;
    private final TelegramBotService telegram;
    private final TransactionTemplate write;
    private final TransactionTemplate read;
    private final Clock clock;
    private final Config config;
    private final ZoneId legacyZone;
    private final boolean enabled;
    private final boolean legacyMarketingEnabled;

    public enum Status { BLOCKED, CLAIMED, SENT, FAILED, UNKNOWN }
    public record PickupWindow(UUID id, long productId, Instant startsAt, Instant endsAt, long verifiedBy, Instant verifiedAt) {}
    public record Preview(boolean eligible, boolean globalEnabled, boolean experimentEnabled, List<Reason> reasons,
                          Double distanceKm, PickupWindow pickupWindow, String message) {
        public Preview { reasons = List.copyOf(reasons); }
    }
    public record DispatchResult(UUID dispatchId, Status status, List<Reason> reasons, String failureCategory) {
        public DispatchResult { reasons = List.copyOf(reasons); }
    }
    private record Evaluation(Preview preview, UserSnapshot user, Frequency frequency, ZoneId zone) {}
    private record Claim(DispatchResult result, Long telegramId, String text) {}

    @Autowired
    public GrowthDispatchService(JdbcTemplate jdbc, PlatformTransactionManager transactions, TelegramBotService telegram,
                                 @Value("${notifications.growth.enabled:false}") boolean enabled,
                                 @Value("${notifications.marketing.enabled:false}") boolean legacyMarketingEnabled,
                                 @Value("${notifications.growth.gps-max-age-hours:24}") long gpsMaxAgeHours,
                                 @Value("${notifications.growth.pickup-verification-max-age-hours:24}") long verificationHours,
                                 @Value("${notifications.growth.pickup-max-ahead-hours:24}") long pickupMaxAheadHours,
                                 @Value("${notifications.growth.minimum-pickup-minutes:30}") long minimumPickupMinutes,
                                 @Value("${notifications.growth.maximum-radius-km:8}") double maximumRadiusKm,
                                 @Value("${notifications.growth.legacy-timestamp-zone:Asia/Almaty}") String legacyTimestampZone) {
        this(jdbc, transactions, telegram, enabled, legacyMarketingEnabled, Clock.systemUTC(),
                new Config(Duration.ofHours(gpsMaxAgeHours), Duration.ofHours(verificationHours),
                        Duration.ofHours(pickupMaxAheadHours), Duration.ofMinutes(minimumPickupMinutes), maximumRadiusKm),
                ZoneId.of(legacyTimestampZone));
    }

    GrowthDispatchService(JdbcTemplate jdbc, PlatformTransactionManager transactions, TelegramBotService telegram,
                          boolean enabled, boolean legacyMarketingEnabled, Clock clock, Config config, ZoneId legacyZone) {
        this.jdbc = jdbc;
        this.telegram = telegram;
        this.enabled = enabled;
        this.legacyMarketingEnabled = legacyMarketingEnabled;
        this.clock = clock;
        this.config = config;
        this.legacyZone = legacyZone;
        this.write = new TransactionTemplate(transactions);
        write.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.read = new TransactionTemplate(transactions);
        read.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        read.setReadOnly(true);
    }

    /** No writes, locks, preference creation, enrollment or sends, even with both enable flags off. */
    public Preview preview(UUID experimentId, long userId, long productId) {
        validateIds(experimentId, userId, productId);
        return read.execute(ignored -> evaluate(experimentId, userId, productId, clock.instant()).preview());
    }

    public DispatchResult dispatch(UUID experimentId, long userId, long productId, long actorUserId) {
        validateIds(experimentId, userId, productId);
        Claim claim = write.execute(ignored -> {
            requireActor(actorUserId);
            // Match enrollment lock order: experiment first, then user.
            jdbc.queryForList("SELECT id FROM growth_experiments WHERE id = ? FOR SHARE", experimentId);
            jdbc.queryForList("SELECT id FROM users WHERE id = ? FOR UPDATE", userId);
            jdbc.queryForList("SELECT p.id FROM products p JOIN stores s ON s.id = p.store_id WHERE p.id = ? FOR SHARE OF p, s", productId);
            DispatchResult prior = existing(experimentId, userId);
            if (prior != null) return new Claim(prior, null, null);
            Instant now = clock.instant();
            Evaluation evaluation = evaluate(experimentId, userId, productId, now);
            if (!evaluation.preview().eligible()) {
                return new Claim(new DispatchResult(null, Status.BLOCKED, evaluation.preview().reasons(), null), null, null);
            }
            UUID dispatchId = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO growth_dispatches
                    (id, experiment_id, user_id, product_id, pickup_verification_id, requested_by, status, claimed_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'CLAIMED', ?)
                    """, dispatchId, experimentId, userId, productId, evaluation.preview().pickupWindow().id(), actorUserId, utc(now));
            reserveFrequency(userId, now, evaluation.zone(), evaluation.frequency());
            return new Claim(new DispatchResult(dispatchId, Status.CLAIMED, List.of(), null),
                    evaluation.user().telegramId(), evaluation.preview().message());
        });
        if (claim == null) throw new IllegalStateException("Growth claim did not complete");
        if (claim.telegramId() == null) return claim.result();

        // Deliberately outside all claim transactions. Ambiguous outcomes are terminal, never retried.
        Status status;
        String category;
        try {
            TelegramBotService.TelegramSendResult result = telegram.sendMessageOnceDetailed(claim.telegramId(),
                    new TelegramBotService.TelegramMessagePayload(claim.text(), null, "Открыть предложение",
                            "https://t.me/FoodSave_bot?startapp=box_" + productId));
            if (result != null && result.sent()) {
                status = Status.SENT;
                category = null;
            } else {
                category = result == null || result.failureCategory() == null ? "UNKNOWN" : result.failureCategory().name();
                status = switch (category) {
                    case "TIMEOUT", "NETWORK", "SERVER_ERROR", "UNKNOWN" -> Status.UNKNOWN;
                    default -> Status.FAILED;
                };
            }
        } catch (RuntimeException ignored) {
            // Never log exception text: transport exceptions can contain bot credentials or user content.
            status = Status.UNKNOWN;
            category = "INTERNAL_ERROR";
        }
        Status finalStatus = status;
        String finalCategory = category;
        write.executeWithoutResult(ignored -> jdbc.update("""
                UPDATE growth_dispatches SET status = ?, finished_at = ?, failure_category = ?
                WHERE id = ? AND status = 'CLAIMED'
                """, finalStatus.name(), utc(clock.instant()), finalCategory, claim.result().dispatchId()));
        return new DispatchResult(claim.result().dispatchId(), finalStatus, List.of(), finalCategory);
    }

    /** Explicit administrator attestation of one dated product pickup window, never inferred from opening hours. */
    public PickupWindow verifyPickupWindow(long productId, Instant startsAt, Instant endsAt, long actorUserId) {
        if (productId <= 0) throw new IllegalArgumentException("Product id must be positive");
        return write.execute(ignored -> {
            requireActor(actorUserId);
            List<Map<String, Object>> products = jdbc.queryForList("SELECT expiry_date FROM products WHERE id = ? FOR UPDATE", productId);
            if (products.isEmpty()) throw new EntityNotFoundException("Product not found");
            Instant now = clock.instant();
            Instant expiry = localInstant(products.get(0).get("expiry_date"), BUSINESS_ZONE);
            if (!validPickupBounds(now, startsAt, endsAt, expiry, config)
                    || endsAt.isBefore(now.plus(config.minimumPickupRemaining()))) {
                throw new IllegalArgumentException("Pickup requires an explicit upcoming window, maximum 12 hours, within expiry and the configured horizon");
            }
            PickupWindow window = new PickupWindow(UUID.randomUUID(), productId, startsAt, endsAt, actorUserId, now);
            jdbc.update("""
                    INSERT INTO growth_pickup_window_verifications (id, product_id, starts_at, ends_at, verified_by, verified_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, window.id(), productId, utc(startsAt), utc(endsAt), actorUserId, utc(now));
            return window;
        });
    }

    private Evaluation evaluate(UUID experimentId, long userId, long productId, Instant now) {
        List<Reason> reasons = new ArrayList<>();
        Map<String, Object> experiment = first("SELECT enabled FROM growth_experiments WHERE id = ?", experimentId);
        boolean experimentEnabled = experiment != null && bool(experiment, "enabled");
        if (!enabled) reasons.add(Reason.GLOBAL_DISABLED);
        if (experiment == null) reasons.add(Reason.EXPERIMENT_NOT_FOUND);
        else if (!experimentEnabled) reasons.add(Reason.EXPERIMENT_DISABLED);
        Map<String, Object> assignment = first("SELECT arm, assigned_at FROM growth_assignments WHERE experiment_id = ? AND user_id = ?", experimentId, userId);
        if (assignment == null) reasons.add(Reason.ASSIGNMENT_NOT_FOUND);
        else {
            if (!"TREATMENT".equals(assignment.get("arm"))) reasons.add(Reason.HOLDOUT);
            Instant assignedAt = instant(assignment.get("assigned_at"));
            if (assignedAt == null || assignedAt.isAfter(now) || !assignedAt.plus(Duration.ofHours(24)).isAfter(now)) reasons.add(Reason.ASSIGNMENT_EXPIRED);
        }
        if (existing(experimentId, userId) != null) reasons.add(Reason.ALREADY_CLAIMED);
        Map<String, Object> u = first("SELECT enabled, active, blacklisted, telegram_user_id, last_latitude, last_longitude, last_location_updated_at FROM users WHERE id = ?", userId);
        UserSnapshot user = u == null ? null : new UserSnapshot(bool(u, "enabled"), bool(u, "active"), bool(u, "blacklisted"),
                number(u, "telegram_user_id") == null ? null : number(u, "telegram_user_id").longValue(),
                decimal(u, "last_latitude"), decimal(u, "last_longitude"), localInstant(u.get("last_location_updated_at"), legacyZone));
        Map<String, Object> p = first("SELECT * FROM user_notification_preferences WHERE user_id = ?", userId);
        Map<String, Object> settings = first("SELECT promotions FROM notification_settings WHERE user_id = ?", userId);
        Preferences prefs = p == null ? null : new Preferences(true, settings != null, bool(p, "telegram_notifications_enabled"),
                bool(p, "nearby_offers_enabled"), settings != null && bool(settings, "promotions"), integer(p, "maximum_messages_per_day"),
                decimal(p, "max_distance_km"), time(p.get("quiet_hours_start")), time(p.get("quiet_hours_end")), (String) p.get("timezone"),
                money(p.get("max_price")), integer(p, "min_discount_percent"));
        ZoneId zone = BUSINESS_ZONE;
        try { if (prefs != null) zone = ZoneId.of(prefs.timezone()); } catch (RuntimeException ignored) { /* policy rejects */ }
        Map<String, Object> productRow = first("""
                SELECT p.active, p.status, p.stock_quantity, p.expiry_date, p.price, p.discount_percentage,
                       p.name AS product_name, s.name AS store_name, s.active AS store_active, s.status AS store_status,
                       s.latitude AS store_latitude, s.longitude AS store_longitude
                FROM products p JOIN stores s ON s.id = p.store_id WHERE p.id = ?
                """, productId);
        ProductSnapshot product = productRow == null ? null : new ProductSnapshot(bool(productRow, "active"), (String) productRow.get("status"),
                integer(productRow, "stock_quantity"), localInstant(productRow.get("expiry_date"), BUSINESS_ZONE), bool(productRow, "store_active"),
                (String) productRow.get("store_status"), decimal(productRow, "store_latitude"), decimal(productRow, "store_longitude"),
                money(productRow.get("price")), decimal(productRow, "discount_percentage"));
        PickupWindow window = latestWindow(productId);
        Frequency frequency = frequency(userId, now, zone);
        Decision policy = GrowthDispatchPolicy.evaluate(now, user, prefs, product,
                window == null ? null : new Pickup(window.startsAt(), window.endsAt(), window.verifiedAt()), frequency, config);
        reasons.addAll(policy.reasons());
        String message = productRow == null || window == null || product.price() == null ? null : buildMessage(productRow, window);
        return new Evaluation(new Preview(reasons.isEmpty(), enabled, experimentEnabled, reasons, policy.distanceKm(), window, message), user, frequency, zone);
    }

    private Frequency frequency(long userId, Instant now, ZoneId zone) {
        Map<String, Object> state = first("SELECT * FROM notification_frequency_states WHERE user_id = ?", userId);
        Instant start = now.atZone(zone).toLocalDate().atStartOfDay(zone).toInstant();
        Map<String, Object> legacy = first("""
                SELECT COUNT(CASE WHEN event_at >= ? THEN 1 END) AS today_count, MAX(event_at) AS last_at
                FROM (
                    SELECT COALESCE(sent_at, created_at) AS event_at FROM notification_groups
                      WHERE user_id = ? AND status IN ('SENT', 'PROCESSING')
                    UNION ALL
                    SELECT created_at AS event_at FROM notifications WHERE user_id = ? AND type = 'TELEGRAM'
                ) history
                """, LocalDateTime.ofInstant(start, legacyZone), userId, userId);
        Map<String, Object> growth = first("SELECT COUNT(CASE WHEN claimed_at >= ? THEN 1 END) AS today_count, MAX(claimed_at) AS last_at FROM growth_dispatches WHERE user_id = ?", utc(start), userId);
        int ledgerCount = integer(legacy, "today_count") + integer(growth, "today_count");
        Instant last = later(localInstant(legacy.get("last_at"), legacyZone), instant(growth.get("last_at")));
        if (state == null) {
            int claimed = jdbc.queryForObject("SELECT COUNT(*) FROM growth_dispatches WHERE user_id = ?", Integer.class, userId);
            return new Frequency(ledgerCount, last, claimed, null, true);
        }
        Integer count = integer(state, "marketing_sent_today");
        Integer unopened = integer(state, "consecutive_unopened_count");
        LocalDate date = date(state.get("marketing_sent_date"));
        boolean valid = count != null && count >= 0 && unopened != null && unopened >= 0 && (date != null || count == 0);
        // Legacy updates use Almaty dates; preserve either today's business-day or recipient-day counter.
        if (date != null && (date.equals(now.atZone(zone).toLocalDate()) || date.equals(now.atZone(BUSINESS_ZONE).toLocalDate()))) {
            ledgerCount = Math.max(ledgerCount, count == null ? 0 : count);
        }
        last = later(last, localInstant(state.get("last_marketing_sent_at"), legacyZone));
        Instant opened = localInstant(state.get("last_opened_at"), legacyZone);
        int growthUnopened = opened == null
                ? jdbc.queryForObject("SELECT COUNT(*) FROM growth_dispatches WHERE user_id = ?", Integer.class, userId)
                : jdbc.queryForObject("SELECT COUNT(*) FROM growth_dispatches WHERE user_id = ? AND claimed_at > ?", Integer.class, userId, utc(opened));
        return new Frequency(ledgerCount, last, unopened == null ? null : Math.max(unopened, growthUnopened),
                localInstant(state.get("suppressed_until"), legacyZone), valid);
    }

    private void reserveFrequency(long userId, Instant now, ZoneId zone, Frequency frequency) {
        LocalDate date = now.atZone(zone).toLocalDate();
        LocalDateTime timestamp = LocalDateTime.ofInstant(now, legacyZone);
        int unopened = frequency.unopened() + 1;
        LocalDateTime suppressed = unopened >= 10 ? timestamp.plusDays(7) : null;
        int updated = jdbc.update("""
                UPDATE notification_frequency_states SET marketing_sent_today = ?, marketing_sent_date = ?,
                last_marketing_sent_at = ?, consecutive_unopened_count = ?, suppressed_until = COALESCE(?, suppressed_until), updated_at = ?
                WHERE user_id = ?
                """, frequency.sentToday() + 1, date, timestamp, unopened, suppressed, timestamp, userId);
        if (updated == 0) jdbc.update("""
                INSERT INTO notification_frequency_states (user_id, marketing_sent_today, marketing_sent_date,
                last_marketing_sent_at, consecutive_unopened_count, suppressed_until, engagement_score, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
                """, userId, frequency.sentToday() + 1, date, timestamp, unopened, suppressed, timestamp, timestamp);
    }

    private DispatchResult existing(UUID experimentId, long userId) {
        Map<String, Object> row = first("SELECT id, status, failure_category FROM growth_dispatches WHERE experiment_id = ? AND user_id = ?", experimentId, userId);
        return row == null ? null : new DispatchResult(uuid(row.get("id")), Status.valueOf((String) row.get("status")), List.of(Reason.ALREADY_CLAIMED), (String) row.get("failure_category"));
    }
    private PickupWindow latestWindow(long productId) {
        Map<String, Object> row = first("SELECT * FROM growth_pickup_window_verifications WHERE product_id = ? ORDER BY revision DESC LIMIT 1", productId);
        return row == null ? null : new PickupWindow(uuid(row.get("id")), productId, instant(row.get("starts_at")), instant(row.get("ends_at")), number(row, "verified_by").longValue(), instant(row.get("verified_at")));
    }
    private void requireActor(long actorId) {
        Map<String, Object> actor = first("SELECT role, enabled, active, blacklisted FROM users WHERE id = ?", actorId);
        if (actor == null || !"SUPER_ADMIN".equals(actor.get("role")) || !bool(actor, "enabled") || !bool(actor, "active") || bool(actor, "blacklisted")) {
            throw new AccessDeniedException("An active super administrator is required");
        }
    }
    private static String buildMessage(Map<String, Object> product, PickupWindow window) {
        DateTimeFormatter format = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm").withZone(BUSINESS_ZONE);
        return "Предложение рядом: <b>" + escape(product.get("product_name")) + "</b>\n"
                + escape(product.get("store_name")) + "\nЦена: " + money(product.get("price")).stripTrailingZeros().toPlainString()
                + " ₸\nСамовывоз: " + format.format(window.startsAt()) + " – " + format.format(window.endsAt())
                + " (Алматы)\nОплата наличными при получении. Наличие уточняется при бронировании.";
    }
    private static String escape(Object text) {
        return text == null ? "" : text.toString().replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
    private static void validateIds(UUID id, long userId, long productId) {
        if (id == null || userId <= 0 || productId <= 0) throw new IllegalArgumentException("Experiment, user and product ids are required");
    }
    private Map<String, Object> first(String sql, Object... args) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, args);
        return rows.isEmpty() ? null : rows.get(0);
    }
    private static boolean bool(Map<String, Object> row, String key) { return Boolean.TRUE.equals(row.get(key)); }
    private static Number number(Map<String, Object> row, String key) { return (Number) row.get(key); }
    private static Integer integer(Map<String, Object> row, String key) { Number n = number(row, key); return n == null ? null : n.intValue(); }
    private static Double decimal(Map<String, Object> row, String key) { Number n = number(row, key); return n == null ? null : n.doubleValue(); }
    private static BigDecimal money(Object value) { return value == null ? null : value instanceof BigDecimal b ? b : new BigDecimal(value.toString()); }
    private static UUID uuid(Object value) { return value instanceof UUID u ? u : UUID.fromString(value.toString()); }
    private static LocalTime time(Object value) { return value == null ? null : value instanceof java.sql.Time t ? t.toLocalTime() : (LocalTime) value; }
    private static LocalDate date(Object value) { return value == null ? null : value instanceof java.sql.Date d ? d.toLocalDate() : (LocalDate) value; }
    private static Instant instant(Object value) {
        if (value == null) return null;
        if (value instanceof Timestamp t) return t.toInstant();
        if (value instanceof OffsetDateTime t) return t.toInstant();
        if (value instanceof Instant t) return t;
        throw new IllegalStateException("Unsupported timestamp representation");
    }
    private static Instant localInstant(Object value, ZoneId zone) {
        if (value == null) return null;
        LocalDateTime local = value instanceof Timestamp t ? t.toLocalDateTime() : (LocalDateTime) value;
        return local.atZone(zone).toInstant();
    }
    private static Instant later(Instant a, Instant b) { return a == null ? b : b == null || a.isAfter(b) ? a : b; }
    private static OffsetDateTime utc(Instant value) { return value.atOffset(ZoneOffset.UTC); }
}
