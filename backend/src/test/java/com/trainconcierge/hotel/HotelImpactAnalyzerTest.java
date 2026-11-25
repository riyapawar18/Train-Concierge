package com.trainconcierge.hotel;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.booking.Journey;
import com.trainconcierge.disruption.Disruption;
import com.trainconcierge.disruption.JourneyImpact;
import com.trainconcierge.notification.SseHub;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Verdict matrix for HotelImpactAnalyzer.
 *
 * Demo arithmetic:
 *   Train 11007 departs PUNE 16:30, arrives CSMT 19:45 (original).
 *   3 h 15 m (195 min) delay → new train arrival ~23:00.
 *   + 40 min station transfer → effective arrival 23:40.
 *
 *   Asha  – cutoff 23:59 : 23:40 ≤ 23:59  → LATE_ARRIVAL_OK
 *   Fatima – cutoff 22:00, no extra night : 23:40 > 22:00 → PAST_CUTOFF_NO_EXTENSION
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HotelImpactAnalyzerTest {

    @Mock HotelBookingRepository bookingRepo;
    @Mock HotelPolicyRepository policyRepo;
    @Mock HotelRoomRepository roomRepo;
    @Mock RoomAvailabilityRepository availRepo;
    @Mock HotelImpactRepository impactRepo;
    @Mock SseHub sseHub;

    HotelImpactAnalyzer analyzer;

    @BeforeEach
    void setUp() {
        analyzer = new HotelImpactAnalyzer(
            bookingRepo, policyRepo, roomRepo, availRepo, impactRepo, sseHub);
        lenient().when(impactRepo.findByImpactIdAndHotelBookingId(any(), any())).thenReturn(Optional.empty());
        lenient().when(impactRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(bookingRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // ------------------------------------------------------------------
    // Asha scenario: arrival 23:40, cutoff 23:59 → LATE_ARRIVAL_OK
    // ------------------------------------------------------------------
    @Test
    void ashaScenario_lateArrivalOk() {
        // 195-minute delay: original arrival 19:45 → new train arrival 23:00
        // effective arrival 23:00 + 40 min = 23:40
        JourneyImpact impact = buildImpact(195,
            LocalDateTime.of(2026, 10, 31, 19, 45),
            LocalDateTime.of(2026, 10, 31, 23, 0));

        HotelBooking booking = buildBooking(1L, 1L, 1L,
            LocalDate.of(2026, 10, 31), LocalTime.of(14, 0),
            LocalDate.of(2026, 11, 1), LocalTime.of(11, 0),
            LocalTime.of(23, 59));
        when(bookingRepo.findByJourneyId(1L)).thenReturn(List.of(booking));

        HotelPolicy policy = buildPolicy(true, LocalTime.of(23, 59),
            true, LocalTime.of(13, 0), "FREE", BigDecimal.ZERO, true, "AUTO");
        when(policyRepo.findByHotelId(1L)).thenReturn(Optional.of(policy));

        analyzer.analyze(impact);

        ArgumentCaptor<HotelImpact> cap = ArgumentCaptor.forClass(HotelImpact.class);
        verify(impactRepo).save(cap.capture());
        assertThat(cap.getValue().getVerdict()).isEqualTo(HotelImpactVerdict.LATE_ARRIVAL_OK);
        assertThat(cap.getValue().getSummary()).contains("late arrival is allowed until 23:59");
    }

    // ------------------------------------------------------------------
    // Fatima scenario: arrival 23:40, cutoff 22:00, no extension → PAST_CUTOFF_NO_EXTENSION
    // ------------------------------------------------------------------
    @Test
    void fatimaScenario_pastCutoffNoExtension() {
        JourneyImpact impact = buildImpact(195,
            LocalDateTime.of(2026, 10, 31, 19, 45),
            LocalDateTime.of(2026, 10, 31, 23, 0));

        HotelBooking booking = buildBooking(2L, 2L, 2L,
            LocalDate.of(2026, 10, 31), LocalTime.of(12, 0),
            LocalDate.of(2026, 11, 1), LocalTime.of(11, 0),
            LocalTime.of(22, 0));
        when(bookingRepo.findByJourneyId(1L)).thenReturn(List.of(booking));

        // extra_night_possible = false
        HotelPolicy policy = buildPolicy(true, LocalTime.of(22, 0),
            false, null, "FREE", BigDecimal.ZERO, false, "ON_REQUEST");
        when(policyRepo.findByHotelId(2L)).thenReturn(Optional.of(policy));

        analyzer.analyze(impact);

        ArgumentCaptor<HotelImpact> cap = ArgumentCaptor.forClass(HotelImpact.class);
        verify(impactRepo).save(cap.capture());
        assertThat(cap.getValue().getVerdict()).isEqualTo(HotelImpactVerdict.PAST_CUTOFF_NO_EXTENSION);
        assertThat(cap.getValue().getSummary()).contains("cannot hold your room");
    }

    // ------------------------------------------------------------------
    // Boundary: effective arrival exactly at cutoff → LATE_ARRIVAL_OK (not after)
    // ------------------------------------------------------------------
    @Test
    void boundary_exactlyCutoff_isLateArrivalOk() {
        // New train arrival 23:00 + 40 min = 23:40 effective. Cutoff 23:40 → not AFTER → OK
        JourneyImpact impact = buildImpact(195,
            LocalDateTime.of(2026, 10, 31, 19, 45),
            LocalDateTime.of(2026, 10, 31, 23, 0));

        HotelBooking booking = buildBooking(3L, 3L, 3L,
            LocalDate.of(2026, 10, 31), LocalTime.of(14, 0),
            LocalDate.of(2026, 11, 1), LocalTime.of(11, 0),
            LocalTime.of(23, 40));
        when(bookingRepo.findByJourneyId(1L)).thenReturn(List.of(booking));

        HotelPolicy policy = buildPolicy(true, LocalTime.of(23, 40),
            true, LocalTime.of(13, 0), "FREE", BigDecimal.ZERO, true, "AUTO");
        when(policyRepo.findByHotelId(3L)).thenReturn(Optional.of(policy));

        analyzer.analyze(impact);

        ArgumentCaptor<HotelImpact> cap = ArgumentCaptor.forClass(HotelImpact.class);
        verify(impactRepo).save(cap.capture());
        assertThat(cap.getValue().getVerdict()).isEqualTo(HotelImpactVerdict.LATE_ARRIVAL_OK);
    }

    // ------------------------------------------------------------------
    // Short delay (<30 min) → no hotel alert
    // ------------------------------------------------------------------
    @Test
    void shortDelay_noAnalysis() {
        JourneyImpact impact = buildImpact(20,
            LocalDateTime.of(2026, 10, 31, 19, 45),
            LocalDateTime.of(2026, 10, 31, 20, 5));

        analyzer.analyze(impact);

        verify(bookingRepo, never()).findByJourneyId(any());
        verify(impactRepo, never()).save(any());
    }

    // ------------------------------------------------------------------
    // Arrival before check-in time → UNAFFECTED
    // ------------------------------------------------------------------
    @Test
    void arrivalBeforeCheckin_unaffected() {
        // Arrival 18:00 + 40 min = 18:40. Check-in 20:00 → unaffected
        JourneyImpact impact = buildImpact(60,
            LocalDateTime.of(2026, 10, 31, 17, 0),
            LocalDateTime.of(2026, 10, 31, 18, 0));

        HotelBooking booking = buildBooking(4L, 4L, 4L,
            LocalDate.of(2026, 10, 31), LocalTime.of(20, 0),
            LocalDate.of(2026, 11, 1), LocalTime.of(11, 0),
            LocalTime.of(23, 59));
        when(bookingRepo.findByJourneyId(1L)).thenReturn(List.of(booking));

        HotelPolicy policy = buildPolicy(true, LocalTime.of(23, 59),
            true, LocalTime.of(13, 0), "HOURLY", BigDecimal.valueOf(150), true, "AUTO");
        when(policyRepo.findByHotelId(4L)).thenReturn(Optional.of(policy));

        analyzer.analyze(impact);

        ArgumentCaptor<HotelImpact> cap = ArgumentCaptor.forClass(HotelImpact.class);
        verify(impactRepo).save(cap.capture());
        assertThat(cap.getValue().getVerdict()).isEqualTo(HotelImpactVerdict.UNAFFECTED);
    }

    // ------------------------------------------------------------------
    // Extra night available → PAST_CUTOFF_EXTENSION_POSSIBLE
    // ------------------------------------------------------------------
    @Test
    void extraNightAvailable_extensionPossible() {
        JourneyImpact impact = buildImpact(195,
            LocalDateTime.of(2026, 10, 31, 19, 45),
            LocalDateTime.of(2026, 10, 31, 23, 0));

        HotelBooking booking = buildBooking(5L, 5L, 5L,
            LocalDate.of(2026, 10, 31), LocalTime.of(12, 0),
            LocalDate.of(2026, 11, 1), LocalTime.of(11, 0),
            LocalTime.of(22, 0));
        when(bookingRepo.findByJourneyId(1L)).thenReturn(List.of(booking));

        // extra_night_possible = true
        HotelPolicy policy = buildPolicy(true, LocalTime.of(22, 0),
            false, null, "FREE", BigDecimal.ZERO, true, "AUTO");
        when(policyRepo.findByHotelId(5L)).thenReturn(Optional.of(policy));
        // Room available on the extra night
        when(availRepo.findByRoomIdAndStayDate(eq(5L), any())).thenReturn(Optional.empty());

        analyzer.analyze(impact);

        ArgumentCaptor<HotelImpact> cap = ArgumentCaptor.forClass(HotelImpact.class);
        verify(impactRepo).save(cap.capture());
        assertThat(cap.getValue().getVerdict()).isEqualTo(HotelImpactVerdict.PAST_CUTOFF_EXTENSION_POSSIBLE);
    }

    // ------------------------------------------------------------------
    // Arrival on next day → NIGHT_LOST
    // ------------------------------------------------------------------
    @Test
    void arrivalNextDay_nightLost() {
        // Delay so large that arrival is on Nov 1 but check-in was Oct 31
        JourneyImpact impact = buildImpact(300,
            LocalDateTime.of(2026, 10, 31, 19, 45),
            LocalDateTime.of(2026, 11, 1, 0, 45));

        HotelBooking booking = buildBooking(6L, 6L, 6L,
            LocalDate.of(2026, 10, 31), LocalTime.of(14, 0),
            LocalDate.of(2026, 11, 1), LocalTime.of(11, 0),
            LocalTime.of(23, 59));
        when(bookingRepo.findByJourneyId(1L)).thenReturn(List.of(booking));

        HotelPolicy policy = buildPolicy(true, LocalTime.of(23, 59),
            true, LocalTime.of(13, 0), "FREE", BigDecimal.ZERO, true, "AUTO");
        when(policyRepo.findByHotelId(6L)).thenReturn(Optional.of(policy));

        analyzer.analyze(impact);

        ArgumentCaptor<HotelImpact> cap = ArgumentCaptor.forClass(HotelImpact.class);
        verify(impactRepo).save(cap.capture());
        assertThat(cap.getValue().getVerdict()).isEqualTo(HotelImpactVerdict.NIGHT_LOST);
    }

    // ===================================================================
    // Helpers
    // ===================================================================

    private JourneyImpact buildImpact(int delayMinutes,
                                       LocalDateTime originalArrival,
                                       LocalDateTime newArrival) {
        Booking booking = mock(Booking.class);
        // boarding ~3 hours before original arrival
        when(booking.getBoardingTime()).thenReturn(originalArrival.minusHours(3));

        Journey journey = mock(Journey.class);
        when(journey.getId()).thenReturn(1L);

        JourneyImpact impact = mock(JourneyImpact.class);
        when(impact.getId()).thenReturn(100L);
        when(impact.getDelayMinutes()).thenReturn(delayMinutes);
        when(impact.getOriginalArrival()).thenReturn(originalArrival);
        when(impact.getNewArrival()).thenReturn(newArrival);
        when(impact.getJourney()).thenReturn(journey);
        when(impact.getBooking()).thenReturn(booking);
        return impact;
    }

    private HotelBooking buildBooking(Long id, Long userId, Long hotelId,
                                       LocalDate checkIn, LocalTime checkInTime,
                                       LocalDate checkOut, LocalTime checkOutTime,
                                       LocalTime cutoff) {
        HotelBooking b = new HotelBooking();
        try {
            var f = HotelBooking.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(b, id);
        } catch (Exception e) { /* id stays null, acceptable for unit test logic */ }
        b.setUserId(userId);
        b.setHotelId(hotelId);
        b.setRoomId(id);
        b.setCheckInDate(checkIn);
        b.setCheckInTime(checkInTime);
        b.setCheckOutDate(checkOut);
        b.setCheckOutTime(checkOutTime);
        b.setLateArrivalCutoff(cutoff);
        b.setStatus(HotelBookingStatus.CONFIRMED);
        b.setTotalPrice(BigDecimal.valueOf(3000));
        return b;
    }

    private HotelPolicy buildPolicy(boolean lateArrival, LocalTime cutoff,
                                     boolean lateCheckout, LocalTime maxCheckout,
                                     String feeType, BigDecimal feeAmount,
                                     boolean extraNight, String approval) {
        HotelPolicy p = new HotelPolicy();
        try {
            set(p, "lateArrivalAllowed", lateArrival);
            set(p, "lateArrivalCutoff", cutoff);
            set(p, "lateCheckoutAllowed", lateCheckout);
            set(p, "maxLateCheckoutTime", maxCheckout);
            set(p, "lateCheckoutFeeType", feeType);
            set(p, "lateCheckoutFeeAmount", feeAmount);
            set(p, "extraNightPossible", extraNight);
            set(p, "extensionNeedsApproval", approval);
            set(p, "standardCheckinTime", LocalTime.of(14, 0));
            set(p, "standardCheckoutTime", LocalTime.of(11, 0));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return p;
    }

    private static void set(Object obj, String field, Object value) throws Exception {
        var f = obj.getClass().getDeclaredField(field);
        f.setAccessible(true);
        f.set(obj, value);
    }
}
