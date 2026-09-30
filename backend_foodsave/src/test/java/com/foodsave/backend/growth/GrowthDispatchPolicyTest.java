package com.foodsave.backend.growth;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import static com.foodsave.backend.growth.GrowthDispatchPolicy.*;
import static org.junit.jupiter.api.Assertions.*;

class GrowthDispatchPolicyTest {
    // Noon in Almaty; expiry is tomorrow in the business timezone.
    private static final Instant NOW = Instant.parse("2026-09-30T07:00:00Z");
    private static final Instant EXPIRY = Instant.parse("2026-10-01T19:00:00Z");

    private static final class Fixture {
        Instant now = NOW;
        UserSnapshot user = new UserSnapshot(true, true, false, 123L, 43.25, 76.95, NOW);
        ProductSnapshot product = product(10, EXPIRY, 43.25, 76.95);
        Pickup pickup = new Pickup(NOW, NOW.plus(Duration.ofHours(3)), NOW);
        Frequency frequency = new Frequency(0, null, 0, null, true);
        Config config = Config.defaults();
        boolean consent = true, settings = true, telegram = true, nearby = true, promotions = true;
        Integer cap = 2;
        Double radius = 8.0;
        LocalTime quietStart = LocalTime.of(22, 0), quietEnd = LocalTime.of(9, 0);
        String timezone = "Asia/Almaty";
        BigDecimal maxPrice;
        Integer minimumDiscount;
        boolean missingPreferences;

        Decision evaluate() {
            Preferences preferences = missingPreferences ? null : new Preferences(consent, settings, telegram,
                    nearby, promotions, cap, radius, quietStart, quietEnd, timezone, maxPrice, minimumDiscount);
            return GrowthDispatchPolicy.evaluate(now, user, preferences, product, pickup, frequency, config);
        }
        void gps(Double latitude, Double longitude, Instant at) {
            user = new UserSnapshot(true, true, false, 123L, latitude, longitude, at);
        }
        void frequency(int sent, Instant last, Integer unopened, Instant suppressed, boolean valid) {
            frequency = new Frequency(sent, last, unopened, suppressed, valid);
        }
        void assertOnly(Reason reason) {
            Decision decision = evaluate();
            assertFalse(decision.eligible());
            assertEquals(List.of(reason), decision.reasons());
        }
        void assertAllowed() {
            Decision decision = evaluate();
            assertTrue(decision.eligible(), () -> decision.reasons().toString());
        }
    }

    private static ProductSnapshot product(Integer stock, Instant expiry, Double latitude, Double longitude) {
        return new ProductSnapshot(true, "AVAILABLE", stock, expiry, true, "ACTIVE", latitude, longitude,
                new BigDecimal("500.00"), 50.0);
    }

    @Test
    void fullyEligibleUserIsAllowedAndDecisionIsImmutable() {
        Decision decision = new Fixture().evaluate();
        assertTrue(decision.eligible());
        assertEquals(0.0, decision.distanceKm());
        assertEquals(ZoneId.of("Asia/Almaty"), decision.zone());
        assertThrows(UnsupportedOperationException.class, () -> decision.reasons().add(Reason.OPTED_OUT));
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing", "consent", "settings"})
    void explicitConsentAndSettingsAreRequired(String missing) {
        Fixture f = new Fixture();
        f.missingPreferences = missing.equals("missing");
        f.consent = !missing.equals("consent");
        f.settings = !missing.equals("settings");
        Decision decision = f.evaluate();
        assertFalse(decision.eligible());
        assertTrue(decision.reasons().contains(Reason.CONSENT_MISSING));
    }

    @ParameterizedTest
    @ValueSource(strings = {"telegram", "nearby", "promotions"})
    void everyOptOutBlocksDispatch(String optOut) {
        Fixture f = new Fixture();
        f.telegram = !optOut.equals("telegram");
        f.nearby = !optOut.equals("nearby");
        f.promotions = !optOut.equals("promotions");
        f.assertOnly(Reason.OPTED_OUT);
    }

    @ParameterizedTest
    @CsvSource({"21:59,false", "22:00,true", "23:59,true", "00:00,true", "08:59,true", "09:00,false"})
    void overnightQuietHoursHaveInclusiveStartExclusiveEnd(String time, boolean quiet) {
        assertEquals(quiet, withinQuietHours(LocalTime.parse(time), LocalTime.of(22, 0), LocalTime.of(9, 0)));
    }

    @Test
    void quietHoursUsePreferenceTimezoneAcrossUtcDateBoundary() {
        Fixture f = new Fixture();
        // Same instant: noon in Almaty, midnight in Los Angeles on September 30.
        f.timezone = "America/Los_Angeles";
        f.assertOnly(Reason.QUIET_HOURS);
        f.timezone = "Pacific/Honolulu"; // 21:00 on September 29: outside the enforced window.
        f.assertAllowed();
    }

    @Test
    void mandatoryQuietHoursCannotBeDisabledByEqualCustomTimes() {
        Fixture f = new Fixture();
        f.timezone = "America/Los_Angeles";
        f.quietStart = f.quietEnd = LocalTime.NOON;
        f.assertOnly(Reason.QUIET_HOURS);
    }

    @Test
    void daytimeCustomQuietHoursAreAlsoEnforced() {
        Fixture f = new Fixture();
        f.quietStart = LocalTime.NOON;
        f.quietEnd = LocalTime.of(13, 0);
        f.assertOnly(Reason.QUIET_HOURS);
        f.quietEnd = LocalTime.NOON;
        f.quietStart = LocalTime.of(11, 0);
        f.assertAllowed();
    }

    @ParameterizedTest
    @ValueSource(strings = {"timezone", "nullTimezone", "cap", "negativeCap", "radius", "negativeRadius", "nanRadius", "quietStart", "quietEnd"})
    void malformedPreferencesFailClosed(String invalid) {
        Fixture f = new Fixture();
        switch (invalid) {
            case "timezone" -> f.timezone = "invalid/timezone";
            case "nullTimezone" -> f.timezone = null;
            case "cap" -> f.cap = null;
            case "negativeCap" -> f.cap = -1;
            case "radius" -> f.radius = null;
            case "negativeRadius" -> f.radius = -1.0;
            case "nanRadius" -> f.radius = Double.NaN;
            case "quietStart" -> f.quietStart = null;
            case "quietEnd" -> f.quietEnd = null;
            default -> fail(invalid);
        }
        assertFalse(f.evaluate().eligible());
        assertTrue(f.evaluate().reasons().contains(Reason.INVALID_PREFERENCES));
    }

    @Test
    void missingCoordinatesOrTimestampFailClosed() {
        Fixture f = new Fixture();
        f.gps(null, 76.95, NOW);
        f.assertOnly(Reason.GPS_MISSING);
        f.gps(43.25, null, NOW);
        f.assertOnly(Reason.GPS_MISSING);
        f.gps(43.25, 76.95, null);
        f.assertOnly(Reason.GPS_MISSING);
    }

    @ParameterizedTest
    @CsvSource({"91,0", "-91,0", "0,181", "0,-181", "NaN,0", "0,Infinity"})
    void invalidGpsCoordinatesFailClosed(double latitude, double longitude) {
        Fixture f = new Fixture();
        f.gps(latitude, longitude, NOW);
        f.assertOnly(Reason.GPS_MISSING);
    }

    @Test
    void gpsAgeBoundaryAndFutureTimestampAreChecked() {
        Fixture f = new Fixture();
        f.gps(43.25, 76.95, NOW.minus(Duration.ofHours(24)));
        f.assertAllowed();
        f.gps(43.25, 76.95, NOW.minus(Duration.ofHours(24)).minusNanos(1));
        f.assertOnly(Reason.GPS_STALE);
        f.gps(43.25, 76.95, NOW.plusNanos(1));
        f.assertOnly(Reason.GPS_STALE);
    }

    @Test
    void radiusHonorsUserPreferenceAndAbsoluteEightKilometerCeiling() {
        Fixture f = new Fixture();
        f.product = product(10, EXPIRY, 43.28, 76.95); // about 3.34 km
        f.radius = 4.0;
        f.assertAllowed();
        f.radius = 3.0;
        f.assertOnly(Reason.OUTSIDE_RADIUS);
        f.radius = 100.0;
        f.product = product(10, EXPIRY, 43.33, 76.95); // about 8.90 km
        f.assertOnly(Reason.OUTSIDE_RADIUS);
    }

    @Test
    void exactRadiusIsInclusiveAndCustomConfigurationCanBeStricter() {
        Fixture f = new Fixture();
        f.product = product(10, EXPIRY, 43.28, 76.95);
        f.radius = distanceKm(43.25, 76.95, 43.28, 76.95);
        f.assertAllowed();
        f.radius = Math.nextDown(f.radius);
        f.assertOnly(Reason.OUTSIDE_RADIUS);
        f.radius = 8.0;
        f.config = new Config(Duration.ofHours(24), Duration.ofHours(24), Duration.ofHours(24), Duration.ofMinutes(30), 3);
        f.assertOnly(Reason.OUTSIDE_RADIUS);
    }

    @Test
    void missingOrInvalidStoreLocationFailsClosed() {
        Fixture f = new Fixture();
        f.product = product(10, EXPIRY, null, 76.95);
        f.assertOnly(Reason.STORE_LOCATION_MISSING);
        f.product = product(10, EXPIRY, 43.25, Double.NaN);
        f.assertOnly(Reason.STORE_LOCATION_MISSING);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1})
    void exhaustedOrNegativeStockIsUnavailable(int stock) {
        Fixture f = new Fixture();
        f.product = product(stock, EXPIRY, 43.25, 76.95);
        f.assertOnly(Reason.PRODUCT_UNAVAILABLE);
    }

    @Test
    void nullStockIsUnavailable() {
        Fixture f = new Fixture();
        f.product = product(null, EXPIRY, 43.25, 76.95);
        f.assertOnly(Reason.PRODUCT_UNAVAILABLE);
    }

    @Test
    void expiryMustBeKnownFutureAndBeyondCurrentBusinessDate() {
        Fixture f = new Fixture();
        for (Instant expiry : new Instant[]{null, NOW.minusNanos(1), NOW, NOW.plus(Duration.ofHours(10))}) {
            f.product = product(10, expiry, 43.25, 76.95);
            assertFalse(f.evaluate().eligible());
            assertTrue(f.evaluate().reasons().contains(Reason.PRODUCT_EXPIRED));
        }
        f.product = product(10, Instant.parse("2026-09-30T19:00:00Z"), 43.25, 76.95);
        f.assertAllowed(); // midnight October 1 in Almaty, still September 30 in UTC
    }

    @Test
    void missingPickupIsUnverified() {
        Fixture f = new Fixture();
        f.pickup = null;
        f.assertOnly(Reason.PICKUP_UNVERIFIED);
    }

    @Test
    void pickupVerificationMustBePresentNotFutureAndFresh() {
        Fixture f = new Fixture();
        for (Instant verified : new Instant[]{null, NOW.plusNanos(1), NOW.minus(Duration.ofHours(24)).minusNanos(1)}) {
            f.pickup = new Pickup(NOW, NOW.plus(Duration.ofHours(3)), verified);
            f.assertOnly(Reason.PICKUP_VERIFICATION_STALE);
        }
        f.pickup = new Pickup(NOW, NOW.plus(Duration.ofHours(3)), NOW.minus(Duration.ofHours(24)));
        f.assertAllowed();
    }

    @Test
    void pickupWindowNeedsBothDatesInCorrectOrderAndMustNotBePast() {
        Fixture f = new Fixture();
        for (Pickup invalid : List.of(new Pickup(null, NOW.plusSeconds(3600), NOW),
                new Pickup(NOW, null, NOW), new Pickup(NOW, NOW, NOW),
                new Pickup(NOW.plusSeconds(1), NOW, NOW), new Pickup(NOW.minusSeconds(3600), NOW, NOW))) {
            f.pickup = invalid;
            f.assertOnly(Reason.PICKUP_WINDOW_INVALID);
        }
    }

    @Test
    void datedPickupWindowCannotStartTooFarAheadExceedTwelveHoursOrOutliveProduct() {
        Fixture f = new Fixture();
        for (Pickup invalid : List.of(
                new Pickup(NOW.plus(Duration.ofHours(24)).plusNanos(1), NOW.plus(Duration.ofHours(25)), NOW),
                new Pickup(NOW, NOW.plus(Duration.ofHours(12)).plusNanos(1), NOW),
                new Pickup(EXPIRY.minusSeconds(3600), EXPIRY.plusNanos(1), NOW))) {
            f.pickup = invalid;
            f.assertOnly(Reason.PICKUP_WINDOW_INVALID);
        }
    }

    @Test
    void pickupEndCannotOutliveExpiryEvenWhenOtherWindowBoundsAreValid() {
        Fixture f = new Fixture();
        Instant expiry = Instant.parse("2026-09-30T19:00:00Z");
        f.product = product(10, expiry, 43.25, 76.95);
        f.pickup = new Pickup(expiry.minusSeconds(3600), expiry.plusNanos(1), NOW);
        f.assertOnly(Reason.PICKUP_WINDOW_INVALID);
        f.pickup = new Pickup(expiry.minusSeconds(3600), expiry, NOW);
        f.assertAllowed();
    }

    @Test
    void pickupBoundsAreInclusiveAtMaximumAheadDurationAndExpiry() {
        Config config = Config.defaults();
        assertTrue(validPickupBounds(NOW, NOW.plus(Duration.ofHours(24)), NOW.plus(Duration.ofHours(25)), EXPIRY, config));
        assertTrue(validPickupBounds(NOW, NOW, NOW.plus(Duration.ofHours(12)), EXPIRY, config));
        assertTrue(validPickupBounds(NOW, NOW, NOW.plus(Duration.ofHours(3)), NOW.plus(Duration.ofHours(3)), config));
    }

    @Test
    void pickupRequiresAtLeastThirtyMinutesEvenAtSameLocation() {
        Fixture f = new Fixture();
        f.pickup = new Pickup(NOW, NOW.plus(Duration.ofMinutes(30)).minusNanos(1), NOW);
        f.assertOnly(Reason.PICKUP_TOO_SOON);
        f.pickup = new Pickup(NOW, NOW.plus(Duration.ofMinutes(30)), NOW);
        f.assertAllowed();
    }

    @Test
    void travelBudgetRoundsUpWalkingTimeAtFourKmPerHourAndAddsFifteenMinutes() {
        Fixture f = new Fixture();
        f.product = product(10, EXPIRY, 43.28, 76.95);
        double distance = distanceKm(43.25, 76.95, 43.28, 76.95);
        long minutes = (long) Math.ceil(distance * 60 / 4) + 15;
        assertTrue(minutes > 30);
        f.pickup = new Pickup(NOW, NOW.plus(Duration.ofMinutes(minutes)).minusNanos(1), NOW);
        f.assertOnly(Reason.PICKUP_TOO_SOON);
        f.pickup = new Pickup(NOW, NOW.plus(Duration.ofMinutes(minutes)), NOW);
        f.assertAllowed();
    }

    @Test
    void stricterConfiguredPickupMinimumIsRespected() {
        Fixture f = new Fixture();
        f.config = new Config(Duration.ofHours(24), Duration.ofHours(24), Duration.ofHours(24), Duration.ofMinutes(60), 8);
        f.pickup = new Pickup(NOW, NOW.plus(Duration.ofMinutes(59)), NOW);
        f.assertOnly(Reason.PICKUP_TOO_SOON);
    }

    @Test
    void activeSuppressionBlocksUntilExactExpiration() {
        Fixture f = new Fixture();
        f.frequency(0, null, 0, NOW.plusNanos(1), true);
        f.assertOnly(Reason.SUPPRESSED);
        f.frequency(0, null, 0, NOW, true);
        f.assertAllowed();
        f.frequency(0, null, 0, NOW.minusNanos(1), true);
        f.assertAllowed();
    }

    @ParameterizedTest
    @ValueSource(ints = {10, 11, 100})
    void tenOrMoreUnopenedMessagesBlockDispatch(int unopened) {
        Fixture f = new Fixture();
        f.frequency(0, null, unopened, null, true);
        f.assertOnly(Reason.UNOPENED_LIMIT);
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 3, 100})
    void dailyCapIsAtMostTwoEvenWhenUserPreferenceIsHigher(int preference) {
        Fixture f = new Fixture();
        f.cap = preference;
        f.frequency(1, null, 0, null, true);
        f.assertAllowed();
        f.frequency(2, null, 0, null, true);
        f.assertOnly(Reason.DAILY_CAP);
    }

    @Test
    void userMaySetStricterDailyCapIncludingZero() {
        Fixture f = new Fixture();
        f.cap = 1;
        f.frequency(1, null, 0, null, true);
        f.assertOnly(Reason.DAILY_CAP);
        f.cap = 0;
        f.frequency(0, null, 0, null, true);
        f.assertOnly(Reason.DAILY_CAP);
    }

    @ParameterizedTest
    @ValueSource(ints = {5, 6, 9})
    void fiveThroughNineUnopenedMessagesReduceDailyCapToOne(int unopened) {
        Fixture f = new Fixture();
        f.frequency(0, null, unopened, null, true);
        f.assertAllowed();
        f.frequency(1, null, unopened, null, true);
        f.assertOnly(Reason.DAILY_CAP);
        f.frequency(1, null, 4, null, true);
        f.assertAllowed();
    }

    @Test
    void sendsNeedFourHourGapAndFutureLastSendFailsClosed() {
        Fixture f = new Fixture();
        f.frequency(1, NOW.minus(Duration.ofHours(4)), 0, null, true);
        f.assertAllowed();
        f.frequency(1, NOW.minus(Duration.ofHours(4)).plusNanos(1), 0, null, true);
        f.assertOnly(Reason.MINIMUM_GAP);
        f.frequency(0, NOW.plusSeconds(1), 0, null, true);
        f.assertOnly(Reason.MINIMUM_GAP);
    }

    @Test
    void unknownOrMalformedFrequencyStateFailsClosed() {
        Fixture f = new Fixture();
        f.frequency = null;
        f.assertOnly(Reason.INVALID_FREQUENCY_STATE);
        for (Frequency invalid : List.of(new Frequency(0, null, 0, null, false),
                new Frequency(-1, null, 0, null, true), new Frequency(0, null, null, null, true),
                new Frequency(0, null, -1, null, true))) {
            f.frequency = invalid;
            f.assertOnly(Reason.INVALID_FREQUENCY_STATE);
        }
    }

    @Test
    void priceAndDiscountPreferencesAreRespected() {
        Fixture f = new Fixture();
        f.maxPrice = new BigDecimal("500");
        f.minimumDiscount = 50;
        f.assertAllowed();
        f.maxPrice = new BigDecimal("499.99");
        f.assertOnly(Reason.PRICE_PREFERENCE);
        f.maxPrice = null;
        f.minimumDiscount = 51;
        f.assertOnly(Reason.PRICE_PREFERENCE);
    }

    @Test
    void independentFailureReasonsAreRetainedTogether() {
        Fixture f = new Fixture();
        f.promotions = false;
        f.gps(43.25, 76.95, NOW.minus(Duration.ofDays(2)));
        f.pickup = null;
        f.frequency(2, NOW, 10, NOW.plusSeconds(3600), true);
        Decision decision = f.evaluate();
        assertFalse(decision.eligible());
        assertTrue(decision.reasons().containsAll(List.of(Reason.OPTED_OUT, Reason.GPS_STALE,
                Reason.PICKUP_UNVERIFIED, Reason.SUPPRESSED, Reason.UNOPENED_LIMIT, Reason.DAILY_CAP, Reason.MINIMUM_GAP)));
    }

    @Test
    void unsafeSafetyConfigurationIsRejected() {
        for (Duration invalid : List.of(Duration.ZERO, Duration.ofSeconds(-1))) {
            assertThrows(IllegalArgumentException.class, () -> new Config(invalid, Duration.ofHours(24), Duration.ofHours(24), Duration.ofMinutes(30), 8));
            assertThrows(IllegalArgumentException.class, () -> new Config(Duration.ofHours(24), invalid, Duration.ofHours(24), Duration.ofMinutes(30), 8));
            assertThrows(IllegalArgumentException.class, () -> new Config(Duration.ofHours(24), Duration.ofHours(24), invalid, Duration.ofMinutes(30), 8));
        }
        assertThrows(IllegalArgumentException.class, () -> new Config(Duration.ofHours(24), Duration.ofHours(24), Duration.ofHours(24), Duration.ofMinutes(29), 8));
        for (double invalid : new double[]{0, -1, 8.01, Double.NaN, Double.POSITIVE_INFINITY}) {
            assertThrows(IllegalArgumentException.class, () -> new Config(Duration.ofHours(24), Duration.ofHours(24), Duration.ofHours(24), Duration.ofMinutes(30), invalid));
        }
    }
}
