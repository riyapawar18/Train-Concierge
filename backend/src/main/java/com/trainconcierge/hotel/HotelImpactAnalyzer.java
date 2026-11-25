package com.trainconcierge.hotel;

import com.trainconcierge.disruption.JourneyImpact;
import com.trainconcierge.notification.SseHub;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Service
public class HotelImpactAnalyzer {

    private static final Logger log = LoggerFactory.getLogger(HotelImpactAnalyzer.class);
    private static final int STATION_TRANSFER_MINUTES = 40;
    private static final int MIN_DELAY_MINUTES = 30;

    private final HotelBookingRepository bookingRepository;
    private final HotelPolicyRepository policyRepository;
    private final HotelRoomRepository roomRepository;
    private final RoomAvailabilityRepository availabilityRepository;
    private final HotelImpactRepository impactRepository;
    private final SseHub sseHub;

    public HotelImpactAnalyzer(HotelBookingRepository bookingRepository,
                                HotelPolicyRepository policyRepository,
                                HotelRoomRepository roomRepository,
                                RoomAvailabilityRepository availabilityRepository,
                                HotelImpactRepository impactRepository,
                                SseHub sseHub) {
        this.bookingRepository = bookingRepository;
        this.policyRepository = policyRepository;
        this.roomRepository = roomRepository;
        this.availabilityRepository = availabilityRepository;
        this.impactRepository = impactRepository;
        this.sseHub = sseHub;
    }

    @Transactional
    public void analyze(JourneyImpact journeyImpact) {
        if (journeyImpact.getDelayMinutes() < MIN_DELAY_MINUTES) {
            return;
        }
        if (journeyImpact.getNewArrival() == null) {
            return;
        }

        Long journeyId = journeyImpact.getJourney().getId();
        List<HotelBooking> hotelBookings = bookingRepository.findByJourneyId(journeyId).stream()
            .filter(b -> b.getStatus() != HotelBookingStatus.CANCELLED)
            .toList();

        for (HotelBooking booking : hotelBookings) {
            try {
                analyzeBooking(journeyImpact, booking);
            } catch (Exception e) {
                log.warn("Failed to analyze hotel impact for booking {}: {}", booking.getId(), e.getMessage());
            }
        }
    }

    private void analyzeBooking(JourneyImpact journeyImpact, HotelBooking booking) {
        HotelPolicy policy = policyRepository.findByHotelId(booking.getHotelId()).orElse(null);
        if (policy == null) return;

        LocalDateTime newArrival = journeyImpact.getNewArrival().plusMinutes(STATION_TRANSFER_MINUTES);
        LocalDateTime checkInDateTime = booking.getCheckInDate().atTime(booking.getCheckInTime());
        int arrivalVsCheckin = (int) java.time.Duration.between(checkInDateTime, newArrival).toMinutes();

        HotelImpactVerdict verdict;
        String summary;

        // Check departure-side delay (checkout pressure)
        LocalDateTime originalDeparture = journeyImpact.getBooking().getBoardingTime();
        LocalDateTime newDeparture = originalDeparture.plusMinutes(journeyImpact.getDelayMinutes());
        LocalDateTime checkOutDateTime = booking.getCheckOutDate().atTime(booking.getCheckOutTime());

        if (newDeparture.isAfter(checkOutDateTime)
                && newDeparture.toLocalDate().equals(booking.getCheckOutDate())) {
            if (policy.isLateCheckoutAllowed() && policy.getMaxLateCheckoutTime() != null) {
                verdict = HotelImpactVerdict.CHECKOUT_PRESSURE;
                summary = "Your train now departs at "
                    + newDeparture.toLocalTime().toString().substring(0, 5)
                    + ", which is after checkout at "
                    + booking.getCheckOutTime().toString().substring(0, 5)
                    + ". Late checkout until "
                    + policy.getMaxLateCheckoutTime().toString().substring(0, 5)
                    + " is available"
                    + (!"FREE".equals(policy.getLateCheckoutFeeType())
                        ? " (approx. fee applies)" : " at no charge") + ".";
            } else {
                verdict = HotelImpactVerdict.CHECKOUT_PRESSURE;
                summary = "Your train now departs at "
                    + newDeparture.toLocalTime().toString().substring(0, 5)
                    + ", which is after checkout at "
                    + booking.getCheckOutTime().toString().substring(0, 5)
                    + ". Contact the hotel to arrange luggage storage.";
            }
        } else if (newArrival.toLocalDate().equals(booking.getCheckInDate())) {
            LocalTime arrivalTime = newArrival.toLocalTime();
            if (!arrivalTime.isAfter(booking.getCheckInTime())) {
                verdict = HotelImpactVerdict.UNAFFECTED;
                summary = "Your arrival is still before check-in time. No action needed.";
            } else if (policy.isLateArrivalAllowed() && policy.getLateArrivalCutoff() != null
                    && !arrivalTime.isAfter(policy.getLateArrivalCutoff())) {
                verdict = HotelImpactVerdict.LATE_ARRIVAL_OK;
                summary = "Your stay can be extended: late arrival is allowed until "
                    + policy.getLateArrivalCutoff().toString().substring(0, 5)
                    + " at no charge. We recommend notifying the hotel of your delay.";
            } else if (policy.isExtraNightPossible()
                    && hasAvailability(booking.getRoomId(), booking.getCheckInDate().plusDays(1))) {
                verdict = HotelImpactVerdict.PAST_CUTOFF_EXTENSION_POSSIBLE;
                summary = "This hotel cannot hold your room past "
                    + (policy.getLateArrivalCutoff() != null
                        ? policy.getLateArrivalCutoff().toString().substring(0, 5) : "the cutoff")
                    + ". You'll arrive about " + arrivalTime.toString().substring(0, 5)
                    + ". An extra night may be available — contact the hotel.";
            } else {
                verdict = HotelImpactVerdict.PAST_CUTOFF_NO_EXTENSION;
                summary = "This hotel cannot hold your room past "
                    + (policy.getLateArrivalCutoff() != null
                        ? policy.getLateArrivalCutoff().toString().substring(0, 5) : "the cutoff")
                    + ". You'll arrive about " + arrivalTime.toString().substring(0, 5)
                    + ". Please call the hotel or find a nearby stay.";
            }
        } else if (newArrival.toLocalDate().isAfter(booking.getCheckInDate())) {
            verdict = HotelImpactVerdict.NIGHT_LOST;
            summary = "Your delay means you'll arrive on " + newArrival.toLocalDate()
                + " instead of your check-in date. Consider shifting your stay by one night.";
        } else {
            verdict = HotelImpactVerdict.UNAFFECTED;
            summary = "Your hotel stay is not affected by this delay.";
        }

        // Save or update hotel impact
        HotelImpact impact = impactRepository
            .findByImpactIdAndHotelBookingId(journeyImpact.getId(), booking.getId())
            .orElseGet(() -> {
                HotelImpact i = new HotelImpact();
                i.setImpactId(journeyImpact.getId());
                i.setHotelBookingId(booking.getId());
                return i;
            });
        impact.setNewArrivalAt(newArrival);
        impact.setArrivalVsCheckinMinutes(arrivalVsCheckin);
        impact.setVerdict(verdict);
        impact.setSummary(summary);
        impact.setCreatedAt(LocalDateTime.now());
        impactRepository.save(impact);

        // Update booking status
        if (verdict != HotelImpactVerdict.UNAFFECTED) {
            if (verdict == HotelImpactVerdict.LATE_ARRIVAL_OK) {
                if (booking.getStatus() == HotelBookingStatus.CONFIRMED) {
                    booking.setStatus(HotelBookingStatus.LATE_ARRIVAL_NOTED);
                }
            } else {
                booking.setStatus(HotelBookingStatus.AT_RISK);
            }
            bookingRepository.save(booking);
            sseHub.send(booking.getUserId(), SseHub.EVENT_HOTEL,
                Map.of("type", "HOTEL_AT_RISK", "bookingId", booking.getId(),
                    "verdict", verdict.name()));
        }
    }

    private boolean hasAvailability(Long roomId, LocalDate date) {
        return availabilityRepository.findByRoomIdAndStayDate(roomId, date)
            .map(ra -> "AVAILABLE".equals(ra.getStatus())).orElse(true);
    }
}
