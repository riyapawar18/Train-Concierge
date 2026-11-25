package com.trainconcierge.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainconcierge.common.audit.AuditLogRepository;
import com.trainconcierge.user.Role;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(SecurityRulesTest.AdminStubConfig.class)
class SecurityRulesTest {

    private static final String PASSWORD = "Str0ng#Pass";
    private static final String SECRET = "test-jwt-secret-0123456789-abcdefghijklmnop";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private RevokedTokenRepository revokedTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LoginAttemptService loginAttemptService;

    @BeforeEach
    void cleanDatabase() {
        revokedTokenRepository.deleteAll();
        auditLogRepository.deleteAll();
        userRepository.deleteAll();
        loginAttemptService.clearAll();
    }

    @Test
    void healthEndpointStaysPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void missingTokenReturnsJson401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Authentication required"))
                .andExpect(jsonPath("$.fieldErrors").isArray())
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void malformedAndTamperedTokensReturn401() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer not-a-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));

        String token = registerAndLogin("tamper@example.com");

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + tamperedSignature(token)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }

    @Test
    void expiredTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + expiredToken()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }

    @Test
    void passengerGets403OnAdminRoutes() throws Exception {
        String token = registerAndLogin("passenger@example.com");

        mockMvc.perform(get("/api/admin/stub")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void adminGets200OnAdminRoutes() throws Exception {
        User admin = User.create("Test Administrator", "admin@example.com", null,
                passwordEncoder.encode(PASSWORD), Role.ADMIN, true);
        userRepository.saveAndFlush(admin);

        String token = login("admin@example.com");

        mockMvc.perform(get("/api/admin/stub")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OK"));
    }

    @Test
    void logoutRevokesTheToken() throws Exception {
        String token = registerAndLogin("logout@example.com");

        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }

    private String registerAndLogin(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email)))
                .andExpect(status().isCreated());
        return login(email);
    }

    private String login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("accessToken").asText();
    }

    private String registerJson(String email) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Test Passenger");
        body.put("email", email);
        body.put("password", PASSWORD);
        body.put("confirmPassword", PASSWORD);
        return objectMapper.writeValueAsString(body);
    }

    private static String tamperedSignature(String token) {
        int signatureStart = token.lastIndexOf('.') + 1;
        char original = token.charAt(signatureStart);
        char replacement = original == 'A' ? 'B' : 'A';
        return token.substring(0, signatureStart) + replacement + token.substring(signatureStart + 1);
    }

    private static String expiredToken() {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject("999")
                .claim("role", Role.PASSENGER.name())
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now.minusSeconds(7200)))
                .expiration(Date.from(now.minusSeconds(3600)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class AdminStubConfig {

        @Bean
        AdminStubController adminStubController() {
            return new AdminStubController();
        }
    }

    @RestController
    static class AdminStubController {

        @GetMapping("/api/admin/stub")
        Map<String, String> stub() {
            return Map.of("status", "OK");
        }
    }
}
