package com.trainconcierge.disruption;

import com.trainconcierge.common.security.CurrentUser;
import com.trainconcierge.disruption.dto.JourneyImpactResponse;
import com.trainconcierge.disruption.dto.PassengerDisruptionDetailResponse;
import com.trainconcierge.disruption.dto.PassengerDisruptionResponse;
import com.trainconcierge.disruption.dto.RecommendationResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class DisruptionController {

    private final DisruptionService disruptionService;

    public DisruptionController(DisruptionService disruptionService) {
        this.disruptionService = disruptionService;
    }

    @GetMapping("/disruptions/mine")
    public List<PassengerDisruptionResponse> mine(@RequestParam(required = false) String status) {
        return disruptionService.mine(CurrentUser.id(), status);
    }

    @GetMapping("/disruptions/{id}")
    public PassengerDisruptionDetailResponse detail(@PathVariable Long id) {
        return disruptionService.passengerDetail(id, CurrentUser.id());
    }

    @GetMapping("/journeys/{id}/impact")
    public JourneyImpactResponse journeyImpact(@PathVariable Long id) {
        return disruptionService.journeyImpact(id, CurrentUser.id());
    }

    @GetMapping("/journeys/{id}/recommendations")
    public List<RecommendationResponse> recommendations(
            @PathVariable Long id,
            @RequestParam(required = false) String kind) {
        return disruptionService.recommendations(id, CurrentUser.id(), kind);
    }
}
