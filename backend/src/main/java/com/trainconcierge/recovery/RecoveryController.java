package com.trainconcierge.recovery;

import com.trainconcierge.payment.dto.InitiatePaymentResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class RecoveryController {

    private final RecoveryService recoveryService;
    private final WaitAcknowledgementService waitAcknowledgementService;

    public RecoveryController(RecoveryService recoveryService,
                              WaitAcknowledgementService waitAcknowledgementService) {
        this.recoveryService = recoveryService;
        this.waitAcknowledgementService = waitAcknowledgementService;
    }

    /** POST /api/rebookings — starts a rebooking for a recommendation. */
    @PostMapping("/rebookings")
    public ResponseEntity<InitiatePaymentResponse> startRebooking(
            @RequestBody StartRebookingRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(recoveryService.startRebooking(request.getRecommendationId(), userId));
    }

    /** GET /api/rebookings/{id} — status of a rebooking. */
    @GetMapping("/rebookings/{id}")
    public ResponseEntity<Rebooking> getRebooking(@PathVariable Long id,
                                                   @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(
                recoveryService.getRebooking(id)
                        .orElseThrow(() -> new com.trainconcierge.common.error.ApiException(
                                org.springframework.http.HttpStatus.NOT_FOUND, "NOT_FOUND", "Rebooking not found")));
    }

    /** POST /api/journeys/{journeyId}/acknowledge-wait */
    @PostMapping("/journeys/{journeyId}/acknowledge-wait")
    public ResponseEntity<Void> acknowledgeWait(@PathVariable Long journeyId,
                                                @RequestHeader("X-User-Id") Long userId) {
        waitAcknowledgementService.acknowledge(journeyId, userId);
        return ResponseEntity.ok().build();
    }

    public static class StartRebookingRequest {
        private Long recommendationId;
        public Long getRecommendationId() { return recommendationId; }
        public void setRecommendationId(Long id) { this.recommendationId = id; }
    }
}
