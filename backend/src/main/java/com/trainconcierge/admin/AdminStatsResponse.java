package com.trainconcierge.admin;

public record AdminStatsResponse(
        long totalPassengers,
        long activeJourneys,
        long activeDisruptions,
        long passengersAffected,
        long rebooked,
        long notificationsSentToday,
        long hotelStaysAtRisk
) {}
