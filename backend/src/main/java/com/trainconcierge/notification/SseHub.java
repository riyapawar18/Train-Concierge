package com.trainconcierge.notification;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SseHub {

    public static final String EVENT_DISRUPTION = "disruption";
    public static final String EVENT_NOTIFICATION = "notification";
    public static final String EVENT_JOURNEY = "journey";
    public static final String EVENT_SEAT_UPDATE = "seat_update";
    public static final String EVENT_PAYMENT = "payment";
    public static final String EVENT_HOTEL = "hotel";

    private static final Logger log = LoggerFactory.getLogger(SseHub.class);

    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final long timeoutMs;

    public SseHub(ObjectMapper objectMapper,
                  @Value("${app.notifications.stream-timeout-ms:1800000}") long timeoutMs) {
        this.objectMapper = objectMapper;
        this.timeoutMs = timeoutMs;
    }

    public SseEmitter register(Long userId) {
        SseEmitter emitter = new SseEmitter(timeoutMs);
        emitters.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> {
            remove(userId, emitter);
            emitter.complete();
        });
        emitter.onError(error -> remove(userId, emitter));
        log.debug("SSE stream opened for user {} ({} open)", userId, connections(userId));
        return emitter;
    }

    public boolean send(Long userId, String event, Object payload) {
        List<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters == null || userEmitters.isEmpty()) {
            return false;
        }
        String data;
        try {
            data = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            log.warn("Could not serialise the SSE payload for event {}.", event);
            return false;
        }
        boolean delivered = false;
        for (SseEmitter emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event().name(event).data(data));
                delivered = true;
            } catch (IOException | IllegalStateException ex) {
                remove(userId, emitter);
                emitter.complete();
            }
        }
        return delivered;
    }

    @Scheduled(fixedRateString = "${app.notifications.heartbeat-ms:25000}",
            initialDelayString = "${app.notifications.heartbeat-initial-delay-ms:25000}")
    public void heartbeat() {
        for (Map.Entry<Long, CopyOnWriteArrayList<SseEmitter>> entry : emitters.entrySet()) {
            for (SseEmitter emitter : entry.getValue()) {
                try {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                } catch (IOException | IllegalStateException ex) {
                    remove(entry.getKey(), emitter);
                    emitter.complete();
                }
            }
        }
    }

    public int connections(Long userId) {
        List<SseEmitter> userEmitters = emitters.get(userId);
        return userEmitters == null ? 0 : userEmitters.size();
    }

    public int totalConnections() {
        return emitters.values().stream().mapToInt(List::size).sum();
    }

    private void remove(Long userId, SseEmitter emitter) {
        List<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters == null) {
            return;
        }
        userEmitters.remove(emitter);
        if (userEmitters.isEmpty()) {
            emitters.remove(userId, userEmitters);
        }
    }
}
