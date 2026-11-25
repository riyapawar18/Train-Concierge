package com.trainconcierge.travel;

import com.trainconcierge.travel.dto.TrainSearchItemResponse;

import java.time.LocalDate;
import java.util.List;

/**
 * Phase 09 hook: receives every non-empty search so it can watch for seats dropping to the
 * alert threshold. The no-op implementation keeps this phase free of email side effects.
 */
public interface SeatAlertService {

    void onSearch(Long userId, List<TrainSearchItemResponse> results, LocalDate travelDate);
}
