package com.trainconcierge.admin;

import java.time.LocalDate;

public record DelayTrendPoint(LocalDate date, long disruptionCount, double avgDelayMinutes) {}
