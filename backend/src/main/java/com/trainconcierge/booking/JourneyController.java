package com.trainconcierge.booking;

import com.trainconcierge.booking.dto.JourneyCancelResponse;
import com.trainconcierge.booking.dto.JourneyDetailResponse;
import com.trainconcierge.booking.dto.JourneyListResponse;
import com.trainconcierge.booking.dto.JourneySummaryResponse;
import com.trainconcierge.booking.dto.JourneyUpdateRequest;
import com.trainconcierge.common.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/journeys")
public class JourneyController {

    private final JourneyService journeyService;

    public JourneyController(JourneyService journeyService) {
        this.journeyService = journeyService;
    }

    @GetMapping
    public JourneyListResponse list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sort) {
        return journeyService.list(CurrentUser.id(), status, from, to, q, page, size, sort);
    }

    @GetMapping("/summary")
    public JourneySummaryResponse summary() {
        return journeyService.summary(CurrentUser.id());
    }

    @GetMapping("/{id}")
    public JourneyDetailResponse detail(@PathVariable Long id) {
        return journeyService.detail(id, CurrentUser.id());
    }

    @PutMapping("/{id}")
    public JourneyDetailResponse update(@PathVariable Long id,
                                        @Valid @RequestBody JourneyUpdateRequest request) {
        return journeyService.update(id, CurrentUser.id(), request);
    }

    @PostMapping("/{id}/cancel")
    public JourneyCancelResponse cancel(@PathVariable Long id) {
        return journeyService.cancel(id, CurrentUser.id());
    }
}
