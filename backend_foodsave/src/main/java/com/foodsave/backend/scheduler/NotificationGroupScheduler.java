package com.foodsave.backend.scheduler;

import com.foodsave.backend.service.NotificationGroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationGroupScheduler {

    private final NotificationGroupService notificationGroupService;

    @Scheduled(fixedDelayString = "${notifications.scheduler.fixed-delay-ms:300000}")
    public void processDueGroups() {
        try {
            notificationGroupService.processDueGroups();
        } catch (Exception e) {
            log.error("Notification group scheduler failed", e);
        }
    }
}
