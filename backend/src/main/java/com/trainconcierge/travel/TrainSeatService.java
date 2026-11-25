package com.trainconcierge.travel;

import com.trainconcierge.catalog.Train;
import com.trainconcierge.catalog.TrainClass;
import com.trainconcierge.catalog.TrainClassRepository;
import com.trainconcierge.catalog.TrainRepository;
import com.trainconcierge.catalog.TrainScheduleRepository;
import com.trainconcierge.catalog.dto.TrainStopResponse;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.disruption.Disruption;
import com.trainconcierge.disruption.DisruptionRepository;
import com.trainconcierge.disruption.DisruptionStatus;
import com.trainconcierge.disruption.ImpactText;
import com.trainconcierge.travel.dto.ClassAvailabilityResponse;
import com.trainconcierge.travel.dto.CoachAvailabilityResponse;
import com.trainconcierge.travel.dto.CoachesResponse;
import com.trainconcierge.travel.dto.SeatMapResponse;
import com.trainconcierge.travel.dto.SeatResponse;
import com.trainconcierge.travel.dto.SeatSummaryResponse;
import com.trainconcierge.travel.dto.TrainAvailabilityResponse;
import com.trainconcierge.travel.dto.TrainStatusResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class TrainSeatService {

    private final TrainRepository trainRepository;
    private final TrainClassRepository trainClassRepository;
    private final TrainScheduleRepository trainScheduleRepository;
    private final CoachRepository coachRepository;
    private final SeatInventoryService seatInventoryService;
    private final SettingsService settingsService;
    private final TravelDateValidator travelDateValidator;
    private final DisruptionRepository disruptionRepository;

    public TrainSeatService(TrainRepository trainRepository,
                            TrainClassRepository trainClassRepository,
                            TrainScheduleRepository trainScheduleRepository,
                            CoachRepository coachRepository,
                            SeatInventoryService seatInventoryService,
                            SettingsService settingsService,
                            TravelDateValidator travelDateValidator,
                            DisruptionRepository disruptionRepository) {
        this.trainRepository = trainRepository;
        this.trainClassRepository = trainClassRepository;
        this.trainScheduleRepository = trainScheduleRepository;
        this.coachRepository = coachRepository;
        this.seatInventoryService = seatInventoryService;
        this.settingsService = settingsService;
        this.travelDateValidator = travelDateValidator;
        this.disruptionRepository = disruptionRepository;
    }

    @Transactional
    public TrainAvailabilityResponse availability(String number, LocalDate date) {
        Train train = requireTrain(number);
        LocalDate travelDate = travelDateValidator.requireValid(date);
        prepare(train.getNumber(), travelDate);
        Map<String, SeatInventoryService.ClassSeatCounts> counts =
                seatInventoryService.countsForTrain(train.getNumber(), travelDate);
        int plenty = settingsService.plentyThreshold();
        int veryLow = settingsService.veryLowThreshold();
        List<ClassAvailabilityResponse> classes = trainClassRepository
                .findByTrainNumberOrderByBaseFareAsc(train.getNumber()).stream()
                .sorted(Comparator.comparingInt(
                        trainClass -> TravelClasses.order(trainClass.getClassCode())))
                .map(trainClass -> {
                    SeatInventoryService.ClassSeatCounts seatCounts = counts.getOrDefault(
                            trainClass.getClassCode(),
                            new SeatInventoryService.ClassSeatCounts(0, 0, 0, 0));
                    return new ClassAvailabilityResponse(
                            trainClass.getClassCode(),
                            TravelClasses.name(trainClass.getClassCode()),
                            trainClass.getBaseFare(),
                            trainClass.getBaseFare(),
                            seatCounts.available(),
                            seatCounts.total(),
                            seatCounts.available() > 0 ? "AVL " + seatCounts.available() : "WL",
                            level(seatCounts.available(), plenty, veryLow));
                })
                .toList();
        return new TrainAvailabilityResponse(train.getNumber(), train.getName(), travelDate, classes);
    }

    @Transactional
    public CoachesResponse coaches(String number, LocalDate date, String classCode) {
        Train train = requireTrain(number);
        LocalDate travelDate = travelDateValidator.requireValid(date);
        String normalizedClass = classCode == null || classCode.isBlank()
                ? "" : TravelClasses.normalize(classCode);
        prepare(train.getNumber(), travelDate);
        List<Coach> coaches = normalizedClass.isEmpty()
                ? coachRepository.findByTrainNumberOrderByCoachNoAsc(train.getNumber())
                : coachRepository.findByTrainNumberAndClassCodeOrderByCoachNoAsc(
                        train.getNumber(), normalizedClass);
        if (!normalizedClass.isEmpty() && coaches.isEmpty()) {
            throw ApiException.notFound();
        }
        List<CoachAvailabilityResponse> responses = coaches.stream()
                .map(coach -> coachResponse(coach, travelDate))
                .toList();
        return new CoachesResponse(train.getNumber(), train.getName(), travelDate,
                normalizedClass.isEmpty() ? "ALL" : normalizedClass,
                normalizedClass.isEmpty() ? "All classes" : TravelClasses.name(normalizedClass),
                responses);
    }

    @Transactional
    public SeatMapResponse seatMap(String number, LocalDate date, String classCode, Long coachId) {
        Train train = requireTrain(number);
        LocalDate travelDate = travelDateValidator.requireValid(date);
        String normalizedClass = classCode == null || classCode.isBlank()
                ? "" : TravelClasses.normalize(classCode);
        if (normalizedClass.isEmpty()) {
            throw ApiException.validation("class", "Choose a travel class.");
        }
        prepare(train.getNumber(), travelDate);
        List<Coach> coaches = coachRepository.findByTrainNumberAndClassCodeOrderByCoachNoAsc(
                train.getNumber(), normalizedClass);
        if (coaches.isEmpty()) {
            throw ApiException.notFound();
        }
        Coach coach;
        if (coachId == null) {
            coach = coaches.get(0);
        } else {
            coach = coaches.stream()
                    .filter(candidate -> candidate.getId().equals(coachId))
                    .findFirst()
                    .orElseThrow(ApiException::notFound);
        }

        List<SeatInventory> seats = seatInventoryService.seats(train.getNumber(), travelDate,
                coach.getId());
        SeatSummaryResponse coachSummary = summary(seats);
        List<SeatResponse> seatResponses = seats.stream()
                .map(seat -> new SeatResponse(
                        seat.getSeatNo(),
                        seat.getBerthType(),
                        BerthTypes.label(seat.getBerthType()),
                        seat.getStatus(),
                        seat.getHeldUntil() == null
                                ? null : seat.getHeldUntil().toInstant(ZoneOffset.UTC)))
                .toList();

        Map<String, SeatInventoryService.ClassSeatCounts> counts =
                seatInventoryService.countsForTrain(train.getNumber(), travelDate);
        SeatInventoryService.ClassSeatCounts classCounts = counts.getOrDefault(normalizedClass,
                new SeatInventoryService.ClassSeatCounts(0, 0, 0, 0));
        SeatSummaryResponse classSummary = new SeatSummaryResponse(classCounts.total(),
                classCounts.available(), classCounts.occupied(), classCounts.held());

        return new SeatMapResponse(
                train.getNumber(),
                train.getName(),
                travelDate,
                normalizedClass,
                TravelClasses.name(normalizedClass),
                coachResponse(coach, travelDate),
                classSummary,
                seatResponses);
    }

    @Transactional(readOnly = true)
    public TrainStatusResponse status(String number, LocalDate date) {
        Train train = requireTrain(number);
        LocalDate travelDate = travelDateValidator.requireValid(date);
        List<TrainStopResponse> schedule = trainScheduleRepository
                .findByTrainNumberOrderByStopOrder(train.getNumber()).stream()
                .map(TrainStopResponse::from)
                .toList();
        Disruption disruption = disruptionRepository
                .findFirstByTrain_NumberAndTravelDateAndStatusOrderByIdDesc(
                        train.getNumber(), travelDate, DisruptionStatus.ACTIVE)
                .orElse(null);
        if (disruption == null) {
            return new TrainStatusResponse(train.getNumber(), train.getName(), travelDate,
                    TrainStatus.ON_TIME, 0, true, null, null, schedule);
        }
        String href = "/app/disruptions/" + disruption.getId();
        if (disruption.isCancellation()) {
            return new TrainStatusResponse(train.getNumber(), train.getName(), travelDate,
                    TrainStatus.CANCELLED, 0, true, href, "Cancelled", schedule);
        }
        return new TrainStatusResponse(train.getNumber(), train.getName(), travelDate,
                TrainStatus.DELAYED, disruption.getDelayMinutesOrZero(), true, href,
                "Delayed by " + ImpactText.duration(disruption.getDelayMinutesOrZero()), schedule);
    }

    private void prepare(String trainNumber, LocalDate travelDate) {
        seatInventoryService.ensureInventory(trainNumber, travelDate);
        seatInventoryService.releaseExpiredForTrain(trainNumber, travelDate);
    }

    private CoachAvailabilityResponse coachResponse(Coach coach, LocalDate date) {
        List<SeatInventory> seats = seatInventoryService.seats(coach.getTrainNumber(), date,
                coach.getId());
        SeatSummaryResponse summary = summary(seats);
        return new CoachAvailabilityResponse(coach.getId(), coach.getCoachNo(), coach.getClassCode(),
                coach.getLayout(), summary.total(), summary.available(), summary.occupied(),
                summary.held());
    }

    private static SeatSummaryResponse summary(List<SeatInventory> seats) {
        int available = 0;
        int occupied = 0;
        int held = 0;
        for (SeatInventory seat : seats) {
            switch (seat.getStatus()) {
                case AVAILABLE -> available++;
                case OCCUPIED -> occupied++;
                case HELD -> held++;
            }
        }
        return new SeatSummaryResponse(seats.size(), available, occupied, held);
    }

    private static AvailabilityLevel level(int available, int plenty, int veryLow) {
        if (available <= 0) {
            return AvailabilityLevel.WAITLIST;
        }
        if (available <= veryLow) {
            return AvailabilityLevel.VERY_LOW;
        }
        if (available <= plenty) {
            return AvailabilityLevel.LOW;
        }
        return AvailabilityLevel.PLENTY;
    }

    private Train requireTrain(String number) {
        String normalized = number == null ? "" : number.trim().toUpperCase(Locale.ROOT);
        return trainRepository.findByNumber(normalized).orElseThrow(ApiException::notFound);
    }
}
