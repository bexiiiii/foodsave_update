package com.foodsave.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Service
@Slf4j
public class RealtimeEventService {
    private final Map<Long, CopyOnWriteArraySet<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.computeIfAbsent(userId, ignored -> new CopyOnWriteArraySet<>()).add(emitter);
        Runnable cleanup = () -> remove(userId, emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(error -> cleanup.run());
        try {
            emitter.send(SseEmitter.event().name("connected").data(Map.of("connected", true)));
        } catch (IOException error) {
            cleanup.run();
        }
        return emitter;
    }

    public void publish(Long userId, String event, Object data) {
        if (userId == null) return;
        var userEmitters = emitters.get(userId);
        if (userEmitters == null) return;
        for (SseEmitter emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event().name(event).data(data));
            } catch (Exception error) {
                log.debug("Removing disconnected realtime client {}: {}", userId, error.getMessage());
                remove(userId, emitter);
            }
        }
    }

    public void broadcast(String event, Object data) {
        emitters.keySet().forEach(userId -> publish(userId, event, data));
    }

    private void remove(Long userId, SseEmitter emitter) {
        var userEmitters = emitters.get(userId);
        if (userEmitters == null) return;
        userEmitters.remove(emitter);
        if (userEmitters.isEmpty()) emitters.remove(userId);
    }
}
