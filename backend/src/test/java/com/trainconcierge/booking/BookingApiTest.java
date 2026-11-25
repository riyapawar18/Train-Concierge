package com.trainconcierge.booking;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.demo.password=Str0ng#Pass",
        "spring.datasource.url=jdbc:h2:mem:booking-api;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER",
        "app.seats.expiry-initial-delay-ms=3600000",
        "app.seats.expiry-check-ms=3600000"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "demo"})
class BookingApiTest {

    private static final String PASSWORD = "Str0ng#Pass";
    private static final AtomicInteger COUNTER = new AtomicInteger();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String userA;
    private String userB;
    private LocalDate travelDate;

    @BeforeEach
    void setUp() throws Exception {
        userA = signIn("booking-a");
        userB = signIn("booking-b");
        travelDate = LocalDate.now().plusDays(2);
    }

    @Test
    void bookingCreatesAJourneyAndOccupiesTheHeldSeats() throws Exception {
        BookingFixture fixture = bookSeats(userA, "11007", travelDate, "3A", 2);

        JsonNode booking = fixture.booking();
        assertThat(booking.path("pnr").asText()).matches("\\d{10}");
        assertThat(booking.path("status").asText()).isEqualTo("CONFIRMED");
        assertThat(booking.path("journeyId").asLong()).isPositive();
        assertThat(booking.path("passengerCount").asInt()).isEqualTo(2);
        assertThat(booking.path("trainNumber").asText()).isEqualTo("11007");
        assertThat(booking.path("from").path("code").asText()).isEqualTo("PUNE");
        assertThat(booking.path("to").path("code").asText()).isEqualTo("CSMT");
        assertThat(booking.path("fare").path("totalFare").decimalValue())
                .isGreaterThan(BigDecimal.ZERO);
        assertThat(booking.path("fare").path("gst").decimalValue()).isPositive();
        assertThat(booking.path("passengers").get(0).path("seatLabel").asText())
                .contains("C1");

        JsonNode seatMap = getJson(userA, "/api/trains/11007/seats?date=" + travelDate
                + "&class=3A&coach=" + fixture.coachId());
        for (int seatNo : fixture.seatNos()) {
            assertThat(seatByNumber(seatMap.path("seats"), seatNo).path("status").asText())
                    .isEqualTo("OCCUPIED");
        }

        JsonNode journeys = getJson(userA, "/api/journeys");
        assertThat(journeys.path("totalItems").asInt()).isEqualTo(1);
        JsonNode item = journeys.path("items").get(0);
        assertThat(item.path("id").asLong()).isEqualTo(booking.path("journeyId").asLong());
        assertThat(item.path("pnr").asText()).isEqualTo(booking.path("pnr").asText());
        assertThat(item.path("status").asText()).isEqualTo("UPCOMING");
        assertThat(item.path("seatLabels")).hasSize(2);

        JsonNode detail = getJson(userA, "/api/journeys/" + item.path("id").asLong());
        assertThat(detail.path("passengers")).hasSize(2);
        assertThat(detail.path("route")).hasSize(5);
        assertThat(detail.path("route").get(0).path("boarding").asBoolean()).isTrue();
        assertThat(detail.path("route").get(4).path("alighting").asBoolean()).isTrue();
        assertThat(detail.path("disruption").isNull()).isTrue();
        assertThat(detail.path("hotel").isNull()).isTrue();

        JsonNode summary = getJson(userA, "/api/journeys/summary");
        assertThat(summary.path("upcoming").asInt()).isEqualTo(1);
        assertThat(summary.path("total").asInt()).isEqualTo(1);

        JsonNode notifications = getJson(userA, "/api/notifications?filter=BOOKINGS");
        assertThat(notifications.path("total").asInt()).isEqualTo(1);
        JsonNode bookingNotification = notifications.path("items").get(0);
        assertThat(bookingNotification.path("type").asText()).isEqualTo("BOOKING_CONFIRMED");
        assertThat(bookingNotification.path("title").asText())
                .contains(booking.path("pnr").asText());
        assertThat(bookingNotification.path("linkPath").asText()).isEqualTo("/app/journeys");
        assertThat(getJson(userA, "/api/notifications/unread-count").path("count").asInt())
                .isEqualTo(1);
    }

    @Test
    void bookingRejectsForeignExpiredAndMismatchedHolds() throws Exception {
        HeldSeat foreignHold = holdSeat(userB, "11007", travelDate, "SL", 1).get(0);
        mockMvc.perform(authorized(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("11007", travelDate, "SL",
                                List.of(foreignHold.id()), 1)), userA))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SEAT_HOLD_INVALID"));

        HeldSeat own = holdSeat(userA, "11007", travelDate, "SL", 1).get(0);
        jdbcTemplate.update("""
                        UPDATE seat_inventory SET held_until = ?
                        WHERE train_number = ? AND travel_date = ? AND coach_id = ? AND seat_no = ?
                        """,
                Timestamp.valueOf(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(5)),
                "11007", Date.valueOf(travelDate), own.coachId(), own.seatNo());
        mockMvc.perform(authorized(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("11007", travelDate, "SL",
                                List.of(own.id()), 1)), userA))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("HOLD_EXPIRED"));

        mockMvc.perform(authorized(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("11007", travelDate, "2A",
                                List.of(own.id()), 2)), userA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(authorized(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"trainNumber\":\"11007\"}"), userA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void aHoldCanBeBookedOnlyOnceAndTheSeatStaysUnavailable() throws Exception {
        BookingFixture fixture = bookSeats(userA, "11007", travelDate, "2A", 1);

        mockMvc.perform(authorized(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("11007", travelDate, "2A",
                                fixture.holdIds(), 1)), userA))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SEAT_HOLD_INVALID"));

        mockMvc.perform(authorized(post("/api/seat-holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "trainNumber", "11007",
                                "date", travelDate.toString(),
                                "coachId", fixture.coachId(),
                                "seatNo", fixture.seatNos().get(0)))), userB))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SEAT_UNAVAILABLE"));
    }

    @Test
    void cancellingFreesSeatsRecordsACancelledJourneyAndEstimatesTheRefund() throws Exception {
        LocalDate farOut = LocalDate.now().plusDays(4);
        BookingFixture fixture = bookSeats(userA, "11007", farOut, "2A", 1);
        JsonNode booking = fixture.booking();
        long journeyId = booking.path("journeyId").asLong();
        BigDecimal totalFare = booking.path("fare").path("totalFare").decimalValue();

        mockMvc.perform(authorized(post("/api/journeys/" + journeyId + "/cancel"), userA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.pnr").value(booking.path("pnr").asText()))
                .andExpect(jsonPath("$.refund.percent").value(75))
                .andExpect(jsonPath("$.refund.label").value("Estimated refund"))
                .andExpect(jsonPath("$.refund.simulated").value(true));

        JsonNode detail = getJson(userA, "/api/journeys/" + journeyId);
        assertThat(detail.path("status").asText()).isEqualTo("CANCELLED");
        assertThat(detail.path("bookingStatus").asText()).isEqualTo("CANCELLED");
        assertThat(detail.path("refund").path("amount").decimalValue())
                .isEqualByComparingTo(totalFare.multiply(new BigDecimal("0.75"))
                        .setScale(2, java.math.RoundingMode.HALF_UP));

        JsonNode seatMap = getJson(userA, "/api/trains/11007/seats?date=" + farOut
                + "&class=2A&coach=" + fixture.coachId());
        assertThat(seatByNumber(seatMap.path("seats"), fixture.seatNos().get(0))
                .path("status").asText()).isEqualTo("AVAILABLE");

        JsonNode pnrLookup = getJson(userA, "/api/bookings/pnr/" + booking.path("pnr").asText());
        assertThat(pnrLookup.path("status").asText()).isEqualTo("CANCELLED");

        JsonNode summary = getJson(userA, "/api/journeys/summary");
        assertThat(summary.path("cancelled").asInt()).isEqualTo(1);
        assertThat(summary.path("upcoming").asInt()).isZero();

        mockMvc.perform(authorized(post("/api/journeys/" + journeyId + "/cancel"), userA))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("JOURNEY_ALREADY_CANCELLED"));
    }

    @Test
    void journeysAndPnrLookupsAreScopedToTheirOwner() throws Exception {
        BookingFixture fixture = bookSeats(userA, "11007", travelDate, "SL", 1);
        long journeyId = fixture.booking().path("journeyId").asLong();
        String pnr = fixture.booking().path("pnr").asText();

        mockMvc.perform(authorized(get("/api/journeys/" + journeyId), userB))
                .andExpect(status().isNotFound());
        mockMvc.perform(authorized(put("/api/journeys/" + journeyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Hijacked"))), userB))
                .andExpect(status().isNotFound());
        mockMvc.perform(authorized(post("/api/journeys/" + journeyId + "/cancel"), userB))
                .andExpect(status().isNotFound());
        mockMvc.perform(authorized(get("/api/bookings/pnr/" + pnr), userB))
                .andExpect(status().isNotFound());
        mockMvc.perform(authorized(get("/api/journeys"), userB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));

        mockMvc.perform(authorized(get("/api/bookings/pnr/" + pnr), userA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pnr").value(pnr));
    }

    @Test
    void journeyTitleNotesAndPassengerNamesCanBeEditedUntilDeparture() throws Exception {
        BookingFixture fixture = bookSeats(userA, "11007", travelDate, "3A", 2);
        long journeyId = fixture.booking().path("journeyId").asLong();
        long passengerId = fixture.booking().path("passengers").get(0).path("id").asLong();

        MvcResult updated = mockMvc.perform(authorized(put("/api/journeys/" + journeyId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json(Map.of(
                                        "title", "Diwali trip",
                                        "notes", "Window seats please",
                                        "passengers", List.of(Map.of(
                                                "id", passengerId, "name", "Asha R. Kulkarni"))))),
                        userA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Diwali trip"))
                .andExpect(jsonPath("$.notes").value("Window seats please"))
                .andReturn();
        JsonNode body = objectMapper.readTree(updated.getResponse().getContentAsString());
        assertThat(body.path("passengers").get(0).path("name").asText())
                .isEqualTo("Asha R. Kulkarni");

        mockMvc.perform(authorized(put("/api/journeys/" + journeyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("passengers", List.of(Map.of(
                                "id", 999999, "name", "Ghost"))))), userA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(authorized(post("/api/journeys/" + journeyId + "/cancel"), userA))
                .andExpect(status().isOk());
        mockMvc.perform(authorized(put("/api/journeys/" + journeyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Too late"))), userA))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("JOURNEY_LOCKED"));
    }

    @Test
    void journeyStatusFollowsTheClockEvenWhenTheStoredRowSaysUpcoming() throws Exception {
        BookingFixture fixture = bookSeats(userA, "11007", travelDate, "SL", 1);
        long journeyId = fixture.booking().path("journeyId").asLong();

        jdbcTemplate.update("""
                        UPDATE bookings SET boarding_time = ?, arrival_time = ?
                        WHERE pnr = ?
                        """,
                Timestamp.valueOf(LocalDateTime.now().minusHours(1)),
                Timestamp.valueOf(LocalDateTime.now().plusHours(2)),
                fixture.booking().path("pnr").asText());
        assertThat(getJson(userA, "/api/journeys/" + journeyId).path("status").asText())
                .isEqualTo("ACTIVE");
        assertThat(getJson(userA, "/api/journeys/summary").path("active").asInt()).isEqualTo(1);

        jdbcTemplate.update("""
                        UPDATE bookings SET boarding_time = ?, arrival_time = ?
                        WHERE pnr = ?
                        """,
                Timestamp.valueOf(LocalDateTime.now().minusDays(2)),
                Timestamp.valueOf(LocalDateTime.now().minusDays(1)),
                fixture.booking().path("pnr").asText());
        assertThat(getJson(userA, "/api/journeys/" + journeyId).path("status").asText())
                .isEqualTo("COMPLETED");

        mockMvc.perform(authorized(post("/api/journeys/" + journeyId + "/cancel"), userA))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("JOURNEY_COMPLETED"));
    }

    @Test
    void journeyListSupportsStatusSearchDateFiltersSortingAndPagination() throws Exception {
        BookingFixture first = bookSeats(userA, "11007", travelDate, "SL", 1);
        LocalDate laterDate = travelDate.plusDays(7);
        BookingFixture second = bookSeats(userA, "11007", laterDate, "2S", 1);
        bookSeats(userB, "11007", travelDate, "SL", 1);

        JsonNode all = getJson(userA, "/api/journeys");
        assertThat(all.path("totalItems").asInt()).isEqualTo(2);
        assertThat(all.path("items").get(0).path("travelDate").asText())
                .isEqualTo(travelDate.toString());
        assertThat(all.path("sort").asText()).isEqualTo("TRAVEL_DATE_ASC");

        JsonNode descending = getJson(userA, "/api/journeys?sort=TRAVEL_DATE_DESC");
        assertThat(descending.path("items").get(0).path("travelDate").asText())
                .isEqualTo(laterDate.toString());

        JsonNode byPnr = getJson(userA, "/api/journeys?q=" + first.booking().path("pnr").asText());
        assertThat(byPnr.path("totalItems").asInt()).isEqualTo(1);
        assertThat(byPnr.path("items").get(0).path("pnr").asText())
                .isEqualTo(first.booking().path("pnr").asText());

        JsonNode byStation = getJson(userA, "/api/journeys?q=csmt");
        assertThat(byStation.path("totalItems").asInt()).isEqualTo(2);

        JsonNode byDate = getJson(userA, "/api/journeys?from=" + laterDate + "&to=" + laterDate);
        assertThat(byDate.path("totalItems").asInt()).isEqualTo(1);
        assertThat(byDate.path("items").get(0).path("id").asLong())
                .isEqualTo(second.booking().path("journeyId").asLong());

        JsonNode cancelled = getJson(userA, "/api/journeys?status=CANCELLED");
        assertThat(cancelled.path("totalItems").asInt()).isZero();

        JsonNode paged = getJson(userA, "/api/journeys?page=2&size=1");
        assertThat(paged.path("totalPages").asInt()).isEqualTo(2);
        assertThat(paged.path("items")).hasSize(1);
        assertThat(paged.path("items").get(0).path("travelDate").asText())
                .isEqualTo(laterDate.toString());

        mockMvc.perform(authorized(get("/api/journeys?status=NOT_A_STATUS"), userA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(authorized(get("/api/journeys?from=" + laterDate + "&to=" + travelDate),
                        userA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void needsAttentionFilterCombinesDisruptedAndRebookedJourneys() throws Exception {
        BookingFixture disrupted = bookSeats(userA, "11007", travelDate, "SL", 1);
        BookingFixture rebooked = bookSeats(userA, "11007", travelDate.plusDays(1), "2S", 1);
        loadStoredStatus(disrupted.booking().path("journeyId").asLong(), "DISRUPTED");
        loadStoredStatus(rebooked.booking().path("journeyId").asLong(), "REBOOKED");

        JsonNode summary = getJson(userA, "/api/journeys/summary");
        assertThat(summary.path("needingAttention").asInt()).isEqualTo(2);
        assertThat(summary.path("disruptions").asInt()).isEqualTo(1);

        JsonNode attention = getJson(userA, "/api/journeys?status=NEEDS_ATTENTION");
        assertThat(attention.path("status").asText()).isEqualTo("NEEDS_ATTENTION");
        assertThat(attention.path("totalItems").asInt()).isEqualTo(2);
        assertThat(attention.path("items").get(0).path("createdAt").asText()).isNotBlank();

        assertThat(getJson(userA, "/api/journeys?status=DISRUPTED").path("totalItems").asInt())
                .isEqualTo(1);
    }

    private void loadStoredStatus(long journeyId, String status) {
        jdbcTemplate.update("UPDATE journeys SET status = ? WHERE id = ?", status, journeyId);
    }

    private BookingFixture bookSeats(String token, String trainNumber, LocalDate date,
                                     String classCode, int count) throws Exception {
        List<HeldSeat> held = holdSeat(token, trainNumber, date, classCode, count);
        List<Long> holdIds = held.stream().map(HeldSeat::id).toList();
        MvcResult result = mockMvc.perform(authorized(post("/api/bookings")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(bookingJson(trainNumber, date, classCode, holdIds,
                                        count)), token))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode booking = objectMapper.readTree(result.getResponse().getContentAsString());
        return new BookingFixture(booking, held.get(0).coachId(),
                held.stream().map(HeldSeat::seatNo).toList(), holdIds);
    }

    private List<HeldSeat> holdSeat(String token, String trainNumber, LocalDate date,
                                    String classCode, int count) throws Exception {
        JsonNode coaches = getJson(token, "/api/trains/" + trainNumber + "/coaches?date=" + date
                + "&class=" + classCode);
        List<HeldSeat> held = new ArrayList<>();
        for (JsonNode coach : coaches.path("coaches")) {
            long coachId = coach.path("id").asLong();
            JsonNode seatMap = getJson(token, "/api/trains/" + trainNumber + "/seats?date=" + date
                    + "&class=" + classCode + "&coach=" + coachId);
            for (JsonNode seat : seatMap.path("seats")) {
                if (held.size() == count) {
                    return held;
                }
                if (seat.path("status").asText().equals("AVAILABLE")) {
                    int seatNo = seat.path("seatNo").asInt();
                    MvcResult response = mockMvc.perform(authorized(post("/api/seat-holds")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(json(Map.of(
                                            "trainNumber", trainNumber,
                                            "date", date.toString(),
                                            "coachId", coachId,
                                            "seatNo", seatNo))), token))
                            .andExpect(status().isCreated())
                            .andReturn();
                    long holdId = objectMapper.readTree(response.getResponse().getContentAsString())
                            .path("id").asLong();
                    held.add(new HeldSeat(holdId, coachId, seatNo));
                }
            }
        }
        assertThat(held).hasSize(count);
        return held;
    }

    private String bookingJson(String trainNumber, LocalDate date, String classCode,
                               List<Long> holdIds, int passengers) throws Exception {
        List<Map<String, Object>> people = new ArrayList<>();
        for (int index = 0; index < passengers; index++) {
            people.add(Map.of(
                    "name", "Passenger " + (index + 1),
                    "age", 30 + index,
                    "gender", index % 2 == 0 ? "FEMALE" : "MALE"));
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("trainNumber", trainNumber);
        body.put("date", date.toString());
        body.put("from", "PUNE");
        body.put("to", "CSMT");
        body.put("classCode", classCode);
        body.put("quota", "GENERAL");
        body.put("passengers", people);
        body.put("holdIds", holdIds);
        body.put("contactEmail", "passenger@example.com");
        body.put("contactMobile", "+91 90000 00000");
        return json(body);
    }

    private String signIn(String prefix) throws Exception {
        String email = prefix + COUNTER.incrementAndGet() + "@example.com";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Booking Tester");
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

    private static JsonNode seatByNumber(JsonNode seats, int seatNo) {
        for (JsonNode seat : seats) {
            if (seat.path("seatNo").asInt() == seatNo) {
                return seat;
            }
        }
        throw new AssertionError("Seat " + seatNo + " missing");
    }

    private record HeldSeat(long id, long coachId, int seatNo) {
    }

    private record BookingFixture(JsonNode booking, long coachId, List<Integer> seatNos,
                                  List<Long> holdIds) {
    }
}
