package com.trainconcierge.hotel;

import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.hotel.dto.*;
import com.trainconcierge.notification.NotificationService;
import com.trainconcierge.notification.SseHub;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class HotelService {

    private static final int HOLD_MINUTES = 10;
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final HotelRepository hotelRepository;
    private final HotelPolicyRepository policyRepository;
    private final HotelRoomRepository roomRepository;
    private final RoomAvailabilityRepository availabilityRepository;
    private final HotelBookingRepository bookingRepository;
    private final HotelExtensionRequestRepository extensionRepository;
    private final HotelImpactRepository impactRepository;
    private final SseHub sseHub;
    private final NotificationService notificationService;

    public HotelService(HotelRepository hotelRepository,
                        HotelPolicyRepository policyRepository,
                        HotelRoomRepository roomRepository,
                        RoomAvailabilityRepository availabilityRepository,
                        HotelBookingRepository bookingRepository,
                        HotelExtensionRequestRepository extensionRepository,
                        HotelImpactRepository impactRepository,
                        SseHub sseHub,
                        NotificationService notificationService) {
        this.hotelRepository = hotelRepository;
        this.policyRepository = policyRepository;
        this.roomRepository = roomRepository;
        this.availabilityRepository = availabilityRepository;
        this.bookingRepository = bookingRepository;
        this.extensionRepository = extensionRepository;
        this.impactRepository = impactRepository;
        this.sseHub = sseHub;
        this.notificationService = notificationService;
    }

    /** GET /api/hotels */
    @Transactional(readOnly = true)
    public List<HotelResponse> listHotels(String station, String sort, BigDecimal priceMax,
                                           BigDecimal ratingMin, String roomType) {
        if (station == null || station.isBlank()) {
            return List.of();
        }
        List<Hotel> hotels = switch (sort != null ? sort : "distance") {
            case "price" -> hotelRepository.findByStationCodeOrderByPriceMinAsc(station);
            case "rating" -> hotelRepository.findByStationCodeOrderByRatingDesc(station);
            default -> hotelRepository.findByStationCodeOrderByDistanceKmAsc(station);
        };
        LocalDate today = LocalDate.now();
        return hotels.stream()
            .filter(h -> priceMax == null || h.getPriceMin().compareTo(priceMax) <= 0)
            .filter(h -> ratingMin == null || h.getRating().compareTo(ratingMin) >= 0)
            .map(h -> {
                List<HotelRoom> rooms = roomRepository.findByHotelIdOrderByFloorAscRoomNoAsc(h.getId());
                List<Long> roomIds = rooms.stream().map(HotelRoom::getId).toList();
                int available = roomIds.isEmpty() ? 0 :
                    (int) availabilityRepository.findAvailableByRoomIdsAndDate(roomIds, today).stream()
                        .map(RoomAvailability::getRoomId).distinct().count();
                return new HotelResponse(h.getId(), h.getName(), h.getStationCode(), h.getAddress(),
                    h.getDistanceKm(), h.getPriceMin(), h.getPriceMax(), h.getRating(),
                    h.getPhone(), h.getEmail(), h.getMapUrl(), available);
            })
            .toList();
    }

    /** GET /api/hotels/{id} */
    @Transactional(readOnly = true)
    public HotelResponse getHotel(Long id) {
        Hotel h = hotelRepository.findById(id).orElseThrow(ApiException::notFound);
        LocalDate today = LocalDate.now();
        List<HotelRoom> rooms = roomRepository.findByHotelIdOrderByFloorAscRoomNoAsc(h.getId());
        List<Long> roomIds = rooms.stream().map(HotelRoom::getId).toList();
        int available = roomIds.isEmpty() ? 0 :
            (int) availabilityRepository.findAvailableByRoomIdsAndDate(roomIds, today).stream()
                .map(RoomAvailability::getRoomId).distinct().count();
        return new HotelResponse(h.getId(), h.getName(), h.getStationCode(), h.getAddress(),
            h.getDistanceKm(), h.getPriceMin(), h.getPriceMax(), h.getRating(),
            h.getPhone(), h.getEmail(), h.getMapUrl(), available);
    }

    /** GET /api/hotels/{id}/policy */
    @Transactional(readOnly = true)
    public HotelPolicyResponse getPolicy(Long hotelId) {
        HotelPolicy p = policyRepository.findByHotelId(hotelId).orElseThrow(ApiException::notFound);
        return new HotelPolicyResponse(
            p.getStandardCheckinTime().format(TIME_FMT),
            p.getStandardCheckoutTime().format(TIME_FMT),
            p.isLateArrivalAllowed(),
            p.getLateArrivalCutoff() != null ? p.getLateArrivalCutoff().format(TIME_FMT) : null,
            p.isLateCheckoutAllowed(),
            p.getMaxLateCheckoutTime() != null ? p.getMaxLateCheckoutTime().format(TIME_FMT) : null,
            p.getLateCheckoutFeeType(),
            p.getLateCheckoutFeeAmount(),
            p.isExtraNightPossible(),
            p.getFreeChangeWindowHours(),
            p.getExtensionNeedsApproval()
        );
    }

    /** GET /api/hotels/{id}/rooms */
    @Transactional(readOnly = true)
    public RoomMapResponse getRooms(Long hotelId, String checkIn, String checkOut, String type) {
        LocalDate checkInDate = checkIn != null ? LocalDate.parse(checkIn) : LocalDate.now();
        LocalDate checkOutDate = checkOut != null ? LocalDate.parse(checkOut) : checkInDate.plusDays(1);

        List<HotelRoom> allRooms = type != null && !type.isBlank()
            ? roomRepository.findByHotelIdAndRoomTypeOrderByFloorAsc(hotelId, type.toUpperCase())
            : roomRepository.findByHotelIdOrderByFloorAscRoomNoAsc(hotelId);

        List<Long> roomIds = allRooms.stream().map(HotelRoom::getId).toList();
        List<RoomAvailability> availabilities = roomIds.isEmpty() ? List.of() :
            availabilityRepository.findByRoomIdsAndDateRange(roomIds, checkInDate, checkOutDate.minusDays(1));

        // Map: roomId -> (date -> status)
        Map<Long, Map<LocalDate, String>> statusMap = new HashMap<>();
        for (RoomAvailability ra : availabilities) {
            statusMap.computeIfAbsent(ra.getRoomId(), k -> new HashMap<>())
                .put(ra.getStayDate(), effectiveStatus(ra));
        }

        // Build floor map
        Map<Integer, List<RoomMapResponse.RoomData>> byFloor = new LinkedHashMap<>();
        for (HotelRoom room : allRooms) {
            String roomStatus = computeRoomStatus(room.getId(), checkInDate, checkOutDate, statusMap);
            byFloor.computeIfAbsent(room.getFloor(), k -> new ArrayList<>())
                .add(new RoomMapResponse.RoomData(room.getId(), room.getRoomNo(), room.getRoomType(),
                    room.getCapacity(), room.getPricePerNight(), roomStatus));
        }
        List<RoomMapResponse.FloorData> floors = byFloor.entrySet().stream()
            .map(e -> new RoomMapResponse.FloorData(e.getKey(), e.getValue()))
            .toList();

        // Date strip
        List<RoomMapResponse.NightAvailability> dateStrip = new ArrayList<>();
        for (LocalDate d = checkInDate; !d.isAfter(checkOutDate.minusDays(1)); d = d.plusDays(1)) {
            final LocalDate night = d;
            int avail = (int) allRooms.stream().filter(r ->
                "AVAILABLE".equals(statusMap.getOrDefault(r.getId(), Map.of())
                    .getOrDefault(night, "AVAILABLE"))).count();
            dateStrip.add(new RoomMapResponse.NightAvailability(night.format(DATE_FMT), avail, allRooms.size()));
        }

        int availableTonight = (int) allRooms.stream().filter(r ->
            "AVAILABLE".equals(statusMap.getOrDefault(r.getId(), Map.of())
                .getOrDefault(checkInDate, "AVAILABLE"))).count();

        return new RoomMapResponse(floors, dateStrip, allRooms.size(), availableTonight);
    }

    private String effectiveStatus(RoomAvailability ra) {
        if ("HELD".equals(ra.getStatus()) && ra.getHeldUntil() != null
                && ra.getHeldUntil().isBefore(LocalDateTime.now())) {
            return "AVAILABLE";
        }
        return ra.getStatus();
    }

    private String computeRoomStatus(Long roomId, LocalDate checkIn, LocalDate checkOut,
                                      Map<Long, Map<LocalDate, String>> statusMap) {
        Map<LocalDate, String> roomDates = statusMap.getOrDefault(roomId, Map.of());
        for (LocalDate d = checkIn; !d.isAfter(checkOut.minusDays(1)); d = d.plusDays(1)) {
            String s = roomDates.getOrDefault(d, "AVAILABLE");
            if ("BOOKED".equals(s)) return "BOOKED";
            if ("HELD".equals(s)) return "HELD";
        }
        return "AVAILABLE";
    }

    /** POST /api/room-holds */
    @Transactional
    public RoomHoldResponse holdRoom(Long roomId, String checkIn, String checkOut, Long userId) {
        LocalDate checkInDate = LocalDate.parse(checkIn);
        LocalDate checkOutDate = LocalDate.parse(checkOut);
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(HOLD_MINUTES);
        List<Long> heldIds = new ArrayList<>();
        for (LocalDate d = checkInDate; !d.isAfter(checkOutDate.minusDays(1)); d = d.plusDays(1)) {
            final LocalDate night = d;
            RoomAvailability ra = availabilityRepository.findByRoomIdAndStayDate(roomId, night)
                .orElseGet(() -> {
                    RoomAvailability n = new RoomAvailability();
                    n.setRoomId(roomId);
                    n.setStayDate(night);
                    n.setStatus("AVAILABLE");
                    return n;
                });
            if ("BOOKED".equals(ra.getStatus())) {
                throw ApiException.conflict("Room not available for " + night);
            }
            if ("HELD".equals(ra.getStatus()) && ra.getHeldUntil() != null
                    && ra.getHeldUntil().isAfter(LocalDateTime.now())) {
                throw ApiException.conflict("Room is held for " + night);
            }
            ra.setStatus("HELD");
            ra.setHeldUntil(expiresAt);
            availabilityRepository.save(ra);
            heldIds.add(ra.getId());
        }
        return new RoomHoldResponse(roomId, expiresAt.toString(), heldIds);
    }

    /** DELETE /api/room-holds/{id} */
    @Transactional
    public void releaseHold(Long roomId, String checkIn, String checkOut) {
        LocalDate checkInDate = LocalDate.parse(checkIn);
        LocalDate checkOutDate = LocalDate.parse(checkOut);
        for (LocalDate d = checkInDate; !d.isAfter(checkOutDate.minusDays(1)); d = d.plusDays(1)) {
            availabilityRepository.findByRoomIdAndStayDate(roomId, d).ifPresent(ra -> {
                if ("HELD".equals(ra.getStatus())) {
                    ra.setStatus("AVAILABLE");
                    ra.setHeldUntil(null);
                    availabilityRepository.save(ra);
                }
            });
        }
    }

    /** POST /api/hotel-bookings */
    @Transactional
    public HotelBookingResponse confirmBooking(CreateHotelBookingRequest req, Long userId) {
        Hotel hotel = hotelRepository.findById(req.hotelId()).orElseThrow(ApiException::notFound);
        HotelRoom room = roomRepository.findById(req.roomId()).orElseThrow(ApiException::notFound);
        HotelPolicy policy = policyRepository.findByHotelId(req.hotelId()).orElseThrow(ApiException::notFound);

        LocalDate checkIn = LocalDate.parse(req.checkInDate());
        LocalDate checkOut = LocalDate.parse(req.checkOutDate());

        for (LocalDate d = checkIn; !d.isAfter(checkOut.minusDays(1)); d = d.plusDays(1)) {
            final LocalDate night = d;
            RoomAvailability ra = availabilityRepository.findByRoomIdAndStayDate(req.roomId(), night)
                .orElseGet(() -> {
                    RoomAvailability n = new RoomAvailability();
                    n.setRoomId(req.roomId());
                    n.setStayDate(night);
                    n.setStatus("AVAILABLE");
                    return n;
                });
            if ("BOOKED".equals(ra.getStatus())) {
                throw ApiException.conflict("Room not available for " + night);
            }
            ra.setStatus("BOOKED");
            ra.setHeldUntil(null);
            availabilityRepository.save(ra);
        }

        HotelBooking booking = new HotelBooking();
        booking.setUserId(userId);
        booking.setJourneyId(req.journeyId());
        booking.setHotelId(req.hotelId());
        booking.setRoomId(req.roomId());
        booking.setCheckInDate(checkIn);
        booking.setCheckInTime(policy.getStandardCheckinTime());
        booking.setCheckOutDate(checkOut);
        booking.setCheckOutTime(policy.getStandardCheckoutTime());
        booking.setGuests(req.guests());
        booking.setTotalPrice(req.totalPrice());
        booking.setStatus(HotelBookingStatus.CONFIRMED);
        booking.setLateArrivalCutoff(policy.getLateArrivalCutoff());
        booking.setManualEntry(false);
        bookingRepository.save(booking);

        notificationService.onHotelBookingConfirmed(booking, hotel, room);
        return toResponse(booking, hotel, room, List.of(), null);
    }

    /** POST /api/hotel-bookings/manual */
    @Transactional
    public HotelBookingResponse createManualBooking(ManualHotelBookingRequest req, Long userId) {
        Hotel hotel = hotelRepository.findById(req.hotelId()).orElseThrow(ApiException::notFound);
        List<HotelRoom> rooms = roomRepository.findByHotelIdOrderByFloorAscRoomNoAsc(req.hotelId());
        HotelRoom room = rooms.isEmpty() ? null : rooms.get(0);

        HotelBooking booking = new HotelBooking();
        booking.setUserId(userId);
        booking.setJourneyId(req.journeyId());
        booking.setHotelId(req.hotelId());
        booking.setRoomId(room != null ? room.getId() : -1L);
        booking.setCheckInDate(LocalDate.parse(req.checkInDate()));
        booking.setCheckInTime(LocalTime.parse(req.checkInTime() != null ? req.checkInTime() : "14:00"));
        booking.setCheckOutDate(LocalDate.parse(req.checkOutDate()));
        booking.setCheckOutTime(LocalTime.parse(req.checkOutTime() != null ? req.checkOutTime() : "11:00"));
        booking.setGuests(req.guests() > 0 ? req.guests() : 1);
        booking.setTotalPrice(BigDecimal.ZERO);
        booking.setStatus(HotelBookingStatus.CONFIRMED);
        booking.setLateArrivalCutoff(req.lateArrivalCutoff() != null && !req.lateArrivalCutoff().isBlank()
            ? LocalTime.parse(req.lateArrivalCutoff()) : null);
        booking.setNotes(req.notes());
        booking.setManualEntry(true);
        bookingRepository.save(booking);
        notificationService.onHotelBookingConfirmed(booking, hotel, room);
        return toResponse(booking, hotel, room, List.of(), null);
    }

    /** GET /api/hotel-bookings */
    @Transactional(readOnly = true)
    public List<HotelBookingResponse> getUserBookings(Long userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(b -> {
                Hotel hotel = hotelRepository.findById(b.getHotelId()).orElse(null);
                HotelRoom room = b.getRoomId() != null && b.getRoomId() > 0
                    ? roomRepository.findById(b.getRoomId()).orElse(null) : null;
                List<HotelExtensionRequest> exts = extensionRepository.findByHotelBookingIdOrderByCreatedAtDesc(b.getId());
                HotelImpactSummary impact = getLatestImpact(b.getId());
                return toResponse(b, hotel, room, exts, impact);
            })
            .toList();
    }

    /** GET /api/hotel-bookings/{id} */
    @Transactional(readOnly = true)
    public HotelBookingResponse getBooking(Long id, Long userId) {
        HotelBooking b = bookingRepository.findByIdAndUserId(id, userId)
            .orElseThrow(ApiException::notFound);
        Hotel hotel = hotelRepository.findById(b.getHotelId()).orElse(null);
        HotelRoom room = b.getRoomId() != null && b.getRoomId() > 0
            ? roomRepository.findById(b.getRoomId()).orElse(null) : null;
        List<HotelExtensionRequest> exts = extensionRepository.findByHotelBookingIdOrderByCreatedAtDesc(b.getId());
        HotelImpactSummary impact = getLatestImpact(b.getId());
        return toResponse(b, hotel, room, exts, impact);
    }

    /** POST /api/hotel-bookings/{id}/extension-requests */
    @Transactional
    public ExtensionRequestResponse createExtensionRequest(Long bookingId, Long userId, CreateExtensionRequest req) {
        HotelBooking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
            .orElseThrow(ApiException::notFound);
        HotelPolicy policy = policyRepository.findByHotelId(booking.getHotelId()).orElseThrow(ApiException::notFound);

        HotelExtensionRequest ext = new HotelExtensionRequest();
        ext.setHotelBookingId(bookingId);
        ext.setType(HotelExtensionType.valueOf(req.type()));
        if (req.requestedTime() != null && !req.requestedTime().isBlank()) {
            ext.setRequestedTime(LocalTime.parse(req.requestedTime()));
        }
        if (req.requestedDate() != null && !req.requestedDate().isBlank()) {
            ext.setRequestedDate(LocalDate.parse(req.requestedDate()));
        }

        BigDecimal fee = calculateFee(req.type(), ext.getRequestedTime(), policy);
        ext.setFeeEstimate(fee);

        boolean isAuto = "AUTO".equals(policy.getExtensionNeedsApproval()) && !booking.isManualEntry();
        if (isAuto) {
            ext.setStatus(HotelExtensionStatus.APPROVED);
            ext.setResponseNote("Approved by the hotel desk");
            ext.setResolvedAt(LocalDateTime.now());
            if (HotelExtensionType.LATE_ARRIVAL.name().equals(req.type())) {
                booking.setStatus(HotelBookingStatus.LATE_ARRIVAL_NOTED);
                bookingRepository.save(booking);
            }
        } else {
            ext.setStatus(HotelExtensionStatus.REQUESTED);
        }
        extensionRepository.save(ext);
        sseHub.send(userId, SseHub.EVENT_HOTEL, Map.of("type", "EXTENSION_UPDATE", "bookingId", bookingId));
        return toExtResponse(ext);
    }

    private BigDecimal calculateFee(String type, LocalTime requestedTime, HotelPolicy policy) {
        if ("LATE_ARRIVAL".equals(type)) return BigDecimal.ZERO;
        if ("EXTRA_NIGHT".equals(type)) return BigDecimal.ZERO;
        if ("LATE_CHECKOUT".equals(type) && policy.isLateCheckoutAllowed()) {
            return switch (policy.getLateCheckoutFeeType()) {
                case "FLAT" -> policy.getLateCheckoutFeeAmount();
                case "HOURLY" -> {
                    if (requestedTime != null) {
                        int hours = Math.max(1, requestedTime.getHour() - policy.getStandardCheckoutTime().getHour());
                        yield policy.getLateCheckoutFeeAmount().multiply(BigDecimal.valueOf(hours));
                    }
                    yield policy.getLateCheckoutFeeAmount();
                }
                default -> BigDecimal.ZERO;
            };
        }
        return BigDecimal.ZERO;
    }

    /** POST /api/hotel-bookings/{id}/shift */
    @Transactional
    public HotelBookingResponse shiftStay(Long bookingId, Long userId, ShiftStayRequest req) {
        HotelBooking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
            .orElseThrow(ApiException::notFound);
        LocalDate newCheckIn = LocalDate.parse(req.newCheckInDate());
        LocalDate newCheckOut = LocalDate.parse(req.newCheckOutDate());

        // Release old rooms
        for (LocalDate d = booking.getCheckInDate(); !d.isAfter(booking.getCheckOutDate().minusDays(1)); d = d.plusDays(1)) {
            availabilityRepository.findByRoomIdAndStayDate(booking.getRoomId(), d).ifPresent(ra -> {
                if ("BOOKED".equals(ra.getStatus())) {
                    ra.setStatus("AVAILABLE");
                    ra.setHeldUntil(null);
                    availabilityRepository.save(ra);
                }
            });
        }

        // Book new rooms
        for (LocalDate d = newCheckIn; !d.isAfter(newCheckOut.minusDays(1)); d = d.plusDays(1)) {
            final LocalDate night = d;
            RoomAvailability ra = availabilityRepository.findByRoomIdAndStayDate(booking.getRoomId(), night)
                .orElseGet(() -> {
                    RoomAvailability n = new RoomAvailability();
                    n.setRoomId(booking.getRoomId());
                    n.setStayDate(night);
                    n.setStatus("AVAILABLE");
                    return n;
                });
            if ("BOOKED".equals(ra.getStatus())) {
                throw ApiException.conflict("Room not available for " + night);
            }
            ra.setStatus("BOOKED");
            ra.setHeldUntil(null);
            availabilityRepository.save(ra);
        }

        booking.setCheckInDate(newCheckIn);
        booking.setCheckOutDate(newCheckOut);
        booking.setStatus(HotelBookingStatus.SHIFTED);
        bookingRepository.save(booking);

        Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
        HotelRoom room = roomRepository.findById(booking.getRoomId()).orElse(null);
        sseHub.send(userId, SseHub.EVENT_HOTEL, Map.of("type", "BOOKING_SHIFTED", "id", bookingId));
        return toResponse(booking, hotel, room,
            extensionRepository.findByHotelBookingIdOrderByCreatedAtDesc(bookingId),
            getLatestImpact(bookingId));
    }

    /** POST /api/hotel-bookings/{id}/cancel */
    @Transactional
    public HotelBookingResponse cancelBooking(Long bookingId, Long userId) {
        HotelBooking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
            .orElseThrow(ApiException::notFound);
        if (booking.getStatus() == HotelBookingStatus.CANCELLED) {
            throw ApiException.conflict("Already cancelled");
        }
        for (LocalDate d = booking.getCheckInDate(); !d.isAfter(booking.getCheckOutDate().minusDays(1)); d = d.plusDays(1)) {
            availabilityRepository.findByRoomIdAndStayDate(booking.getRoomId(), d).ifPresent(ra -> {
                ra.setStatus("AVAILABLE");
                ra.setHeldUntil(null);
                availabilityRepository.save(ra);
            });
        }
        booking.setStatus(HotelBookingStatus.CANCELLED);
        bookingRepository.save(booking);
        sseHub.send(userId, SseHub.EVENT_HOTEL, Map.of("type", "BOOKING_CANCELLED", "id", bookingId));
        Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
        HotelRoom room = roomRepository.findById(booking.getRoomId()).orElse(null);
        return toResponse(booking, hotel, room,
            extensionRepository.findByHotelBookingIdOrderByCreatedAtDesc(bookingId), null);
    }

    /** GET /api/journeys/{id}/hotel-impact */
    @Transactional(readOnly = true)
    public Optional<HotelImpactResponse> getJourneyHotelImpact(Long journeyId, Long userId) {
        return bookingRepository.findActiveByJourneyId(journeyId).map(booking -> {
            Hotel hotel = hotelRepository.findById(booking.getHotelId()).orElse(null);
            HotelImpactSummary impact = getLatestImpact(booking.getId());
            if (impact == null) return null;
            return new HotelImpactResponse(
                booking.getId(),
                hotel != null ? hotel.getName() : "Hotel",
                impact.verdict(), impact.summary(), impact.newArrivalAt(),
                impact.arrivalVsCheckinMinutes(), impact.actions()
            );
        });
    }

    private HotelImpactSummary getLatestImpact(Long bookingId) {
        List<HotelImpact> impacts = impactRepository.findByHotelBookingId(bookingId);
        if (impacts.isEmpty()) return null;
        HotelImpact latest = impacts.stream()
            .max(Comparator.comparing(HotelImpact::getCreatedAt)).orElse(null);
        if (latest == null) return null;
        List<String> actions = actionsForVerdict(latest.getVerdict());
        return new HotelImpactSummary(
            latest.getVerdict().name(), latest.getSummary(),
            latest.getNewArrivalAt().toString(),
            latest.getArrivalVsCheckinMinutes(), actions
        );
    }

    private List<String> actionsForVerdict(HotelImpactVerdict verdict) {
        return switch (verdict) {
            case UNAFFECTED -> List.of();
            case LATE_ARRIVAL_OK -> List.of("NOTIFY_HOTEL");
            case PAST_CUTOFF_EXTENSION_POSSIBLE -> List.of("NOTIFY_HOTEL", "REQUEST_EXTENSION", "CALL_HOTEL");
            case PAST_CUTOFF_NO_EXTENSION -> List.of("CALL_HOTEL", "SEE_NEARBY");
            case NIGHT_LOST -> List.of("SHIFT_STAY", "CALL_HOTEL");
            case CHECKOUT_PRESSURE -> List.of("REQUEST_EXTENSION", "CALL_HOTEL");
        };
    }

    private HotelBookingResponse toResponse(HotelBooking b, Hotel hotel, HotelRoom room,
                                              List<HotelExtensionRequest> exts, HotelImpactSummary impact) {
        return new HotelBookingResponse(
            b.getId(),
            b.getHotelId(), hotel != null ? hotel.getName() : null,
            hotel != null ? hotel.getPhone() : null,
            b.getRoomId(), room != null ? room.getRoomNo() : null,
            room != null ? room.getRoomType() : null,
            b.getCheckInDate().format(DATE_FMT),
            b.getCheckInTime().format(TIME_FMT),
            b.getCheckOutDate().format(DATE_FMT),
            b.getCheckOutTime().format(TIME_FMT),
            b.getGuests(), b.getTotalPrice(), b.getStatus().name(),
            b.getLateArrivalCutoff() != null ? b.getLateArrivalCutoff().format(TIME_FMT) : null,
            b.getNotes(), b.isManualEntry(), b.getJourneyId(),
            b.getCreatedAt().toString(),
            impact,
            exts.stream().map(this::toExtResponse).toList()
        );
    }

    private ExtensionRequestResponse toExtResponse(HotelExtensionRequest e) {
        return new ExtensionRequestResponse(
            e.getId(), e.getType().name(),
            e.getRequestedTime() != null ? e.getRequestedTime().format(TIME_FMT) : null,
            e.getRequestedDate() != null ? e.getRequestedDate().format(DATE_FMT) : null,
            e.getStatus().name(), e.getFeeEstimate(), e.getResponseNote(),
            e.getCreatedAt().toString()
        );
    }
}
