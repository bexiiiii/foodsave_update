package com.foodsave.backend.controller;

import com.foodsave.backend.dto.communications.CommunicationsOverviewDTO;
import com.foodsave.backend.dto.communications.NotificationScheduleSettingDTO;
import com.foodsave.backend.service.CommunicationsAnalyticsService;
import com.foodsave.backend.service.NotificationGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/communications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_MANAGER') or hasRole('STORE_OWNER')")
public class CommunicationsAdminController {

    private final CommunicationsAnalyticsService analyticsService;
    private final NotificationGroupService notificationGroupService;

    @GetMapping("/overview")
    public ResponseEntity<CommunicationsOverviewDTO> overview() {
        return ResponseEntity.ok(analyticsService.getOverview());
    }

    @GetMapping("/schedule-settings")
    public ResponseEntity<List<NotificationScheduleSettingDTO>> scheduleSettings() {
        return ResponseEntity.ok(notificationGroupService.getScheduleSettings());
    }

    @PutMapping("/schedule-settings")
    public ResponseEntity<NotificationScheduleSettingDTO> updateScheduleSetting(@RequestBody NotificationScheduleSettingDTO request) {
        return ResponseEntity.ok(notificationGroupService.upsertScheduleSetting(request));
    }

    @GetMapping("/deeplink")
    public ResponseEntity<Map<String, String>> deeplink(@RequestParam String startParam) {
        return ResponseEntity.ok(Map.of("url", notificationGroupService.buildMiniAppDeepLink(startParam)));
    }
}
