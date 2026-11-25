package com.trainconcierge.booking;

import com.trainconcierge.booking.dto.BookingRequest;
import com.trainconcierge.booking.dto.BookingResponse;
import com.trainconcierge.common.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse book(@Valid @RequestBody BookingRequest request) {
        return bookingService.book(request, CurrentUser.id());
    }

    @GetMapping("/pnr/{pnr}")
    public BookingResponse byPnr(@PathVariable String pnr) {
        return bookingService.byPnr(pnr, CurrentUser.id());
    }
}
