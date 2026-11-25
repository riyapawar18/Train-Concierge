package com.trainconcierge.catalog;

import com.trainconcierge.catalog.dto.StationResponse;
import com.trainconcierge.catalog.dto.TrainClassResponse;
import com.trainconcierge.catalog.dto.TrainResponse;
import com.trainconcierge.catalog.dto.TrainStopResponse;
import com.trainconcierge.common.error.ApiException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class CatalogService {

    private static final int SEARCH_LIMIT = 10;

    private final StationRepository stationRepository;
    private final TrainRepository trainRepository;
    private final TrainScheduleRepository trainScheduleRepository;
    private final TrainClassRepository trainClassRepository;

    public CatalogService(StationRepository stationRepository, TrainRepository trainRepository,
                          TrainScheduleRepository trainScheduleRepository,
                          TrainClassRepository trainClassRepository) {
        this.stationRepository = stationRepository;
        this.trainRepository = trainRepository;
        this.trainScheduleRepository = trainScheduleRepository;
        this.trainClassRepository = trainClassRepository;
    }

    @Transactional(readOnly = true)
    public List<StationResponse> searchStations(String query) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.isEmpty()) {
            return List.of();
        }
        return stationRepository.search(trimmed, PageRequest.of(0, SEARCH_LIMIT)).stream()
                .map(StationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public StationResponse getStation(String code) {
        return stationRepository.findById(normalize(code))
                .map(StationResponse::from)
                .orElseThrow(ApiException::notFound);
    }

    @Transactional(readOnly = true)
    public TrainResponse getTrain(String number) {
        Train train = trainRepository.findByNumber(normalize(number))
                .orElseThrow(ApiException::notFound);
        List<TrainClassResponse> classes = trainClassRepository
                .findByTrainNumberOrderByBaseFareAsc(train.getNumber()).stream()
                .map(TrainClassResponse::from)
                .toList();
        List<TrainStopResponse> schedule = trainScheduleRepository
                .findByTrainNumberOrderByStopOrder(train.getNumber()).stream()
                .map(TrainStopResponse::from)
                .toList();
        return new TrainResponse(
                train.getNumber(),
                train.getName(),
                train.getType(),
                train.getSource().getCode(),
                train.getSource().getName(),
                train.getDestination().getCode(),
                train.getDestination().getName(),
                train.getRunsOn(),
                classes,
                schedule);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
}
