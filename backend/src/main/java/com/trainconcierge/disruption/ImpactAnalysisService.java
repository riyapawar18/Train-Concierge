package com.trainconcierge.disruption;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.booking.BookingRepository;
import com.trainconcierge.booking.BookingStatus;
import com.trainconcierge.booking.Journey;
import com.trainconcierge.booking.JourneyRepository;
import com.trainconcierge.booking.JourneyStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ImpactAnalysisService {

    private static final int SUMMARY_LIMIT = 300;

    private final DisruptionRepository disruptionRepository;
    private final BookingRepository bookingRepository;
    private final JourneyRepository journeyRepository;
    private final JourneyImpactRepository impactRepository;
    private final RecommendationEngine recommendationEngine;
    private final DisruptionProperties properties;

    public ImpactAnalysisService(DisruptionRepository disruptionRepository,
                                 BookingRepository bookingRepository,
                                 JourneyRepository journeyRepository,
                                 JourneyImpactRepository impactRepository,
                                 RecommendationEngine recommendationEngine,
                                 DisruptionProperties properties) {
        this.disruptionRepository = disruptionRepository;
        this.bookingRepository = bookingRepository;
        this.journeyRepository = journeyRepository;
        this.impactRepository = impactRepository;
        this.recommendationEngine = recommendationEngine;
        this.properties = properties;
    }

    /**
     * Recomputes every impact for the disruption. Existing rows are updated through the
     * unique (disruption, booking) key, so running this twice cannot duplicate impacts.
     */
    @Transactional
    public List<JourneyImpact> analyze(Long disruptionId) {
        Disruption disruption = disruptionRepository.findById(disruptionId)
                .orElseThrow(com.trainconcierge.common.error.ApiException::notFound);
        return analyze(disruption);
    }

    @Transactional
    public List<JourneyImpact> analyze(Disruption disruption) {
        if (!disruption.isActive()) {
            return List.of();
        }
        List<Booking> bookings = bookingRepository.findForTrainAndDate(
                disruption.getTrainNumber(), disruption.getTravelDate(), BookingStatus.CONFIRMED);
        List<JourneyImpact> impacts = new ArrayList<>();
        for (Booking booking : bookings) {
            Journey journey = journeyRepository.findByBookingId(booking.getId()).orElse(null);
            if (journey == null || journey.getStoredStatus() == JourneyStatus.CANCELLED) {
                continue;
            }
            JourneyImpact impact = impactRepository
                    .findByDisruptionIdAndBookingId(disruption.getId(), booking.getId())
                    .orElseGet(() -> JourneyImpact.create(disruption, journey, booking,
                            LocalDateTime.now()));
            boolean cancellation = disruption.isCancellation();
            int delay = disruption.getDelayMinutesOrZero();
            LocalDateTime originalArrival = booking.getArrivalTime();
            LocalDateTime newArrival = cancellation ? null : originalArrival.plusMinutes(delay);
            boolean missedConnection = hasConnectingBooking(booking, newArrival);
            boolean overnight = cancellation
                    ? !recommendationEngine.hasSameDayAlternative(disruption, booking)
                    : newArrival.toLocalTime().isAfter(LocalTime.of(
                            properties.getHotelUnlockHour(), 0))
                    || delay > properties.getHotelUnlockWaitHours() * 60;
            ImpactLevel level = level(delay, cancellation);
            String summary = summary(disruption, booking, newArrival, missedConnection, overnight);
            impact.update(originalArrival, newArrival, delay, missedConnection, overnight,
                    overnight, level, summary);
            journey.markDisrupted(disruption.getId());
            impactRepository.save(impact);
            journeyRepository.save(journey);
            impacts.add(impact);
        }
        impactRepository.flush();
        return impacts;
    }

    private boolean hasConnectingBooking(Booking booking, LocalDateTime newArrival) {
        LocalDateTime from = booking.getArrivalTime();
        LocalDateTime to = newArrival != null ? newArrival : from.plusHours(24);
        if (!to.isAfter(from)) {
            return false;
        }
        return !bookingRepository.findConnectingBookings(booking.getUserId(), booking.getId(),
                BookingStatus.CONFIRMED, from, to).isEmpty();
    }

    private static ImpactLevel level(int delayMinutes, boolean cancellation) {
        if (cancellation) {
            return ImpactLevel.SEVERE;
        }
        if (delayMinutes < 60) {
            return ImpactLevel.MINOR;
        }
        if (delayMinutes <= 240) {
            return ImpactLevel.MODERATE;
        }
        return ImpactLevel.SEVERE;
    }

    private String summary(Disruption disruption, Booking booking, LocalDateTime newArrival,
                           boolean missedConnection, boolean overnight) {
        LocalDate travelDate = booking.getTravelDate();
        StringBuilder text = new StringBuilder();
        if (disruption.isCancellation()) {
            text.append("Train ").append(disruption.getTrainNumber())
                    .append(" is cancelled on ").append(ImpactText.day(travelDate))
                    .append(". Full refund applies. We're showing alternatives for your journey.");
        } else {
            text.append("Train ").append(disruption.getTrainNumber())
                    .append(" is delayed by ").append(ImpactText.duration(
                            disruption.getDelayMinutesOrZero()))
                    .append(". You'll reach ").append(booking.getToStation().getName())
                    .append(ImpactText.arrivalClause(newArrival, travelDate)).append(".");
        }
        if (missedConnection) {
            text.append(" You may miss your onward connection.");
        }
        if (overnight) {
            text.append(" This journey now runs overnight; hotel options are available.");
        }
        if (text.length() > SUMMARY_LIMIT) {
            return text.substring(0, SUMMARY_LIMIT - 1) + ".";
        }
        return text.toString();
    }
}
