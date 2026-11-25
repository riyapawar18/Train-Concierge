package com.trainconcierge.recovery;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.booking.BookingRepository;
import com.trainconcierge.booking.Journey;
import com.trainconcierge.booking.JourneyRepository;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.disruption.JourneyImpact;
import com.trainconcierge.disruption.Recommendation;
import com.trainconcierge.disruption.RecommendationKind;
import com.trainconcierge.disruption.RecommendationRepository;
import com.trainconcierge.payment.Payment;
import com.trainconcierge.payment.PaymentRepository;
import com.trainconcierge.payment.PaymentService;
import com.trainconcierge.payment.dto.InitiatePaymentResponse;
import com.trainconcierge.recovery.bus.BusSeat;
import com.trainconcierge.recovery.bus.BusSeatService;
import com.trainconcierge.catalog.BusTripRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RecoveryServiceTest {

    private RecommendationRepository recommendationRepo;
    private BookingRepository bookingRepo;
    private JourneyRepository journeyRepo;
    private PaymentService paymentService;
    private PaymentRepository paymentRepo;
    private RebookingRepository rebookingRepo;
    private BusTripRepository busTripRepo;
    private BusSeatService busSeatService;
    private RecoveryService recoveryService;

    @BeforeEach
    void setUp() {
        recommendationRepo = mock(RecommendationRepository.class);
        bookingRepo        = mock(BookingRepository.class);
        journeyRepo        = mock(JourneyRepository.class);
        paymentService     = mock(PaymentService.class);
        paymentRepo        = mock(PaymentRepository.class);
        rebookingRepo      = mock(RebookingRepository.class);
        busTripRepo        = mock(BusTripRepository.class);
        busSeatService     = mock(BusSeatService.class);
        recoveryService    = new RecoveryService(
                recommendationRepo, bookingRepo, journeyRepo,
                paymentService, paymentRepo, rebookingRepo,
                busTripRepo, busSeatService);
        when(rebookingRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // ------------------------------------------------------------------
    // helpers – build entities via reflection (constructors are protected)
    // ------------------------------------------------------------------

    private Recommendation buildRec(Long id, Long busTripId, BigDecimal fare) {
        Recommendation rec = mock(Recommendation.class);
        Journey journey = buildJourney(5L, 42L);
        JourneyImpact impact = mock(JourneyImpact.class);
        when(impact.getJourney()).thenReturn(journey);
        when(rec.getId()).thenReturn(id);
        when(rec.getRefBusTripId()).thenReturn(busTripId);
        when(rec.getFare()).thenReturn(fare);
        when(rec.getCreatedAt()).thenReturn(LocalDateTime.now());
        when(rec.getImpact()).thenReturn(impact);
        return rec;
    }

    private Journey buildJourney(Long id, Long userId) {
        Booking booking = mock(Booking.class);
        when(booking.getId()).thenReturn(100L);
        Journey journey = mock(Journey.class);
        when(journey.getId()).thenReturn(id);
        when(journey.getUserId()).thenReturn(userId);
        when(journey.getBooking()).thenReturn(booking);
        return journey;
    }

    private Payment buildPayment(Long id) {
        Payment p = mock(Payment.class);
        when(p.getId()).thenReturn(id);
        when(p.getProvider()).thenReturn("SIMULATED");
        return p;
    }

    // ------------------------------------------------------------------

    @Test
    void startRebooking_busTrip_holdsAndCreatesPayment() {
        Recommendation rec = buildRec(1L, 10L, BigDecimal.valueOf(500));
        Journey journey = rec.getImpact().getJourney();
        when(recommendationRepo.findById(1L)).thenReturn(Optional.of(rec));
        when(journeyRepo.findById(5L)).thenReturn(Optional.of(journey));

        com.trainconcierge.catalog.BusTrip busTrip = mock(com.trainconcierge.catalog.BusTrip.class);
        when(busTripRepo.findById(10L)).thenReturn(Optional.of(busTrip));
        BusSeat seat = mock(BusSeat.class);
        when(seat.getId()).thenReturn(7L);
        when(busSeatService.findAvailableSeats(10L)).thenReturn(List.of(seat));

        Booking sourceBooking = mock(Booking.class);
        when(bookingRepo.findById(100L)).thenReturn(Optional.of(sourceBooking));
        Payment payment = buildPayment(99L);
        when(paymentService.initiate(anyString(), anyString(), anyLong(), anyLong(), any()))
                .thenReturn(payment);

        InitiatePaymentResponse resp = recoveryService.startRebooking(1L, 42L);

        assertThat(resp.getPaymentId()).isEqualTo(99L);
        verify(busSeatService).holdSeat(7L, 42L);
        verify(rebookingRepo).save(any(Rebooking.class));
    }

    @Test
    void startRebooking_noAvailableBusSeats_throws() {
        Recommendation rec = buildRec(2L, 20L, BigDecimal.valueOf(300));
        Journey journey = rec.getImpact().getJourney();
        when(recommendationRepo.findById(2L)).thenReturn(Optional.of(rec));
        when(journeyRepo.findById(5L)).thenReturn(Optional.of(journey));
        com.trainconcierge.catalog.BusTrip busTrip2 = mock(com.trainconcierge.catalog.BusTrip.class);
        when(busTripRepo.findById(20L)).thenReturn(Optional.of(busTrip2));
        when(busSeatService.findAvailableSeats(20L)).thenReturn(List.of());

        assertThatThrownBy(() -> recoveryService.startRebooking(2L, 42L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("No available bus seats");

        verify(paymentService, never()).initiate(anyString(), anyString(), anyLong(), anyLong(), any());
    }

    @Test
    void startRebooking_wrongUser_throwsNotFound() {
        Recommendation rec = buildRec(3L, null, BigDecimal.valueOf(200));
        // journey owned by user 99, not 42
        Journey journey = mock(Journey.class);
        Booking booking = mock(Booking.class);
        when(booking.getId()).thenReturn(100L);
        when(journey.getId()).thenReturn(5L);
        when(journey.getUserId()).thenReturn(99L);
        when(journey.getBooking()).thenReturn(booking);
        JourneyImpact impact = mock(JourneyImpact.class);
        when(impact.getJourney()).thenReturn(journey);
        when(rec.getImpact()).thenReturn(impact);
        when(recommendationRepo.findById(3L)).thenReturn(Optional.of(rec));
        when(journeyRepo.findById(5L)).thenReturn(Optional.of(journey));

        assertThatThrownBy(() -> recoveryService.startRebooking(3L, 42L))
                .isInstanceOf(ApiException.class);
    }
}
