package com.foodsave.backend.controller;

import com.foodsave.backend.dto.communications.NotificationGroupResponse;
import com.foodsave.backend.service.NotificationGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications/groups")
@RequiredArgsConstructor
public class NotificationGroupController {

    private final NotificationGroupService notificationGroupService;

    @GetMapping("/{id}")
    public ResponseEntity<NotificationGroupResponse> getGroup(@PathVariable Long id) {
        return ResponseEntity.ok(notificationGroupService.getMiniAppGroup(id));
    }

    @PostMapping("/{id}/opened")
    public ResponseEntity<Void> markOpened(@PathVariable Long id) {
        notificationGroupService.markOpened(id);
        return ResponseEntity.accepted().build();
    }
}
