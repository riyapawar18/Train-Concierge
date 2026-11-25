package com.trainconcierge.travel;

import com.trainconcierge.common.security.CurrentUser;
import com.trainconcierge.travel.dto.SeatHoldRequest;
import com.trainconcierge.travel.dto.SeatHoldResponse;
import com.trainconcierge.travel.dto.SeatHoldsResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/seat-holds")
public class SeatHoldController {

    private final SeatHoldService seatHoldService;

    public SeatHoldController(SeatHoldService seatHoldService) {
        this.seatHoldService = seatHoldService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SeatHoldResponse hold(@Valid @RequestBody SeatHoldRequest request) {
        return seatHoldService.hold(request, CurrentUser.id());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void release(@PathVariable Long id) {
        seatHoldService.release(id, CurrentUser.id());
    }

    @GetMapping("/mine")
    public SeatHoldsResponse mine() {
        return seatHoldService.mine(CurrentUser.id());
    }
}
