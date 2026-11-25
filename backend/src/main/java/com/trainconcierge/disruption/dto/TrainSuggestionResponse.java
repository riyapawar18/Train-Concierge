package com.trainconcierge.disruption.dto;

public record TrainSuggestionResponse(
        String number,
        String name,
        String runsOn
) {
}
