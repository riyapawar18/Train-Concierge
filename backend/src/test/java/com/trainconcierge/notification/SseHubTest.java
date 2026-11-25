package com.trainconcierge.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SseHubTest {

    private SseHub hub;

    @BeforeEach
    void setUp() {
        hub = new SseHub(new ObjectMapper(), 60_000);
    }

    @Test
    void tracksConnectionsPerUserAndRoutesEventsOnlyToTheOwner() {
        assertThat(hub.send(1L, SseHub.EVENT_NOTIFICATION, Map.of("id", 1))).isFalse();

        hub.register(1L);
        hub.register(1L);
        hub.register(2L);

        assertThat(hub.connections(1L)).isEqualTo(2);
        assertThat(hub.connections(2L)).isEqualTo(1);
        assertThat(hub.totalConnections()).isEqualTo(3);

        assertThat(hub.send(1L, SseHub.EVENT_NOTIFICATION, Map.of("id", 3))).isTrue();
        assertThat(hub.send(2L, SseHub.EVENT_DISRUPTION, Map.of("id", 4))).isTrue();
        assertThat(hub.send(3L, SseHub.EVENT_JOURNEY, Map.of("id", 5))).isFalse();
    }

    @Test
    void removesClosedEmittersWhenTheyCanNoLongerReceive() {
        SseEmitter emitter = hub.register(8L);
        emitter.complete();

        hub.send(8L, SseHub.EVENT_NOTIFICATION, Map.of("id", 9));

        assertThat(hub.connections(8L)).isZero();
        assertThat(hub.totalConnections()).isZero();
    }

    @Test
    void heartbeatKeepsHealthyConnectionsOpen() {
        hub.register(9L);

        hub.heartbeat();

        assertThat(hub.connections(9L)).isEqualTo(1);
    }
}
