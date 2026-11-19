package com.foodsave.backend.dto.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelegramLocation(Double latitude, Double longitude,
        @JsonProperty("horizontal_accuracy") Double accuracy,
        @JsonProperty("live_period") Long livePeriod) {
    public boolean usable() {
        return latitude != null && Double.isFinite(latitude) && Math.abs(latitude) <= 90
                && longitude != null && Double.isFinite(longitude) && Math.abs(longitude) <= 180
                && (accuracy == null || Double.isFinite(accuracy) && accuracy >= 0 && accuracy <= 500);
    }
}
