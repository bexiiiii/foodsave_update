package com.foodsave.backend.dto.communications;

import com.foodsave.backend.domain.enums.NotificationGroupStatus;
import com.foodsave.backend.domain.enums.NotificationTriggerType;
import com.foodsave.backend.domain.enums.NotificationWindowType;
import com.foodsave.backend.entity.NotificationGroup;
import com.foodsave.backend.entity.NotificationGroupItem;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record NotificationGroupResponse(
        Long id,
        NotificationGroupStatus status,
        String notificationType,
        NotificationTriggerType triggerType,
        NotificationWindowType timeWindow,
        Integer totalPartners,
        Integer totalBoxes,
        BigDecimal minimumPrice,
        Integer maximumDiscount,
        String deepLink,
        String campaignId,
        LocalDateTime scheduledAt,
        LocalDateTime sentAt,
        LocalDateTime openedAt,
        List<Item> items
) {
    public static NotificationGroupResponse fromEntity(NotificationGroup group) {
        return new NotificationGroupResponse(
                group.getId(),
                group.getStatus(),
                group.getNotificationType(),
                group.getTriggerType(),
                group.getTimeWindow(),
                group.getTotalPartners(),
                group.getTotalBoxes(),
                group.getMinimumPrice(),
                group.getMaximumDiscount(),
                group.getDeepLink(),
                group.getCampaignId(),
                group.getScheduledAt(),
                group.getSentAt(),
                group.getOpenedAt(),
                group.getItems().stream().map(Item::fromEntity).toList()
        );
    }

    public record Item(
            Long id,
            Long partnerId,
            String partnerName,
            Long branchId,
            String branchName,
            Long boxId,
            String boxName,
            String boxImageUrl,
            Integer availableQuantity,
            BigDecimal price,
            BigDecimal originalPrice,
            Integer discountPercent,
            LocalDateTime pickupEndAt
    ) {
        public static Item fromEntity(NotificationGroupItem item) {
            var box = item.getBox();
            var partner = item.getPartner();
            var branch = item.getBranch();
            return new Item(
                    item.getId(),
                    partner != null ? partner.getId() : null,
                    partner != null ? partner.getName() : null,
                    branch != null ? branch.getId() : null,
                    branch != null ? branch.getName() : null,
                    box != null ? box.getId() : null,
                    box != null ? box.getName() : null,
                    box != null ? box.getFirstImage() : null,
                    item.getAvailableQuantity(),
                    item.getPrice(),
                    item.getOriginalPrice(),
                    item.getDiscountPercent(),
                    item.getPickupEndAt()
            );
        }
    }
}
