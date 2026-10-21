package com.trainconcierge.provider;

import com.trainconcierge.dto.TrainSearchResult;
import com.trainconcierge.entity.Train;
import com.trainconcierge.repository.TrainRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class DatabaseTrainProviderTest {

    @Mock
    private TrainRepository trainRepository;

    @InjectMocks
    private DatabaseTrainProvider provider;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void providerName_returnsDATABASE() {
        assertThat(provider.providerName()).isEqualTo("DATABASE");
    }

    @Test
    void search_returnsBookableResults() {
        LocalDate date = LocalDate.now().plusDays(1);
        Train train = buildTrain("12001", "Rajdhani Express", "Mumbai", "Delhi", date);
        when(trainRepository.searchAvailableTrains("Mumbai", "Delhi", date, 1))
                .thenReturn(List.of(train));

        List<TrainSearchResult> results = provider.search("Mumbai", "Delhi", date, 1);

        assertThat(results).hasSize(1);
        TrainSearchResult r = results.get(0);
        assertThat(r.getTrainNumber()).isEqualTo("12001");
        assertThat(r.isBookable()).isTrue();
        assertThat(r.getDataSource()).isEqualTo("DATABASE");
        assertThat(r.getId()).isEqualTo(1L);
    }

    @Test
    void search_emptyWhenNoMatchingTrains() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(trainRepository.searchAvailableTrains(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of());

        List<TrainSearchResult> results = provider.search("X", "Y", date, 1);

        assertThat(results).isEmpty();
    }

    @Test
    void search_multipleTrainsReturned() {
        LocalDate date = LocalDate.now().plusDays(1);
        Train t1 = buildTrain("12001", "Rajdhani", "Mumbai", "Delhi", date);
        Train t2 = buildTrain("12002", "Shatabdi", "Mumbai", "Delhi", date);
        when(trainRepository.searchAvailableTrains("Mumbai", "Delhi", date, 2))
                .thenReturn(List.of(t1, t2));

        List<TrainSearchResult> results = provider.search("Mumbai", "Delhi", date, 2);
        assertThat(results).hasSize(2);
        assertThat(results).allMatch(TrainSearchResult::isBookable);
    }

    @Test
    void search_durationIsComputedCorrectly() {
        LocalDate date = LocalDate.now().plusDays(1);
        Train t = buildTrain("12001", "Rajdhani", "Mumbai", "Delhi", date);
        // dep 06:00, arr 22:00 → 16 hours = 960 min
        t.setDepartureTime(LocalTime.of(6, 0));
        t.setArrivalTime(LocalTime.of(22, 0));
        when(trainRepository.searchAvailableTrains(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of(t));

        List<TrainSearchResult> results = provider.search("Mumbai", "Delhi", date, 1);
        assertThat(results.get(0).getDurationMinutes()).isEqualTo(960);
    }

    @Test
    void search_overnightTrainDurationWrapsCorrectly() {
        LocalDate date = LocalDate.now().plusDays(1);
        Train t = buildTrain("12003", "Duronto", "Mumbai", "Delhi", date);
        // dep 14:00, arr 06:00 next day → 16 hours = 960 min
        t.setDepartureTime(LocalTime.of(14, 0));
        t.setArrivalTime(LocalTime.of(6, 0));
        when(trainRepository.searchAvailableTrains(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of(t));

        List<TrainSearchResult> results = provider.search("Mumbai", "Delhi", date, 1);
        assertThat(results.get(0).getDurationMinutes()).isEqualTo(960);
    }

    @Test
    void search_cancelledTrainsNotReturnedByRepository() {
        // The repository query excludes CANCELLED trains; verify provider does not override that
        LocalDate date = LocalDate.now().plusDays(1);
        when(trainRepository.searchAvailableTrains(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of()); // repository has already filtered them out

        List<TrainSearchResult> results = provider.search("Mumbai", "Delhi", date, 1);
        assertThat(results).isEmpty();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Train buildTrain(String number, String name, String from, String to, LocalDate date) {
        return Train.builder()
                .id(1L)
                .trainNumber(number)
                .trainName(name)
                .fromStation(from)
                .toStation(to)
                .travelDate(date)
                .departureTime(LocalTime.of(6, 0))
                .arrivalTime(LocalTime.of(22, 0))
                .totalSeats(200)
                .availableSeats(150)
                .price(1200.0)
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build();
    }
}
