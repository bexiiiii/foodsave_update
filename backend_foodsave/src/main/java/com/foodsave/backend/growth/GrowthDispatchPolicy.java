package com.foodsave.backend.growth;

import java.math.BigDecimal;
import java.time.*;
import java.util.ArrayList;
import java.util.List;

/** Pure, fail-closed policy. No district matching, writes, network calls or preference creation. */
public final class GrowthDispatchPolicy {
    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Almaty");
    private GrowthDispatchPolicy() {}

    public enum Reason {
        GLOBAL_DISABLED, EXPERIMENT_DISABLED, EXPERIMENT_NOT_FOUND, LEGACY_MARKETING_ENABLED,
        ASSIGNMENT_NOT_FOUND, ASSIGNMENT_EXPIRED, HOLDOUT, ALREADY_CLAIMED,
        USER_UNAVAILABLE, TELEGRAM_UNAVAILABLE, CONSENT_MISSING, OPTED_OUT, INVALID_PREFERENCES,
        QUIET_HOURS, GPS_MISSING, GPS_STALE, STORE_LOCATION_MISSING, OUTSIDE_RADIUS,
        PRODUCT_UNAVAILABLE, PRODUCT_EXPIRED, STORE_UNAVAILABLE, PRICE_PREFERENCE,
        PICKUP_UNVERIFIED, PICKUP_VERIFICATION_STALE, PICKUP_WINDOW_INVALID, PICKUP_TOO_SOON,
        SUPPRESSED, UNOPENED_LIMIT, DAILY_CAP, MINIMUM_GAP, INVALID_FREQUENCY_STATE
    }

    public record Config(Duration gpsMaxAge, Duration verificationMaxAge, Duration pickupMaxAhead,
                         Duration minimumPickupRemaining, double maximumRadiusKm) {
        public Config {
            if (gpsMaxAge == null || gpsMaxAge.isNegative() || gpsMaxAge.isZero()
                    || verificationMaxAge == null || verificationMaxAge.isNegative() || verificationMaxAge.isZero()
                    || pickupMaxAhead == null || pickupMaxAhead.isNegative() || pickupMaxAhead.isZero()
                    || minimumPickupRemaining == null || minimumPickupRemaining.compareTo(Duration.ofMinutes(30)) < 0
                    || !Double.isFinite(maximumRadiusKm) || maximumRadiusKm <= 0 || maximumRadiusKm > 8) {
                throw new IllegalArgumentException("Invalid growth safety configuration");
            }
        }
        public static Config defaults() {
            return new Config(Duration.ofHours(24), Duration.ofHours(24), Duration.ofHours(24), Duration.ofMinutes(30), 8);
        }
    }
    public record UserSnapshot(boolean enabled, boolean active, boolean blacklisted, Long telegramId,
                               Double latitude, Double longitude, Instant locationUpdatedAt) {}
    public record Preferences(boolean present, boolean settingsPresent, boolean telegramEnabled,
                              boolean nearbyEnabled, boolean promotions, Integer maxPerDay,
                              Double maxDistanceKm, LocalTime quietStart, LocalTime quietEnd, String timezone,
                              BigDecimal maxPrice, Integer minimumDiscount) {}
    public record ProductSnapshot(boolean active, String status, Integer stock, Instant expiry,
                                  boolean storeActive, String storeStatus, Double latitude, Double longitude,
                                  BigDecimal price, Double discount) {}
    public record Frequency(int sentToday, Instant lastSent, Integer unopened, Instant suppressedUntil, boolean valid) {}
    public record Pickup(Instant start, Instant end, Instant verifiedAt) {}
    public record Decision(List<Reason> reasons, Double distanceKm, ZoneId zone) {
        public Decision { reasons = List.copyOf(reasons); }
        public boolean eligible() { return reasons.isEmpty(); }
    }

    public static Decision evaluate(Instant now, UserSnapshot user, Preferences prefs, ProductSnapshot product,
                                    Pickup pickup, Frequency frequency, Config config) {
        List<Reason> reasons = new ArrayList<>();
        ZoneId zone = BUSINESS_ZONE;
        if (user == null || !user.enabled() || !user.active() || user.blacklisted()) reasons.add(Reason.USER_UNAVAILABLE);
        if (user == null || user.telegramId() == null || user.telegramId() <= 0) reasons.add(Reason.TELEGRAM_UNAVAILABLE);
        if (prefs == null || !prefs.present() || !prefs.settingsPresent()) {
            reasons.add(Reason.CONSENT_MISSING);
        } else {
            if (!prefs.telegramEnabled() || !prefs.nearbyEnabled() || !prefs.promotions()) reasons.add(Reason.OPTED_OUT);
            try {
                zone = ZoneId.of(prefs.timezone());
            } catch (RuntimeException e) {
                reasons.add(Reason.INVALID_PREFERENCES);
            }
            if (prefs.maxPerDay() == null || prefs.maxPerDay() < 0 || prefs.maxDistanceKm() == null
                    || !Double.isFinite(prefs.maxDistanceKm()) || prefs.maxDistanceKm() <= 0
                    || prefs.quietStart() == null || prefs.quietEnd() == null) {
                reasons.add(Reason.INVALID_PREFERENCES);
            }
            LocalTime time = now.atZone(zone).toLocalTime();
            if (withinQuietHours(time, LocalTime.of(22, 0), LocalTime.of(9, 0))
                    || withinQuietHours(time, prefs.quietStart(), prefs.quietEnd())) reasons.add(Reason.QUIET_HOURS);
        }

        Double distance = null;
        if (user == null || !coordinatesValid(user.latitude(), user.longitude()) || user.locationUpdatedAt() == null) {
            reasons.add(Reason.GPS_MISSING);
        } else if (user.locationUpdatedAt().isAfter(now) || user.locationUpdatedAt().plus(config.gpsMaxAge()).isBefore(now)) {
            reasons.add(Reason.GPS_STALE);
        }
        if (product == null || !product.active() || !"AVAILABLE".equals(product.status())
                || product.stock() == null || product.stock() <= 0 || product.price() == null || product.price().signum() <= 0) {
            reasons.add(Reason.PRODUCT_UNAVAILABLE);
        }
        if (product == null || product.expiry() == null || !product.expiry().isAfter(now)
                || !product.expiry().atZone(BUSINESS_ZONE).toLocalDate().isAfter(now.atZone(BUSINESS_ZONE).toLocalDate())) {
            reasons.add(Reason.PRODUCT_EXPIRED);
        }
        if (product == null || !product.storeActive() || !"ACTIVE".equals(product.storeStatus())) reasons.add(Reason.STORE_UNAVAILABLE);
        if (product == null || !coordinatesValid(product.latitude(), product.longitude())) {
            reasons.add(Reason.STORE_LOCATION_MISSING);
        } else if (user != null && coordinatesValid(user.latitude(), user.longitude())) {
            distance = distanceKm(user.latitude(), user.longitude(), product.latitude(), product.longitude());
            double radius = prefs != null && prefs.maxDistanceKm() != null ? prefs.maxDistanceKm() : 0;
            if (!Double.isFinite(radius) || distance > Math.min(config.maximumRadiusKm(), radius)) reasons.add(Reason.OUTSIDE_RADIUS);
        }
        if (product != null && prefs != null && (prefs.maxPrice() != null && product.price() != null && product.price().compareTo(prefs.maxPrice()) > 0
                || prefs.minimumDiscount() != null && (product.discount() == null || !Double.isFinite(product.discount())
                || product.discount() < prefs.minimumDiscount()))) reasons.add(Reason.PRICE_PREFERENCE);

        if (pickup == null) {
            reasons.add(Reason.PICKUP_UNVERIFIED);
        } else {
            if (pickup.verifiedAt() == null || pickup.verifiedAt().isAfter(now)
                    || pickup.verifiedAt().plus(config.verificationMaxAge()).isBefore(now)) reasons.add(Reason.PICKUP_VERIFICATION_STALE);
            if (!validPickupBounds(now, pickup.start(), pickup.end(), product == null ? null : product.expiry(), config)) {
                reasons.add(Reason.PICKUP_WINDOW_INVALID);
            } else {
                long walkAndBufferMinutes = distance == null ? 30 : (long) Math.ceil(distance * 60 / 4) + 15;
                Duration remaining = config.minimumPickupRemaining().compareTo(Duration.ofMinutes(walkAndBufferMinutes)) > 0
                        ? config.minimumPickupRemaining() : Duration.ofMinutes(walkAndBufferMinutes);
                if (pickup.end().isBefore(now.plus(remaining))) reasons.add(Reason.PICKUP_TOO_SOON);
            }
        }
        if (frequency == null || !frequency.valid() || frequency.sentToday() < 0 || frequency.unopened() == null || frequency.unopened() < 0) {
            reasons.add(Reason.INVALID_FREQUENCY_STATE);
        } else {
            if (frequency.suppressedUntil() != null && frequency.suppressedUntil().isAfter(now)) reasons.add(Reason.SUPPRESSED);
            if (frequency.unopened() >= 10) reasons.add(Reason.UNOPENED_LIMIT);
            int cap = prefs == null || prefs.maxPerDay() == null ? 0 : Math.min(2, prefs.maxPerDay());
            if (frequency.unopened() >= 5) cap = Math.min(cap, 1);
            if (frequency.sentToday() >= cap) reasons.add(Reason.DAILY_CAP);
            if (frequency.lastSent() != null && frequency.lastSent().plus(Duration.ofHours(4)).isAfter(now)) reasons.add(Reason.MINIMUM_GAP);
        }
        return new Decision(reasons, distance, zone);
    }

    static boolean validPickupBounds(Instant now, Instant start, Instant end, Instant expiry, Config config) {
        return start != null && end != null && expiry != null && end.isAfter(start) && end.isAfter(now)
                && !start.isAfter(now.plus(config.pickupMaxAhead()))
                && !end.isAfter(expiry) && Duration.between(start, end).compareTo(Duration.ofHours(12)) <= 0;
    }
    static boolean withinQuietHours(LocalTime now, LocalTime start, LocalTime end) {
        if (start == null || end == null || start.equals(end)) return false;
        return start.isBefore(end) ? !now.isBefore(start) && now.isBefore(end) : !now.isBefore(start) || now.isBefore(end);
    }
    static boolean coordinatesValid(Double latitude, Double longitude) {
        return latitude != null && longitude != null && Double.isFinite(latitude) && Double.isFinite(longitude)
                && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
    }
    static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double a = Math.pow(Math.sin(Math.toRadians(lat2 - lat1) / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(Math.toRadians(lon2 - lon1) / 2), 2);
        return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
    }
}
