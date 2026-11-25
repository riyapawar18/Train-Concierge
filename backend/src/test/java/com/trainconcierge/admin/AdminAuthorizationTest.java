package com.trainconcierge.admin;

import com.trainconcierge.user.Role;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization matrix for every /api/admin/** endpoint:
 *   - Anonymous          → 401
 *   - Authenticated PASSENGER → 403
 *   - Authenticated ADMIN     → 2xx / 4xx (not 401/403)
 *
 * The tests use the full Spring context so the real security chain is exercised.
 */
@SpringBootTest(properties = {
        "app.demo.password=Str0ng#Pass",
        "spring.datasource.url=jdbc:h2:mem:admin-auth;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER",
        "payment.mode=SIMULATED"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "demo"})
class AdminAuthorizationTest {

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder encoder;

    @Value("${app.jwt.secret:test-jwt-secret-0123456789-abcdefghijklmnop}")
    private String jwtSecret;

    private String adminToken;
    private String passengerToken;

    @BeforeEach
    void setup() {
        User admin = userRepository.findByEmail("admin@trainconcierge.demo")
                .orElseGet(() -> {
                    User u = User.create("Admin", "admin@trainconcierge.demo", null,
                            encoder.encode("Str0ng#Pass"), Role.ADMIN, true);
                    return userRepository.save(u);
                });
        User passenger = userRepository.findByEmail("passenger@trainconcierge.demo")
                .orElseGet(() -> {
                    User u = User.create("Passenger", "passenger@trainconcierge.demo", null,
                            encoder.encode("Str0ng#Pass"), Role.PASSENGER, true);
                    return userRepository.save(u);
                });
        adminToken = buildToken(admin.getId(), Role.ADMIN);
        passengerToken = buildToken(passenger.getId(), Role.PASSENGER);
    }

    private String buildToken(Long userId, Role role) {
        byte[] keyBytes = jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return io.jsonwebtoken.Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role.name())
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(Instant.now().plusSeconds(3600)))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(keyBytes))
                .compact();
    }

    // ── GET /api/admin/stats ──────────────────────────────────────────────────

    @Nested class Stats {
        @Test void anonymous_returns401() throws Exception {
            mvc.perform(get("/api/admin/stats")).andExpect(status().isUnauthorized());
        }

        @Test void passenger_returns403() throws Exception {
            mvc.perform(get("/api/admin/stats")
                    .header("Authorization", "Bearer " + passengerToken))
                    .andExpect(status().isForbidden());
        }

        @Test void admin_returns200() throws Exception {
            mvc.perform(get("/api/admin/stats")
                    .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }
    }

    // ── GET /api/admin/passengers ─────────────────────────────────────────────

    @Nested class Passengers {
        @Test void anonymous_returns401() throws Exception {
            mvc.perform(get("/api/admin/passengers")).andExpect(status().isUnauthorized());
        }

        @Test void passenger_returns403() throws Exception {
            mvc.perform(get("/api/admin/passengers")
                    .header("Authorization", "Bearer " + passengerToken))
                    .andExpect(status().isForbidden());
        }

        @Test void admin_returns200() throws Exception {
            mvc.perform(get("/api/admin/passengers")
                    .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }
    }

    // ── GET /api/admin/settings ───────────────────────────────────────────────

    @Nested class Settings {
        @Test void anonymous_returns401() throws Exception {
            mvc.perform(get("/api/admin/settings")).andExpect(status().isUnauthorized());
        }

        @Test void passenger_returns403() throws Exception {
            mvc.perform(get("/api/admin/settings")
                    .header("Authorization", "Bearer " + passengerToken))
                    .andExpect(status().isForbidden());
        }

        @Test void admin_returns200() throws Exception {
            mvc.perform(get("/api/admin/settings")
                    .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }
    }

    // ── GET /api/admin/users ──────────────────────────────────────────────────

    @Nested class Users {
        @Test void anonymous_returns401() throws Exception {
            mvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
        }

        @Test void passenger_returns403() throws Exception {
            mvc.perform(get("/api/admin/users")
                    .header("Authorization", "Bearer " + passengerToken))
                    .andExpect(status().isForbidden());
        }

        @Test void admin_returns200() throws Exception {
            mvc.perform(get("/api/admin/users")
                    .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }
    }

    // ── Role change guards ────────────────────────────────────────────────────

    @Nested class RoleGuards {
        @Test void cannotDemoteLastAdmin() throws Exception {
            // The admin user IS the last admin in this test context; demoting self is blocked
            mvc.perform(patch("/api/admin/users/" + getAdminId() + "/role")
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType("application/json")
                    .content("{\"role\":\"PASSENGER\"}"))
                    .andExpect(status().isConflict()); // 409 – cannot change own role
        }

        private long getAdminId() {
            return userRepository.findByEmail("admin@trainconcierge.demo")
                    .map(User::getId).orElseThrow();
        }
    }

    // ── GET /api/admin/notifications ─────────────────────────────────────────

    @Nested class Notifications {
        @Test void anonymous_returns401() throws Exception {
            mvc.perform(get("/api/admin/notifications")).andExpect(status().isUnauthorized());
        }

        @Test void passenger_returns403() throws Exception {
            mvc.perform(get("/api/admin/notifications")
                    .header("Authorization", "Bearer " + passengerToken))
                    .andExpect(status().isForbidden());
        }

        @Test void admin_returns200() throws Exception {
            mvc.perform(get("/api/admin/notifications")
                    .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }
    }

    // ── GET /api/profile (passenger endpoint) ─────────────────────────────────

    @Nested class Profile {
        @Test void anonymous_returns401() throws Exception {
            mvc.perform(get("/api/profile")).andExpect(status().isUnauthorized());
        }

        @Test void passenger_returns200() throws Exception {
            mvc.perform(get("/api/profile")
                    .header("Authorization", "Bearer " + passengerToken))
                    .andExpect(status().isOk());
        }

        @Test void admin_returns200() throws Exception {
            mvc.perform(get("/api/profile")
                    .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }
    }
}
