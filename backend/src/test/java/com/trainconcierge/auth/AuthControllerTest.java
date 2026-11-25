package com.trainconcierge.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainconcierge.common.audit.AuditLogRepository;
import com.trainconcierge.user.Role;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    private static final String PASSWORD = "Str0ng#Pass";

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
    void registerCreatesPassengerWithBcryptHash() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("Asiya@Example.com", PASSWORD)))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.fullName").value("Asiya Mujawar"))
                .andExpect(jsonPath("$.email").value("asiya@example.com"))
                .andExpect(jsonPath("$.role").value("PASSENGER"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();

        assertThat(result.getResponse().getContentAsString())
                .doesNotContain(PASSWORD)
                .doesNotContain("$2");

        User saved = userRepository.findByEmail("asiya@example.com").orElseThrow();
        assertThat(saved.getRole()).isEqualTo(Role.PASSENGER);
        assertThat(saved.getPasswordHash()).isNotEqualTo(PASSWORD);
        assertThat(saved.getPasswordHash()).startsWith("$2");
        assertThat(passwordEncoder.matches(PASSWORD, saved.getPasswordHash())).isTrue();
    }

    @Test
    void registerRejectsDuplicateEmailIgnoringCase() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("duplicate@example.com", PASSWORD)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("DUPLICATE@example.com", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"))
                .andExpect(jsonPath("$.message").value("An account with this email already exists."))
                .andExpect(jsonPath("$.fieldErrors").isArray());

        assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    void registerRejectsPasswordShorterThanTheMinimum() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("short@example.com", "abc")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("password")))
                .andExpect(jsonPath("$.fieldErrors[*].message",
                        hasItem("Password must be at least 4 characters.")));

        assertThat(userRepository.count()).isZero();
    }

    @Test
    void registerAcceptsAnyPasswordOfTheMinimumLength() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("simple@example.com", "password")))
                .andExpect(status().isCreated());

        assertThat(userRepository.findByEmail("simple@example.com")).isPresent();
    }

    @Test
    void registerIgnoresRoleEscalationField() throws Exception {
        Map<String, Object> body = registerBody("escalate@example.com", PASSWORD);
        body.put("role", "ADMIN");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("PASSENGER"));

        User saved = userRepository.findByEmail("escalate@example.com").orElseThrow();
        assertThat(saved.getRole()).isEqualTo(Role.PASSENGER);
    }

    @Test
    void loginReturnsTokenAndUserSummary() throws Exception {
        register("login@example.com");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("LOGIN@example.com", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresInSeconds").value(3600))
                .andExpect(jsonPath("$.user.id").isNumber())
                .andExpect(jsonPath("$.user.email").value("login@example.com"))
                .andExpect(jsonPath("$.user.role").value("PASSENGER"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andReturn();

        String token = accessToken(result);
        assertThat(token).isNotBlank();

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("login@example.com"))
                .andExpect(jsonPath("$.role").value("PASSENGER"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void loginUsesGenericMessageForWrongPasswordAndUnknownEmail() throws Exception {
        register("generic@example.com");

        MvcResult wrongPassword = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("generic@example.com", "Wr0ng#Pass")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Incorrect email or password."))
                .andReturn();

        MvcResult unknownEmail = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("missing@example.com", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Incorrect email or password."))
                .andReturn();

        assertThat(wrongPassword.getResponse().getContentAsString())
                .doesNotContain(PASSWORD)
                .doesNotContain("$2")
                .doesNotContain("trace");
        assertThat(unknownEmail.getResponse().getContentAsString())
                .doesNotContain("missing@example.com")
                .doesNotContain("$2")
                .doesNotContain("trace");
    }

    @Test
    void meRequiresAuthenticationAndReturnsProfile() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.fieldErrors").isArray());

        Map<String, Object> body = registerBody("profile@example.com", PASSWORD);
        body.put("mobile", "9876543210");
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());

        String token = login("profile@example.com", PASSWORD);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.fullName").value("Asiya Mujawar"))
                .andExpect(jsonPath("$.email").value("profile@example.com"))
                .andExpect(jsonPath("$.role").value("PASSENGER"))
                .andExpect(jsonPath("$.mobile").value("9876543210"))
                .andExpect(jsonPath("$.emailAlerts").value(true))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void sixthFailedLoginInWindowIsThrottled() throws Exception {
        register("throttle@example.com");

        for (int attempt = 1; attempt <= 5; attempt++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson("throttle@example.com", "Wr0ng#Pass")))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("throttle@example.com", "Wr0ng#Pass")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"))
                .andExpect(jsonPath("$.message").value("Too many sign-in attempts. Please try again later."));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("throttle@example.com", PASSWORD)))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void successfulLoginResetsTheFailureCounter() throws Exception {
        register("reset@example.com");

        for (int attempt = 1; attempt <= 4; attempt++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson("reset@example.com", "Wr0ng#Pass")))
                    .andExpect(status().isUnauthorized());
        }

        login("reset@example.com", PASSWORD);

        for (int attempt = 1; attempt <= 4; attempt++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson("reset@example.com", "Wr0ng#Pass")))
                    .andExpect(status().isUnauthorized());
        }

        login("reset@example.com", PASSWORD);
    }

    private void register(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, PASSWORD)))
                .andExpect(status().isCreated());
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        return accessToken(result);
    }

    private String registerJson(String email, String password) throws Exception {
        return objectMapper.writeValueAsString(registerBody(email, password));
    }

    private static Map<String, Object> registerBody(String email, String password) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Asiya Mujawar");
        body.put("email", email);
        body.put("mobile", "9876543210");
        body.put("password", password);
        body.put("confirmPassword", password);
        return body;
    }

    private String loginJson(String email, String password) throws Exception {
        return objectMapper.writeValueAsString(Map.of("email", email, "password", password));
    }

    private String accessToken(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("accessToken").asText();
    }
}
