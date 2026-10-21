package com.trainconcierge.provider;

import com.trainconcierge.dto.TrainSearchResult;
import com.trainconcierge.entity.Train;
import com.trainconcierge.repository.TrainRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Train data provider backed by the application's own MySQL database.
 * Always available; no external API key required.
 * Results are bookable through the existing BookingService.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseTrainProvider implements TrainDataProvider {

    private final TrainRepository trainRepository;

    @Override
    public String providerName() {
        return "DATABASE";
    }

    @Override
    public List<TrainSearchResult> search(String from, String to, LocalDate date, int seats) {
        log.debug("DatabaseTrainProvider: searching from='{}' to='{}' date='{}' seats={}", from, to, date, seats);
        List<Train> trains = trainRepository.searchAvailableTrains(from, to, date, seats);
        log.debug("DatabaseTrainProvider: found {} trains", trains.size());
        return trains.stream().map(this::toResult).collect(Collectors.toList());
    }

    private TrainSearchResult toResult(Train t) {
        return TrainSearchResult.builder()
                .id(t.getId())
                .trainNumber(t.getTrainNumber())
                .trainName(t.getTrainName())
                .trainType(inferType(t.getTrainName()))
                .fromStation(t.getFromStation())
                .toStation(t.getToStation())
                .travelDate(t.getTravelDate())
                .departureTime(t.getDepartureTime())
                .arrivalTime(t.getArrivalTime())
                .durationMinutes(calcDurationMinutes(t.getDepartureTime(), t.getArrivalTime()))
                .availableSeats(t.getAvailableSeats())
                .totalSeats(t.getTotalSeats())
                .price(t.getPrice())
                .bookable(true)
                .status(t.getStatus().name())
                .delayMinutes(t.getDelayMinutes())
                .cancellationReason(t.getCancellationReason())
                .dataSource("DATABASE")
                .dataNote("Bookable — inventory managed by TrainConcierge")
                .build();
    }

    private static Integer calcDurationMinutes(LocalTime dep, LocalTime arr) {
        if (dep == null || arr == null) return null;
        int diff = arr.toSecondOfDay() / 60 - dep.toSecondOfDay() / 60;
        if (diff < 0) diff += 24 * 60;
        return diff;
    }

    private static String inferType(String name) {
        if (name == null) return "Express";
        String lower = name.toLowerCase();
        if (lower.contains("rajdhani"))  return "Rajdhani";
        if (lower.contains("shatabdi"))  return "Shatabdi";
        if (lower.contains("vande"))     return "Vande Bharat";
        if (lower.contains("duronto"))   return "Duronto";
        if (lower.contains("garib rath")) return "Garib Rath";
        if (lower.contains("express"))   return "Express";
        if (lower.contains("mail"))      return "Mail";
        if (lower.contains("passenger")) return "Passenger";
        return "Express";
    }
}
