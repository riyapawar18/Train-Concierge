package com.trainconcierge.recovery;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.booking.BookingRepository;
import com.trainconcierge.booking.Journey;
import com.trainconcierge.booking.JourneyRepository;
import com.trainconcierge.booking.JourneyStatus;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.disruption.Recommendation;
import com.trainconcierge.disruption.RecommendationKind;
import com.trainconcierge.disruption.RecommendationRepository;
import com.trainconcierge.payment.Payment;
import com.trainconcierge.payment.PaymentRepository;
import com.trainconcierge.payment.PaymentService;
import com.trainconcierge.payment.dto.InitiatePaymentResponse;
import com.trainconcierge.recovery.bus.BusSeatService;
import com.trainconcierge.catalog.BusTripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class RecoveryService {

    private final RecommendationRepository recommendationRepository;
    private final BookingRepository bookingRepository;
    private final JourneyRepository journeyRepository;
    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    final RebookingRepository rebookingRepository;
    private final BusTripRepository busTripRepository;
    private final BusSeatService busSeatService;

    public RecoveryService(RecommendationRepository recommendationRepository,
                           BookingRepository bookingRepository,
                           JourneyRepository journeyRepository,
                           PaymentService paymentService,
                           PaymentRepository paymentRepository,
                           RebookingRepository rebookingRepository,
                           BusTripRepository busTripRepository,
                           BusSeatService busSeatService) {
        this.recommendationRepository = recommendationRepository;
        this.bookingRepository = bookingRepository;
        this.journeyRepository = journeyRepository;
        this.paymentService = paymentService;
        this.paymentRepository = paymentRepository;
        this.rebookingRepository = rebookingRepository;
        this.busTripRepository = busTripRepository;
        this.busSeatService = busSeatService;
    }

    /** Returns recommendations for a disrupted journey. */
    @Transactional(readOnly = true)
    public List<Recommendation> getRecommendations(Long journeyId, Long userId,
                                                    RecommendationKind kind,
                                                    String sort, String classes, String types,
                                                    String depFrom, String depTo,
                                                    String arrFrom, String arrTo) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(ApiException::notFound);
        if (!journey.getUserId().equals(userId)) {
            throw ApiException.notFound();
        }
        // Load via impact → recommendations; use the impact linked to this journey
        return recommendationRepository.findAll().stream()
                .filter(r -> r.getImpact().getJourney().getId().equals(journeyId))
                .filter(r -> kind == null || r.getKind() == kind)
                .sorted(java.util.Comparator.comparingInt(Recommendation::getRank))
                .toList();
    }

    /** Starts a rebooking: holds a seat, creates a REBOOKING payment. */
    @Transactional
    public InitiatePaymentResponse startRebooking(Long recommendationId, Long userId) {
        Recommendation recommendation = recommendationRepository.findById(recommendationId)
                .orElseThrow(ApiException::notFound);

        Journey journey = journeyRepository.findById(
                recommendation.getImpact().getJourney().getId())
                .orElseThrow(ApiException::notFound);
        if (!journey.getUserId().equals(userId)) {
            throw ApiException.notFound();
        }
        if (recommendation.getCreatedAt().isBefore(LocalDateTime.now().minusHours(2))) {
            throw ApiException.conflict("Recommendation has expired");
        }

        // Hold a bus seat if this is a bus recommendation
        if (recommendation.getRefBusTripId() != null) {
            busTripRepository.findById(recommendation.getRefBusTripId())
                    .orElseThrow(() -> ApiException.conflict("Bus trip not found"));
            var availableSeats = busSeatService.findAvailableSeats(recommendation.getRefBusTripId());
            if (availableSeats.isEmpty()) {
                throw ApiException.conflict("No available bus seats");
            }
            busSeatService.holdSeat(availableSeats.get(0).getId(), userId);
        }

        Booking sourceBooking = bookingRepository.findById(journey.getBooking().getId())
                .orElseThrow(ApiException::notFound);
        BigDecimal amount = recommendation.getFare();

        Payment payment = paymentService.initiate(
                "REBOOKING", "RECOMMENDATION", recommendationId, userId, amount);

        Rebooking rebooking = new Rebooking();
        rebooking.setSourceBookingId(sourceBooking.getId());
        rebooking.setPaymentId(payment.getId());
        rebooking.setStatus(RebookingStatus.INITIATED);
        rebookingRepository.save(rebooking);

        InitiatePaymentResponse response = new InitiatePaymentResponse();
        response.setPaymentId(payment.getId());
        response.setProvider(payment.getProvider());
        return response;
    }

    /** Called when the REBOOKING payment reaches SUCCESS. */
    @Transactional
    public void completeRebooking(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(ApiException::notFound);
        if (payment.getStatus() != Payment.Status.SUCCESS) {
            throw ApiException.conflict("Payment not successful");
        }
        Rebooking rebooking = rebookingRepository.findByPaymentId(paymentId);
        if (rebooking == null) throw ApiException.notFound();
        if (rebooking.getStatus() == RebookingStatus.SUCCESS) return; // idempotent

        rebooking.setStatus(RebookingStatus.SUCCESS);
        rebookingRepository.save(rebooking);

        // Mark old booking as REBOOKED
        Booking oldBooking = bookingRepository.findById(rebooking.getSourceBookingId())
                .orElseThrow(ApiException::notFound);
        oldBooking.rebook();
        bookingRepository.save(oldBooking);

        // Update old journey
        Journey oldJourney = journeyRepository.findByBookingId(oldBooking.getId())
                .orElseThrow(ApiException::notFound);
        oldJourney.markRebooked();
        journeyRepository.save(oldJourney);
    }

    /** Returns a rebooking by id, ownership enforced by caller. */
    @Transactional(readOnly = true)
    public Optional<Rebooking> getRebooking(Long id) {
        return rebookingRepository.findById(id);
    }
}
