package com.foodsave.backend.controller;

import com.foodsave.backend.security.SecurityUtils;
import com.foodsave.backend.service.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/realtime")
@RequiredArgsConstructor
public class RealtimeController {
    private final RealtimeEventService realtime;
    private final SecurityUtils security;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return realtime.subscribe(security.getCurrentUser().getId());
    }
}
