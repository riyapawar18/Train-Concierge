package com.trainconcierge.hotel;

import com.trainconcierge.common.security.UserPrincipal;
import com.trainconcierge.hotel.dto.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class HotelController {

    private final HotelService hotelService;

    public HotelController(HotelService hotelService) {
        this.hotelService = hotelService;
    }

    @GetMapping("/hotels")
    public List<HotelResponse> listHotels(
            @RequestParam(required = false) String station,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) BigDecimal price,
            @RequestParam(required = false) BigDecimal rating,
            @RequestParam(required = false) String roomType) {
        return hotelService.listHotels(station, sort, price, rating, roomType);
    }

    @GetMapping("/hotels/{id}")
    public HotelResponse getHotel(@PathVariable Long id) {
        return hotelService.getHotel(id);
    }

    @GetMapping("/hotels/{id}/policy")
    public HotelPolicyResponse getPolicy(@PathVariable Long id) {
        return hotelService.getPolicy(id);
    }

    @GetMapping("/hotels/{id}/rooms")
    public RoomMapResponse getRooms(
            @PathVariable Long id,
            @RequestParam(required = false) String checkIn,
            @RequestParam(required = false) String checkOut,
            @RequestParam(required = false) String type) {
        return hotelService.getRooms(id, checkIn, checkOut, type);
    }

    @PostMapping("/room-holds")
    public RoomHoldResponse holdRoom(@RequestBody RoomHoldRequest req,
                                      @AuthenticationPrincipal UserPrincipal principal) {
        return hotelService.holdRoom(req.roomId(), req.checkIn(), req.checkOut(), principal.id());
    }

    @DeleteMapping("/room-holds/{roomId}")
    public ResponseEntity<Void> releaseHold(@PathVariable Long roomId,
                                             @RequestParam String checkIn,
                                             @RequestParam String checkOut) {
        hotelService.releaseHold(roomId, checkIn, checkOut);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/hotel-bookings")
    public HotelBookingResponse createBooking(@RequestBody CreateHotelBookingRequest req,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return hotelService.confirmBooking(req, principal.id());
    }

    @PostMapping("/hotel-bookings/manual")
    public HotelBookingResponse createManual(@RequestBody ManualHotelBookingRequest req,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        return hotelService.createManualBooking(req, principal.id());
    }

    @GetMapping("/hotel-bookings")
    public List<HotelBookingResponse> getMyBookings(@AuthenticationPrincipal UserPrincipal principal) {
        return hotelService.getUserBookings(principal.id());
    }

    @GetMapping("/hotel-bookings/{id}")
    public HotelBookingResponse getBooking(@PathVariable Long id,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        return hotelService.getBooking(id, principal.id());
    }

    @PostMapping("/hotel-bookings/{id}/extension-requests")
    public ExtensionRequestResponse createExtension(@PathVariable Long id,
                                                     @RequestBody CreateExtensionRequest req,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        return hotelService.createExtensionRequest(id, principal.id(), req);
    }

    @PostMapping("/hotel-bookings/{id}/shift")
    public HotelBookingResponse shiftStay(@PathVariable Long id,
                                           @RequestBody ShiftStayRequest req,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return hotelService.shiftStay(id, principal.id(), req);
    }

    @PostMapping("/hotel-bookings/{id}/cancel")
    public HotelBookingResponse cancelBooking(@PathVariable Long id,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return hotelService.cancelBooking(id, principal.id());
    }

    @GetMapping("/journeys/{id}/hotel-impact")
    public ResponseEntity<HotelImpactResponse> getHotelImpact(@PathVariable Long id,
                                                                @AuthenticationPrincipal UserPrincipal principal) {
        Optional<HotelImpactResponse> impact = hotelService.getJourneyHotelImpact(id, principal.id());
        return impact.map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }
}
