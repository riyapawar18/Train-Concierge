package com.trainconcierge.auth;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(10);

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();

    public boolean isBlocked(String email, String ip) {
        String key = key(email, ip);
        Deque<Instant> attempts = failures.get(key);
        if (attempts == null) {
            return false;
        }
        Instant cutoff = Instant.now().minus(WINDOW);
        synchronized (attempts) {
            prune(attempts, cutoff);
            if (attempts.isEmpty()) {
                failures.remove(key, attempts);
                return false;
            }
            return attempts.size() >= MAX_FAILURES;
        }
    }

    public void recordFailure(String email, String ip) {
        String key = key(email, ip);
        Instant cutoff = Instant.now().minus(WINDOW);
        Deque<Instant> attempts = failures.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (attempts) {
            prune(attempts, cutoff);
            attempts.addLast(Instant.now());
        }
    }

    public void reset(String email, String ip) {
        failures.remove(key(email, ip));
    }

    public void clearAll() {
        failures.clear();
    }

    private static void prune(Deque<Instant> attempts, Instant cutoff) {
        while (!attempts.isEmpty() && attempts.peekFirst().isBefore(cutoff)) {
            attempts.removeFirst();
        }
    }

    private static String key(String email, String ip) {
        return (email == null ? "" : email) + "|" + (ip == null || ip.isBlank() ? "unknown" : ip);
    }
}
