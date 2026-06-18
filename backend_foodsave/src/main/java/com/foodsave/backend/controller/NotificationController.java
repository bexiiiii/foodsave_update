package com.foodsave.backend.controller;

import com.foodsave.backend.domain.enums.Permission;
import com.foodsave.backend.dto.NotificationDTO;
import com.foodsave.backend.dto.NotificationSettingsDTO;
import com.foodsave.backend.dto.TelegramBroadcastRequest;
import com.foodsave.backend.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Notification management APIs")
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    // @RequirePermission(Permission.USER_READ)
    @Operation(summary = "Get all notifications")
    public ResponseEntity<List<NotificationDTO>> getAllNotifications() {
        return ResponseEntity.ok(notificationService.getAllNotifications());
    }

    @GetMapping("/unread-count")
    // @RequirePermission(Permission.USER_READ)
    @Operation(summary = "Get unread notifications count")
    public ResponseEntity<Long> getUnreadCount() {
        return ResponseEntity.ok(notificationService.getUnreadCount());
    }

    @PutMapping("/{id}/read")
    // @RequirePermission(Permission.USER_UPDATE)
    @Operation(summary = "Mark notification as read")
    public ResponseEntity<NotificationDTO> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @PutMapping("/read-all")
    // @RequirePermission(Permission.USER_UPDATE)
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    // @RequirePermission(Permission.USER_DELETE)
    @Operation(summary = "Delete notification")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/bulk-delete")
    // @RequirePermission(Permission.USER_DELETE)
    @Operation(summary = "Delete multiple notifications")
    public ResponseEntity<Void> deleteNotifications(@RequestBody List<Long> ids) {
        notificationService.deleteNotifications(ids);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/settings")
    // @RequirePermission(Permission.USER_READ)
    @Operation(summary = "Get notification settings")
    public ResponseEntity<NotificationSettingsDTO> getNotificationSettings() {
        return ResponseEntity.ok(notificationService.getNotificationSettings());
    }

    @PutMapping("/settings")
    // @RequirePermission(Permission.USER_UPDATE)
    @Operation(summary = "Update notification settings")
    public ResponseEntity<NotificationSettingsDTO> updateNotificationSettings(
            @RequestBody NotificationSettingsDTO settings) {
        return ResponseEntity.ok(notificationService.updateNotificationSettings(settings));
    }

    @PostMapping("/telegram/broadcast")
    @Operation(summary = "Send broadcast notification to Telegram users")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> sendTelegramBroadcast(
            @RequestBody @Valid TelegramBroadcastRequest request) {
        log.info("Telegram broadcast request received: buttonEnabled={}, imageProvided={}, titleLength={}, messageLength={}",
                request.getButtonEnabled(),
                request.getImageUrl() != null && !request.getImageUrl().isBlank(),
                request.getTitle() != null ? request.getTitle().length() : 0,
                request.getMessage() != null ? request.getMessage().length() : 0);

        int recipients = notificationService.sendTelegramBroadcast(request);

        log.info("Telegram broadcast sent to {} recipients", recipients);
        return ResponseEntity.ok(Map.of("recipients", recipients));
    }
}
