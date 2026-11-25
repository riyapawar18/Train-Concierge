package com.trainconcierge.booking;

import com.trainconcierge.booking.dto.BookingPassengerRequest;
import com.trainconcierge.booking.dto.BookingPassengerResponse;
import com.trainconcierge.booking.dto.BookingRequest;
import com.trainconcierge.booking.dto.BookingResponse;
import com.trainconcierge.booking.dto.RefundResponse;
import com.trainconcierge.catalog.Station;
import com.trainconcierge.catalog.StationRepository;
import com.trainconcierge.catalog.Train;
import com.trainconcierge.catalog.TrainClass;
import com.trainconcierge.catalog.TrainClassRepository;
import com.trainconcierge.catalog.TrainRepository;
import com.trainconcierge.catalog.TrainSchedule;
import com.trainconcierge.catalog.TrainScheduleRepository;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.notification.NotificationService;
import com.trainconcierge.travel.BerthTypes;
import com.trainconcierge.travel.Fares;
import com.trainconcierge.travel.Quota;
import com.trainconcierge.travel.SeatInventory;
import com.trainconcierge.travel.SeatInventoryRepository;
import com.trainconcierge.travel.SeatInventoryService;
import com.trainconcierge.travel.SeatStatus;
import com.trainconcierge.travel.TravelClasses;
import com.trainconcierge.travel.TravelDateValidator;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private static final SecureRandom PNR_RANDOM = new SecureRandom();

    private final BookingRepository bookingRepository;
    private final JourneyRepository journeyRepository;
    private final TrainRepository trainRepository;
    private final StationRepository stationRepository;
    private final TrainClassRepository trainClassRepository;
    private final TrainScheduleRepository trainScheduleRepository;
    private final SeatInventoryRepository seatInventoryRepository;
    private final TravelDateValidator travelDateValidator;
    private final NotificationService notificationService;

    public BookingService(BookingRepository bookingRepository,
                          JourneyRepository journeyRepository,
                          TrainRepository trainRepository,
                          StationRepository stationRepository,
                          TrainClassRepository trainClassRepository,
                          TrainScheduleRepository trainScheduleRepository,
                          SeatInventoryRepository seatInventoryRepository,
                          TravelDateValidator travelDateValidator,
                          NotificationService notificationService) {
        this.bookingRepository = bookingRepository;
        this.journeyRepository = journeyRepository;
        this.trainRepository = trainRepository;
        this.stationRepository = stationRepository;
        this.trainClassRepository = trainClassRepository;
        this.trainScheduleRepository = trainScheduleRepository;
        this.seatInventoryRepository = seatInventoryRepository;
        this.travelDateValidator = travelDateValidator;
        this.notificationService = notificationService;
    }

    @Transactional
    public BookingResponse book(BookingRequest request, Long userId) {
        String trainNumber = normalize(request.trainNumber());
        Train train = trainRepository.findByNumber(trainNumber).orElseThrow(ApiException::notFound);
        LocalDate travelDate = travelDateValidator.requireValid(request.date());
        String classCode = TravelClasses.normalize(request.classCode());
        if (!TravelClasses.isKnown(classCode)) {
            throw ApiException.validation("classCode", "Choose a valid travel class.");
        }
        Quota quota = request.quota() == null ? Quota.GENERAL : request.quota();
        List<BookingPassengerRequest> passengers = request.passengers();
        List<Long> holdIds = request.holdIds();
        if (holdIds.size() != passengers.size()) {
            throw ApiException.validation("holdIds", "Select one seat for each passenger.");
        }
        if (new HashSet<>(holdIds).size() != holdIds.size()) {
            throw ApiException.validation("holdIds", "Each seat can be booked only once.");
        }
        if (passengers.size() > 6) {
            throw ApiException.validation("passengers", "A booking can include up to 6 passengers.");
        }

        Map<Long, SeatInventory> holds = loadHolds(holdIds, userId, trainNumber, travelDate, classCode);

        Station from = stationRepository.findById(normalize(request.from()))
                .orElseThrow(() -> ApiException.validation("from", "Choose a boarding station."));
        Station to = stationRepository.findById(normalize(request.to()))
                .orElseThrow(() -> ApiException.validation("to", "Choose a destination station."));
        if (from.getCode().equals(to.getCode())) {
            throw ApiException.validation("to", "Origin and destination must be different.");
        }

        List<TrainSchedule> stops = trainScheduleRepository.findByTrainNumberOrderByStopOrder(trainNumber);
        TrainSchedule board = stops.stream()
                .filter(stop -> stop.getStation().getCode().equals(from.getCode()))
                .findFirst()
                .filter(stop -> stop.getDepartureTime() != null)
                .orElseThrow(() -> ApiException.validation("from", "This train does not board at that station."));
        TrainSchedule alight = stops.stream()
                .filter(stop -> stop.getStation().getCode().equals(to.getCode()))
                .findFirst()
                .filter(stop -> stop.getArrivalTime() != null)
                .orElseThrow(() -> ApiException.validation("to", "This train does not stop at that station."));
        if (board.getStopOrder() >= alight.getStopOrder()) {
            throw ApiException.validation("to", "Choose a destination after the boarding station.");
        }

        TrainClass trainClass = trainClassRepository
                .findByTrainNumberAndClassCode(trainNumber, classCode)
                .orElseThrow(ApiException::notFound);
        TrainSchedule first = stops.get(0);
        TrainSchedule last = stops.get(stops.size() - 1);
        int routeKm = last.getDistanceKm() - first.getDistanceKm();
        int segmentKm = alight.getDistanceKm() - board.getDistanceKm();
        BigDecimal perPassenger = Fares.quotaFare(
                Fares.segmentFare(trainClass.getBaseFare(), segmentKm, routeKm), quota);
        Fares.Quote quote = Fares.quote(perPassenger, classCode, passengers.size());

        LocalDateTime boardingTime = travelDate.atTime(board.getDepartureTime())
                .plusDays(board.getDayOffset());
        LocalDateTime arrivalTime = travelDate.atTime(alight.getArrivalTime())
                .plusDays(alight.getDayOffset());
        LocalDateTime now = LocalDateTime.now();

        Booking booking = Booking.create(generatePnr(), userId, train, travelDate, from, to,
                boardingTime, arrivalTime, classCode, quota, quote,
                normalizeContact(request.contactEmail()), normalizeContact(request.contactMobile()),
                now);

        for (int index = 0; index < passengers.size(); index++) {
            BookingPassengerRequest passenger = passengers.get(index);
            SeatInventory seat = holds.get(holdIds.get(index));
            Gender gender = Gender.parse(passenger.gender());
            if (gender == null) {
                throw ApiException.validation("passengers",
                        "Choose Male, Female or Other for each passenger.");
            }
            String coachNo = seat.getCoach().getCoachNo();
            String seatLabel = "%s-%02d, %s".formatted(coachNo, seat.getSeatNo(),
                    BerthTypes.label(seat.getBerthType()));
            booking.addPassenger(BookingPassenger.create(passenger.name().trim(), passenger.age(),
                    gender, null, seat.getId(), seatLabel, coachNo));
            seat.confirm();
        }

        try {
            Booking saved = bookingRepository.saveAndFlush(booking);
            seatInventoryRepository.saveAll(holds.values());
            seatInventoryRepository.flush();
            Journey journey = journeyRepository.saveAndFlush(
                    Journey.create(userId, saved, null, null, now));
            notificationService.onBookingConfirmed(saved);
            return response(saved, journey.getId());
        } catch (OptimisticLockingFailureException | DataIntegrityViolationException ex) {
            throw seatUnavailable();
        }
    }

    @Transactional(readOnly = true)
    public BookingResponse byPnr(String pnr, Long userId) {
        String normalized = pnr == null ? "" : pnr.trim();
        Booking booking = bookingRepository.findByPnrAndUserId(normalized, userId)
                .orElseThrow(ApiException::notFound);
        Long journeyId = journeyRepository.findByBookingId(booking.getId())
                .map(Journey::getId)
                .orElse(null);
        return response(booking, journeyId);
    }

    public String generatePnr() {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder candidate = new StringBuilder(10);
            candidate.append(1 + PNR_RANDOM.nextInt(9));
            for (int digit = 1; digit < 10; digit++) {
                candidate.append(PNR_RANDOM.nextInt(10));
            }
            String pnr = candidate.toString();
            if (!bookingRepository.existsByPnr(pnr)) {
                return pnr;
            }
        }
        throw new IllegalStateException("Could not allocate a unique PNR");
    }

    Map<Long, SeatInventory> loadHolds(List<Long> holdIds, Long userId, String trainNumber,
                                       LocalDate travelDate, String classCode) {
        if (holdIds.stream().anyMatch(Objects::isNull)) {
            throw ApiException.validation("holdIds", "Each seat can be booked only once.");
        }
        List<SeatInventory> seats = seatInventoryRepository.findAllById(holdIds);
        if (seats.size() != holdIds.size()) {
            throw new ApiException(HttpStatus.CONFLICT, "SEAT_HOLD_INVALID",
                    "One of your seat holds is no longer valid. Select the seats again.");
        }
        LocalDateTime now = SeatInventoryService.now();
        Map<Long, SeatInventory> byId = new LinkedHashMap<>();
        for (SeatInventory seat : seats) {
            if (!userId.equals(seat.getHeldBy()) || seat.getStatus() != SeatStatus.HELD) {
                throw new ApiException(HttpStatus.CONFLICT, "SEAT_HOLD_INVALID",
                        "One of your seat holds is no longer valid. Select the seats again.");
            }
            if (seat.getHeldUntil() == null || !seat.getHeldUntil().isAfter(now)) {
                throw new ApiException(HttpStatus.CONFLICT, "HOLD_EXPIRED",
                        "Your seat hold expired. Select the seats again to book.");
            }
            if (!seat.getTrainNumber().equals(trainNumber) || !seat.getTravelDate().equals(travelDate)) {
                throw new ApiException(HttpStatus.CONFLICT, "SEAT_HOLD_INVALID",
                        "Those seats belong to a different train or date.");
            }
            if (!seat.getCoach().getClassCode().equals(classCode)) {
                throw ApiException.validation("classCode",
                        "Choose the class that matches your held seats.");
            }
            byId.put(seat.getId(), seat);
        }
        return byId;
    }

    BookingResponse response(Booking booking) {
        Long journeyId = journeyRepository.findByBookingId(booking.getId())
                .map(Journey::getId)
                .orElse(null);
        return response(booking, journeyId);
    }

    private BookingResponse response(Booking booking, Long journeyId) {
        Map<Long, SeatInventory> seats = seatsFor(booking.getPassengers());
        List<BookingPassengerResponse> passengers = booking.getPassengers().stream()
                .map(passenger -> BookingMappings.passenger(passenger,
                        seats.get(passenger.getSeatInventoryId())))
                .toList();
        return new BookingResponse(
                booking.getId(),
                booking.getPnr(),
                journeyId,
                booking.getStatus().name(),
                booking.getTrain().getNumber(),
                booking.getTrain().getName(),
                booking.getTravelDate(),
                booking.getBoardingTime(),
                booking.getArrivalTime(),
                booking.getClassCode(),
                TravelClasses.name(booking.getClassCode()),
                booking.getQuota().name(),
                BookingMappings.station(booking.getFromStation()),
                BookingMappings.station(booking.getToStation()),
                booking.getPassengers().size(),
                passengers,
                BookingMappings.fare(booking),
                booking.getContactEmail(),
                booking.getContactMobile(),
                booking.getCreatedAt(),
                booking.getCancelledAt(),
                RefundResponse.of(booking.getRefundAmount(), booking.getRefundPercent()));
    }

    private Map<Long, SeatInventory> seatsFor(List<BookingPassenger> passengers) {
        Set<Long> ids = passengers.stream()
                .map(BookingPassenger::getSeatInventoryId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        return seatInventoryRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(SeatInventory::getId, seat -> seat));
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeContact(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static ApiException seatUnavailable() {
        return new ApiException(HttpStatus.CONFLICT, "SEAT_UNAVAILABLE",
                "Those seats were just taken. Refresh the seat map and try again.");
    }
}
