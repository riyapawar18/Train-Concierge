package com.trainconcierge.disruption.dto;

public record DisruptionUpdateRequest(
        Integer delayMinutes,
        String reason
) {
}
