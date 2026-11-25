package com.trainconcierge.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.icegreen.greenmail.configuration.GreenMailConfiguration;
import com.icegreen.greenmail.util.GreenMail;
import com.icegreen.greenmail.util.ServerSetup;
import com.trainconcierge.catalog.TrainType;
import com.trainconcierge.travel.AvailabilityLevel;
import com.trainconcierge.travel.dto.ClassAvailabilityResponse;
import com.trainconcierge.travel.dto.SegmentFromResponse;
import com.trainconcierge.travel.dto.SegmentToResponse;
import com.trainconcierge.travel.dto.TrainSearchItemResponse;
import com.trainconcierge.user.DemoAdminSeeder;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterAll;
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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.fail;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Proves the whole promise for an account that was not seeded: a brand-new email registers, logs in,
 * books, and the message really leaves the JVM through SMTP and lands in that mailbox. The transport
 * is a local GreenMail server rather than a mock, so {@code SENT} can only be reached once a mail
 * server has accepted the bytes.
 */
@SpringBootTest(properties = {
        "app.demo.password=Str0ng#Pass",
        "spring.datasource.url=jdbc:h2:mem:registered-mail;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER",
        "app.seats.expiry-initial-delay-ms=3600000",
        "app.seats.expiry-check-ms=3600000",
        "app.mail.enabled=true",
        "spring.mail.host=127.0.0.1",
        "spring.mail.username=trainconcierge@localhost",
        "spring.mail.password=mailbox-password",
        "spring.mail.properties.mail.smtp.auth=true",
        "spring.mail.properties.mail.smtp.starttls.enable=false",
        "spring.mail.properties.mail.smtp.starttls.required=false",
        "app.mail.from=trainconcierge@localhost",
        "app.mail.retry-initial-delay-ms=3600000",
        "app.mail.retry-delay-ms=3600000"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "demo"})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class RegisteredUserEmailDeliveryTest {

    private static final String PASSWORD = "Str0ng#Pass";
    private static final String DECOY_CONTACT = "someone-else@example.com";
    private static final AtomicInteger COUNTER = new AtomicInteger();

    private static final GreenMail MAILBOX =
            new GreenMail(new ServerSetup(0, "127.0.0.1", ServerSetup.PROTOCOL_SMTP));

    static {
        MAILBOX.withConfiguration(GreenMailConfiguration.aConfig()
                .withUser("trainconcierge@localhost", "mailbox-password"));
        MAILBOX.start();
    }

    @DynamicPropertySource
    static void smtpPort(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.port", () -> MAILBOX.getSmtp().getPort());
    }

    @AfterAll
    static void stopMailbox() {
        MAILBOX.stop();
    }

    private static String bookedEmail;
    private static String bookedToken;
    private static String bookedPnr;
    private static LocalDate bookedDate;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    private String admin;

    @BeforeEach
    void signInAdmin() throws Exception {
        admin = login(DemoAdminSeeder.ADMIN_EMAIL);
    }

    @Test
    @Order(1)
    void aNewAccountStartsWithTheDocumentedPreferences() throws Exception {
        String email = register("prefs");
        String token = login(email);

        JsonNode me = getJson(token, "/api/auth/me");
        assertThat(me.path("email").asText()).isEqualTo(email);
        assertThat(me.path("role").asText()).isEqualTo("PASSENGER");

        String hash = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM users WHERE email = ?", String.class, email);
        assertThat(hash).doesNotContain(PASSWORD);
        assertThat(hash).startsWith("$2").hasSize(60);

        JsonNode preferences = getJson(token, "/api/settings/preferences");
        assertThat(preferences.path("emailEnabled").asBoolean()).isTrue();
        assertThat(preferences.path("disruptionAlertsEnabled").asBoolean()).isTrue();
        assertThat(preferences.path("seatAlertsEnabled").asBoolean()).isFalse();

        mockMvc.perform(authorized(put("/api/settings/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("emailEnabled", true, "seatAlertsEnabled", true,
                                "disruptionAlertsEnabled", true, "announcementsEnabled", false))),
                        token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seatAlertsEnabled").value(true));
        assertThat(getJson(token, "/api/settings/preferences").path("seatAlertsEnabled").asBoolean())
                .isTrue();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("fullName", "Duplicate Person", "email", email,
                                "password", PASSWORD, "confirmPassword", PASSWORD))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString(
                        "already exists")));
    }

    @Test
    @Order(2)
    void bookingEmailsTheRegisteredAddressNotTheContactAddress() throws Exception {
        bookedEmail = register("mail-booking");
        bookedToken = login(bookedEmail);
        bookedDate = LocalDate.now().plusDays(2);

        List<Long> holdIds = holdSeats(bookedToken, "11007", bookedDate, "3A", 2);
        MvcResult created = mockMvc.perform(authorized(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("11007", bookedDate, holdIds)), bookedToken))
                .andExpect(status().isCreated())
                .andReturn();
        bookedPnr = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("pnr").asText();

        MimeMessage message = awaitMail(bookedEmail);
        assertThat(message.getAllRecipients()).hasSize(1);
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo(bookedEmail);
        assertThat(message.getSubject()).isEqualTo("Booking confirmed: " + bookedPnr);
        assertThat(((InternetAddress) message.getFrom()[0]).getAddress())
                .isEqualTo("trainconcierge@localhost");
        String html = SmtpTestSupport.part(message, "text/html");
        assertThat(html).contains("Booking details", bookedPnr, "http://localhost:5173/app/journeys");
        assertThat(SmtpTestSupport.part(message, "text/plain"))
                .contains("PNR:", bookedPnr, "View journey");
        assertThat(html).doesNotContain(DECOY_CONTACT);

        Long userId = userId(bookedEmail);
        assertThat(awaitStatus(userId, "EMAIL", "BOOKING_CONFIRMED")).isEqualTo("SENT");
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                SELECT delivery_status, attempts, delivery_error FROM notifications
                WHERE user_id = ? AND channel = 'EMAIL' AND type = 'BOOKING_CONFIRMED'
                """, userId);
        assertThat(row.get("delivery_status")).isEqualTo("SENT");
        assertThat(String.valueOf(row.get("attempts"))).isEqualTo("1");
        assertThat(row.get("delivery_error")).isNull();
    }

    @Test
    @Order(3)
    void disruptionEmailsTheSameAccountWithoutAnyRefresh() throws Exception {
        assertThat(bookedEmail).as("depends on the booking test running first").isNotNull();

        mockMvc.perform(authorized(post("/api/admin/disruptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(disruptionBody("11007", bookedDate, 195,
                                "Signal failure near Lonavala"))), admin))
                .andExpect(status().isCreated());

        MimeMessage message = awaitMail(bookedEmail, "Train 11007 is delayed");
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo(bookedEmail);
        assertThat(SmtpTestSupport.part(message, "text/html"))
                .contains("Journey update", "11007", "Signal failure");
        assertThat(awaitStatus(userId(bookedEmail), "EMAIL", "DISRUPTION")).isEqualTo("SENT");
    }

    @Test
    @Order(4)
    void seatAlertsAreMailedOnlyAfterThePassengerOptsIn() throws Exception {
        String email = register("seat-alerts");
        String token = login(email);
        User user = userRepository.findByEmail(email).orElseThrow();
        TrainSearchItemResponse result = lowSeatTrain();
        ClassAvailabilityResponse seatClass = result.classes().get(0);
        LocalDate date = LocalDate.now().plusDays(5);

        assertThat(notificationService.notifySeatAlert(user, result, seatClass, date)).isFalse();
        assertThat(count(email, "EMAIL")).isZero();
        assertThat(receivedFor(email)).isZero();

        mockMvc.perform(authorized(put("/api/settings/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("emailEnabled", true, "seatAlertsEnabled", true,
                                "disruptionAlertsEnabled", true, "announcementsEnabled", true))),
                        token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seatAlertsEnabled").value(true));

        assertThat(notificationService.notifySeatAlert(user, result, seatClass, date)).isTrue();
        MimeMessage message = awaitMail(email, "Only 3 seats left");
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo(email);
        assertThat(SmtpTestSupport.part(message, "text/html")).contains("3A", "11007");
        assertThat(awaitStatus(user.getId(), "EMAIL", "SEAT_ALERT")).isEqualTo("SENT");
    }

    @Test
    @Order(5)
    void turningEmailOffStopsTheMessageWithoutLosingTheNotification() throws Exception {
        String email = register("email-off");
        String token = login(email);

        mockMvc.perform(authorized(put("/api/settings/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("emailEnabled", false, "seatAlertsEnabled", false,
                                "disruptionAlertsEnabled", true, "announcementsEnabled", false))),
                        token))
                .andExpect(status().isOk());

        List<Long> holdIds = holdSeats(token, "11007", LocalDate.now().plusDays(3), "3A", 1);
        mockMvc.perform(authorized(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("11007", LocalDate.now().plusDays(3), holdIds)), token))
                .andExpect(status().isCreated());

        assertThat(count(email, "EMAIL")).isZero();
        assertThat(count(email, "IN_APP")).isEqualTo(1);
    }

    @Test
    @Order(6)
    void aRegisteredUserSeesOnlyTheirOwnData() throws Exception {
        assertThat(bookedEmail).isNotNull();
        String other = register("outsider");
        String otherToken = login(other);

        JsonNode journeys = getJson(otherToken, "/api/journeys");
        assertThat(journeys.path("totalItems").asInt()).isZero();
        assertThat(getJson(otherToken, "/api/notifications?filter=ALL").path("total").asInt())
                .isZero();

        Long bookedId = userId(bookedEmail);
        long foreignNotification = jdbcTemplate.queryForObject("""
                SELECT id FROM notifications WHERE user_id = ? AND channel = 'IN_APP'
                ORDER BY id LIMIT 1
                """, Long.class, bookedId);
        mockMvc.perform(authorized(patch("/api/notifications/" + foreignNotification + "/read"),
                        otherToken))
                .andExpect(status().isNotFound());

        JsonNode mine = getJson(bookedToken, "/api/journeys");
        assertThat(mine.path("items").get(0).path("pnr").asText()).isEqualTo(bookedPnr);
        assertThat(mine.path("totalItems").asInt()).isEqualTo(1);
    }

    // ------------------------------------------------------------------ helpers

    private String register(String prefix) {
        String email = prefix + COUNTER.incrementAndGet() + "@example.com";
        try {
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("fullName", "New Traveller", "email", email,
                                    "password", PASSWORD, "confirmPassword", PASSWORD))))
                    .andExpect(status().isCreated());
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
        return email;
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

    private List<Long> holdSeats(String token, String trainNumber, LocalDate date, String classCode,
                                 int count) throws Exception {
        JsonNode coaches = getJson(token, "/api/trains/" + trainNumber + "/coaches?date=" + date
                + "&class=" + classCode);
        List<Long> held = new ArrayList<>();
        for (JsonNode coach : coaches.path("coaches")) {
            long coachId = coach.path("id").asLong();
            JsonNode seats = getJson(token, "/api/trains/" + trainNumber + "/seats?date=" + date
                    + "&class=" + classCode + "&coach=" + coachId);
            for (JsonNode seat : seats.path("seats")) {
                if (held.size() == count) {
                    return held;
                }
                if (seat.path("status").asText().equals("AVAILABLE")) {
                    MvcResult response = mockMvc.perform(authorized(post("/api/seat-holds")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(json(Map.of("trainNumber", trainNumber, "date",
                                            date.toString(), "coachId", coachId, "seatNo",
                                            seat.path("seatNo").asInt()))), token))
                            .andExpect(status().isCreated())
                            .andReturn();
                    held.add(objectMapper.readTree(response.getResponse().getContentAsString())
                            .path("id").asLong());
                }
            }
        }
        assertThat(held).hasSize(count);
        return held;
    }

    private String bookingJson(String trainNumber, LocalDate date, List<Long> holdIds)
            throws Exception {
        List<Map<String, Object>> people = new ArrayList<>();
        for (int index = 0; index < holdIds.size(); index++) {
            people.add(Map.of("name", "Traveller " + (index + 1), "age", 34, "gender", "FEMALE"));
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("trainNumber", trainNumber);
        body.put("date", date.toString());
        body.put("from", "PUNE");
        body.put("to", "CSMT");
        body.put("classCode", "3A");
        body.put("quota", "GENERAL");
        body.put("passengers", people);
        body.put("holdIds", holdIds);
        body.put("contactEmail", DECOY_CONTACT);
        body.put("contactMobile", "+91 90000 00000");
        return json(body);
    }

    private static TrainSearchItemResponse lowSeatTrain() {
        ClassAvailabilityResponse seatClass = new ClassAvailabilityResponse("3A", "AC 3 Tier",
                BigDecimal.valueOf(1210), BigDecimal.valueOf(1000), 3, 64, "FEW TICKETS",
                AvailabilityLevel.LOW);
        return new TrainSearchItemResponse("11007", "Pune Express", TrainType.SUPERFAST,
                new SegmentFromResponse("PUNE", "Pune Junction", "19:15", 0),
                new SegmentToResponse("CSMT", "Mumbai Cst", "03:35", 1), 500, 140,
                List.of("MON", "TUE"), List.of(seatClass));
    }

    private Map<String, Object> disruptionBody(String trainNumber, LocalDate date, int delay,
                                               String reason) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("trainNumber", trainNumber);
        body.put("travelDate", date.toString());
        body.put("type", "DELAY");
        body.put("delayMinutes", delay);
        body.put("reason", reason);
        body.put("severity", "HIGH");
        return body;
    }

    private MimeMessage awaitMail(String recipient) {
        return awaitMail(recipient, null);
    }

    private int receivedFor(String recipient) throws Exception {
        int found = 0;
        for (MimeMessage message : MAILBOX.getReceivedMessages()) {
            if (recipient.equalsIgnoreCase(String.valueOf(message.getAllRecipients()[0]))) {
                found++;
            }
        }
        return found;
    }

    private MimeMessage awaitMail(String recipient, String subjectContains) {
        long deadline = System.currentTimeMillis() + 20_000;
        while (System.currentTimeMillis() < deadline) {
            for (MimeMessage message : MAILBOX.getReceivedMessages()) {
                if (matches(recipient, subjectContains, message)) {
                    return message;
                }
            }
            try {
                Thread.sleep(50);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        fail("No email for " + recipient + " reached the SMTP mailbox"
                + (subjectContains == null ? "" : " with subject containing " + subjectContains));
        return null;
    }

    private static boolean matches(String recipient, String subjectContains,
                                   MimeMessage message) {
        try {
            if (!recipient.equalsIgnoreCase(String.valueOf(message.getAllRecipients()[0]))) {
                return false;
            }
            return subjectContains == null || message.getSubject().contains(subjectContains);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private String awaitStatus(Long userId, String channel, String type) {
        long deadline = System.currentTimeMillis() + 20_000;
        String status = null;
        while (System.currentTimeMillis() < deadline) {
            List<String> values = jdbcTemplate.queryForList("""
                    SELECT delivery_status FROM notifications
                    WHERE user_id = ? AND channel = ? AND type = ?
                    """, String.class, userId, channel, type);
            status = values.isEmpty() ? null : values.get(0);
            if ("SENT".equals(status) || "FAILED".equals(status)) {
                return status;
            }
            try {
                Thread.sleep(50);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        fail("Notification " + channel + "/" + type + " never settled, last status " + status);
        return status;
    }

    private int count(String email, String channel) {
        Integer value = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM notifications n
                JOIN users u ON u.id = n.user_id
                WHERE u.email = ? AND n.channel = ?
                """, Integer.class, email, channel);
        return value == null ? 0 : value;
    }

    private Long userId(String email) {
        Long id = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class,
                email);
        assertThat(id).isNotNull();
        return id;
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
