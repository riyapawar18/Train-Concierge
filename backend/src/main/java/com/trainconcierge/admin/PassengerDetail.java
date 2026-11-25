package com.trainconcierge.admin;

import java.util.List;

public record PassengerDetail(
        PassengerSummary summary,
        int journeyCount,
        long hotelBookings,
        List<NotificationAdminEntry> recentNotifications
) {}
