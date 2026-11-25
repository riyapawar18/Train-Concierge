package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.RecommendationKind;
import com.trainconcierge.hotel.HotelBooking;
import com.trainconcierge.hotel.HotelBookingRepository;
import com.trainconcierge.hotel.HotelBookingStatus;
import com.trainconcierge.hotel.HotelPolicy;
import com.trainconcierge.hotel.HotelPolicyRepository;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.Optional;

/**
 * Scores recommendations based on whether the candidate arrival fits the passenger's
 * hotel late-arrival cutoff. +20 and "Fits your hotel check-in" when it fits;
 * a warning when it doesn't.
 */
@Component
@Order(90)
public class FitsHotelRule implements RecommendationRule {

    private static final int HOTEL_FIT_POINTS = 20;
    private static final int STATION_TRANSFER_MINUTES = 40;

    private final HotelBookingRepository bookingRepository;
    private final HotelPolicyRepository policyRepository;

    public FitsHotelRule(HotelBookingRepository bookingRepository,
                         HotelPolicyRepository policyRepository) {
        this.bookingRepository = bookingRepository;
        this.policyRepository = policyRepository;
    }

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.TRAIN || kind == RecommendationKind.BUS;
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        Optional<HotelBooking> bookingOpt = bookingRepository.findActiveByJourneyId(context.journeyId());
        if (bookingOpt.isEmpty()) {
            return RuleResult.pass();
        }
        HotelBooking booking = bookingOpt.get();
        if (booking.getStatus() == HotelBookingStatus.CANCELLED) {
            return RuleResult.pass();
        }

        HotelPolicy policy = policyRepository.findByHotelId(booking.getHotelId()).orElse(null);
        if (policy == null) {
            return RuleResult.pass();
        }

        // Effective arrival = candidate arrival + station transfer
        LocalTime effectiveArrivalTime = candidate.arrivalAt()
            .plusMinutes(STATION_TRANSFER_MINUTES)
            .toLocalTime();

        if (policy.isLateArrivalAllowed() && policy.getLateArrivalCutoff() != null) {
            if (!effectiveArrivalTime.isAfter(policy.getLateArrivalCutoff())) {
                return RuleResult.scored(HOTEL_FIT_POINTS, "Fits your hotel check-in");
            } else {
                return RuleResult.scored(0, null,
                    "Arrives after your hotel's late-arrival cutoff ("
                        + policy.getLateArrivalCutoff().toString().substring(0, 5) + ")");
            }
        }

        // No late arrival policy — compare against standard check-in
        if (!effectiveArrivalTime.isAfter(booking.getCheckInTime())) {
            return RuleResult.scored(HOTEL_FIT_POINTS, "Fits your hotel check-in");
        }
        return RuleResult.pass();
    }
}
