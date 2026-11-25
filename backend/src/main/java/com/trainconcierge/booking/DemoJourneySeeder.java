package com.trainconcierge.booking;

import com.trainconcierge.catalog.Station;
import com.trainconcierge.catalog.StationRepository;
import com.trainconcierge.catalog.Train;
import com.trainconcierge.catalog.TrainClass;
import com.trainconcierge.catalog.TrainClassRepository;
import com.trainconcierge.catalog.TrainRepository;
import com.trainconcierge.catalog.TrainSchedule;
import com.trainconcierge.catalog.TrainScheduleRepository;
import com.trainconcierge.travel.BerthTypes;
import com.trainconcierge.travel.Coach;
import com.trainconcierge.travel.CoachRepository;
import com.trainconcierge.travel.Fares;
import com.trainconcierge.travel.Quota;
import com.trainconcierge.travel.SeatInventory;
import com.trainconcierge.travel.SeatInventoryRepository;
import com.trainconcierge.travel.SeatInventoryService;
import com.trainconcierge.travel.SeatStatus;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Demo journeys for the seeded passenger accounts. Dates are relative to the startup day so
 * the My Journeys screen always has upcoming, active and completed examples, and each booking
 * is created at most once per title.
 */
@Component
@Profile("demo")
@Order(30)
public class DemoJourneySeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoJourneySeeder.class);
    private static final LocalTime DEMO_DEPARTURE = LocalTime.of(16, 30);
    private static final LocalTime DEMO_ARRIVAL = LocalTime.of(19, 45);

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final JourneyRepository journeyRepository;
    private final TrainRepository trainRepository;
    private final StationRepository stationRepository;
    private final TrainClassRepository trainClassRepository;
    private final TrainScheduleRepository trainScheduleRepository;
    private final CoachRepository coachRepository;
    private final SeatInventoryRepository seatInventoryRepository;
    private final SeatInventoryService seatInventoryService;
    private final JourneyService journeyService;
    private final BookingService bookingService;
    private final boolean enabled;

    public DemoJourneySeeder(UserRepository userRepository,
                             BookingRepository bookingRepository,
                             JourneyRepository journeyRepository,
                             TrainRepository trainRepository,
                             StationRepository stationRepository,
                             TrainClassRepository trainClassRepository,
                             TrainScheduleRepository trainScheduleRepository,
                             CoachRepository coachRepository,
                             SeatInventoryRepository seatInventoryRepository,
                             SeatInventoryService seatInventoryService,
                             JourneyService journeyService,
                             BookingService bookingService,
                             @Value("${app.demo.journeys.enabled:true}") boolean enabled) {
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.journeyRepository = journeyRepository;
        this.trainRepository = trainRepository;
        this.stationRepository = stationRepository;
        this.trainClassRepository = trainClassRepository;
        this.trainScheduleRepository = trainScheduleRepository;
        this.coachRepository = coachRepository;
        this.seatInventoryRepository = seatInventoryRepository;
        this.seatInventoryService = seatInventoryService;
        this.journeyService = journeyService;
        this.bookingService = bookingService;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        LocalDate today = LocalDate.now();
        List<DemoJourney> specs = specs(today, LocalDateTime.now());
        int created = 0;
        for (DemoJourney spec : specs) {
            if (seed(spec)) {
                created++;
            }
        }
        log.info("Demo journeys ready: {} created, {} already present or skipped.",
                created, specs.size() - created);
    }

    private List<DemoJourney> specs(LocalDate today, LocalDateTime now) {
        LocalDate eveningTrip = eveningRunDate(now);
        return List.of(
                new DemoJourney("asha.kulkarni@trainconcierge.demo", "11007", "PUNE", "CSMT",
                        "3A", today.plusDays(2), "Mumbai weekend with Neha", State.CONFIRMED,
                        List.of(new DemoPassenger("Asha Kulkarni", 31, Gender.FEMALE, "LB"),
                                new DemoPassenger("Neha Kulkarni", 27, Gender.FEMALE, "UB")),
                        "+91 98200 41120"),
                new DemoJourney("asha.kulkarni@trainconcierge.demo", "11007", "PUNE", "CSMT",
                        "2A", eveningTrip, "Evening run to Mumbai", State.CONFIRMED,
                        List.of(new DemoPassenger("Asha Kulkarni", 31, Gender.FEMALE, "LB")),
                        "+91 98200 41120"),
                new DemoJourney("fatima.sheikh@trainconcierge.demo", "11007", "PUNE", "CSMT",
                        "3A", today.plusDays(2), "Family visit to Mumbai", State.CONFIRMED,
                        List.of(new DemoPassenger("Fatima Sheikh", 45, Gender.FEMALE, "MB"),
                                new DemoPassenger("Imran Sheikh", 48, Gender.MALE, "UB")),
                        "+91 99870 22315"),
                new DemoJourney("rohan.deshmukh@trainconcierge.demo", "12123", "PUNE", "CSMT",
                        "CC", today.plusDays(2), "Deccan Queen to Mumbai", State.CONFIRMED,
                        List.of(new DemoPassenger("Rohan Deshmukh", 29, Gender.MALE, "WS")),
                        "+91 97650 88431"),
                new DemoJourney("meera.iyer@trainconcierge.demo", "12007", "SBC", "MAS",
                        "CC", today.plusDays(5), "Chennai client meeting", State.CONFIRMED,
                        List.of(new DemoPassenger("Meera Iyer", 36, Gender.FEMALE, "WS")),
                        "+91 98450 70912"),
                new DemoJourney("meera.iyer@trainconcierge.demo", "12007", "SBC", "MAS",
                        "EC", today.minusDays(7), "Chennai review trip", State.CONFIRMED,
                        List.of(new DemoPassenger("Meera Iyer", 36, Gender.FEMALE, "WS"),
                                new DemoPassenger("Arjun Iyer", 39, Gender.MALE, "AS")),
                        "+91 98450 70912"),
                new DemoJourney("karan.singh@trainconcierge.demo", "12951", "BCT", "NDLS",
                        "2A", today.plusDays(9), "Delhi work trip", State.CONFIRMED,
                        List.of(new DemoPassenger("Karan Singh", 41, Gender.MALE, "LB")),
                        "+91 98110 33640"),
                new DemoJourney("karan.singh@trainconcierge.demo", "12951", "BCT", "NDLS",
                        "3A", today.plusDays(4), "Delhi conference", State.CANCELLED,
                        List.of(new DemoPassenger("Karan Singh", 41, Gender.MALE, "MB")),
                        "+91 98110 33640"));
    }

    /**
     * The demo evening service runs 16:30–19:45. Seed it for today while it can still be
     * active, otherwise for tomorrow so the journey stays upcoming.
     */
    static LocalDate eveningRunDate(LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        boolean todayStillRunning = now.toLocalTime().isBefore(DEMO_ARRIVAL);
        return todayStillRunning && !now.toLocalTime().isBefore(DEMO_DEPARTURE)
                ? today
                : today.plusDays(1);
    }

    private boolean seed(DemoJourney spec) {
        User user = userRepository.findByEmail(spec.email()).orElse(null);
        Train train = trainRepository.findByNumber(spec.trainNumber()).orElse(null);
        if (user == null || train == null) {
            return false;
        }
        if (journeyRepository.existsByUserIdAndTitle(user.getId(), spec.title())) {
            return false;
        }
        List<TrainSchedule> stops =
                trainScheduleRepository.findByTrainNumberOrderByStopOrder(spec.trainNumber());
        TrainSchedule board = stops.stream()
                .filter(stop -> stop.getStation().getCode().equals(spec.from()))
                .findFirst().orElse(null);
        TrainSchedule alight = stops.stream()
                .filter(stop -> stop.getStation().getCode().equals(spec.to()))
                .findFirst().orElse(null);
        Station from = board == null ? null : board.getStation();
        Station to = alight == null ? null : alight.getStation();
        TrainClass trainClass = trainClassRepository
                .findByTrainNumberAndClassCode(spec.trainNumber(), spec.classCode())
                .orElse(null);
        if (from == null || to == null || trainClass == null
                || board.getDepartureTime() == null || alight.getArrivalTime() == null) {
            return false;
        }

        seatInventoryService.ensureInventory(spec.trainNumber(), spec.travelDate());
        List<SeatInventory> seats =
                availableSeats(spec.trainNumber(), spec.travelDate(), spec.classCode(),
                        spec.passengers().size());
        if (seats.size() < spec.passengers().size()) {
            log.warn("Not enough demo seats for {}", spec.title());
            return false;
        }

        TrainSchedule first = stops.get(0);
        TrainSchedule last = stops.get(stops.size() - 1);
        int routeKm = last.getDistanceKm() - first.getDistanceKm();
        int segmentKm = alight.getDistanceKm() - board.getDistanceKm();
        BigDecimal perPassenger = Fares.quotaFare(
                Fares.segmentFare(trainClass.getBaseFare(), segmentKm, routeKm), Quota.GENERAL);
        Fares.Quote quote = Fares.quote(perPassenger, spec.classCode(), spec.passengers().size());

        LocalDateTime boardingTime = spec.travelDate().atTime(board.getDepartureTime())
                .plusDays(board.getDayOffset());
        LocalDateTime arrivalTime = spec.travelDate().atTime(alight.getArrivalTime())
                .plusDays(alight.getDayOffset());
        LocalDateTime createdAt = boardingTime.minusDays(4);

        Booking booking = Booking.create(bookingService.generatePnr(), user.getId(), train,
                spec.travelDate(), from, to, boardingTime, arrivalTime, spec.classCode(),
                Quota.GENERAL, quote, user.getEmail(), spec.contactMobile(), createdAt);
        for (int index = 0; index < spec.passengers().size(); index++) {
            DemoPassenger passenger = spec.passengers().get(index);
            SeatInventory seat = seats.get(index);
            String coachNo = seat.getCoach().getCoachNo();
            booking.addPassenger(BookingPassenger.create(passenger.name(), passenger.age(),
                    passenger.gender(), passenger.berthPreference(), seat.getId(),
                    "%s-%02d, %s".formatted(coachNo, seat.getSeatNo(),
                            BerthTypes.label(seat.getBerthType())), coachNo));
            seat.confirm();
        }
        Booking saved = bookingRepository.saveAndFlush(booking);
        seatInventoryRepository.saveAll(seats);
        seatInventoryRepository.flush();
        Journey journey = journeyRepository.saveAndFlush(
                Journey.create(user.getId(), saved, spec.title(), null, createdAt));

        if (spec.state() == State.CANCELLED) {
            journeyService.cancel(journey.getId(), user.getId());
        }
        return true;
    }

    private List<SeatInventory> availableSeats(String trainNumber, LocalDate travelDate,
                                               String classCode, int wanted) {
        List<SeatInventory> picked = new ArrayList<>(wanted);
        for (Coach coach : coachRepository
                .findByTrainNumberAndClassCodeOrderByCoachNoAsc(trainNumber, classCode)) {
            for (SeatInventory seat : seatInventoryRepository
                    .findByTrainNumberAndTravelDateAndCoachIdOrderBySeatNoAsc(
                            trainNumber, travelDate, coach.getId())) {
                if (seat.getStatus() == SeatStatus.AVAILABLE) {
                    picked.add(seat);
                    if (picked.size() == wanted) {
                        return picked;
                    }
                }
            }
        }
        return picked;
    }

    private enum State {
        CONFIRMED,
        CANCELLED
    }

    private record DemoPassenger(String name, int age, Gender gender, String berthPreference) {
    }

    private record DemoJourney(String email, String trainNumber, String from, String to,
                               String classCode, LocalDate travelDate, String title, State state,
                               List<DemoPassenger> passengers, String contactMobile) {
    }
}
