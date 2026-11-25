package com.trainconcierge.hotel;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.booking.BookingRepository;
import com.trainconcierge.booking.Journey;
import com.trainconcierge.booking.JourneyRepository;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * Seeds demo hotel bookings for Asha, Fatima and Karan.
 *
 * Demo scenario — evening service 11007 departs 16:30, arrives CSMT ~19:45.
 * A 3 h 15 m delay pushes the arrival to ~23:00; adding the 40-minute station
 * transfer gives an effective arrival of ~23:40.
 *
 * Verdict arithmetic:
 *   Asha  – Harbour Gate Residency (CSMT): check-in 14:00, late-arrival cutoff 23:59.
 *           23:40 ≤ 23:59  →  LATE_ARRIVAL_OK          (action: Notify hotel)
 *
 *   Fatima – Ballard Budget Lodge (CSMT): check-in 12:00, late-arrival cutoff 22:00,
 *            extra_night_possible = FALSE.
 *           23:40 > 22:00 and no extension  →  PAST_CUTOFF_NO_EXTENSION
 *                                              (actions: Call hotel, See nearby stays)
 *
 *   Karan  – Fort Business Inn (CSMT): check-in same day, FLAT late-checkout fee.
 *            Departure delayed past checkout  →  CHECKOUT_PRESSURE
 *                                               (actions: Request extension, Call hotel)
 */
@Component
@Profile("demo")
@Order(35)
public class DemoHotelBookingSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoHotelBookingSeeder.class);

    private final UserRepository userRepository;
    private final HotelRepository hotelRepository;
    private final HotelRoomRepository roomRepository;
    private final HotelPolicyRepository policyRepository;
    private final HotelBookingRepository bookingRepository;
    private final RoomAvailabilityRepository availabilityRepository;
    private final JourneyRepository journeyRepository;
    private final BookingRepository trainBookingRepository;
    private final JdbcTemplate jdbc;
    private final boolean enabled;

    public DemoHotelBookingSeeder(UserRepository userRepository,
                                   HotelRepository hotelRepository,
                                   HotelRoomRepository roomRepository,
                                   HotelPolicyRepository policyRepository,
                                   HotelBookingRepository bookingRepository,
                                   RoomAvailabilityRepository availabilityRepository,
                                   JourneyRepository journeyRepository,
                                   BookingRepository trainBookingRepository,
                                   JdbcTemplate jdbc,
                                   @Value("${app.demo.hotels.enabled:true}") boolean enabled) {
        this.userRepository = userRepository;
        this.hotelRepository = hotelRepository;
        this.roomRepository = roomRepository;
        this.policyRepository = policyRepository;
        this.bookingRepository = bookingRepository;
        this.availabilityRepository = availabilityRepository;
        this.journeyRepository = journeyRepository;
        this.trainBookingRepository = trainBookingRepository;
        this.jdbc = jdbc;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        try {
            seedAsha();
            seedFatima();
            seedKaran();
            log.info("Demo hotel bookings ready.");
        } catch (Exception e) {
            log.warn("Could not seed demo hotel bookings: {}", e.getMessage());
        }
    }

    // -----------------------------------------------------------------------
    // Asha — Harbour Gate Residency, cutoff 23:59 → LATE_ARRIVAL_OK
    // -----------------------------------------------------------------------
    private void seedAsha() {
        User asha = userRepository.findByEmail("asha.kulkarni@trainconcierge.demo").orElse(null);
        if (asha == null) return;

        Journey journey = findJourneyByTitle(asha.getId(), "Evening run to Mumbai");
        if (journey != null && !bookingRepository.findByJourneyId(journey.getId()).isEmpty()) return;

        Hotel hotel = findHotel("Harbour Gate Residency", "CSMT");
        if (hotel == null) return;

        HotelPolicy policy = policyRepository.findByHotelId(hotel.getId()).orElse(null);
        if (policy == null) return;

        LocalDate checkInDate = getEveningTripDate();
        HotelRoom room = getFirstAvailableRoom(hotel.getId(), checkInDate);
        if (room == null) return;

        LocalDate checkOutDate = checkInDate.plusDays(1);
        bookRoomNights(room.getId(), checkInDate, checkOutDate);

        HotelBooking b = new HotelBooking();
        b.setUserId(asha.getId());
        b.setJourneyId(journey != null ? journey.getId() : null);
        b.setHotelId(hotel.getId());
        b.setRoomId(room.getId());
        b.setCheckInDate(checkInDate);
        b.setCheckInTime(policy.getStandardCheckinTime());
        b.setCheckOutDate(checkOutDate);
        b.setCheckOutTime(policy.getStandardCheckoutTime());
        b.setGuests(1);
        b.setTotalPrice(room.getPricePerNight());
        b.setStatus(HotelBookingStatus.CONFIRMED);
        b.setLateArrivalCutoff(policy.getLateArrivalCutoff()); // 23:59
        b.setNotes("Evening run booking – linked to train journey");
        bookingRepository.save(b);
        log.info("Seeded Asha hotel booking: {} (cutoff {})", hotel.getName(), policy.getLateArrivalCutoff());
    }

    // -----------------------------------------------------------------------
    // Fatima — Ballard Budget Lodge, cutoff 22:00, no extension → PAST_CUTOFF_NO_EXTENSION
    // -----------------------------------------------------------------------
    private void seedFatima() {
        User fatima = userRepository.findByEmail("fatima.sheikh@trainconcierge.demo").orElse(null);
        if (fatima == null) return;

        Journey journey = findJourneyByTitle(fatima.getId(), "Evening run to Mumbai");
        if (journey != null && !bookingRepository.findByJourneyId(journey.getId()).isEmpty()) return;

        Hotel hotel = findHotel("Ballard Budget Lodge", "CSMT");
        if (hotel == null) return;

        HotelPolicy policy = policyRepository.findByHotelId(hotel.getId()).orElse(null);
        if (policy == null) return;

        LocalDate checkInDate = getEveningTripDate();
        HotelRoom room = getFirstAvailableRoom(hotel.getId(), checkInDate);
        if (room == null) return;

        LocalDate checkOutDate = checkInDate.plusDays(1);
        bookRoomNights(room.getId(), checkInDate, checkOutDate);

        HotelBooking b = new HotelBooking();
        b.setUserId(fatima.getId());
        b.setJourneyId(journey != null ? journey.getId() : null);
        b.setHotelId(hotel.getId());
        b.setRoomId(room.getId());
        b.setCheckInDate(checkInDate);
        b.setCheckInTime(policy.getStandardCheckinTime());
        b.setCheckOutDate(checkOutDate);
        b.setCheckOutTime(policy.getStandardCheckoutTime());
        b.setGuests(1);
        b.setTotalPrice(room.getPricePerNight());
        b.setStatus(HotelBookingStatus.CONFIRMED);
        b.setLateArrivalCutoff(policy.getLateArrivalCutoff()); // 22:00
        bookingRepository.save(b);
        log.info("Seeded Fatima hotel booking: {} (cutoff {})", hotel.getName(), policy.getLateArrivalCutoff());
    }

    // -----------------------------------------------------------------------
    // Karan — Fort Business Inn, FLAT late-checkout fee → CHECKOUT_PRESSURE
    // -----------------------------------------------------------------------
    private void seedKaran() {
        User karan = userRepository.findByEmail("karan.mehta@trainconcierge.demo").orElse(null);
        if (karan == null) return;

        // Any journey where Karan departs from CSMT or BCT toward NDLS
        Journey journey = findKaranDepartureJourney(karan.getId());
        if (journey != null && !bookingRepository.findByJourneyId(journey.getId()).isEmpty()) return;

        Hotel hotel = findHotel("Fort Business Inn", "CSMT");
        if (hotel == null) return;

        HotelPolicy policy = policyRepository.findByHotelId(hotel.getId()).orElse(null);
        if (policy == null) return;

        LocalDate checkInDate = LocalDate.now();
        HotelRoom room = getFirstAvailableRoom(hotel.getId(), checkInDate);
        if (room == null) return;

        LocalDate checkOutDate = checkInDate.plusDays(1);
        bookRoomNights(room.getId(), checkInDate, checkOutDate);

        HotelBooking b = new HotelBooking();
        b.setUserId(karan.getId());
        b.setJourneyId(journey != null ? journey.getId() : null);
        b.setHotelId(hotel.getId());
        b.setRoomId(room.getId());
        b.setCheckInDate(checkInDate);
        b.setCheckInTime(policy.getStandardCheckinTime());
        b.setCheckOutDate(checkOutDate);
        b.setCheckOutTime(policy.getStandardCheckoutTime());
        b.setGuests(1);
        b.setTotalPrice(room.getPricePerNight());
        b.setStatus(HotelBookingStatus.CONFIRMED);
        b.setLateArrivalCutoff(policy.getLateArrivalCutoff());
        b.setNotes("Mumbai stay before Delhi departure");
        bookingRepository.save(b);
        log.info("Seeded Karan hotel booking: {} (FLAT late-checkout fee)", hotel.getName());
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private Hotel findHotel(String name, String stationCode) {
        return hotelRepository.findByStationCodeOrderByDistanceKmAsc(stationCode).stream()
            .filter(h -> h.getName().equalsIgnoreCase(name))
            .findFirst().orElse(null);
    }

    private Journey findJourneyByTitle(Long userId, String titleSubstring) {
        return journeyRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .filter(j -> j.getTitle() != null && j.getTitle().contains(titleSubstring))
            .findFirst().orElse(null);
    }

    private Journey findKaranDepartureJourney(Long userId) {
        return journeyRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .filter(j -> {
                try {
                    Booking bk = j.getBooking();
                    String dest = bk.getToStation().getCode();
                    return "NDLS".equals(dest) || "BCT".equals(dest);
                } catch (Exception e) {
                    return false;
                }
            })
            .findFirst().orElse(null);
    }

    private HotelRoom getFirstAvailableRoom(Long hotelId, LocalDate checkInDate) {
        List<HotelRoom> rooms = roomRepository.findByHotelIdOrderByFloorAscRoomNoAsc(hotelId);
        for (HotelRoom room : rooms) {
            boolean available = availabilityRepository
                .findByRoomIdAndStayDate(room.getId(), checkInDate)
                .map(ra -> "AVAILABLE".equals(ra.getStatus()))
                .orElse(true);
            if (available) return room;
        }
        return rooms.isEmpty() ? null : rooms.get(0);
    }

    /**
     * Books room nights using JDBC MERGE/UPDATE to avoid JPA optimistic-locking
     * issues with rows inserted by the catalog SQL seeder (which set version=NULL).
     */
    private void bookRoomNights(Long roomId, LocalDate checkIn, LocalDate checkOut) {
        for (LocalDate d = checkIn; !d.isAfter(checkOut.minusDays(1)); d = d.plusDays(1)) {
            // Try UPDATE first; if 0 rows affected, INSERT
            int updated = jdbc.update(
                "UPDATE room_availability SET status='BOOKED', held_until=NULL WHERE room_id=? AND stay_date=?",
                roomId, java.sql.Date.valueOf(d));
            if (updated == 0) {
                jdbc.update(
                    "INSERT INTO room_availability (room_id, stay_date, status, held_until, version) VALUES (?,?,'BOOKED',NULL,0)",
                    roomId, java.sql.Date.valueOf(d));
            }
        }
    }

    /**
     * Mirrors DemoJourneySeeder.eveningRunDate: today if before 16:30, else tomorrow.
     */
    private LocalDate getEveningTripDate() {
        LocalDateTime now = LocalDateTime.now();
        return now.toLocalTime().isBefore(LocalTime.of(16, 30))
            ? now.toLocalDate()
            : now.toLocalDate().plusDays(1);
    }
}
