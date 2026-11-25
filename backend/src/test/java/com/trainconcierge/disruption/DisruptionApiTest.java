package com.trainconcierge.disruption;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainconcierge.booking.DemoJourneySeeder;
import com.trainconcierge.disruption.dto.DisruptionDetailResponse;
import com.trainconcierge.disruption.dto.DisruptionRequest;
import com.trainconcierge.user.DemoAdminSeeder;
import com.trainconcierge.user.UserRepository;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.demo.password=Str0ng#Pass",
        "spring.datasource.url=jdbc:h2:mem:disruption-api;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER",
        "app.seats.expiry-initial-delay-ms=3600000",
        "app.seats.expiry-check-ms=3600000"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "demo"})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class DisruptionApiTest {

    private static final String PASSWORD = "Str0ng#Pass";
    private static final String ASHA = "asha.kulkarni@trainconcierge.demo";
    private static final String FATIMA = "fatima.sheikh@trainconcierge.demo";
    private static final String ROHAN = "rohan.deshmukh@trainconcierge.demo";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JourneyImpactRepository impactRepository;

    @Autowired
    private DisruptionService disruptionService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private String admin;
    private String asha;
    private String fatima;
    private String rohan;

    @BeforeEach
    void signIn() throws Exception {
        admin = login(DemoAdminSeeder.ADMIN_EMAIL);
        asha = login(ASHA);
        fatima = login(FATIMA);
        rohan = login(ROHAN);
    }

    @Test
    @Order(1)
    void aDelayImpactsExactBookingsAndResolvesCleanly() throws Exception {
        LocalDate date = LocalDate.now().plusDays(2);
        long ashaJourney = journeyId(ASHA, "Mumbai weekend with Neha");
        long fatimaJourney = journeyId(FATIMA, "Family visit to Mumbai");
        long rohanJourney = journeyId(ROHAN, "Deccan Queen to Mumbai");

        JsonNode preview = postJson(admin, "/api/admin/disruptions/preview", body(
                "11007", date, "DELAY", 195, "Signal failure near Lonavala", "HIGH"), 200);
        assertThat(preview.path("affectedPassengers").asInt()).isEqualTo(4);
        assertThat(preview.path("confirmedBookings").asInt()).isEqualTo(2);
        assertThat(preview.path("message").asText()).contains("4");

        JsonNode created = postJson(admin, "/api/admin/disruptions", body(
                "11007", date, "DELAY", 195, "Signal failure near Lonavala", "HIGH"), 201);
        long disruptionId = created.path("id").asLong();

        mockMvc.perform(authorized(post("/api/admin/disruptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body("11007", date, "DELAY", 60, "Duplicate", "LOW"))), admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DISRUPTION_ALREADY_ACTIVE"));

        JsonNode detail = getJson(admin, "/api/admin/disruptions/" + disruptionId);
        assertThat(detail.path("status").asText()).isEqualTo("ACTIVE");
        assertThat(detail.path("affectedBookings").asInt()).isEqualTo(2);
        assertThat(detail.path("affectedPassengers").asInt()).isEqualTo(4);
        assertThat(detail.path("impacts")).hasSize(2);
        for (JsonNode impact : detail.path("impacts")) {
            assertThat(impact.path("delayMinutes").asInt()).isEqualTo(195);
            assertThat(impact.path("impactLevel").asText()).isEqualTo("MODERATE");
            assertThat(impact.path("overnight").asBoolean()).isTrue();
            assertThat(impact.path("needsHotel").asBoolean()).isTrue();
            assertThat(impact.path("summary").asText()).contains("delayed");
            assertThat(impact.path("recommendationCount").asInt()).isGreaterThanOrEqualTo(1);
        }

        assertThat(getJson(asha, "/api/journeys/" + ashaJourney)
                .path("status").asText()).isEqualTo("DISRUPTED");
        assertThat(getJson(asha, "/api/journeys/" + ashaJourney)
                .path("disruption").path("id").asLong()).isEqualTo(disruptionId);
        assertThat(getJson(fatima, "/api/journeys/" + fatimaJourney)
                .path("status").asText()).isEqualTo("DISRUPTED");
        JsonNode rohanDetail = getJson(rohan, "/api/journeys/" + rohanJourney);
        assertThat(rohanDetail.path("status").asText()).isEqualTo("UPCOMING");
        assertThat(rohanDetail.path("disruption").isNull()).isTrue();

        JsonNode trainStatus = getJson(asha, "/api/trains/11007/status?date=" + date);
        assertThat(trainStatus.path("status").asText()).isEqualTo("DELAYED");
        assertThat(trainStatus.path("delayMinutes").asInt()).isEqualTo(195);
        assertThat(trainStatus.path("disruptionHref").asText())
                .isEqualTo("/app/disruptions/" + disruptionId);

        JsonNode mine = getJson(asha, "/api/disruptions/mine?status=ACTIVE");
        assertThat(ids(mine)).contains(disruptionId);
        JsonNode passengerDetail = getJson(asha, "/api/disruptions/" + disruptionId);
        assertThat(passengerDetail.path("status").asText()).isEqualTo("ACTIVE");
        assertThat(passengerDetail.path("impacts")).hasSize(1);
        assertThat(passengerDetail.path("impacts").get(0).path("journeyId").asLong())
                .isEqualTo(ashaJourney);
        mockMvc.perform(authorized(get("/api/disruptions/" + disruptionId), fatima))
                .andExpect(status().isOk());
        mockMvc.perform(authorized(get("/api/disruptions/" + disruptionId), rohan))
                .andExpect(status().isNotFound());

        JsonNode impact = getJson(asha, "/api/journeys/" + ashaJourney + "/impact");
        assertThat(impact.path("delayMinutes").asInt()).isEqualTo(195);
        assertThat(impact.path("needsHotel").asBoolean()).isTrue();
        assertThat(impact.path("newArrival").asText()).endsWith("23:00:00");
        assertThat(impact.path("refundNote").isNull()).isTrue();

        JsonNode recommendations = getJson(asha,
                "/api/journeys/" + ashaJourney + "/recommendations");
        assertThat(recommendations.size()).isGreaterThanOrEqualTo(3);
        assertThat(kinds(recommendations)).contains("TRAIN", "BUS");
        assertThat(countKind(recommendations, "TRAIN")).isGreaterThanOrEqualTo(2);
        assertThat(countKind(recommendations, "BUS")).isGreaterThanOrEqualTo(1);
        assertRanked(recommendations);
        assertThat(recommendations.get(0).path("recommended").asBoolean()).isTrue();
        assertThat(recommendations.get(0).path("reasons").size()).isPositive();
        for (JsonNode recommendation : recommendations) {
            assertThat(recommendation.path("active").asBoolean()).isTrue();
        }

        mockMvc.perform(authorized(patch("/api/admin/disruptions/" + disruptionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("delayMinutes", 200,
                                "reason", "Signal failure, revised estimate"))), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.delayMinutes").value(200));
        JsonNode updated = getJson(admin, "/api/admin/disruptions/" + disruptionId);
        assertThat(updated.path("impacts")).hasSize(2);
        for (JsonNode row : updated.path("impacts")) {
            assertThat(row.path("delayMinutes").asInt()).isEqualTo(200);
        }
        JsonNode updatedRecommendations = getJson(asha,
                "/api/journeys/" + ashaJourney + "/recommendations");
        assertRanked(updatedRecommendations);

        mockMvc.perform(authorized(patch("/api/admin/disruptions/" + disruptionId + "/resolve"),
                        admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        JsonNode resolved = getJson(admin, "/api/admin/disruptions/" + disruptionId);
        assertThat(resolved.path("status").asText()).isEqualTo("RESOLVED");
        assertThat(resolved.path("impacts")).hasSize(2);
        JsonNode restored = getJson(asha, "/api/journeys/" + ashaJourney);
        assertThat(restored.path("status").asText()).isEqualTo("UPCOMING");
        assertThat(restored.path("disruption").isNull()).isTrue();
        assertThat(getJson(asha, "/api/journeys/" + ashaJourney + "/impact")
                .path("disruptionStatus").asText()).isEqualTo("RESOLVED");
        JsonNode inactive = getJson(asha,
                "/api/journeys/" + ashaJourney + "/recommendations");
        assertThat(inactive.size()).isEqualTo(updatedRecommendations.size());
        for (JsonNode recommendation : inactive) {
            assertThat(recommendation.path("active").asBoolean()).isFalse();
        }
        assertThat(getJson(asha, "/api/trains/11007/status?date=" + date)
                .path("status").asText()).isEqualTo("ON_TIME");
    }

    @Test
    @Order(2)
    void aShortDelayRecommendsWaitingForTheTrain() throws Exception {
        LocalDate date = LocalDate.now().plusDays(2);
        long rohanJourney = journeyId(ROHAN, "Deccan Queen to Mumbai");

        JsonNode created = postJson(admin, "/api/admin/disruptions", body(
                "12123", date, "DELAY", 45, "Late rake", "LOW"), 201);
        long disruptionId = created.path("id").asLong();

        JsonNode impact = getJson(rohan, "/api/journeys/" + rohanJourney + "/impact");
        assertThat(impact.path("impactLevel").asText()).isEqualTo("MINOR");
        assertThat(impact.path("needsHotel").asBoolean()).isFalse();
        assertThat(impact.path("refundNote").isNull()).isTrue();

        JsonNode recommendations = getJson(rohan,
                "/api/journeys/" + rohanJourney + "/recommendations");
        assertThat(kinds(recommendations)).contains("WAIT");
        assertThat(recommendations.get(0).path("kind").asText()).isEqualTo("WAIT");
        assertThat(recommendations.get(0).path("rank").asInt()).isEqualTo(1);
        assertThat(recommendations.get(0).path("reasons").get(0).asText())
                .contains("Short delay");

        mockMvc.perform(authorized(patch("/api/admin/disruptions/" + disruptionId + "/resolve"),
                admin)).andExpect(status().isOk());
    }

    @Test
    @Order(3)
    void aCancellationKeepsABackendRefundNoteAndStillOffersAlternatives() throws Exception {
        long journeyId = journeyId(ASHA, "Evening run to Mumbai");
        LocalDate date = jdbcTemplate.queryForObject("""
                SELECT b.travel_date FROM bookings b
                JOIN journeys j ON j.booking_id = b.id
                JOIN users u ON u.id = j.user_id
                WHERE u.email = ? AND j.title = ?
                """, LocalDate.class, ASHA, "Evening run to Mumbai");
        assertThat(date).isNotNull();

        JsonNode created = postJson(admin, "/api/admin/disruptions", body(
                "11007", date, "CANCELLATION", null, "Waterlogging at Kurla", "HIGH"), 201);
        long disruptionId = created.path("id").asLong();

        assertThat(getJson(asha, "/api/trains/11007/status?date=" + date)
                .path("status").asText()).isEqualTo("CANCELLED");

        JsonNode detail = getJson(admin, "/api/admin/disruptions/" + disruptionId);
        assertThat(detail.path("impacts")).hasSize(1);
        assertThat(detail.path("impacts").get(0).path("newArrival").isNull()).isTrue();
        assertThat(detail.path("impacts").get(0).path("overnight").asBoolean()).isFalse();

        JsonNode impact = getJson(asha, "/api/journeys/" + journeyId + "/impact");
        assertThat(impact.path("disruptionType").asText()).isEqualTo("CANCELLATION");
        assertThat(impact.path("refundNote").asText()).contains("Full refund");
        assertThat(impact.path("newArrival").isNull()).isTrue();

        JsonNode recommendations = getJson(asha,
                "/api/journeys/" + journeyId + "/recommendations");
        assertThat(recommendations.size()).isGreaterThanOrEqualTo(1);
        boolean refundReason = false;
        for (JsonNode recommendation : recommendations) {
            for (JsonNode reason : recommendation.path("reasons")) {
                refundReason |= reason.asText().contains("Full refund");
            }
        }
        assertThat(refundReason).isTrue();

        mockMvc.perform(authorized(patch("/api/admin/disruptions/" + disruptionId + "/resolve"),
                admin)).andExpect(status().isOk());
    }

    @Test
    @Order(4)
    void validationAndAuthorizationProtectTheAdminApi() throws Exception {
        LocalDate date = LocalDate.now().plusDays(5);
        LocalDate sunday = LocalDate.now()
                .with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        mockMvc.perform(authorized(post("/api/admin/disruptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body("11007", date, "DELAY", 4, "Too short", "LOW"))), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(authorized(post("/api/admin/disruptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body("11007", date, "CANCELLATION", 30, "Wrong type", "LOW"))),
                        admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(authorized(post("/api/admin/disruptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body("12169", sunday, "DELAY", 60, "Not running", "LOW"))), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("travelDate"));
        mockMvc.perform(authorized(post("/api/admin/disruptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body("99999", date, "DELAY", 60, "Unknown", "LOW"))), admin))
                .andExpect(status().isBadRequest());

        mockMvc.perform(authorized(get("/api/admin/disruptions"), asha))
                .andExpect(status().isForbidden());
        mockMvc.perform(authorized(post("/api/admin/disruptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body("12127", date, "DELAY", 60, "Passenger", "LOW"))), asha))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/disruptions/mine"))
                .andExpect(status().isUnauthorized());

        long ashaJourney = journeyId(ASHA, "Mumbai weekend with Neha");
        mockMvc.perform(authorized(get("/api/journeys/" + ashaJourney + "/impact"), fatima))
                .andExpect(status().isNotFound());

        JsonNode created = postJson(admin, "/api/admin/disruptions", body(
                "12127", date, "DELAY", 60, "Test duplicate", "MEDIUM"), 201);
        long disruptionId = created.path("id").asLong();
        mockMvc.perform(authorized(post("/api/admin/disruptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body("12127", date, "DELAY", 60, "Test duplicate", "MEDIUM"))),
                        admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DISRUPTION_ALREADY_ACTIVE"));
        mockMvc.perform(authorized(patch("/api/admin/disruptions/" + disruptionId + "/resolve"),
                admin)).andExpect(status().isOk());
        mockMvc.perform(authorized(patch("/api/admin/disruptions/" + disruptionId + "/resolve"),
                admin)).andExpect(status().isOk());
    }

    @Test
    @Order(5)
    void theImpactPipelineRunsOnlyAfterTheCreatingTransactionCommits() {
        Long adminId = userRepository.findByEmail(DemoAdminSeeder.ADMIN_EMAIL)
                .orElseThrow().getId();
        LocalDate date = LocalDate.now().plusDays(2);
        DisruptionRequest request = new DisruptionRequest("11007", date, "DELAY", 90,
                "Commit boundary test", "MEDIUM");
        AtomicLong disruptionId = new AtomicLong();
        TransactionTemplate template = new TransactionTemplate(transactionManager);

        template.executeWithoutResult(status -> {
            DisruptionDetailResponse response = disruptionService.create(request, adminId);
            disruptionId.set(response.id());
            assertThat(impactRepository
                    .findByDisruptionIdOrderByCreatedAtAsc(disruptionId.get())).isEmpty();
        });

        assertThat(impactRepository
                .findByDisruptionIdOrderByCreatedAtAsc(disruptionId.get())).hasSize(2);
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

    private long journeyId(String email, String title) {
        Long id = jdbcTemplate.queryForObject("""
                SELECT j.id FROM journeys j
                JOIN users u ON u.id = j.user_id
                WHERE u.email = ? AND j.title = ?
                """, Long.class, email, title);
        assertThat(id).isNotNull();
        return id;
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

    private static List<String> kinds(JsonNode recommendations) {
        List<String> kinds = new ArrayList<>();
        recommendations.forEach(item -> kinds.add(item.path("kind").asText()));
        return kinds;
    }

    private static long countKind(JsonNode recommendations, String kind) {
        long count = 0;
        for (JsonNode item : recommendations) {
            if (item.path("kind").asText().equals(kind)) {
                count++;
            }
        }
        return count;
    }

    private static List<Long> ids(JsonNode items) {
        List<Long> ids = new ArrayList<>();
        items.forEach(item -> ids.add(item.path("id").asLong()));
        return ids;
    }

    private static void assertRanked(JsonNode recommendations) {
        int previousRank = 0;
        int previousScore = Integer.MAX_VALUE;
        int recommended = 0;
        for (JsonNode item : recommendations) {
            assertThat(item.path("rank").asInt()).isEqualTo(previousRank + 1);
            previousRank = item.path("rank").asInt();
            assertThat(item.path("score").asInt()).isLessThanOrEqualTo(previousScore);
            previousScore = item.path("score").asInt();
            if (item.path("recommended").asBoolean()) {
                recommended++;
            }
        }
        assertThat(recommended).isEqualTo(1);
    }
}
