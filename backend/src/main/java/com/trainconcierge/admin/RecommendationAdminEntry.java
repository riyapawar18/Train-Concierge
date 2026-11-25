package com.trainconcierge.admin;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RecommendationAdminEntry(
        Long id, Long impactId, String pnr, String kind,
        String refTrainNumber, String classCode,
        LocalDateTime departureAt, LocalDateTime arrivalAt,
        BigDecimal fare, int score, int rank, boolean recommended,
        List<String> reasons, List<String> warnings
) {}
