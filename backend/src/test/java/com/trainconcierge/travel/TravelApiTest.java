package com.trainconcierge.travel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.demo.password=Str0ng#Pass",
        "spring.datasource.url=jdbc:h2:mem:travel-api;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER",
        "app.seats.expiry-initial-delay-ms=3600000",
        "app.seats.expiry-check-ms=3600000"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "demo"})
class TravelApiTest {

    private static final String PASSWORD = "Str0ng#Pass";
    private static final AtomicInteger COUNTER = new AtomicInteger();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private SeatInventoryRepository seatInventoryRepository;

    @Autowired
    private SeatHoldExpiryJob seatHoldExpiryJob;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private String userA;
    private String userB;
    private LocalDate travelDate;

    @BeforeEach
    void setUp() throws Exception {
        userA = signIn("travel-a");
        userB = signIn("travel-b");
        travelDate = nextWeekday();
    }

    @Test
    void searchRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/trains/search")
                        .param("from", "PUNE")
                        .param("to", "CSMT")
                        .param("date", travelDate.toString()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/seat-holds/mine"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void searchFindsPuneToMumbaiTrainsUsingStopOrder() throws Exception {
        JsonNode body = search(userA, "PUNE", "CSMT");
        assertThat(body.path("count").asInt()).isGreaterThanOrEqualTo(5);
        assertThat(body.path("results")).hasSize(body.path("count").asInt());
        assertThat(body.path("from").path("code").asText()).isEqualTo("PUNE");
        assertThat(body.path("to").path("code").asText()).isEqualTo("CSMT");

        boolean containsDeccanQueen = false;
        for (JsonNode result : body.path("results")) {
            containsDeccanQueen |= result.path("trainNumber").asText().equals("12123");
            assertThat(result.path("from").path("code").asText()).isEqualTo("PUNE");
            assertThat(result.path("to").path("code").asText()).isEqualTo("CSMT");
            assertThat(result.path("classes")).isNotEmpty();
            for (JsonNode seatClass : result.path("classes")) {
                assertThat(List.of("PLENTY", "LOW", "VERY_LOW", "WAITLIST"))
                        .contains(seatClass.path("level").asText());
                assertThat(seatClass.path("label").asText())
                        .matches("AVL \\d+|WL");
            }
        }
        assertThat(containsDeccanQueen).isTrue();

        assertThat(codes(body.path("fromStations"))).contains("PUNE", "LNL");
        assertThat(codes(body.path("toStations"))).contains("CSMT", "DR", "KYN");
    }

    @Test
    void intermediateBoardingAndAlightingStationsAreMatched() throws Exception {
        JsonNode body = search(userA, "LNL", "KYN");
        int exact = 0;
        for (JsonNode result : body.path("results")) {
            assertThat(result.path("from").path("departure").asText()).isNotBlank();
            assertThat(result.path("to").path("arrival").asText()).isNotBlank();
            assertThat(result.path("durationMinutes").asInt()).isPositive();
            if (result.path("from").path("code").asText().equals("LNL")) {
                exact++;
                assertThat(result.path("to").path("code").asText()).isEqualTo("KYN");
            }
        }
        assertThat(exact).isGreaterThanOrEqualTo(5);
        assertThat(codes(body.path("fromStations"))).contains("LNL");
        assertThat(codes(body.path("toStations"))).contains("KYN");
    }

    @Test
    void classFilterKeepsOnlyTrainsWithThatClass() throws Exception {
        JsonNode body = search(userA, "PUNE", "CSMT", "class", "2A");
        assertThat(body.path("count").asInt()).isEqualTo(2);
        for (JsonNode result : body.path("results")) {
            assertThat(result.path("classes")).hasSize(1);
            assertThat(result.path("classes").get(0).path("code").asText()).isEqualTo("2A");
        }
    }

    @Test
    void typeFilterMatchesTrainTypeChips() throws Exception {
        JsonNode body = search(userA, "PUNE", "CSMT", "types", "EXPRESS");
        assertThat(body.path("count").asInt()).isEqualTo(3);
        for (JsonNode result : body.path("results")) {
            assertThat(result.path("type").asText()).isEqualTo("EXPRESS");
        }

        JsonNode none = search(userA, "PUNE", "CSMT", "types", "RAJDHANI");
        assertThat(none.path("count").asInt()).isZero();
    }

    @Test
    void timeBucketFiltersUseDepartureAndArrivalWindows() throws Exception {
        JsonNode early = search(userA, "PUNE", "CSMT", "depFrom", "0", "depTo", "400");
        assertThat(early.path("count").asInt()).isEqualTo(1);
        assertThat(early.path("results").get(0).path("trainNumber").asText()).isEqualTo("12127");

        JsonNode later = search(userA, "PUNE", "CSMT", "depFrom", "420", "depTo", "1440");
        assertThat(later.path("count").asInt()).isEqualTo(4);
        for (JsonNode result : later.path("results")) {
            assertThat(result.path("from").path("departure").asText()).isNotEqualTo("06:35");
        }

        JsonNode evening = search(userA, "PUNE", "CSMT", "arrFrom", "1100", "arrTo", "1440");
        assertThat(evening.path("count").asInt()).isGreaterThanOrEqualTo(1);
        for (JsonNode result : evening.path("results")) {
            assertThat(result.path("to").path("arrival").asText()).isNotBlank();
        }
    }

    @Test
    void resultsSortByFareDurationAndArrival() throws Exception {
        JsonNode byFare = search(userA, "PUNE", "CSMT", "sort", "FARE");
        List<BigDecimal> fares = new ArrayList<>();
        for (JsonNode result : byFare.path("results")) {
            fares.add(lowestFare(result));
        }
        for (int index = 1; index < fares.size(); index++) {
            assertThat(fares.get(index)).isGreaterThanOrEqualTo(fares.get(index - 1));
        }
        assertThat(byFare.path("results").get(0).path("trainNumber").asText()).isEqualTo("11007");

        JsonNode byDuration = search(userA, "PUNE", "CSMT", "sort", "DURATION");
        List<Integer> durations = new ArrayList<>();
        for (JsonNode result : byDuration.path("results")) {
            durations.add(result.path("durationMinutes").asInt());
        }
        for (int index = 1; index < durations.size(); index++) {
            assertThat(durations.get(index)).isGreaterThanOrEqualTo(durations.get(index - 1));
        }
        assertThat(byDuration.path("results").get(0).path("trainNumber").asText()).isEqualTo("12123");

        JsonNode byArrival = search(userA, "PUNE", "CSMT", "sort", "ARRIVAL");
        assertThat(byArrival.path("results").get(0).path("trainNumber").asText()).isEqualTo("12127");
        assertThat(byArrival.path("results").get(byArrival.path("results").size() - 1)
                .path("trainNumber").asText()).isEqualTo("12169");
    }

    @Test
    void quotaSimulationChangesAvailabilityAndFareOnly() throws Exception {
        JsonNode general = search(userA, "PUNE", "CSMT");
        JsonNode tatkal = search(userA, "PUNE", "CSMT", "quota", "TATKAL");

        JsonNode generalClass = seatClass(general, "11007", "2S");
        JsonNode tatkalClass = seatClass(tatkal, "11007", "2S");

        assertThat(tatkalClass.path("available").asInt())
                .isEqualTo((int) Math.floor(generalClass.path("available").asInt() * 0.25));
        assertThat(tatkalClass.path("fare").decimalValue())
                .isEqualByComparingTo(generalClass.path("fare").decimalValue()
                        .multiply(BigDecimal.valueOf(1.3)));
        assertThat(tatkal.path("quota").asText()).isEqualTo("TATKAL");
    }

    @Test
    void zeroResultSearchIsAnEmptyListNotAnError() throws Exception {
        JsonNode body = search(userA, "HWH", "MAO");
        assertThat(body.path("count").asInt()).isZero();
        assertThat(body.path("results")).isEmpty();
    }

    @Test
    void searchRejectsPastDatesSameStationsAndFarFutureDates() throws Exception {
        mockMvc.perform(authorized(get("/api/trains/search")
                                .param("from", "PUNE").param("to", "CSMT")
                                .param("date", LocalDate.now().minusDays(1).toString()), userA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(authorized(get("/api/trains/search")
                                .param("from", "PUNE").param("to", "PUNE")
                                .param("date", travelDate.toString()), userA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("to"));

        mockMvc.perform(authorized(get("/api/trains/search")
                                .param("from", "PUNE").param("to", "CSMT")
                                .param("date", LocalDate.now().plusDays(121).toString()), userA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void availabilityCoachesAndSeatMapCountsAgree() throws Exception {
        JsonNode availability = getJson(userA, "/api/trains/12125/availability?date=" + travelDate);
        JsonNode cc = classEntry(availability.path("classes"), "CC");
        assertThat(cc.path("label").asText()).matches("AVL \\d+|WL");
        assertThat(cc.path("total").asInt()).isEqualTo(144);
        assertThat(cc.path("available").asInt()).isLessThanOrEqualTo(cc.path("total").asInt());

        JsonNode coaches = getJson(userA, "/api/trains/12125/coaches?date=" + travelDate + "&class=CC");
        assertThat(coaches.path("coaches")).hasSize(2);
        int coachTotal = 0;
        int coachAvailable = 0;
        int firstCoachAvailable = 0;
        long firstCoachId = 0;
        for (JsonNode coach : coaches.path("coaches")) {
            coachTotal += coach.path("total").asInt();
            coachAvailable += coach.path("available").asInt();
            if (firstCoachId == 0) {
                firstCoachId = coach.path("id").asLong();
                firstCoachAvailable = coach.path("available").asInt();
            }
            assertThat(coach.path("layout").asText()).isEqualTo("CHAIR_3x2");
        }
        assertThat(coachTotal).isEqualTo(cc.path("total").asInt());
        assertThat(coachAvailable).isEqualTo(cc.path("available").asInt());

        JsonNode seatMap = getJson(userA, "/api/trains/12125/seats?date=" + travelDate
                + "&class=CC&coach=" + firstCoachId);
        assertThat(seatMap.path("seats")).hasSize(coachTotal / 2);
        assertThat(seatMap.path("classSummary").path("total").asInt())
                .isEqualTo(cc.path("total").asInt());
        assertThat(seatMap.path("classSummary").path("available").asInt())
                .isEqualTo(cc.path("available").asInt());
        assertThat(seatMap.path("coach").path("available").asInt())
                .isEqualTo(firstCoachAvailable);
        assertThat(berthTypes(seatMap.path("seats"))).contains("WS", "MS", "AS");
    }

    @Test
    void berthCoachesUseLowerMiddleUpperAndSideBerths() throws Exception {
        JsonNode coaches = getJson(userA, "/api/trains/11007/coaches?date=" + travelDate + "&class=2A");
        assertThat(coaches.path("coaches")).isNotEmpty();
        assertThat(coaches.path("coaches").get(0).path("layout").asText()).isEqualTo("BERTH");
        long coachId = coaches.path("coaches").get(0).path("id").asLong();
        JsonNode seatMap = getJson(userA, "/api/trains/11007/seats?date=" + travelDate
                + "&class=2A&coach=" + coachId);
        assertThat(berthTypes(seatMap.path("seats"))).contains("LB", "MB", "UB", "SL", "SU");
        assertThat(seatMap.path("seats").get(0).path("berthLabel").asText()).isNotBlank();
    }

    @Test
    void holdingReleasingAndOwnershipFollowTheApiContract() throws Exception {
        JsonNode seatMap = getJson(userA, "/api/trains/11007/seats?date=" + travelDate + "&class=2A");
        long coachId = seatMap.path("coach").path("id").asLong();
        JsonNode available = firstSeat(seatMap.path("seats"), "AVAILABLE");
        int seatNo = available.path("seatNo").asInt();

        MvcResult held = mockMvc.perform(authorized(post("/api/seat-holds")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json(Map.of(
                                        "trainNumber", "11007",
                                        "date", travelDate.toString(),
                                        "coachId", coachId,
                                        "seatNo", seatNo))), userA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.seatNo").value(seatNo))
                .andExpect(jsonPath("$.label").value(org.hamcrest.Matchers.containsString(
                        String.format("-%02d", seatNo))))
                .andReturn();
        long holdId = objectMapper.readTree(held.getResponse().getContentAsString())
                .path("id").asLong();

        JsonNode afterHold = getJson(userA, "/api/trains/11007/seats?date=" + travelDate
                + "&class=2A&coach=" + coachId);
        assertThat(seatByNumber(afterHold.path("seats"), seatNo).path("status").asText())
                .isEqualTo("HELD");

        mockMvc.perform(authorized(post("/api/seat-holds")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json(Map.of(
                                        "trainNumber", "11007",
                                        "date", travelDate.toString(),
                                        "coachId", coachId,
                                        "seatNo", seatNo))), userB))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SEAT_UNAVAILABLE"));

        mockMvc.perform(authorized(delete("/api/seat-holds/" + holdId), userB))
                .andExpect(status().isNotFound());

        mockMvc.perform(authorized(get("/api/seat-holds/mine"), userA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.holds[0].id").value(holdId))
                .andExpect(jsonPath("$.serverTime").isNotEmpty());

        mockMvc.perform(authorized(delete("/api/seat-holds/" + holdId), userA))
                .andExpect(status().isNoContent());

        JsonNode afterRelease = getJson(userA, "/api/trains/11007/seats?date=" + travelDate
                + "&class=2A&coach=" + coachId);
        assertThat(seatByNumber(afterRelease.path("seats"), seatNo).path("status").asText())
                .isEqualTo("AVAILABLE");
    }

    @Test
    void expiredHoldsAreReleasedByTheScheduledJob() throws Exception {
        JsonNode seatMap = getJson(userA, "/api/trains/11007/seats?date=" + travelDate + "&class=3A");
        long coachId = seatMap.path("coach").path("id").asLong();
        JsonNode available = firstSeat(seatMap.path("seats"), "AVAILABLE");
        int seatNo = available.path("seatNo").asInt();

        mockMvc.perform(authorized(post("/api/seat-holds")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json(Map.of(
                                        "trainNumber", "11007",
                                        "date", travelDate.toString(),
                                        "coachId", coachId,
                                        "seatNo", seatNo))), userA))
                .andExpect(status().isCreated());

        jdbcTemplate.update("""
                        UPDATE seat_inventory
                        SET held_until = ?
                        WHERE train_number = ? AND travel_date = ? AND coach_id = ? AND seat_no = ?
                        """,
                Timestamp.valueOf(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(2)),
                "11007", Date.valueOf(travelDate), coachId, seatNo);

        seatHoldExpiryJob.releaseExpiredHolds();

        JsonNode afterExpiry = getJson(userA, "/api/trains/11007/seats?date=" + travelDate
                + "&class=3A&coach=" + coachId);
        assertThat(seatByNumber(afterExpiry.path("seats"), seatNo).path("status").asText())
                .isEqualTo("AVAILABLE");
    }

    @Test
    void staleSeatWritesFailWithOptimisticLocking() {
        JsonNode seatMap;
        try {
            seatMap = getJson(userA, "/api/trains/11007/seats?date=" + travelDate + "&class=SL");
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
        long coachId = seatMap.path("coach").path("id").asLong();
        JsonNode available = firstSeat(seatMap.path("seats"), "AVAILABLE");
        int seatNo = available.path("seatNo").asInt();
        Long seatId = jdbcTemplate.queryForObject("""
                        SELECT id FROM seat_inventory
                        WHERE train_number = ? AND travel_date = ? AND coach_id = ? AND seat_no = ?
                        """,
                Long.class, "11007", Date.valueOf(travelDate), coachId, seatNo);
        assertThat(seatId).isNotNull();

        TransactionTemplate template = new TransactionTemplate(transactionManager);
        SeatInventory stale = template.execute(status ->
                seatInventoryRepository.findById(seatId).orElseThrow());

        template.executeWithoutResult(status -> {
            SeatInventory current = seatInventoryRepository.findById(seatId).orElseThrow();
            current.hold(999L, LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
            seatInventoryRepository.saveAndFlush(current);
        });

        try {
            assertThatThrownBy(() -> template.executeWithoutResult(status -> {
                stale.hold(998L, LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
                seatInventoryRepository.saveAndFlush(stale);
            })).isInstanceOf(OptimisticLockingFailureException.class);
        } finally {
            jdbcTemplate.update("""
                            UPDATE seat_inventory
                            SET status = 'AVAILABLE', held_by = NULL, held_until = NULL, version = version + 1
                            WHERE id = ?
                            """, seatId);
        }
    }

    @Test
    void trainStatusIsSimulatedAndOnTime() throws Exception {
        mockMvc.perform(authorized(get("/api/trains/11007/status")
                        .param("date", travelDate.toString()), userA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ON_TIME"))
                .andExpect(jsonPath("$.delayMinutes").value(0))
                .andExpect(jsonPath("$.simulated").value(true))
                .andExpect(jsonPath("$.disruptionHref").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.schedule.length()").value(5))
                .andExpect(jsonPath("$.schedule[0].stationCode").value("PUNE"))
                .andExpect(jsonPath("$.schedule[4].stationCode").value("CSMT"));

        mockMvc.perform(authorized(get("/api/trains/99999/status")
                        .param("date", travelDate.toString()), userA))
                .andExpect(status().isNotFound());
    }

    private String signIn(String prefix) throws Exception {
        String email = prefix + COUNTER.incrementAndGet() + "@example.com";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Travel Tester");
        body.put("email", email);
        body.put("password", PASSWORD);
        body.put("confirmPassword", PASSWORD);
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString())
                .path("accessToken").asText();
    }

    private JsonNode search(String token, String from, String to, String... extra) throws Exception {
        MockHttpServletRequestBuilder builder = get("/api/trains/search")
                .param("from", from)
                .param("to", to)
                .param("date", travelDate.toString());
        for (int index = 0; index < extra.length; index += 2) {
            builder.param(extra[index], extra[index + 1]);
        }
        return getJson(token, builder);
    }

    private JsonNode getJson(String token, String url) throws Exception {
        return getJson(token, get(url));
    }

    private JsonNode getJson(String token, MockHttpServletRequestBuilder builder) throws Exception {
        MvcResult result = mockMvc.perform(authorized(builder, token))
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

    private static LocalDate nextWeekday() {
        LocalDate date = LocalDate.now().plusDays(2);
        while (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.plusDays(1);
        }
        return date;
    }

    private static List<String> codes(JsonNode options) {
        List<String> codes = new ArrayList<>();
        options.forEach(option -> codes.add(option.path("code").asText()));
        return codes;
    }

    private static JsonNode seatClass(JsonNode body, String trainNumber, String classCode) {
        for (JsonNode result : body.path("results")) {
            if (result.path("trainNumber").asText().equals(trainNumber)) {
                return classEntry(result.path("classes"), classCode);
            }
        }
        throw new AssertionError("No train " + trainNumber + " in the search results");
    }

    private static JsonNode classEntry(JsonNode classes, String classCode) {
        for (JsonNode entry : classes) {
            if (entry.path("code").asText().equals(classCode)) {
                return entry;
            }
        }
        throw new AssertionError("No " + classCode + " class in the response");
    }

    private static BigDecimal lowestFare(JsonNode result) {
        BigDecimal lowest = null;
        for (JsonNode seatClass : result.path("classes")) {
            BigDecimal fare = seatClass.path("fare").decimalValue();
            if (lowest == null || fare.compareTo(lowest) < 0) {
                lowest = fare;
            }
        }
        return lowest == null ? BigDecimal.ZERO : lowest;
    }

    private static JsonNode firstSeat(JsonNode seats, String status) {
        for (JsonNode seat : seats) {
            if (seat.path("status").asText().equals(status)) {
                return seat;
            }
        }
        throw new AssertionError("No " + status + " seat in the seat map");
    }

    private static JsonNode seatByNumber(JsonNode seats, int seatNo) {
        for (JsonNode seat : seats) {
            if (seat.path("seatNo").asInt() == seatNo) {
                return seat;
            }
        }
        throw new AssertionError("Seat " + seatNo + " missing");
    }

    private static List<String> berthTypes(JsonNode seats) {
        List<String> types = new ArrayList<>();
        seats.forEach(seat -> types.add(seat.path("berthType").asText()));
        return types;
    }
}
