package com.trainconcierge.disruption;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.booking.BookingPassenger;
import com.trainconcierge.booking.BookingRepository;
import com.trainconcierge.booking.BookingStatus;
import com.trainconcierge.booking.Journey;
import com.trainconcierge.booking.JourneyRepository;
import com.trainconcierge.booking.JourneyStatus;
import com.trainconcierge.booking.JourneyStatuses;
import com.trainconcierge.catalog.BusTrip;
import com.trainconcierge.catalog.BusTripRepository;
import com.trainconcierge.catalog.Station;
import com.trainconcierge.catalog.StationRepository;
import com.trainconcierge.catalog.Train;
import com.trainconcierge.catalog.TrainRepository;
import com.trainconcierge.common.audit.AuditService;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.disruption.dto.DisruptionDetailResponse;
import com.trainconcierge.disruption.dto.DisruptionListItemResponse;
import com.trainconcierge.disruption.dto.DisruptionPreviewResponse;
import com.trainconcierge.disruption.dto.DisruptionRequest;
import com.trainconcierge.disruption.dto.DisruptionUpdateRequest;
import com.trainconcierge.disruption.dto.ImpactDetailResponse;
import com.trainconcierge.disruption.dto.JourneyImpactResponse;
import com.trainconcierge.disruption.dto.PassengerDisruptionDetailResponse;
import com.trainconcierge.disruption.dto.PassengerDisruptionResponse;
import com.trainconcierge.disruption.dto.RecommendationResponse;
import com.trainconcierge.disruption.dto.TrainSuggestionResponse;
import com.trainconcierge.disruption.event.DisruptionCreatedEvent;
import com.trainconcierge.disruption.event.DisruptionResolvedEvent;
import com.trainconcierge.disruption.event.DisruptionUpdatedEvent;
import com.trainconcierge.travel.TravelClasses;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class DisruptionService {

    private final DisruptionRepository disruptionRepository;
    private final TrainRepository trainRepository;
    private final StationRepository stationRepository;
    private final BookingRepository bookingRepository;
    private final JourneyRepository journeyRepository;
    private final JourneyImpactRepository impactRepository;
    private final RecommendationRepository recommendationRepository;
    private final BusTripRepository busTripRepository;
    private final AuditService auditService;
    private final ApplicationEventPublisher eventPublisher;

    public DisruptionService(DisruptionRepository disruptionRepository,
                             TrainRepository trainRepository,
                             StationRepository stationRepository,
                             BookingRepository bookingRepository,
                             JourneyRepository journeyRepository,
                             JourneyImpactRepository impactRepository,
                             RecommendationRepository recommendationRepository,
                             BusTripRepository busTripRepository,
                             AuditService auditService,
                             ApplicationEventPublisher eventPublisher) {
        this.disruptionRepository = disruptionRepository;
        this.trainRepository = trainRepository;
        this.stationRepository = stationRepository;
        this.bookingRepository = bookingRepository;
        this.journeyRepository = journeyRepository;
        this.impactRepository = impactRepository;
        this.recommendationRepository = recommendationRepository;
        this.busTripRepository = busTripRepository;
        this.auditService = auditService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public DisruptionPreviewResponse preview(DisruptionRequest request) {
        Validated validated = validate(request);
        List<Booking> bookings = bookingRepository.findForTrainAndDate(
                validated.train().getNumber(), validated.travelDate(), BookingStatus.CONFIRMED);
        int passengers = bookings.stream().mapToInt(booking -> booking.getPassengers().size()).sum();
        String message = "Will affect " + passengers + " confirmed passenger"
                + (passengers == 1 ? "" : "s");
        return new DisruptionPreviewResponse(passengers, bookings.size(), message);
    }

    @Transactional
    public DisruptionDetailResponse create(DisruptionRequest request, Long actorId) {
        Validated validated = validate(request);
        if (disruptionRepository.existsByTrain_NumberAndTravelDateAndStatus(
                validated.train().getNumber(), validated.travelDate(), DisruptionStatus.ACTIVE)) {
            throw new ApiException(HttpStatus.CONFLICT, "DISRUPTION_ALREADY_ACTIVE",
                    "An active disruption already exists for this train and date.");
        }
        Disruption disruption = disruptionRepository.save(Disruption.create(
                validated.train(), validated.travelDate(), validated.type(),
                validated.delayMinutes(), validated.reason(), validated.severity(), actorId,
                LocalDateTime.now()));
        auditService.record(actorId, "DISRUPTION_CREATED", "DISRUPTION", disruption.getId(),
                disruption.getTrainNumber() + " on " + disruption.getTravelDate());
        eventPublisher.publishEvent(new DisruptionCreatedEvent(disruption.getId()));
        return detail(disruption);
    }

    @Transactional(readOnly = true)
    public List<DisruptionListItemResponse> list(String statusParam, String train, LocalDate date) {
        DisruptionStatus status = parseStatus(statusParam);
        String needle = train == null || train.isBlank() ? null : train.trim();
        return disruptionRepository.search(status, needle, date).stream()
                .map(this::listItem)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrainSuggestionResponse> searchTrains(String query) {
        String needle = query == null ? "" : query.trim();
        if (needle.isEmpty()) {
            return List.of();
        }
        return trainRepository.search(needle, PageRequest.of(0, 10)).stream()
                .map(train -> new TrainSuggestionResponse(train.getNumber(), train.getName(),
                        train.getRunsOn()))
                .toList();
    }

    @Transactional(readOnly = true)
    public DisruptionDetailResponse detail(Long id) {
        return detail(require(id));
    }

    @Transactional(readOnly = true)
    public List<ImpactDetailResponse> impacts(Long id) {
        Disruption disruption = require(id);
        return impactRepository.findByDisruptionIdOrderByCreatedAtAsc(disruption.getId()).stream()
                .map(this::impactDetail)
                .toList();
    }

    @Transactional
    public DisruptionDetailResponse update(Long id, DisruptionUpdateRequest request,
                                           Long actorId) {
        Disruption disruption = require(id);
        if (!disruption.isActive()) {
            throw new ApiException(HttpStatus.CONFLICT, "DISRUPTION_RESOLVED",
                    "This disruption has already been resolved.");
        }
        Integer delay = disruption.getDelayMinutes();
        if (request.delayMinutes() != null) {
            if (disruption.isCancellation()) {
                if (request.delayMinutes() != 0) {
                    throw ApiException.validation("delayMinutes",
                            "A cancellation has no delay.");
                }
                delay = null;
            } else {
                delay = validateDelay(request.delayMinutes());
            }
        }
        String reason = request.reason() == null ? disruption.getReason()
                : validateReason(request.reason());
        disruption.update(delay, reason);
        disruptionRepository.save(disruption);
        auditService.record(actorId, "DISRUPTION_UPDATED", "DISRUPTION", disruption.getId(),
                "delay=" + (delay == null ? "none" : delay));
        eventPublisher.publishEvent(new DisruptionUpdatedEvent(disruption.getId()));
        return detail(disruption);
    }

    @Transactional
    public DisruptionDetailResponse resolve(Long id, Long actorId) {
        Disruption disruption = require(id);
        if (disruption.isActive()) {
            disruption.resolve(actorId, LocalDateTime.now());
            disruptionRepository.save(disruption);
            for (JourneyImpact impact : impactRepository
                    .findByDisruptionIdOrderByCreatedAtAsc(disruption.getId())) {
                Journey journey = impact.getJourney();
                journey.restoreAfterResolution();
                journeyRepository.save(journey);
            }
            auditService.record(actorId, "DISRUPTION_RESOLVED", "DISRUPTION", disruption.getId(),
                    disruption.getTrainNumber() + " on " + disruption.getTravelDate());
            eventPublisher.publishEvent(new DisruptionResolvedEvent(disruption.getId()));
        }
        return detail(disruption);
    }

    @Transactional(readOnly = true)
    public List<PassengerDisruptionResponse> mine(Long userId, String statusParam) {
        DisruptionStatus status = parseStatus(statusParam);
        LocalDateTime now = LocalDateTime.now();
        return impactRepository.findForUser(userId, status).stream()
                .map(impact -> passengerResponse(impact, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public PassengerDisruptionDetailResponse passengerDetail(Long id, Long userId) {
        List<JourneyImpact> impacts = impactRepository
                .findByDisruptionIdOrderByCreatedAtAsc(id).stream()
                .filter(impact -> impact.getBooking().getUserId().equals(userId))
                .toList();
        if (impacts.isEmpty()) {
            throw ApiException.notFound();
        }
        Disruption disruption = impacts.get(0).getDisruption();
        LocalDateTime now = LocalDateTime.now();
        return new PassengerDisruptionDetailResponse(
                disruption.getId(),
                disruption.getTrainNumber(),
                disruption.getTrain().getName(),
                disruption.getTravelDate(),
                disruption.getType().name(),
                disruption.getDelayMinutes(),
                disruption.getReason(),
                disruption.getSeverity().name(),
                disruption.getStatus().name(),
                disruption.getCreatedAt(),
                impacts.stream().map(impact -> passengerResponse(impact, now)).toList());
    }

    @Transactional(readOnly = true)
    public JourneyImpactResponse journeyImpact(Long journeyId, Long userId) {
        journeyRepository.findByIdAndUserId(journeyId, userId).orElseThrow(ApiException::notFound);
        JourneyImpact impact = impactRepository
                .findFirstByJourneyIdOrderByCreatedAtDesc(journeyId)
                .orElseThrow(ApiException::notFound);
        Booking booking = impact.getBooking();
        Disruption disruption = impact.getDisruption();
        String refundNote = disruption.isCancellation()
                ? "Full refund applies to your original ticket." : null;
        return new JourneyImpactResponse(
                impact.getId(),
                disruption.getId(),
                disruption.getStatus().name(),
                disruption.getType().name(),
                disruption.getSeverity().name(),
                booking.getTrain().getNumber(),
                booking.getTrain().getName(),
                booking.getFromStation().getCode(),
                booking.getFromStation().getName(),
                booking.getToStation().getCode(),
                booking.getToStation().getName(),
                impact.getOriginalArrival(),
                impact.getNewArrival(),
                impact.getDelayMinutes(),
                impact.isMissedConnection(),
                impact.isOvernight(),
                impact.isNeedsHotel(),
                impact.getImpactLevel().name(),
                impact.getSummary(),
                refundNote);
    }

    @Transactional(readOnly = true)
    public List<RecommendationResponse> recommendations(Long journeyId, Long userId,
                                                        String kindParam) {
        journeyRepository.findByIdAndUserId(journeyId, userId).orElseThrow(ApiException::notFound);
        JourneyImpact impact = impactRepository
                .findFirstByJourneyIdOrderByCreatedAtDesc(journeyId)
                .orElseThrow(ApiException::notFound);
        RecommendationKind kind = parseKind(kindParam);
        boolean active = impact.getDisruption().isActive();
        Map<String, Station> stations = stationByCode();
        Map<String, Train> trains = new HashMap<>();
        trainRepository.findAll().forEach(train -> trains.put(train.getNumber(), train));
        List<RecommendationResponse> responses = new ArrayList<>();
        for (Recommendation recommendation : recommendationRepository
                .findByImpactIdOrderByRankAsc(impact.getId())) {
            if (kind != null && recommendation.getKind() != kind) {
                continue;
            }
            String refName = null;
            if (recommendation.getKind() == RecommendationKind.TRAIN
                    && recommendation.getRefTrainNumber() != null) {
                Train train = trains.get(recommendation.getRefTrainNumber());
                refName = train == null ? null : train.getName();
            } else if (recommendation.getKind() == RecommendationKind.BUS
                    && recommendation.getRefBusTripId() != null) {
                BusTrip trip = busTripRepository.findWithService(
                        recommendation.getRefBusTripId()).orElse(null);
                refName = trip == null ? null : trip.getService().getOperator();
            }
            Station from = stations.get(recommendation.getFromStation());
            Station to = stations.get(recommendation.getToStation());
            responses.add(new RecommendationResponse(
                    recommendation.getId(),
                    recommendation.getKind().name(),
                    recommendation.getRefTrainNumber(),
                    refName,
                    recommendation.getRefBusTripId(),
                    recommendation.getClassCode(),
                    recommendation.getClassCode() == null ? null
                            : TravelClasses.name(recommendation.getClassCode()),
                    recommendation.getFromStation(),
                    from == null ? null : from.getName(),
                    recommendation.getToStation(),
                    to == null ? null : to.getName(),
                    recommendation.getDepartureAt(),
                    recommendation.getArrivalAt(),
                    recommendation.getFare(),
                    recommendation.getSeatsAvailable(),
                    recommendation.getScore(),
                    recommendation.getRank(),
                    recommendation.isRecommended(),
                    recommendation.getReasons(),
                    recommendation.getWarnings(),
                    active));
        }
        responses.sort(Comparator.comparingInt(RecommendationResponse::rank));
        return responses;
    }

    private DisruptionDetailResponse detail(Disruption disruption) {
        List<JourneyImpact> impacts = impactRepository
                .findByDisruptionIdOrderByCreatedAtAsc(disruption.getId());
        int recommendationCount = impacts.stream()
                .mapToInt(impact -> Math.toIntExact(
                        recommendationRepository.countByImpactId(impact.getId())))
                .sum();
        int affectedPassengers = impacts.stream()
                .mapToInt(impact -> impact.getBooking().getPassengers().size())
                .sum();
        return new DisruptionDetailResponse(
                disruption.getId(),
                disruption.getTrainNumber(),
                disruption.getTrain().getName(),
                disruption.getTravelDate(),
                disruption.getType().name(),
                disruption.getDelayMinutes(),
                disruption.getReason(),
                disruption.getSeverity().name(),
                disruption.getStatus().name(),
                affectedPassengers,
                impacts.size(),
                recommendationCount,
                disruption.getCreatedAt(),
                disruption.getResolvedAt(),
                impacts.stream().map(this::impactDetail).toList());
    }

    private DisruptionListItemResponse listItem(Disruption disruption) {
        List<JourneyImpact> impacts = impactRepository
                .findByDisruptionIdOrderByCreatedAtAsc(disruption.getId());
        int recommendationCount = impacts.stream()
                .mapToInt(impact -> Math.toIntExact(
                        recommendationRepository.countByImpactId(impact.getId())))
                .sum();
        int affectedPassengers = impacts.stream()
                .mapToInt(impact -> impact.getBooking().getPassengers().size())
                .sum();
        return new DisruptionListItemResponse(
                disruption.getId(),
                disruption.getTrainNumber(),
                disruption.getTrain().getName(),
                disruption.getTravelDate(),
                disruption.getType().name(),
                disruption.getDelayMinutes(),
                disruption.getReason(),
                disruption.getSeverity().name(),
                disruption.getStatus().name(),
                affectedPassengers,
                impacts.size(),
                recommendationCount,
                disruption.getCreatedAt(),
                disruption.getResolvedAt());
    }

    private ImpactDetailResponse impactDetail(JourneyImpact impact) {
        Booking booking = impact.getBooking();
        return new ImpactDetailResponse(
                impact.getId(),
                impact.getJourney().getId(),
                booking.getId(),
                booking.getPnr(),
                booking.getPassengers().stream().map(BookingPassenger::getName).toList(),
                booking.getFromStation().getCode(),
                booking.getFromStation().getName(),
                booking.getToStation().getCode(),
                booking.getToStation().getName(),
                impact.getOriginalArrival(),
                impact.getNewArrival(),
                impact.getDelayMinutes(),
                impact.isMissedConnection(),
                impact.isOvernight(),
                impact.isNeedsHotel(),
                impact.getImpactLevel().name(),
                impact.getSummary(),
                Math.toIntExact(recommendationRepository.countByImpactId(impact.getId())));
    }

    private PassengerDisruptionResponse passengerResponse(JourneyImpact impact,
                                                          LocalDateTime now) {
        Booking booking = impact.getBooking();
        Journey journey = impact.getJourney();
        Disruption disruption = impact.getDisruption();
        JourneyStatus status = JourneyStatuses.effective(journey.getStoredStatus(),
                booking.getBoardingTime(), booking.getArrivalTime(), now);
        return new PassengerDisruptionResponse(
                disruption.getId(),
                impact.getId(),
                journey.getId(),
                booking.getTrain().getNumber(),
                booking.getTrain().getName(),
                booking.getTravelDate(),
                booking.getFromStation().getCode(),
                booking.getFromStation().getName(),
                booking.getToStation().getCode(),
                booking.getToStation().getName(),
                disruption.getType().name(),
                disruption.getDelayMinutes(),
                disruption.getReason(),
                disruption.getSeverity().name(),
                disruption.getStatus().name(),
                impact.getImpactLevel().name(),
                impact.getSummary(),
                impact.getOriginalArrival(),
                impact.getNewArrival(),
                impact.isMissedConnection(),
                impact.isOvernight(),
                impact.isNeedsHotel(),
                status.name(),
                disruption.getCreatedAt());
    }

    private Map<String, Station> stationByCode() {
        Map<String, Station> stations = new HashMap<>();
        stationRepository.findAll().forEach(station -> stations.put(station.getCode(), station));
        return stations;
    }

    private Validated validate(DisruptionRequest request) {
        if (request == null) {
            throw ApiException.validation("trainNumber", "Choose a train.");
        }
        String number = request.trainNumber() == null ? ""
                : request.trainNumber().trim().toUpperCase(Locale.ROOT);
        if (number.isEmpty()) {
            throw ApiException.validation("trainNumber", "Choose a train.");
        }
        Train train = trainRepository.findByNumber(number)
                .orElseThrow(() -> ApiException.validation("trainNumber",
                        "That train is not in the catalog."));
        if (request.travelDate() == null) {
            throw ApiException.validation("travelDate", "Choose a travel date.");
        }
        if (!runsOn(train, request.travelDate())) {
            throw ApiException.validation("travelDate",
                    "This train does not run on the selected date.");
        }
        DisruptionType type = parseType(request.type());
        Integer delay = null;
        if (type == DisruptionType.DELAY) {
            delay = validateDelay(request.delayMinutes());
        } else if (request.delayMinutes() != null && request.delayMinutes() != 0) {
            throw ApiException.validation("delayMinutes", "A cancellation has no delay.");
        }
        String reason = validateReason(request.reason());
        DisruptionSeverity severity = parseSeverity(request.severity());
        return new Validated(train, request.travelDate(), type, delay, reason, severity);
    }

    private static Integer validateDelay(Integer delayMinutes) {
        if (delayMinutes == null) {
            throw ApiException.validation("delayMinutes", "Enter the delay in minutes.");
        }
        if (delayMinutes < 5 || delayMinutes > 1440) {
            throw ApiException.validation("delayMinutes",
                    "The delay must be between 5 minutes and 24 hours.");
        }
        return delayMinutes;
    }

    private static String validateReason(String value) {
        String reason = value == null ? "" : value.trim();
        if (reason.isEmpty()) {
            throw ApiException.validation("reason", "Choose or enter a reason.");
        }
        if (reason.length() > 190) {
            throw ApiException.validation("reason", "Keep the reason under 190 characters.");
        }
        return reason;
    }

    private static DisruptionType parseType(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        try {
            return DisruptionType.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw ApiException.validation("type", "Choose delay or cancellation.");
        }
    }

    private static DisruptionSeverity parseSeverity(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        try {
            return DisruptionSeverity.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw ApiException.validation("severity", "Choose low, medium or high severity.");
        }
    }

    private static DisruptionStatus parseStatus(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("ALL")) {
            return null;
        }
        try {
            return DisruptionStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.validation("status", "Choose a valid disruption status.");
        }
    }

    private static RecommendationKind parseKind(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("ALL")) {
            return null;
        }
        try {
            return RecommendationKind.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.validation("kind", "Choose trains, buses or waiting.");
        }
    }

    private static boolean runsOn(Train train, LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        String shortName = day.name().substring(0, 3);
        return java.util.Arrays.stream(train.getRunsOn().split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .anyMatch(value -> value.equalsIgnoreCase(shortName));
    }

    private Disruption require(Long id) {
        return disruptionRepository.findById(id).orElseThrow(ApiException::notFound);
    }

    private record Validated(Train train, LocalDate travelDate, DisruptionType type,
                             Integer delayMinutes, String reason, DisruptionSeverity severity) {
    }
}
