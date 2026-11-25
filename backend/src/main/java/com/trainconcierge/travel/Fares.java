package com.trainconcierge.travel;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Set;

/**
 * Fare rules shared by search, booking and the demo data, so the quoted fare and the
 * stored booking fare always agree.
 */
public final class Fares {

    private static final Set<String> AC_CLASSES = Set.of("1A", "2A", "3A", "3E", "CC", "EC", "EV");
    private static final BigDecimal AC_RESERVATION_CHARGE = BigDecimal.valueOf(60);
    private static final BigDecimal NON_AC_RESERVATION_CHARGE = BigDecimal.valueOf(40);
    private static final BigDecimal GST_RATE = new BigDecimal("0.05");

    private Fares() {
    }

    public static BigDecimal segmentFare(BigDecimal baseFare, int segmentKm, int routeKm) {
        if (segmentKm <= 0 || routeKm <= 0) {
            return roundToFive(baseFare);
        }
        double ratio = Math.min(1.0, (double) segmentKm / routeKm);
        return roundToFive(baseFare.multiply(BigDecimal.valueOf(ratio)));
    }

    public static BigDecimal quotaFare(BigDecimal fare, Quota quota) {
        return switch (quota == null ? Quota.GENERAL : quota) {
            case TATKAL -> roundToFive(fare.multiply(BigDecimal.valueOf(1.30)));
            case PREMIUM_TATKAL -> roundToFive(fare.multiply(BigDecimal.valueOf(1.50)));
            case GENERAL, LADIES, SENIOR_CITIZEN -> fare;
        };
    }

    public static BigDecimal roundToFive(BigDecimal amount) {
        return amount.divide(BigDecimal.valueOf(5), 0, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(5))
                .setScale(0, RoundingMode.UNNECESSARY);
    }

    public static Quote quote(BigDecimal farePerPassenger, String classCode, int passengers) {
        int count = Math.max(1, passengers);
        BigDecimal baseFare = farePerPassenger.multiply(BigDecimal.valueOf(count))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal chargePerPassenger = AC_CLASSES.contains(TravelClasses.normalize(classCode))
                ? AC_RESERVATION_CHARGE : NON_AC_RESERVATION_CHARGE;
        BigDecimal reservationCharge = chargePerPassenger.multiply(BigDecimal.valueOf(count))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal gst = baseFare.add(reservationCharge).multiply(GST_RATE)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalFare = baseFare.add(reservationCharge).add(gst)
                .setScale(2, RoundingMode.HALF_UP);
        return new Quote(baseFare, reservationCharge, gst, totalFare,
                farePerPassenger.setScale(2, RoundingMode.HALF_UP));
    }

    public record Quote(BigDecimal baseFare, BigDecimal reservationCharge, BigDecimal gst,
                        BigDecimal totalFare, BigDecimal perPassenger) {
    }
}
