package com.foodsave.backend.dto.analytics;

public record DecisionHelpResponse(
        boolean showPrompt,
        long recentViews,
        long uniqueBoxes
) {
}
