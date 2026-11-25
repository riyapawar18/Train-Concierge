package com.trainconcierge.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainconcierge.user.DemoAdminSeeder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.demo.password=Str0ng#Pass",
        "spring.datasource.url=jdbc:h2:mem:notification-api;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER",
        "app.seats.expiry-initial-delay-ms=3600000",
        "app.seats.expiry-check-ms=3600000",
        "app.mail.enabled=false",
        "app.mail.retry-initial-delay-ms=3600000",
        "app.mail.retry-delay-ms=3600000"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "demo"})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class NotificationApiTest {

    private static final String PASSWORD = "Str0ng#Pass";
    private static final String ASHA = "asha.kulkarni@trainconcierge.demo";
    private static final String ROHAN = "rohan.deshmukh@trainconcierge.demo";

    private static long disruptionId;
    private static long secondDisruptionId;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private MailService mailService;

    private String admin;
    private String asha;
    private String rohan;

    @BeforeEach
    void signIn() throws Exception {
        admin = login(DemoAdminSeeder.ADMIN_EMAIL);
        asha = login(ASHA);
        rohan = login(ROHAN);
    }

    @Test
    @Order(1)
    void aDisruptionNotifiesAffectedPassengersInAppAndByEmail() throws Exception {
        LocalDate date = LocalDate.now().plusDays(2);
        JsonNode created = postJson(admin, "/api/admin/disruptions",
                body("11007", date, "DELAY", 195, "Signal failure near Lonavala", "HIGH"), 201);
        disruptionId = created.path("id").asLong();

        JsonNode page = getJson(asha, "/api/notifications?page=0&size=20");
        assertThat(page.path("total").asInt()).isEqualTo(1);
        JsonNode notification = page.path("items").get(0);
        assertThat(notification.path("type").asText()).isEqualTo("DISRUPTION");
        assertThat(notification.path("title").asText())
                .contains("11007").contains("delayed");
        assertThat(notification.path("body").asText()).contains("delayed");
        assertThat(notification.path("linkPath").asText()).startsWith("/app/recovery?journey=");
        assertThat(notification.path("read").asBoolean()).isFalse();
        assertThat(notification.path("createdAt").asText()).isNotBlank();
        assertThat(getJson(asha, "/api/notifications/unread-count").path("count").asInt())
                .isEqualTo(1);

        assertThat(getJson(asha, "/api/notifications?filter=UNREAD").path("total").asInt())
                .isEqualTo(1);
        assertThat(getJson(asha, "/api/notifications?filter=DISRUPTIONS").path("total").asInt())
                .isEqualTo(1);
        assertThat(getJson(asha, "/api/notifications?filter=SEATS").path("total").asInt())
                .isZero();
        assertThat(getJson(asha, "/api/notifications?filter=BOOKINGS").path("total").asInt())
                .isZero();

        assertThat(getJson(rohan, "/api/notifications?filter=ALL").path("total").asInt()).isZero();
        assertThat(getJson(rohan, "/api/notifications/unread-count").path("count").asInt())
                .isZero();

        Long ashaId = userId(ASHA);
        assertThat(inAppCount(ashaId)).isEqualTo(1);
        assertThat(emailCount(ashaId)).isEqualTo(1);

        Long emailId = jdbcTemplate.queryForObject("""
                SELECT id FROM notifications
                WHERE user_id = ? AND channel = 'EMAIL'
                ORDER BY id DESC LIMIT 1
                """, Long.class, ashaId);
        assertThat(emailId).isNotNull();
        mailService.deliver(emailId);
        Map<String, Object> emailRow = jdbcTemplate.queryForMap("""
                SELECT delivery_status, delivery_error, title FROM notifications WHERE id = ?
                """, emailId);
        assertThat(emailRow.get("delivery_status")).isEqualTo("FAILED");
        assertThat(emailRow.get("delivery_error")).isEqualTo(MailService.NOT_CONFIGURED_MESSAGE);
        assertThat(emailRow.get("title")).isEqualTo(notification.path("title").asText());
    }

    @Test
    @Order(2)
    void notificationsSupportFiltersReadStateAndOwnership() throws Exception {
        JsonNode page = getJson(asha, "/api/notifications?filter=ALL");
        long notificationId = page.path("items").get(0).path("id").asLong();

        mockMvc.perform(authorized(patch("/api/notifications/" + notificationId + "/read"), asha))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));
        assertThat(getJson(asha, "/api/notifications/unread-count").path("count").asInt())
                .isZero();

        mockMvc.perform(authorized(patch("/api/admin/disruptions/" + disruptionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("delayMinutes", 200,
                                "reason", "Signal failure, revised estimate"))), admin))
                .andExpect(status().isOk());

        JsonNode afterUpdate = getJson(asha, "/api/notifications?filter=DISRUPTIONS");
        assertThat(afterUpdate.path("total").asInt()).isEqualTo(2);
        long updateNotificationId = afterUpdate.path("items").get(0).path("id").asLong();
        assertThat(afterUpdate.path("items").get(0).path("type").asText())
                .isEqualTo("DISRUPTION_UPDATED");
        assertThat(getJson(asha, "/api/notifications/unread-count").path("count").asInt())
                .isEqualTo(1);

        mockMvc.perform(authorized(patch("/api/notifications/" + updateNotificationId + "/read"),
                        rohan))
                .andExpect(status().isNotFound());

        mockMvc.perform(authorized(post("/api/notifications/read-all"), asha))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updated").value(1));
        assertThat(getJson(asha, "/api/notifications/unread-count").path("count").asInt())
                .isZero();
        assertThat(getJson(asha, "/api/notifications?filter=UNREAD").path("total").asInt())
                .isZero();
        assertThat(getJson(asha, "/api/notifications?filter=DISRUPTIONS").path("total").asInt())
                .isEqualTo(2);
    }

    @Test
    @Order(3)
    void preferencesGateDisruptionNotificationsUntilTheyAreEnabledAgain() throws Exception {
        mockMvc.perform(authorized(put("/api/settings/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(preferences(false, true, false, false))), asha))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailEnabled").value(false))
                .andExpect(jsonPath("$.disruptionAlertsEnabled").value(false));
        assertThat(getJson(asha, "/api/settings/preferences")
                .path("disruptionAlertsEnabled").asBoolean()).isFalse();

        Long ashaId = userId(ASHA);
        int inAppBefore = inAppCount(ashaId);
        int emailBefore = emailCount(ashaId);

        mockMvc.perform(authorized(patch("/api/admin/disruptions/" + disruptionId + "/resolve"),
                        admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        assertThat(inAppCount(ashaId)).isEqualTo(inAppBefore);
        assertThat(emailCount(ashaId)).isEqualTo(emailBefore);

        mockMvc.perform(authorized(put("/api/settings/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(preferences(true, true, true, true))), asha))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailEnabled").value(true));

        LocalDate date = LocalDate.now().plusDays(2);
        JsonNode recreated = postJson(admin, "/api/admin/disruptions",
                body("11007", date, "DELAY", 120, "Track maintenance", "MEDIUM"), 201);
        secondDisruptionId = recreated.path("id").asLong();

        assertThat(inAppCount(ashaId)).isEqualTo(inAppBefore + 1);
        assertThat(emailCount(ashaId)).isEqualTo(emailBefore + 1);
        assertThat(getJson(asha, "/api/notifications/unread-count").path("count").asInt())
                .isEqualTo(1);
    }

    @Test
    @Order(4)
    void resolvedUpdatesLinkToTheJourneyAndInvalidInputIsRejected() throws Exception {
        mockMvc.perform(authorized(patch("/api/admin/disruptions/" + secondDisruptionId + "/resolve"),
                        admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        JsonNode page = getJson(asha, "/api/notifications?filter=ALL");
        JsonNode resolved = page.path("items").get(0);
        assertThat(resolved.path("type").asText()).isEqualTo("DISRUPTION_RESOLVED");
        assertThat(resolved.path("title").asText()).contains("running to schedule");
        assertThat(resolved.path("linkPath").asText()).matches("/app/journeys/\\d+");

        mockMvc.perform(authorized(get("/api/notifications?filter=BOGUS"), asha))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("filter"));

        mockMvc.perform(authorized(put("/api/settings/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("emailEnabled", true, "seatAlertsEnabled", true,
                                "disruptionAlertsEnabled", true))), asha))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/notifications/unread-count"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/settings/preferences")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/stream")).andExpect(status().isUnauthorized());

        Long ashaId = userId(ASHA);
        assertThat(getJson(asha, "/api/notifications/unread-count").path("count").asInt())
                .isEqualTo(jdbcTemplate.queryForObject("""
                        SELECT COUNT(*) FROM notifications
                        WHERE user_id = ? AND channel = 'IN_APP' AND read_at IS NULL
                        """, Integer.class, ashaId));
    }

    private int inAppCount(Long userId) {
        return count(userId, "IN_APP");
    }

    private int emailCount(Long userId) {
        return count(userId, "EMAIL");
    }

    private int count(Long userId, String channel) {
        Integer value = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM notifications WHERE user_id = ? AND channel = ?
                """, Integer.class, userId, channel);
        return value == null ? 0 : value;
    }

    private Long userId(String email) {
        Long id = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = ?", Long.class, email);
        assertThat(id).isNotNull();
        return id;
    }

    private Map<String, Object> preferences(boolean email, boolean seats, boolean disruptions,
                                            boolean announcements) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("emailEnabled", email);
        body.put("seatAlertsEnabled", seats);
        body.put("disruptionAlertsEnabled", disruptions);
        body.put("announcementsEnabled", announcements);
        return body;
    }

    private Map<String, Object> body(String trainNumber, LocalDate date, String type,
                                     Integer delayMinutes, String reason, String severity) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("trainNumber", trainNumber);
        body.put("travelDate", date.toString());
        body.put("type", type);
        body.put("delayMinutes", delayMinutes);
        body.put("reason", reason);
        body.put("severity", severity);
        return body;
    }

    private String login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("accessToken").asText();
    }

    private JsonNode postJson(String token, String url, Object body, int expectedStatus)
            throws Exception {
        MvcResult result = mockMvc.perform(authorized(post(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)), token))
                .andExpect(status().is(expectedStatus))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode getJson(String token, String url) throws Exception {
        MvcResult result = mockMvc.perform(authorized(get(url), token))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private MockHttpServletRequestBuilder authorized(MockHttpServletRequestBuilder builder,
                                                     String token) {
        return builder.header("Authorization", "Bearer " + token);
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}
