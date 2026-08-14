package com.foodsave.backend.util;

import com.foodsave.backend.domain.enums.ProductStatus;
import com.foodsave.backend.domain.enums.StoreStatus;
import com.foodsave.backend.entity.Product;
import com.foodsave.backend.entity.Store;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Single source of truth for customer-facing box availability.
 * Product and store timestamps are entered as Kazakhstan local time, while the
 * production host runs in UTC, so the business zone must always be explicit.
 */
public final class ProductAvailability {

    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Almaty");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private static final long CLOSING_SOON_THRESHOLD_MINUTES = 60;

    private ProductAvailability() {
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(BUSINESS_ZONE);
    }

    /**
     * Products whose expiry date is today must already be hidden. Therefore
     * customer queries only accept expiry timestamps from tomorrow onward.
     */
    public static LocalDateTime visibilityCutoff() {
        return now().toLocalDate().plusDays(1).atStartOfDay();
    }

    public static String currentTimeText() {
        return LocalTime.now(BUSINESS_ZONE).format(TIME_FORMAT);
    }

    public static boolean isAvailable(Product product) {
        return isAvailable(product, now());
    }

    static boolean isAvailable(Product product, LocalDateTime now) {
        if (product == null
                || !Boolean.TRUE.equals(product.getActive())
                || product.getStatus() != ProductStatus.AVAILABLE
                || product.getStockQuantity() == null
                || product.getStockQuantity() <= 0) {
            return false;
        }

        if (product.getExpiryDate() != null
                && !product.getExpiryDate().toLocalDate().isAfter(now.toLocalDate())) {
            return false;
        }

        return isStoreOpen(product.getStore(), now.toLocalTime());
    }

    public static boolean isStoreOpen(Store store) {
        return isStoreOpen(store, LocalTime.now(BUSINESS_ZONE));
    }

    static boolean isStoreOpen(Store store, LocalTime now) {
        if (store == null || !store.isActive() || store.getStatus() != StoreStatus.ACTIVE) {
            return false;
        }

        LocalTime opening = parseTime(store.getOpeningHours());
        LocalTime closing = parseTime(store.getClosingHours());

        // Missing or malformed business hours should not accidentally hide a store.
        if (opening == null || closing == null || opening.equals(closing)) {
            return true;
        }

        if (opening.isBefore(closing)) {
            return !now.isBefore(opening) && now.isBefore(closing);
        }

        // Overnight schedule, for example 10:00-03:00.
        return !now.isBefore(opening) || now.isBefore(closing);
    }

    public static boolean isClosingSoon(Store store) {
        return minutesUntilClose(store) != null;
    }

    public static boolean isClosingSoon(String closingHours) {
        return minutesUntilClose(closingHours) != null;
    }

    /**
     * Minutes until the store closes, or null if it isn't closing within
     * {@link #CLOSING_SOON_THRESHOLD_MINUTES}. Kept as the single source of the
     * exact countdown so the badge, the pre-checkout warning and the store card
     * all show the same number instead of drifting apart.
     */
    public static Integer minutesUntilClose(Store store) {
        return store == null ? null : minutesUntilClose(store.getClosingHours());
    }

    public static Integer minutesUntilClose(String closingHours) {
        LocalTime closing = parseTime(closingHours);
        if (closing == null) {
            return null;
        }
        LocalTime now = LocalTime.now(BUSINESS_ZONE);
        long minutes = java.time.Duration.between(now, closing).toMinutes();
        if (minutes < 0) {
            minutes += 24 * 60;
        }
        return (minutes >= 0 && minutes <= CLOSING_SOON_THRESHOLD_MINUTES) ? (int) minutes : null;
    }

    private static LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalTime.parse(value.trim(), TIME_FORMAT);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }
}
