package com.trainconcierge.booking;

import com.trainconcierge.booking.dto.JourneyCancelResponse;
import com.trainconcierge.booking.dto.JourneyDetailResponse;
import com.trainconcierge.booking.dto.JourneyDisruptionResponse;
import com.trainconcierge.booking.dto.JourneyListItemResponse;
import com.trainconcierge.booking.dto.JourneyListResponse;
import com.trainconcierge.booking.dto.JourneyPassengerResponse;
import com.trainconcierge.booking.dto.JourneyRouteStopResponse;
import com.trainconcierge.booking.dto.JourneySummaryResponse;
import com.trainconcierge.booking.dto.JourneyUpdateRequest;
import com.trainconcierge.booking.dto.RefundResponse;
import com.trainconcierge.catalog.TrainSchedule;
import com.trainconcierge.catalog.TrainScheduleRepository;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.disruption.Disruption;
import com.trainconcierge.disruption.ImpactText;
import com.trainconcierge.disruption.JourneyImpact;
import com.trainconcierge.disruption.JourneyImpactRepository;
import com.trainconcierge.travel.SeatInventory;
import com.trainconcierge.travel.SeatInventoryRepository;
import com.trainconcierge.travel.SeatStatus;
import com.trainconcierge.travel.TravelClasses;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class JourneyService {

    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm");

    private final JourneyRepository journeyRepository;
    private final BookingRepository bookingRepository;
    private final SeatInventoryRepository seatInventoryRepository;
    private final TrainScheduleRepository trainScheduleRepository;
    private final JourneyImpactRepository journeyImpactRepository;

    public JourneyService(JourneyRepository journeyRepository, BookingRepository bookingRepository,
                          SeatInventoryRepository seatInventoryRepository,
                          TrainScheduleRepository trainScheduleRepository,
                          JourneyImpactRepository journeyImpactRepository) {
        this.journeyRepository = journeyRepository;
        this.bookingRepository = bookingRepository;
        this.seatInventoryRepository = seatInventoryRepository;
        this.trainScheduleRepository = trainScheduleRepository;
        this.journeyImpactRepository = journeyImpactRepository;
    }

    @Transactional(readOnly = true)
    public JourneyListResponse list(Long userId, String statusFilter, LocalDate from, LocalDate to,
                                    String query, int page, int size, String sortCode) {
        if (from != null && to != null && from.isAfter(to)) {
            throw ApiException.validation("from", "The start date must be before the end date.");
        }
        JourneyStatusFilter status = parseStatus(statusFilter);
        JourneySort sort = parseSort(sortCode);
        String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        int pageNumber = Math.max(1, page);
        int pageSize = Math.min(50, Math.max(1, size));
        LocalDateTime now = LocalDateTime.now();

        List<JourneyView> views = journeyRepository.findByUserId(userId).stream()
                .map(journey -> new JourneyView(journey,
                        BookingMappings.effectiveStatus(journey, now)))
                .filter(view -> status.matches(view.status()))
                .filter(view -> from == null
                        || !view.journey().getBooking().getTravelDate().isBefore(from))
                .filter(view -> to == null
                        || !view.journey().getBooking().getTravelDate().isAfter(to))
                .filter(view -> matches(view, needle))
                .collect(Collectors.toCollection(ArrayList::new));

        views.sort(comparator(sort));

        long totalItems = views.size();
        int totalPages = totalItems == 0 ? 0 : (int) Math.ceil((double) totalItems / pageSize);
        int start = Math.min((pageNumber - 1) * pageSize, views.size());
        int end = Math.min(start + pageSize, views.size());
        List<JourneyListItemResponse> items = views.subList(start, end).stream()
                .map(view -> itemResponse(view.journey(), view.status()))
                .toList();
        return new JourneyListResponse(items, pageNumber, pageSize, totalItems, totalPages,
                sort.name(), status.code(), now);
    }

    @Transactional(readOnly = true)
    public JourneySummaryResponse summary(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        int upcoming = 0;
        int active = 0;
        int needingAttention = 0;
        int completed = 0;
        int cancelled = 0;
        int disruptions = 0;
        List<Journey> journeys = journeyRepository.findByUserId(userId);
        for (Journey journey : journeys) {
            JourneyStatus status = BookingMappings.effectiveStatus(journey, now);
            switch (status) {
                case UPCOMING -> upcoming++;
                case ACTIVE -> active++;
                case COMPLETED -> completed++;
                case CANCELLED -> cancelled++;
                case DISRUPTED -> {
                    needingAttention++;
                    disruptions++;
                }
                case REBOOKED -> needingAttention++;
            }
        }
        return new JourneySummaryResponse(upcoming, active, needingAttention, completed, cancelled,
                disruptions, journeys.size());
    }

    @Transactional(readOnly = true)
    public JourneyDetailResponse detail(Long id, Long userId) {
        Journey journey = journeyRepository.findByIdAndUserId(id, userId)
                .orElseThrow(ApiException::notFound);
        return detailResponse(journey, LocalDateTime.now());
    }

    @Transactional
    public JourneyDetailResponse update(Long id, Long userId, JourneyUpdateRequest request) {
        Journey journey = journeyRepository.findByIdAndUserId(id, userId)
                .orElseThrow(ApiException::notFound);
        LocalDateTime now = LocalDateTime.now();
        JourneyStatus status = BookingMappings.effectiveStatus(journey, now);
        if (status == JourneyStatus.CANCELLED || status == JourneyStatus.COMPLETED
                || status == JourneyStatus.REBOOKED) {
            throw new ApiException(HttpStatus.CONFLICT, "JOURNEY_LOCKED",
                    "This journey can no longer be edited.");
        }
        if (request.title() != null) {
            journey.rename(trimToNull(request.title()));
        }
        if (request.notes() != null) {
            journey.updateNotes(trimToNull(request.notes()));
        }
        List<JourneyUpdateRequest.PassengerNameUpdate> updates = request.passengers();
        if (updates != null && !updates.isEmpty()) {
            if (status != JourneyStatus.UPCOMING) {
                throw new ApiException(HttpStatus.CONFLICT, "JOURNEY_LOCKED",
                        "Passenger names can only be changed before departure.");
            }
            Map<Long, BookingPassenger> byId = journey.getBooking().getPassengers().stream()
                    .collect(Collectors.toMap(BookingPassenger::getId, passenger -> passenger));
            for (JourneyUpdateRequest.PassengerNameUpdate update : updates) {
                BookingPassenger passenger = byId.get(update.id());
                if (passenger == null) {
                    throw ApiException.validation("passengers",
                            "Those passengers do not belong to this journey.");
                }
                passenger.rename(update.name().trim());
            }
            bookingRepository.save(journey.getBooking());
        }
        journeyRepository.save(journey);
        return detailResponse(journey, now);
    }

    @Transactional
    public JourneyCancelResponse cancel(Long id, Long userId) {
        Journey journey = journeyRepository.findByIdAndUserId(id, userId)
                .orElseThrow(ApiException::notFound);
        LocalDateTime now = LocalDateTime.now();
        JourneyStatus status = BookingMappings.effectiveStatus(journey, now);
        if (status == JourneyStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "JOURNEY_ALREADY_CANCELLED",
                    "This journey is already cancelled.");
        }
        if (status == JourneyStatus.COMPLETED) {
            throw new ApiException(HttpStatus.CONFLICT, "JOURNEY_COMPLETED",
                    "Completed journeys cannot be cancelled.");
        }
        Booking booking = journey.getBooking();
        RefundPolicy.Refund refund = RefundPolicy.estimate(booking.getTotalFare(),
                booking.getBoardingTime(), now);
        booking.cancel(now, refund);
        journey.cancel();
        releaseSeats(booking);
        bookingRepository.save(booking);
        journeyRepository.save(journey);
        return new JourneyCancelResponse(journey.getId(), booking.getPnr(),
                JourneyStatus.CANCELLED.name(),
                RefundResponse.of(refund.amount(), refund.percent()), now);
    }

    private void releaseSeats(Booking booking) {
        Set<Long> seatIds = booking.getPassengers().stream()
                .map(BookingPassenger::getSeatInventoryId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (seatIds.isEmpty()) {
            return;
        }
        List<SeatInventory> released = new ArrayList<>();
        for (SeatInventory seat : seatInventoryRepository.findAllById(seatIds)) {
            if (seat.getStatus() == SeatStatus.OCCUPIED) {
                seat.release();
                released.add(seat);
            }
        }
        if (!released.isEmpty()) {
            seatInventoryRepository.saveAll(released);
        }
    }

    private JourneyDetailResponse detailResponse(Journey journey, LocalDateTime now) {
        Booking booking = journey.getBooking();
        JourneyStatus status = BookingMappings.effectiveStatus(journey, now);
        Map<Long, SeatInventory> seats = seatsFor(booking);
        List<JourneyPassengerResponse> passengers = booking.getPassengers().stream()
                .map(passenger -> BookingMappings.journeyPassenger(passenger,
                        seats.get(passenger.getSeatInventoryId())))
                .toList();
        return new JourneyDetailResponse(
                journey.getId(),
                booking.getPnr(),
                journey.getTitle(),
                journey.getNotes(),
                status.name(),
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
                passengers,
                BookingMappings.fare(booking),
                route(booking),
                booking.getContactEmail(),
                booking.getContactMobile(),
                booking.getCreatedAt(),
                booking.getCancelledAt(),
                RefundResponse.of(booking.getRefundAmount(), booking.getRefundPercent()),
                disruptionResponse(journey),
                null);
    }

    private JourneyDisruptionResponse disruptionResponse(Journey journey) {
        if (journey.getDisruptionId() == null) {
            return null;
        }
        JourneyImpact impact = journeyImpactRepository
                .findFirstByJourneyIdOrderByCreatedAtDesc(journey.getId())
                .filter(candidate -> candidate.getDisruption().getId()
                        .equals(journey.getDisruptionId()))
                .orElse(null);
        if (impact == null) {
            return null;
        }
        Disruption disruption = impact.getDisruption();
        String title = disruption.isCancellation() ? "Cancelled"
                : "Delayed by " + ImpactText.duration(disruption.getDelayMinutesOrZero());
        return new JourneyDisruptionResponse(disruption.getId(), title,
                disruption.getStatus().name());
    }

    private List<JourneyRouteStopResponse> route(Booking booking) {
        List<TrainSchedule> stops = trainScheduleRepository
                .findByTrainNumberOrderByStopOrder(booking.getTrain().getNumber());
        return stops.stream()
                .map(stop -> new JourneyRouteStopResponse(
                        stop.getStation().getCode(),
                        stop.getStation().getName(),
                        stop.getArrivalTime() == null ? null : stop.getArrivalTime().format(CLOCK),
                        stop.getDepartureTime() == null ? null : stop.getDepartureTime().format(CLOCK),
                        stop.getDayOffset(),
                        stop.getDistanceKm(),
                        stop.getStation().getCode().equals(booking.getFromStation().getCode()),
                        stop.getStation().getCode().equals(booking.getToStation().getCode())))
                .toList();
    }

    private JourneyListItemResponse itemResponse(Journey journey, JourneyStatus status) {
        Booking booking = journey.getBooking();
        return new JourneyListItemResponse(
                journey.getId(),
                booking.getPnr(),
                journey.getTitle(),
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
                booking.getPassengers().stream().map(BookingPassenger::getSeatLabel).toList(),
                status.name(),
                booking.getStatus().name(),
                booking.getTotalFare(),
                booking.getRefundAmount(),
                booking.getRefundPercent(),
                booking.getCreatedAt());
    }

    private Map<Long, SeatInventory> seatsFor(Booking booking) {
        Set<Long> ids = booking.getPassengers().stream()
                .map(BookingPassenger::getSeatInventoryId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, SeatInventory> seats = new LinkedHashMap<>();
        for (SeatInventory seat : seatInventoryRepository.findAllById(ids)) {
            seats.put(seat.getId(), seat);
        }
        return seats;
    }

    private static boolean matches(JourneyView view, String needle) {
        if (needle.isEmpty()) {
            return true;
        }
        Booking booking = view.journey().getBooking();
        return contains(booking.getPnr(), needle)
                || contains(booking.getTrain().getNumber(), needle)
                || contains(booking.getTrain().getName(), needle)
                || contains(booking.getFromStation().getCode(), needle)
                || contains(booking.getFromStation().getName(), needle)
                || contains(booking.getFromStation().getCity(), needle)
                || contains(booking.getToStation().getCode(), needle)
                || contains(booking.getToStation().getName(), needle)
                || contains(booking.getToStation().getCity(), needle)
                || contains(view.journey().getTitle(), needle);
    }

    private static boolean contains(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }

    private static Comparator<JourneyView> comparator(JourneySort sort) {
        return switch (sort) {
            case TRAVEL_DATE_ASC -> Comparator
                    .comparing((JourneyView view) -> view.journey().getBooking().getBoardingTime())
                    .thenComparing(view -> view.journey().getId());
            case TRAVEL_DATE_DESC -> Comparator
                    .comparing((JourneyView view) -> view.journey().getBooking().getBoardingTime())
                    .reversed();
            case CREATED_DESC -> Comparator
                    .comparing((JourneyView view) -> view.journey().getCreatedAt())
                    .reversed();
        };
    }

    private static JourneyStatusFilter parseStatus(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("ALL")) {
            return JourneyStatusFilter.all();
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (normalized.equals("NEEDS_ATTENTION")) {
            return new JourneyStatusFilter("NEEDS_ATTENTION",
                    EnumSet.of(JourneyStatus.DISRUPTED, JourneyStatus.REBOOKED));
        }
        try {
            return new JourneyStatusFilter(JourneyStatus.valueOf(normalized).name(),
                    EnumSet.of(JourneyStatus.valueOf(normalized)));
        } catch (IllegalArgumentException ex) {
            throw ApiException.validation("status", "Choose a valid journey status.");
        }
    }

    private static JourneySort parseSort(String value) {
        if (value == null || value.isBlank()) {
            return JourneySort.TRAVEL_DATE_ASC;
        }
        try {
            return JourneySort.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return JourneySort.TRAVEL_DATE_ASC;
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record JourneyView(Journey journey, JourneyStatus status) {
    }

    private record JourneyStatusFilter(String code, Set<JourneyStatus> statuses) {

        static JourneyStatusFilter all() {
            return new JourneyStatusFilter("ALL", Set.of());
        }

        boolean matches(JourneyStatus status) {
            return statuses.isEmpty() || statuses.contains(status);
        }
    }
}
