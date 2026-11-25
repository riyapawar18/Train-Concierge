package com.trainconcierge.travel;

import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.common.security.CurrentUser;
import com.trainconcierge.travel.dto.CoachesResponse;
import com.trainconcierge.travel.dto.SeatMapResponse;
import com.trainconcierge.travel.dto.TrainAvailabilityResponse;
import com.trainconcierge.travel.dto.TrainSearchResponse;
import com.trainconcierge.travel.dto.TrainStatusResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Locale;

@RestController
@RequestMapping("/api")
public class TrainTravelController {

    private final TrainSearchService trainSearchService;
    private final TrainSeatService trainSeatService;

    public TrainTravelController(TrainSearchService trainSearchService,
                                 TrainSeatService trainSeatService) {
        this.trainSearchService = trainSearchService;
        this.trainSeatService = trainSeatService;
    }

    @GetMapping("/trains/search")
    public TrainSearchResponse search(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(name = "class", required = false) String classCode,
            @RequestParam(required = false) String quota,
            @RequestParam(required = false) String types,
            @RequestParam(required = false) Integer depFrom,
            @RequestParam(required = false) Integer depTo,
            @RequestParam(required = false) Integer arrFrom,
            @RequestParam(required = false) Integer arrTo,
            @RequestParam(required = false) String fromStations,
            @RequestParam(required = false) String toStations,
            @RequestParam(required = false) String sort) {
        TrainSearchCriteria criteria = new TrainSearchCriteria(from, to, date, classCode,
                parseQuota(quota), types, depFrom, depTo, arrFrom, arrTo,
                fromStations, toStations, parseSort(sort));
        return trainSearchService.search(criteria, CurrentUser.id());
    }

    @GetMapping("/trains/{number}/availability")
    public TrainAvailabilityResponse availability(
            @PathVariable String number,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return trainSeatService.availability(number, date);
    }

    @GetMapping("/trains/{number}/coaches")
    public CoachesResponse coaches(
            @PathVariable String number,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(name = "class", required = false) String classCode) {
        return trainSeatService.coaches(number, date, classCode);
    }

    @GetMapping("/trains/{number}/seats")
    public SeatMapResponse seats(
            @PathVariable String number,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(name = "class", required = false) String classCode,
            @RequestParam(required = false) Long coach) {
        return trainSeatService.seatMap(number, date, classCode, coach);
    }

    @GetMapping("/trains/{number}/status")
    public TrainStatusResponse status(
            @PathVariable String number,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return trainSeatService.status(number, date);
    }

    private static Quota parseQuota(String value) {
        if (value == null || value.isBlank()) {
            return Quota.GENERAL;
        }
        try {
            return Quota.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.validation("quota", "Choose a valid quota.");
        }
    }

    private static SearchSort parseSort(String value) {
        if (value == null || value.isBlank()) {
            return SearchSort.DEPARTURE;
        }
        try {
            return SearchSort.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.validation("sort", "Choose a valid sort order.");
        }
    }
}
