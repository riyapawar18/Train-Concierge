package com.trainconcierge.travel;

import com.trainconcierge.catalog.Train;
import com.trainconcierge.catalog.TrainRepository;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.travel.dto.SeatHoldRequest;
import com.trainconcierge.travel.dto.SeatHoldResponse;
import com.trainconcierge.travel.dto.SeatHoldsResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

@Service
public class SeatHoldService {

    private final SeatInventoryRepository seatInventoryRepository;
    private final CoachRepository coachRepository;
    private final TrainRepository trainRepository;
    private final SeatInventoryService seatInventoryService;
    private final SettingsService settingsService;
    private final TravelDateValidator travelDateValidator;

    public SeatHoldService(SeatInventoryRepository seatInventoryRepository,
                           CoachRepository coachRepository,
                           TrainRepository trainRepository,
                           SeatInventoryService seatInventoryService,
                           SettingsService settingsService,
                           TravelDateValidator travelDateValidator) {
        this.seatInventoryRepository = seatInventoryRepository;
        this.coachRepository = coachRepository;
        this.trainRepository = trainRepository;
        this.seatInventoryService = seatInventoryService;
        this.settingsService = settingsService;
        this.travelDateValidator = travelDateValidator;
    }

    @Transactional
    public SeatHoldResponse hold(SeatHoldRequest request, Long userId) {
        String trainNumber = request.trainNumber() == null
                ? "" : request.trainNumber().trim().toUpperCase(Locale.ROOT);
        Train train = trainRepository.findByNumber(trainNumber).orElseThrow(ApiException::notFound);
        LocalDate travelDate = travelDateValidator.requireValid(request.date());
        Coach coach = coachRepository.findByIdAndTrainNumber(request.coachId(), train.getNumber())
                .orElseThrow(ApiException::notFound);
        if (request.seatNo() == null || request.seatNo() < 1 || request.seatNo() > coach.getSeatCount()) {
            throw ApiException.validation("seatNo", "Choose a valid seat.");
        }

        seatInventoryService.ensureInventory(train.getNumber(), travelDate);
        seatInventoryService.releaseExpiredForTrain(train.getNumber(), travelDate);

        SeatInventory seat = seatInventoryRepository
                .findByTrainNumberAndTravelDateAndCoachIdAndSeatNo(
                        train.getNumber(), travelDate, coach.getId(), request.seatNo())
                .orElseThrow(ApiException::notFound);
        LocalDateTime now = SeatInventoryService.now();
        if (seat.getStatus() == SeatStatus.HELD) {
            if (userId.equals(seat.getHeldBy()) && seat.getHeldUntil() != null
                    && seat.getHeldUntil().isAfter(now)) {
                return response(seat);
            }
            throw seatUnavailable();
        }
        if (seat.getStatus() != SeatStatus.AVAILABLE) {
            throw seatUnavailable();
        }

        seat.hold(userId, now.plusMinutes(settingsService.seatHoldMinutes()));
        try {
            seatInventoryRepository.saveAndFlush(seat);
        } catch (OptimisticLockingFailureException | DataIntegrityViolationException ex) {
            throw seatUnavailable();
        }
        return response(seat);
    }

    @Transactional
    public void release(Long holdId, Long userId) {
        SeatInventory seat = seatInventoryRepository
                .findByIdAndHeldByAndStatus(holdId, userId, SeatStatus.HELD)
                .orElseThrow(ApiException::notFound);
        seat.release();
        try {
            seatInventoryRepository.saveAndFlush(seat);
        } catch (OptimisticLockingFailureException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "SEAT_HOLD_CHANGED",
                    "That seat hold changed. Refresh the seat map and try again.");
        }
    }

    @Transactional
    public SeatHoldsResponse mine(Long userId) {
        seatInventoryService.releaseExpiredForUser(userId);
        LocalDateTime now = SeatInventoryService.now();
        List<SeatHoldResponse> holds = seatInventoryRepository
                .findByHeldByAndStatusOrderByHeldUntilAsc(userId, SeatStatus.HELD).stream()
                .filter(seat -> seat.getHeldUntil() != null && seat.getHeldUntil().isAfter(now))
                .map(this::response)
                .toList();
        return new SeatHoldsResponse(holds, Instant.now());
    }

    private SeatHoldResponse response(SeatInventory seat) {
        Coach coach = seat.getCoach();
        String berthLabel = BerthTypes.label(seat.getBerthType());
        String label = "%s-%02d, %s".formatted(coach.getCoachNo(), seat.getSeatNo(), berthLabel);
        return new SeatHoldResponse(
                seat.getId(),
                seat.getTrainNumber(),
                seat.getTravelDate(),
                coach.getId(),
                coach.getCoachNo(),
                seat.getSeatNo(),
                seat.getBerthType(),
                berthLabel,
                label,
                seat.getHeldUntil() == null ? null : seat.getHeldUntil().toInstant(ZoneOffset.UTC));
    }

    private static ApiException seatUnavailable() {
        return new ApiException(HttpStatus.CONFLICT, "SEAT_UNAVAILABLE",
                "That seat is no longer available. Please choose another seat.");
    }
}
