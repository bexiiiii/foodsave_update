package com.foodsave.backend.dto;

import com.foodsave.backend.entity.NotificationSettings;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingsDTO {
    private Long id;
    private boolean emailEnabled;
    private boolean pushEnabled;
    private boolean smsEnabled;
    private boolean orderUpdates;
    private boolean promotions;
    private boolean systemUpdates;
    private Long userId;

    public static NotificationSettingsDTO fromEntity(NotificationSettings settings) {
        NotificationSettingsDTO dto = new NotificationSettingsDTO();
        dto.setId(settings.getId());
        dto.setEmailEnabled(settings.isEmailEnabled());
        dto.setPushEnabled(settings.isPushEnabled());
        dto.setSmsEnabled(settings.isSmsEnabled());
        dto.setOrderUpdates(settings.isOrderUpdates());
        dto.setPromotions(settings.isPromotions());
        dto.setSystemUpdates(settings.isSystemUpdates());
        dto.setUserId(settings.getUser().getId());
        return dto;
    }
} 