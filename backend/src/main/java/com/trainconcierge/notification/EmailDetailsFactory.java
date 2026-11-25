package com.trainconcierge.notification;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.booking.BookingRepository;
import com.trainconcierge.booking.BookingPassenger;
import com.trainconcierge.disruption.Disruption;
import com.trainconcierge.disruption.ImpactText;
import com.trainconcierge.disruption.JourneyImpact;
import com.trainconcierge.disruption.JourneyImpactRepository;
import com.trainconcierge.hotel.Hotel;
import com.trainconcierge.hotel.HotelBooking;
import com.trainconcierge.hotel.HotelBookingRepository;
import com.trainconcierge.hotel.HotelRepository;
import com.trainconcierge.hotel.HotelRoom;
import com.trainconcierge.hotel.HotelRoomRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Rebuilds the summary table inside a transactional email from the record the notification
 * points at, so a message retried hours later still quotes live data. Runs on the mail thread,
 * which has no session of its own, hence the read-only transaction.
 */
@Component
public class EmailDetailsFactory {

    private static final DateTimeFormatter TIMESTAMP =
            DateTimeFormatter.ofPattern("EEEE, d MMM yyyy 'at' HH:mm", Locale.ENGLISH);
    private static final DateTimeFormatter DATE =
            DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DecimalFormat MONEY =
            new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(Locale.ENGLISH));

    private final BookingRepository bookingRepository;
    private final JourneyImpactRepository impactRepository;
    private final HotelBookingRepository hotelBookingRepository;
    private final HotelRepository hotelRepository;
    private final HotelRoomRepository hotelRoomRepository;

    public EmailDetailsFactory(BookingRepository bookingRepository,
                               JourneyImpactRepository impactRepository,
                               HotelBookingRepository hotelBookingRepository,
                               HotelRepository hotelRepository,
                               HotelRoomRepository hotelRoomRepository) {
        this.bookingRepository = bookingRepository;
        this.impactRepository = impactRepository;
        this.hotelBookingRepository = hotelBookingRepository;
        this.hotelRepository = hotelRepository;
        this.hotelRoomRepository = hotelRoomRepository;
    }

    @Transactional(readOnly = true)
    public List<EmailDetail> forNotification(Notification notification) {
        List<EmailDetail> details = new ArrayList<>();
        switch (notification.getType()) {
            case BOOKING_CONFIRMED, REBOOKING_CONFIRMED ->
                    find(notification, bookingRepository).ifPresent(booking ->
                            bookingDetails(booking, details));
            case DISRUPTION, DISRUPTION_UPDATED, DISRUPTION_RESOLVED ->
                    disruptionDetails(notification, details);
            case HOTEL_AT_RISK, HOTEL_UPDATE ->
                    find(notification, hotelBookingRepository).ifPresent(booking ->
                            hotelDetails(booking, details));
            default -> {
            }
        }
        return details;
    }

    private void disruptionDetails(Notification notification, List<EmailDetail> details) {
        if (notification.getEntityId() == null) {
            return;
        }
        JourneyImpact impact = impactRepository
                .findByDisruptionIdOrderByCreatedAtAsc(notification.getEntityId()).stream()
                .filter(candidate -> candidate.getBooking().getUserId()
                        .equals(notification.getUserId()))
                .findFirst()
                .orElse(null);
        if (impact == null) {
            return;
        }
        Disruption disruption = impact.getDisruption();
        Booking booking = impact.getBooking();
        details.add(new EmailDetail("Train", "%s (%s)".formatted(disruption.getTrain().getName(),
                disruption.getTrainNumber())));
        details.add(new EmailDetail("Travel date", date(disruption.getTravelDate())));
        details.add(new EmailDetail("Update type", disruption.isCancellation()
                ? "Cancellation" : "Delay of " + duration(disruption.getDelayMinutesOrZero())));
        details.add(new EmailDetail("Severity", humanize(disruption.getSeverity())));
        if (disruption.getReason() != null && !disruption.getReason().isBlank()) {
            details.add(new EmailDetail("Reason", disruption.getReason()));
        }
        details.add(new EmailDetail("Journey", route(booking)));
        details.add(new EmailDetail("Class", booking.getClassCode()));
        if (!disruption.isCancellation()) {
            details.add(new EmailDetail("Scheduled arrival", timestamp(impact.getOriginalArrival())));
            details.add(new EmailDetail("Revised arrival", timestamp(impact.getNewArrival())));
        }
        details.add(new EmailDetail("PNR", booking.getPnr()));
        details.add(new EmailDetail("Booking status", humanize(booking.getStatus())));
    }

    private void bookingDetails(Booking booking, List<EmailDetail> details) {
        details.add(new EmailDetail("Booking ID", String.valueOf(booking.getId())));
        details.add(new EmailDetail("PNR", booking.getPnr()));
        details.add(new EmailDetail("Train", "%s (%s)".formatted(booking.getTrain().getName(),
                booking.getTrain().getNumber())));
        details.add(new EmailDetail("Journey", route(booking)));
        details.add(new EmailDetail("Travel date", date(booking.getTravelDate())));
        details.add(new EmailDetail("Departure", "%s · %s".formatted(
                booking.getFromStation().getName(), timestamp(booking.getBoardingTime()))));
        details.add(new EmailDetail("Arrival", "%s · %s".formatted(
                booking.getToStation().getName(), timestamp(booking.getArrivalTime()))));
        details.add(new EmailDetail("Class and quota", "%s · %s".formatted(booking.getClassCode(),
                humanize(booking.getQuota()))));
        details.add(new EmailDetail("Passengers", joinLabels(booking.getPassengers().stream()
                .map(passenger -> "%s (%d)".formatted(passenger.getName(), passenger.getAge()))
                .toList())));
        details.add(new EmailDetail("Coach and berths", joinLabels(booking.getPassengers().stream()
                .map(BookingPassenger::getSeatLabel)
                .filter(label -> label != null && !label.isBlank())
                .toList())));
        details.add(new EmailDetail("Fare paid", money(booking.getTotalFare())));
        details.add(new EmailDetail("Status", humanize(booking.getStatus())));
    }

    private void hotelDetails(HotelBooking booking, List<EmailDetail> details) {
        details.add(new EmailDetail("Booking ID", String.valueOf(booking.getId())));
        Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
        details.add(new EmailDetail("Hotel", hotel == null ? DASH : hotel.getName()));
        if (hotel != null) {
            details.add(new EmailDetail("Address", "%s · %s km from %s station".formatted(
                    hotel.getAddress(), plain(hotel.getDistanceKm()), hotel.getStationCode())));
        }
        HotelRoom room = hotelRoomRepository.findById(booking.getRoomId()).orElse(null);
        details.add(new EmailDetail("Room", room == null ? DASH
                : "%s · floor %d".formatted(room.getRoomType(), room.getFloor())));
        details.add(new EmailDetail("Check-in", "%s from %s".formatted(
                date(booking.getCheckInDate()), time(booking.getCheckInTime()))));
        details.add(new EmailDetail("Check-out", "%s by %s".formatted(
                date(booking.getCheckOutDate()), time(booking.getCheckOutTime()))));
        details.add(new EmailDetail("Guests", String.valueOf(booking.getGuests())));
        if (!booking.isManualEntry()) {
            details.add(new EmailDetail("Total", money(booking.getTotalPrice())));
        }
        details.add(new EmailDetail("Status", humanize(booking.getStatus())));
    }

    private static <T> Optional<T> find(Notification notification, JpaRepository<T, Long> repository) {
        return notification.getEntityId() == null ? Optional.empty()
                : repository.findById(notification.getEntityId());
    }

    private static String route(Booking booking) {
        return "%s (%s) → %s (%s)".formatted(booking.getFromStation().getName(),
                booking.getFromStation().getCode(), booking.getToStation().getName(),
                booking.getToStation().getCode());
    }

    private static final String DASH = "—";

    private static String joinLabels(List<String> values) {
        return values.isEmpty() ? DASH : String.join(", ", values);
    }

    private static String timestamp(LocalDateTime value) {
        return value == null ? DASH : TIMESTAMP.format(value);
    }

    private static String time(LocalTime value) {
        return value == null ? DASH : TIME.format(value);
    }

    private static String date(LocalDate value) {
        return value == null ? DASH : DATE.format(value);
    }

    private static String money(BigDecimal value) {
        return value == null ? DASH : "₹" + MONEY.format(value);
    }

    private static String plain(BigDecimal value) {
        return value == null ? DASH : new DecimalFormat("#,##0.#",
                DecimalFormatSymbols.getInstance(Locale.ENGLISH)).format(value);
    }

    private static String duration(int minutes) {
        return ImpactText.duration(minutes);
    }

    private static String humanize(Enum<?> value) {
        String words = value.name().toLowerCase(Locale.ENGLISH).replace('_', ' ');
        return Character.toUpperCase(words.charAt(0)) + words.substring(1);
    }
}
