package com.trainconcierge.service;

import com.trainconcierge.dto.*;
import com.trainconcierge.entity.*;
import com.trainconcierge.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HotelCabService {

    private final HotelReservationRepository hotelRepo;
    private final CabReservationRepository cabRepo;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    @Transactional
    public HotelDto reserveHotel(Long userId, HotelRequest req) {
        Booking booking = bookingRepository.findById(req.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        if (!booking.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }

        long nights = ChronoUnit.DAYS.between(req.getCheckIn(), req.getCheckOut());
        if (nights <= 0) throw new RuntimeException("Check-out must be after check-in");

        double total = req.getPricePerNight() * nights * req.getRooms();

        HotelReservation hotel = HotelReservation.builder()
                .booking(booking)
                .hotelName(req.getHotelName())
                .city(req.getCity())
                .checkIn(req.getCheckIn())
                .checkOut(req.getCheckOut())
                .rooms(req.getRooms())
                .pricePerNight(req.getPricePerNight())
                .totalAmount(total)
                .status(HotelReservation.ReservationStatus.CONFIRMED)
                .build();
        HotelReservation saved = hotelRepo.save(hotel);

        notificationService.sendNotification(
                userId,
                "Hotel Confirmed",
                "Hotel '" + req.getHotelName() + "' in " + req.getCity() +
                        " confirmed for " + nights + " night(s). Total: ₹" + total,
                Notification.NotificationType.HOTEL_CONFIRMED,
                booking.getId()
        );

        return toHotelDto(saved);
    }

    @Transactional
    public CabDto reserveCab(Long userId, CabRequest req) {
        Booking booking = bookingRepository.findById(req.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        if (!booking.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }

        CabReservation cab = CabReservation.builder()
                .booking(booking)
                .cabType(req.getCabType())
                .pickupLocation(req.getPickupLocation())
                .dropLocation(req.getDropLocation())
                .pickupDate(req.getPickupDate())
                .pickupTime(req.getPickupTime())
                .fare(req.getFare())
                .status(CabReservation.ReservationStatus.CONFIRMED)
                .rideStatus(CabReservation.RideStatus.DRIVER_ASSIGNED)
                .pickupEtaMinutes(req.getPickupEtaMinutes() != null ? req.getPickupEtaMinutes() : 5)
                .driverName(req.getDriverName())
                .vehicleNumber(req.getVehicleNumber())
                .build();
        CabReservation saved = cabRepo.save(cab);

        notificationService.sendNotification(
                userId,
                "Cab Confirmed",
                "Cab (" + req.getCabType() + ") from " + req.getPickupLocation() +
                        " to " + req.getDropLocation() + " on " + req.getPickupDate() +
                        " confirmed. ETA: " + saved.getPickupEtaMinutes() + " min.",
                Notification.NotificationType.CAB_CONFIRMED,
                booking.getId()
        );

        return toCabDto(saved);
    }

    /**
     * Advance the ride status to the next stage in the simulated lifecycle.
     * Only the owning passenger may trigger this.
     * Progression: DRIVER_ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED
     */
    @Transactional
    public CabDto advanceRideStatus(Long cabId, Long userId) {
        CabReservation cab = cabRepo.findById(cabId)
                .orElseThrow(() -> new RuntimeException("Cab reservation not found"));
        if (!cab.getBooking().getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }
        if (cab.getStatus() == CabReservation.ReservationStatus.CANCELLED) {
            throw new RuntimeException("Cannot advance status of a cancelled reservation");
        }
        CabReservation.RideStatus next = nextRideStatus(cab.getRideStatus());
        cab.setRideStatus(next);
        if (next == CabReservation.RideStatus.COMPLETED) {
            cab.setStatus(CabReservation.ReservationStatus.CONFIRMED); // stays CONFIRMED
        }
        return toCabDto(cabRepo.save(cab));
    }

    private static CabReservation.RideStatus nextRideStatus(CabReservation.RideStatus current) {
        if (current == null) return CabReservation.RideStatus.EN_ROUTE;
        return switch (current) {
            case DRIVER_ASSIGNED -> CabReservation.RideStatus.EN_ROUTE;
            case EN_ROUTE        -> CabReservation.RideStatus.ARRIVED;
            case ARRIVED         -> CabReservation.RideStatus.IN_PROGRESS;
            case IN_PROGRESS     -> CabReservation.RideStatus.COMPLETED;
            case COMPLETED, CANCELLED -> current; // terminal states
        };
    }

    public List<HotelDto> getHotelsByUser(Long userId) {
        return hotelRepo.findByBookingUserId(userId).stream().map(this::toHotelDto).collect(Collectors.toList());
    }

    public List<CabDto> getCabsByUser(Long userId) {
        return cabRepo.findByBookingUserId(userId).stream().map(this::toCabDto).collect(Collectors.toList());
    }

    public List<HotelDto> getHotelsByBooking(Long bookingId) {
        return hotelRepo.findByBookingId(bookingId).stream().map(this::toHotelDto).collect(Collectors.toList());
    }

    public List<CabDto> getCabsByBooking(Long bookingId) {
        return cabRepo.findByBookingId(bookingId).stream().map(this::toCabDto).collect(Collectors.toList());
    }

    // ─── Hotel Catalog (demo inventory) ──────────────────────────────────────

    /**
     * Returns a list of demo hotel catalog entries for a given city.
     * These are in-memory seeded entries — no live availability check.
     * Results are filtered case-insensitively by city name.
     */
    public List<HotelCatalogItem> searchHotelCatalog(String city) {
        if (city == null || city.isBlank()) {
            return List.of();
        }
        String normalizedCity = city.trim().toLowerCase();
        return HOTEL_CATALOG.stream()
                .filter(h -> h.getCity().toLowerCase().contains(normalizedCity))
                .collect(Collectors.toList());
    }

    // ─── Cab Catalog (demo inventory) ────────────────────────────────────────

    /**
     * Returns demo cab options available at a given city/destination.
     * These are in-memory entries — no live availability check.
     */
    public List<CabCatalogItem> searchCabCatalog(String city) {
        if (city == null || city.isBlank()) {
            return List.of();
        }
        String normalizedCity = city.trim().toLowerCase();
        return CAB_CATALOG.stream()
                .filter(c -> c.getCity().toLowerCase().contains(normalizedCity))
                .collect(Collectors.toList());
    }

    // ─── Demo Catalog Data ────────────────────────────────────────────────────
    // Seeded in-memory catalog. Availability and prices are simulated demo data.

    private static final List<HotelCatalogItem> HOTEL_CATALOG = buildHotelCatalog();
    private static final List<CabCatalogItem> CAB_CATALOG = buildCabCatalog();

    private static List<HotelCatalogItem> buildHotelCatalog() {
        List<HotelCatalogItem> list = new ArrayList<>();

        // Delhi
        list.add(HotelCatalogItem.builder().catalogId(101L).hotelName("Taj Palace Delhi").city("Delhi")
                .locality("Diplomatic Enclave").address("Sardar Patel Marg, New Delhi")
                .pricePerNight(8500).rating(4.8).reviewCount(2341).roomType("Deluxe Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Spa", "Restaurant", "Gym"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(102L).hotelName("The Leela Palace").city("Delhi")
                .locality("Chanakyapuri").address("Diplomatic Enclave, New Delhi")
                .pricePerNight(12000).rating(4.9).reviewCount(1876).roomType("Superior Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Spa", "Restaurant", "Concierge"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(103L).hotelName("Ibis Delhi Aerocity").city("Delhi")
                .locality("Aerocity").address("Asset 6, Hospitality District, New Delhi")
                .pricePerNight(3200).rating(4.1).reviewCount(4512).roomType("Standard Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Restaurant", "24-Hour Reception"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(104L).hotelName("Bloom Hotel Connaught Place").city("Delhi")
                .locality("Connaught Place").address("K-Block, Connaught Circus, New Delhi")
                .pricePerNight(4500).rating(4.3).reviewCount(987).roomType("Premium Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Restaurant", "Bar", "Gym"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(105L).hotelName("FabHotel Prime Karol Bagh").city("Delhi")
                .locality("Karol Bagh").address("5/31 Arya Samaj Road, New Delhi")
                .pricePerNight(1800).rating(3.8).reviewCount(623).roomType("Standard Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "AC", "TV"))
                .available(true).isDemo(true).build());

        // Mumbai
        list.add(HotelCatalogItem.builder().catalogId(201L).hotelName("Taj Mahal Palace").city("Mumbai")
                .locality("Colaba").address("Apollo Bunder, Colaba, Mumbai")
                .pricePerNight(15000).rating(4.9).reviewCount(5430).roomType("Heritage Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Spa", "Multiple Restaurants", "Gym"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(202L).hotelName("The Oberoi Mumbai").city("Mumbai")
                .locality("Nariman Point").address("Nariman Point, Mumbai")
                .pricePerNight(11000).rating(4.8).reviewCount(2100).roomType("Deluxe Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Spa", "Restaurant"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(203L).hotelName("Trident BKC").city("Mumbai")
                .locality("Bandra Kurla Complex").address("C-56, G Block, BKC, Mumbai")
                .pricePerNight(7500).rating(4.5).reviewCount(1340).roomType("Deluxe Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Restaurant", "Gym", "Business Center"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(204L).hotelName("Juhu Beach Resort").city("Mumbai")
                .locality("Juhu").address("Juhu Tara Road, Juhu, Mumbai")
                .pricePerNight(5000).rating(4.0).reviewCount(890).roomType("Sea View Room")
                .maxOccupancy(3).amenities(List.of("WiFi", "Pool", "Restaurant", "Beach Access"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(205L).hotelName("Hotel Suba Palace").city("Mumbai")
                .locality("CST Station Area").address("Apollo Bunder Road, Mumbai")
                .pricePerNight(2800).rating(3.9).reviewCount(456).roomType("Standard Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "AC", "Restaurant"))
                .available(true).isDemo(true).build());

        // Chennai
        list.add(HotelCatalogItem.builder().catalogId(301L).hotelName("ITC Grand Chola").city("Chennai")
                .locality("Mount Road").address("63, Mount Road, Guindy, Chennai")
                .pricePerNight(9500).rating(4.8).reviewCount(2876).roomType("Executive Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Spa", "Multiple Restaurants", "Gym"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(302L).hotelName("The Raintree St. Mary's Road").city("Chennai")
                .locality("Alwarpet").address("636 St. Mary's Road, Alwarpet, Chennai")
                .pricePerNight(5500).rating(4.4).reviewCount(1230).roomType("Deluxe Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Restaurant", "Gym"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(303L).hotelName("Hotel Himalaya Chennai").city("Chennai")
                .locality("Anna Salai").address("Anna Salai, Chennai")
                .pricePerNight(3200).rating(3.9).reviewCount(678).roomType("Standard Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "AC", "Restaurant"))
                .available(true).isDemo(true).build());

        // Bangalore
        list.add(HotelCatalogItem.builder().catalogId(401L).hotelName("The Oberoi Bangalore").city("Bangalore")
                .locality("MG Road").address("37-39 MG Road, Bangalore")
                .pricePerNight(10500).rating(4.8).reviewCount(1980).roomType("Deluxe Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Spa", "Restaurant", "Gym"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(402L).hotelName("Taj MG Road Bangalore").city("Bangalore")
                .locality("MG Road").address("41/3 MG Road, Bangalore")
                .pricePerNight(8000).rating(4.7).reviewCount(2560).roomType("Superior Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Restaurant", "Gym", "Bar"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(403L).hotelName("Lemon Tree Hotel Whitefield").city("Bangalore")
                .locality("Whitefield").address("Mahadevapura, Whitefield, Bangalore")
                .pricePerNight(3800).rating(4.2).reviewCount(890).roomType("Comfort Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Restaurant", "Gym", "Pool"))
                .available(true).isDemo(true).build());

        // Pune
        list.add(HotelCatalogItem.builder().catalogId(501L).hotelName("JW Marriott Pune").city("Pune")
                .locality("Senapati Bapat Road").address("Senapati Bapat Road, Pune")
                .pricePerNight(7500).rating(4.7).reviewCount(3210).roomType("Deluxe Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Spa", "Restaurant", "Gym"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(502L).hotelName("Hotel Sunderban Pune").city("Pune")
                .locality("Koregaon Park").address("19 Koregaon Park, Pune")
                .pricePerNight(4500).rating(4.3).reviewCount(1120).roomType("Deluxe Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Restaurant", "Garden"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(503L).hotelName("FabHotel Sunrise Kothrud").city("Pune")
                .locality("Kothrud").address("Near Kothrud Bus Stand, Pune")
                .pricePerNight(1900).rating(3.7).reviewCount(340).roomType("Standard Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "AC"))
                .available(true).isDemo(true).build());

        // Kolkata
        list.add(HotelCatalogItem.builder().catalogId(601L).hotelName("Taj Bengal Kolkata").city("Kolkata")
                .locality("Alipore").address("34B Belvedere Road, Alipore, Kolkata")
                .pricePerNight(8500).rating(4.7).reviewCount(1870).roomType("Deluxe Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Spa", "Restaurant", "Gym"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(602L).hotelName("The Park Kolkata").city("Kolkata")
                .locality("Park Street").address("17 Park Street, Kolkata")
                .pricePerNight(5500).rating(4.4).reviewCount(2100).roomType("Deluxe Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Pool", "Restaurant", "Bar", "Gym"))
                .available(true).isDemo(true).build());
        list.add(HotelCatalogItem.builder().catalogId(603L).hotelName("Ibis Kolkata Rajarhat").city("Kolkata")
                .locality("Rajarhat").address("Plot AA-1, New Town, Rajarhat, Kolkata")
                .pricePerNight(2800).rating(4.0).reviewCount(789).roomType("Standard Room")
                .maxOccupancy(2).amenities(List.of("WiFi", "Restaurant", "Gym"))
                .available(true).isDemo(true).build());

        return list;
    }

    private static List<CabCatalogItem> buildCabCatalog() {
        List<CabCatalogItem> list = new ArrayList<>();
        String[] cities = {"Delhi", "Mumbai", "Chennai", "Bangalore", "Pune", "Kolkata"};

        long id = 1L;
        for (String city : cities) {
            String station = city + " Railway Station";
            list.add(CabCatalogItem.builder().catalogId(id++).cabType("Auto Rickshaw")
                    .vehicleName("Auto Rickshaw").passengerCapacity(3).luggageCapacity(1)
                    .baseFare(50).farePerKm(12).available(true)
                    .defaultPickupLocation(station).city(city).isDemo(true).build());
            list.add(CabCatalogItem.builder().catalogId(id++).cabType("Economy")
                    .vehicleName("Maruti Suzuki Swift / Similar").passengerCapacity(4).luggageCapacity(2)
                    .baseFare(100).farePerKm(14).available(true)
                    .defaultPickupLocation(station).city(city).isDemo(true).build());
            list.add(CabCatalogItem.builder().catalogId(id++).cabType("Sedan")
                    .vehicleName("Honda City / Similar").passengerCapacity(4).luggageCapacity(3)
                    .baseFare(150).farePerKm(18).available(true)
                    .defaultPickupLocation(station).city(city).isDemo(true).build());
            list.add(CabCatalogItem.builder().catalogId(id++).cabType("SUV")
                    .vehicleName("Toyota Innova / Similar").passengerCapacity(6).luggageCapacity(5)
                    .baseFare(200).farePerKm(22).available(true)
                    .defaultPickupLocation(station).city(city).isDemo(true).build());
            list.add(CabCatalogItem.builder().catalogId(id++).cabType("Premium")
                    .vehicleName("Mercedes E-Class / Similar").passengerCapacity(4).luggageCapacity(3)
                    .baseFare(500).farePerKm(35).available(true)
                    .defaultPickupLocation(station).city(city).isDemo(true).build());
        }
        return list;
    }

    @Transactional
    public void cancelHotel(Long hotelId, Long userId) {
        HotelReservation hotel = hotelRepo.findById(hotelId)
                .orElseThrow(() -> new RuntimeException("Hotel reservation not found"));
        if (!hotel.getBooking().getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }
        hotel.setStatus(HotelReservation.ReservationStatus.CANCELLED);
        hotelRepo.save(hotel);
    }

    @Transactional
    public void cancelCab(Long cabId, Long userId) {
        CabReservation cab = cabRepo.findById(cabId)
                .orElseThrow(() -> new RuntimeException("Cab reservation not found"));
        if (!cab.getBooking().getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }
        cab.setStatus(CabReservation.ReservationStatus.CANCELLED);
        cabRepo.save(cab);
    }

    private HotelDto toHotelDto(HotelReservation h) {
        return HotelDto.builder()
                .id(h.getId())
                .bookingId(h.getBooking().getId())
                .hotelName(h.getHotelName())
                .city(h.getCity())
                .checkIn(h.getCheckIn())
                .checkOut(h.getCheckOut())
                .rooms(h.getRooms())
                .pricePerNight(h.getPricePerNight())
                .totalAmount(h.getTotalAmount())
                .status(h.getStatus().name())
                .createdAt(h.getCreatedAt())
                .build();
    }

    private CabDto toCabDto(CabReservation c) {
        return CabDto.builder()
                .id(c.getId())
                .bookingId(c.getBooking().getId())
                .cabType(c.getCabType())
                .pickupLocation(c.getPickupLocation())
                .dropLocation(c.getDropLocation())
                .pickupDate(c.getPickupDate())
                .pickupTime(c.getPickupTime())
                .fare(c.getFare())
                .status(c.getStatus().name())
                .rideStatus(c.getRideStatus() != null ? c.getRideStatus().name() : null)
                .pickupEtaMinutes(c.getPickupEtaMinutes())
                .driverName(c.getDriverName())
                .vehicleNumber(c.getVehicleNumber())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
