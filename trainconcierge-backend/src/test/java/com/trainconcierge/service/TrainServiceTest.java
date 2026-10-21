package com.trainconcierge.service;

import com.trainconcierge.dto.TrainSearchResult;
import com.trainconcierge.entity.Train;
import com.trainconcierge.provider.DatabaseTrainProvider;
import com.trainconcierge.provider.RailRadarTrainProvider;
import com.trainconcierge.provider.TrainProviderException;
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

class TrainServiceTest {

    @Mock private TrainRepository trainRepository;
    @Mock private DatabaseTrainProvider databaseProvider;
    @Mock private RailRadarTrainProvider railRadarProvider;

    @InjectMocks
    private TrainService trainService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // By default RailRadar is NOT configured
        when(railRadarProvider.isConfigured()).thenReturn(false);
    }

    // ── Database-only search ──────────────────────────────────────────────────

    @Test
    void searchTrains_usesDatabase_whenRailRadarNotConfigured() {
        LocalDate date = LocalDate.now().plusDays(1);
        TrainSearchResult dbResult = buildResult("12001", "Rajdhani", true, "DATABASE");
        when(databaseProvider.search("Mumbai", "Delhi", date, 1)).thenReturn(List.of(dbResult));

        List<TrainSearchResult> results = trainService.searchTrains("Mumbai", "Delhi", date, 1);

        assertThat(results).hasSize(1);
        verify(databaseProvider).search("Mumbai", "Delhi", date, 1);
        verify(railRadarProvider, never()).search(any(), any(), any(), anyInt());
    }

    @Test
    void searchTrains_returnsEmptyList_whenNoTrainsFound() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(databaseProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of());

        List<TrainSearchResult> results = trainService.searchTrains("X", "Y", date, 1);

        assertThat(results).isEmpty();
    }

    // ── RailRadar integration ─────────────────────────────────────────────────

    @Test
    void searchTrains_mergesDBAndRailRadar_whenConfigured() {
        when(railRadarProvider.isConfigured()).thenReturn(true);
        LocalDate date = LocalDate.now().plusDays(1);
        TrainSearchResult dbResult  = buildResult("12001", "Rajdhani", true, "DATABASE");
        TrainSearchResult rrResult1 = buildResult("12001", "Rajdhani", false, "RAILRADAR"); // duplicate
        TrainSearchResult rrResult2 = buildResult("19031", "Yoga Express", false, "RAILRADAR");

        when(databaseProvider.search("Mumbai", "Delhi", date, 1)).thenReturn(List.of(dbResult));
        when(railRadarProvider.search("Mumbai", "Delhi", date, 1))
                .thenReturn(List.of(rrResult1, rrResult2));

        List<TrainSearchResult> results = trainService.searchTrains("Mumbai", "Delhi", date, 1);

        // 12001 appears only once (DB version), plus 19031 from RailRadar = 2
        assertThat(results).hasSize(2);
        assertThat(results.get(0).isBookable()).isTrue();  // DB result first
        assertThat(results.get(1).getTrainNumber()).isEqualTo("19031");
    }

    @Test
    void searchTrains_propagatesRailRadarException_whenNoDBResults() {
        // When RailRadar throws AND the DB is empty, exception is propagated
        when(railRadarProvider.isConfigured()).thenReturn(true);
        LocalDate date = LocalDate.now().plusDays(1);
        when(databaseProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of());
        when(railRadarProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenThrow(new TrainProviderException(
                        TrainProviderException.Reason.RATE_LIMITED, "Rate limited"));

        assertThatThrownBy(() -> trainService.searchTrains("Mumbai", "Delhi", date, 1))
                .isInstanceOf(TrainProviderException.class)
                .satisfies(e -> assertThat(((TrainProviderException) e).getReason())
                        .isEqualTo(TrainProviderException.Reason.RATE_LIMITED));
    }

    @Test
    void searchTrains_returnsDBResults_whenRailRadarThrowsButDBHasData() {
        // When RailRadar throws but DB has results, return DB results (don't surface the error)
        when(railRadarProvider.isConfigured()).thenReturn(true);
        LocalDate date = LocalDate.now().plusDays(1);
        TrainSearchResult dbResult = buildResult("TC11024", "Sahyadri Express", true, "DATABASE");
        when(databaseProvider.search("Miraj", "Pune", date, 1)).thenReturn(List.of(dbResult));
        when(railRadarProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenThrow(new TrainProviderException(
                        TrainProviderException.Reason.PROVIDER_TIMEOUT, "Timeout"));

        List<TrainSearchResult> results = trainService.searchTrains("Miraj", "Pune", date, 1);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getTrainNumber()).isEqualTo("TC11024");
        assertThat(results.get(0).isBookable()).isTrue();
    }

    @Test
    void searchTrains_propagatesAuthFailure_whenNoDBResults() {
        when(railRadarProvider.isConfigured()).thenReturn(true);
        LocalDate date = LocalDate.now().plusDays(1);
        when(databaseProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of());
        when(railRadarProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenThrow(new TrainProviderException(
                        TrainProviderException.Reason.AUTHENTICATION_FAILURE, "401"));

        assertThatThrownBy(() -> trainService.searchTrains("Mumbai", "Delhi", date, 1))
                .isInstanceOf(TrainProviderException.class)
                .satisfies(e -> assertThat(((TrainProviderException) e).getReason())
                        .isEqualTo(TrainProviderException.Reason.AUTHENTICATION_FAILURE));
    }

    @Test
    void searchTrains_propagatesTimeout_whenNoDBResults() {
        when(railRadarProvider.isConfigured()).thenReturn(true);
        LocalDate date = LocalDate.now().plusDays(1);
        when(databaseProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of());
        when(railRadarProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenThrow(new TrainProviderException(
                        TrainProviderException.Reason.PROVIDER_TIMEOUT, "Timeout"));

        assertThatThrownBy(() -> trainService.searchTrains("Mumbai", "Delhi", date, 1))
                .isInstanceOf(TrainProviderException.class)
                .satisfies(e -> assertThat(((TrainProviderException) e).getReason())
                        .isEqualTo(TrainProviderException.Reason.PROVIDER_TIMEOUT));
    }

    // ── Miraj → Pune specific tests ────────────────────────────────────────────

    @Test
    void searchTrains_mirajToPune_returnsDatabaseResults() {
        // Database-only mode (no RailRadar key) returns seeded Miraj→Pune trains
        LocalDate date = LocalDate.now().plusDays(1);
        TrainSearchResult sahyadri = buildResultCustom("TC11024", "Sahyadri Express (11024)",
                "Miraj", "Pune", true, "DATABASE");
        TrainSearchResult goaExp   = buildResultCustom("TC12779", "Goa Express (12779)",
                "Miraj", "Pune", true, "DATABASE");

        when(databaseProvider.search("Miraj", "Pune", date, 1))
                .thenReturn(List.of(sahyadri, goaExp));

        List<TrainSearchResult> results = trainService.searchTrains("Miraj", "Pune", date, 1);

        assertThat(results).hasSize(2);
        assertThat(results).extracting(TrainSearchResult::getFromStation)
                .containsOnly("Miraj");
        assertThat(results).extracting(TrainSearchResult::getToStation)
                .containsOnly("Pune");
    }

    @Test
    void searchTrains_mirajToPune_dbEmptyNoRailRadar_returnsEmpty() {
        // No RailRadar key, DB has no matching trains: returns empty (not an error)
        LocalDate date = LocalDate.now().plusDays(1);
        when(databaseProvider.search("Miraj", "Pune", date, 1)).thenReturn(List.of());

        List<TrainSearchResult> results = trainService.searchTrains("Miraj", "Pune", date, 1);

        assertThat(results).isEmpty();
    }

    @Test
    void searchTrains_mirajToPune_doesNotReturnReverseTrain() {
        // A Pune→Miraj train must not appear in a Miraj→Pune search
        LocalDate date = LocalDate.now().plusDays(1);
        when(databaseProvider.search("Miraj", "Pune", date, 1)).thenReturn(List.of());
        // DB provider correctly filters — verify we pass the right params
        verify(databaseProvider, never()).search("Pune", "Miraj", date, 1);

        List<TrainSearchResult> results = trainService.searchTrains("Miraj", "Pune", date, 1);
        assertThat(results).isEmpty();
    }

    // ── Input validation ──────────────────────────────────────────────────────

    @Test
    void searchTrains_rejectsBlankFrom() {
        assertThatThrownBy(() ->
                trainService.searchTrains("", "Delhi", LocalDate.now().plusDays(1), 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Source station is required");
    }

    @Test
    void searchTrains_rejectsBlankTo() {
        assertThatThrownBy(() ->
                trainService.searchTrains("Mumbai", "", LocalDate.now().plusDays(1), 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Destination station is required");
    }

    @Test
    void searchTrains_rejectsSameStations() {
        assertThatThrownBy(() ->
                trainService.searchTrains("Delhi", "Delhi", LocalDate.now().plusDays(1), 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be the same");
    }

    @Test
    void searchTrains_caseInsensitiveSameStationRejected() {
        assertThatThrownBy(() ->
                trainService.searchTrains("delhi", "DELHI", LocalDate.now().plusDays(1), 1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void searchTrains_rejectsZeroSeats() {
        assertThatThrownBy(() ->
                trainService.searchTrains("Mumbai", "Delhi", LocalDate.now().plusDays(1), 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 1 and 10");
    }

    @Test
    void searchTrains_rejectsMoreThan10Seats() {
        assertThatThrownBy(() ->
                trainService.searchTrains("Mumbai", "Delhi", LocalDate.now().plusDays(1), 11))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 1 and 10");
    }

    @Test
    void searchTrains_rejectsNullDate() {
        assertThatThrownBy(() ->
                trainService.searchTrains("Mumbai", "Delhi", null, 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("date is required");
    }

    // ── Bookable flag ─────────────────────────────────────────────────────────

    @Test
    void searchTrains_dbResultsAreBookable() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(databaseProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of(buildResult("12001", "Rajdhani", true, "DATABASE")));

        List<TrainSearchResult> results = trainService.searchTrains("Mumbai", "Delhi", date, 1);
        assertThat(results.get(0).isBookable()).isTrue();
    }

    @Test
    void searchTrains_railRadarResultsAreNotBookable() {
        when(railRadarProvider.isConfigured()).thenReturn(true);
        LocalDate date = LocalDate.now().plusDays(1);
        when(databaseProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of());
        when(railRadarProvider.search(anyString(), anyString(), any(), anyInt()))
                .thenReturn(List.of(buildResult("19031", "Yoga Express", false, "RAILRADAR")));

        List<TrainSearchResult> results = trainService.searchTrains("Mumbai", "Delhi", date, 1);
        assertThat(results.get(0).isBookable()).isFalse();
        assertThat(results.get(0).getDataSource()).isEqualTo("RAILRADAR");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private TrainSearchResult buildResult(String number, String name,
                                           boolean bookable, String source) {
        return buildResultCustom(number, name, "Mumbai", "Delhi", bookable, source);
    }

    private TrainSearchResult buildResultCustom(String number, String name,
                                                 String from, String to,
                                                 boolean bookable, String source) {
        return TrainSearchResult.builder()
                .id(bookable ? 1L : null)
                .trainNumber(number)
                .trainName(name)
                .fromStation(from)
                .toStation(to)
                .travelDate(LocalDate.now().plusDays(1))
                .departureTime(LocalTime.of(6, 0))
                .arrivalTime(LocalTime.of(22, 0))
                .availableSeats(100)
                .price(1200.0)
                .bookable(bookable)
                .status("ON_TIME")
                .dataSource(source)
                .build();
    }
}
