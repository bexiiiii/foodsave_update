package com.foodsave.backend.controller;

import com.foodsave.backend.dto.communications.CommunicationsOverviewDTO;
import com.foodsave.backend.dto.communications.CommunicationsAnalyticsRangeDTO;
import com.foodsave.backend.dto.communications.NotificationScheduleSettingDTO;
import com.foodsave.backend.service.CommunicationsAnalyticsService;
import com.foodsave.backend.service.NotificationGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/communications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class CommunicationsAdminController {

    private final CommunicationsAnalyticsService analyticsService;
    private final NotificationGroupService notificationGroupService;

    @GetMapping("/overview")
    public ResponseEntity<CommunicationsOverviewDTO> overview() {
        return ResponseEntity.ok(analyticsService.getOverview());
    }

    @GetMapping("/analytics")
    public ResponseEntity<CommunicationsAnalyticsRangeDTO> analytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "day") String groupBy) {
        if (toDate.isBefore(fromDate) || fromDate.plusDays(366).isBefore(toDate)
                || !("day".equals(groupBy) || "month".equals(groupBy))) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid analytics range or grouping");
        }
        return ResponseEntity.ok(analyticsService.getRangeAnalytics(fromDate, toDate, groupBy));
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
