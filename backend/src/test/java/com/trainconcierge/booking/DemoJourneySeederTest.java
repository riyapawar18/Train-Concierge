package com.trainconcierge.booking;

import com.trainconcierge.travel.SeatInventory;
import com.trainconcierge.travel.SeatInventoryRepository;
import com.trainconcierge.travel.SeatStatus;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "app.demo.password=Str0ng#Pass",
        "spring.datasource.url=jdbc:h2:mem:demo-journeys;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER",
        "app.seats.expiry-initial-delay-ms=3600000",
        "app.seats.expiry-check-ms=3600000"
})
@ActiveProfiles({"test", "demo"})
class DemoJourneySeederTest {

    private static final String ASHA = "asha.kulkarni@trainconcierge.demo";
    private static final String FATIMA = "fatima.sheikh@trainconcierge.demo";
    private static final String ROHAN = "rohan.deshmukh@trainconcierge.demo";
    private static final String MEERA = "meera.iyer@trainconcierge.demo";
    private static final String KARAN = "karan.singh@trainconcierge.demo";

    @Autowired
    private DemoJourneySeeder seeder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JourneyRepository journeyRepository;

    @Autowired
    private SeatInventoryRepository seatInventoryRepository;

    @Test
    void demoAccountsHaveRelativeUpcomingAndPastJourneys() {
        LocalDate today = LocalDate.now();

        Journey ashaTrip = find(ASHA, "Mumbai weekend with Neha");
        assertThat(ashaTrip.getBooking().getTrain().getNumber()).isEqualTo("11007");
        assertThat(ashaTrip.getBooking().getClassCode()).isEqualTo("3A");
        assertThat(ashaTrip.getBooking().getTravelDate()).isEqualTo(today.plusDays(2));
        assertThat(ashaTrip.getBooking().getFromStation().getCode()).isEqualTo("PUNE");
        assertThat(ashaTrip.getBooking().getToStation().getCode()).isEqualTo("CSMT");
        assertThat(status(ashaTrip)).isEqualTo(JourneyStatus.UPCOMING);
        assertThat(ashaTrip.getBooking().getPassengers()).hasSize(2);

        assertThat(find(ASHA, "Evening run to Mumbai").getBooking().getClassCode()).isEqualTo("2A");
        assertThat(find(FATIMA, "Family visit to Mumbai").getBooking().getTrain().getNumber())
                .isEqualTo("11007");
        assertThat(find(ROHAN, "Deccan Queen to Mumbai").getBooking().getTrain().getNumber())
                .isEqualTo("12123");
        assertThat(find(MEERA, "Chennai client meeting").getBooking().getTravelDate())
                .isEqualTo(today.plusDays(5));
        assertThat(status(find(MEERA, "Chennai review trip"))).isEqualTo(JourneyStatus.COMPLETED);
        assertThat(find(KARAN, "Delhi work trip").getBooking().getTravelDate())
                .isEqualTo(today.plusDays(9));
        assertThat(find(KARAN, "Delhi conference").getStoredStatus())
                .isEqualTo(JourneyStatus.CANCELLED);
    }

    @Test
    void demoBookingsUseUniquePnrsAndRealSeatsThatMatchTheirStatus() {
        List<Journey> all = new ArrayList<>();
        for (String email : List.of(ASHA, FATIMA, ROHAN, MEERA, KARAN)) {
            all.addAll(journeys(email));
        }
        assertThat(all).hasSize(8);

        Set<String> pnrs = new HashSet<>();
        for (Journey journey : all) {
            assertThat(pnrs.add(journey.getBooking().getPnr())).isTrue();
            Booking booking = journey.getBooking();
            assertThat(booking.getTotalFare()).isPositive();
            assertThat(booking.getPassengers()).isNotEmpty();
            for (BookingPassenger passenger : booking.getPassengers()) {
                SeatInventory seat = seatInventoryRepository.findById(
                        passenger.getSeatInventoryId()).orElseThrow();
                boolean cancelled = journey.getStoredStatus() == JourneyStatus.CANCELLED;
                assertThat(seat.getStatus())
                        .isEqualTo(cancelled ? SeatStatus.AVAILABLE : SeatStatus.OCCUPIED);
                assertThat(passenger.getSeatLabel()).contains(passenger.getCoachNo());
            }
        }

        Journey cancelled = find(KARAN, "Delhi conference");
        assertThat(cancelled.getBooking().getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(cancelled.getBooking().getRefundAmount()).isPositive();
        assertThat(cancelled.getBooking().getRefundPercent()).isEqualTo(75);
    }

    @Test
    void reseedingDoesNotDuplicateDemoJourneys() {
        int before = journeys(ASHA).size();
        seeder.run(null);
        assertThat(journeys(ASHA)).hasSize(before);
        assertThat(journeys(FATIMA)).hasSize(1);
        assertThat(journeys(KARAN)).hasSize(2);
    }

    @Test
    void theEveningDemoServiceUsesTodayWhenItIsStillRunning() {
        LocalDate today = LocalDate.of(2026, 10, 28);
        assertThat(DemoJourneySeeder.eveningRunDate(today.atTime(LocalTime.of(17, 0))))
                .isEqualTo(today);
        assertThat(DemoJourneySeeder.eveningRunDate(today.atTime(LocalTime.of(10, 0))))
                .isEqualTo(today.plusDays(1));
        assertThat(DemoJourneySeeder.eveningRunDate(today.atTime(LocalTime.of(21, 0))))
                .isEqualTo(today.plusDays(1));
    }

    private Journey find(String email, String title) {
        return journeys(email).stream()
                .filter(journey -> title.equals(journey.getTitle()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No demo journey " + title + " for " + email));
    }

    private List<Journey> journeys(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AssertionError("Missing demo user " + email));
        return journeyRepository.findByUserId(user.getId());
    }

    private static JourneyStatus status(Journey journey) {
        return BookingMappings.effectiveStatus(journey, LocalDateTime.now());
    }
}
