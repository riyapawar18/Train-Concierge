package com.trainconcierge.notification;

import com.trainconcierge.catalog.TrainType;
import com.trainconcierge.travel.AvailabilityLevel;
import com.trainconcierge.travel.SettingsService;
import com.trainconcierge.travel.dto.ClassAvailabilityResponse;
import com.trainconcierge.travel.dto.SegmentFromResponse;
import com.trainconcierge.travel.dto.SegmentToResponse;
import com.trainconcierge.travel.dto.TrainSearchItemResponse;
import com.trainconcierge.user.Role;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeatAlertNotifierTest {

    private static final long USER_ID = 1L;
    private static final LocalDate TRAVEL_DATE = LocalDate.of(2026, 11, 12);

    @Mock
    private SettingsService settingsService;

    @Mock
    private SeatAlertLogRepository logRepository;

    @Mock
    private PreferenceService preferenceService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserRepository userRepository;

    private SeatAlertNotifier notifier;
    private User user;

    @BeforeEach
    void setUp() {
        notifier = new SeatAlertNotifier(settingsService, logRepository, preferenceService,
                notificationService, userRepository);
        user = User.create("Asha Kulkarni", "asha@example.com", null, "hash", Role.PASSENGER, true);

        lenient().when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        // Seat alerts are opt-in, so the passenger has to have switched them on.
        UserPreference optedIn = UserPreference.defaults(USER_ID, true);
        optedIn.update(true, true, true, true);
        lenient().when(preferenceService.forUser(user)).thenReturn(optedIn);
        lenient().when(settingsService.plentyThreshold()).thenReturn(20);
    }

    @Test
    void alertsForTheLowestClassUnderTheThresholdAndRecordsIt() {
        TrainSearchItemResponse result = result("11007", 30, 12, 3);
        when(notificationService.notifySeatAlert(eq(user), eq(result),
                any(ClassAvailabilityResponse.class), eq(TRAVEL_DATE))).thenReturn(true);

        notifier.onSearch(USER_ID, List.of(result), TRAVEL_DATE);

        ArgumentCaptor<ClassAvailabilityResponse> seatClass =
                ArgumentCaptor.forClass(ClassAvailabilityResponse.class);
        verify(notificationService).notifySeatAlert(eq(user), eq(result), seatClass.capture(),
                eq(TRAVEL_DATE));
        assertThat(seatClass.getValue().code()).isEqualTo("SL");
        assertThat(seatClass.getValue().available()).isEqualTo(3);

        ArgumentCaptor<SeatAlertLog> log = ArgumentCaptor.forClass(SeatAlertLog.class);
        verify(logRepository).save(log.capture());
        assertThat(log.getValue().getUserId()).isEqualTo(USER_ID);
        assertThat(log.getValue().getTrainNumber()).isEqualTo("11007");
        assertThat(log.getValue().getTravelDate()).isEqualTo(TRAVEL_DATE);
        assertThat(log.getValue().getClassCode()).isEqualTo("SL");
        assertThat(log.getValue().getSeatsLeft()).isEqualTo(3);
    }

    @Test
    void skipsATrainThatWasAlertedWithinTheLastHour() {
        TrainSearchItemResponse result = result("11007", 12);
        SeatAlertLog recent = SeatAlertLog.create(USER_ID, "11007", TRAVEL_DATE, "3A", 12,
                LocalDateTime.now().minusMinutes(10));
        when(logRepository.findByUserIdAndTrainNumberAndTravelDate(USER_ID, "11007", TRAVEL_DATE))
                .thenReturn(Optional.of(recent));

        notifier.onSearch(USER_ID, List.of(result), TRAVEL_DATE);

        verify(notificationService, never()).notifySeatAlert(any(), any(), any(), any());
        verify(logRepository, never()).save(any());
    }

    @Test
    void alertsAgainAndRefreshesTheLogOnceTheHourHasPassed() {
        TrainSearchItemResponse result = result("11007", 8);
        SeatAlertLog old = SeatAlertLog.create(USER_ID, "11007", TRAVEL_DATE, "3A", 18,
                LocalDateTime.now().minusHours(2));
        when(logRepository.findByUserIdAndTrainNumberAndTravelDate(USER_ID, "11007", TRAVEL_DATE))
                .thenReturn(Optional.of(old));
        when(notificationService.notifySeatAlert(eq(user), eq(result),
                any(ClassAvailabilityResponse.class), eq(TRAVEL_DATE))).thenReturn(true);

        notifier.onSearch(USER_ID, List.of(result), TRAVEL_DATE);

        ArgumentCaptor<SeatAlertLog> log = ArgumentCaptor.forClass(SeatAlertLog.class);
        verify(logRepository).save(log.capture());
        assertThat(log.getValue()).isSameAs(old);
        assertThat(log.getValue().getClassCode()).isEqualTo("3A");
        assertThat(log.getValue().getSeatsLeft()).isEqualTo(8);
        assertThat(log.getValue().getCreatedAt()).isAfter(LocalDateTime.now().minusMinutes(1));
    }

    @Test
    void capsTheNumberOfAlertsPerSearch() {
        List<TrainSearchItemResponse> results = List.of(
                result("11007", 5),
                result("12123", 6),
                result("12127", 7),
                result("12169", 8),
                result("12007", 9));
        when(notificationService.notifySeatAlert(eq(user), any(TrainSearchItemResponse.class),
                any(ClassAvailabilityResponse.class), eq(TRAVEL_DATE))).thenReturn(true);

        notifier.onSearch(USER_ID, results, TRAVEL_DATE);

        verify(notificationService, times(3))
                .notifySeatAlert(eq(user), any(TrainSearchItemResponse.class),
                        any(ClassAvailabilityResponse.class), eq(TRAVEL_DATE));
        verify(logRepository, times(3)).save(any(SeatAlertLog.class));
    }

    @Test
    void ignoresTrainsThatStillHavePlentyOfSeats() {
        TrainSearchItemResponse result = result("11007", 25, 30);

        notifier.onSearch(USER_ID, List.of(result), TRAVEL_DATE);

        verify(notificationService, never()).notifySeatAlert(any(), any(), any(), any());
        verify(logRepository, never()).save(any());
    }

    @Test
    void doesNothingWhenSeatAlertsAreTurnedOff() {
        UserPreference disabled = UserPreference.defaults(USER_ID, true);
        disabled.update(true, false, true, true);
        when(preferenceService.forUser(user)).thenReturn(disabled);
        TrainSearchItemResponse result = result("11007", 3);

        notifier.onSearch(USER_ID, List.of(result), TRAVEL_DATE);

        verify(settingsService, never()).plentyThreshold();
        verify(notificationService, never()).notifySeatAlert(any(), any(), any(), any());
        verify(logRepository, never()).save(any());
    }

    @Test
    void doesNotLogWhenTheNotificationIsSuppressed() {
        TrainSearchItemResponse result = result("11007", 3);
        when(notificationService.notifySeatAlert(eq(user), eq(result),
                any(ClassAvailabilityResponse.class), eq(TRAVEL_DATE))).thenReturn(false);

        notifier.onSearch(USER_ID, List.of(result), TRAVEL_DATE);

        verify(logRepository, never()).save(any());
    }

    @Test
    void ignoresAnEmptyResultSet() {
        notifier.onSearch(USER_ID, List.of(), TRAVEL_DATE);

        verify(userRepository, never()).findById(anyLong());
    }

    private TrainSearchItemResponse result(String trainNumber, int... availability) {
        String[] codes = {"3A", "2A", "SL", "CC", "1A"};
        List<ClassAvailabilityResponse> classes = new ArrayList<>();
        for (int index = 0; index < availability.length; index++) {
            classes.add(new ClassAvailabilityResponse(codes[index], "Class " + codes[index],
                    BigDecimal.valueOf(1200), BigDecimal.valueOf(1000), availability[index], 64,
                    "AVAILABLE", AvailabilityLevel.LOW));
        }
        return new TrainSearchItemResponse(trainNumber, "Test Express", TrainType.EXPRESS,
                new SegmentFromResponse("PUNE", "Pune", "16:30", 0),
                new SegmentToResponse("CSMT", "Mumbai", "19:45", 0),
                195, 192, List.of("MON"), classes);
    }
}
