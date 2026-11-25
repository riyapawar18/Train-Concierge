package com.trainconcierge.admin;

import java.util.List;
import java.util.Map;

public record ReportData(String name, List<String> headers, List<List<String>> rows) {

    public static ReportData disruptions(List<Map<String, Object>> data) {
        List<String> headers = List.of("Date", "Count", "Avg Delay (min)");
        List<List<String>> rows = data.stream().map(m -> List.of(
                str(m, "date"), str(m, "count"), str(m, "avgDelay"))).toList();
        return new ReportData("disruptions", headers, rows);
    }

    public static ReportData affected(List<Map<String, Object>> data) {
        List<String> headers = List.of("Date", "Passengers Affected", "Bookings Affected");
        List<List<String>> rows = data.stream().map(m -> List.of(
                str(m, "date"), str(m, "passengers"), str(m, "bookings"))).toList();
        return new ReportData("affected", headers, rows);
    }

    public static ReportData rebooking(List<Map<String, Object>> data) {
        List<String> headers = List.of("Date", "Rebooked", "Total Disrupted");
        List<List<String>> rows = data.stream().map(m -> List.of(
                str(m, "date"), str(m, "rebooked"), str(m, "disrupted"))).toList();
        return new ReportData("rebooking", headers, rows);
    }

    public static ReportData notifications(List<Map<String, Object>> data) {
        List<String> headers = List.of("Date", "Sent", "Failed", "Success Rate");
        List<List<String>> rows = data.stream().map(m -> List.of(
                str(m, "date"), str(m, "sent"), str(m, "failed"), str(m, "rate"))).toList();
        return new ReportData("notifications", headers, rows);
    }

    public static ReportData hotelVerdicts(List<Map<String, Object>> data) {
        List<String> headers = List.of("Verdict", "Count");
        List<List<String>> rows = data.stream().map(m -> List.of(
                str(m, "verdict"), str(m, "count"))).toList();
        return new ReportData("hotel-verdicts", headers, rows);
    }

    private static String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v == null ? "" : v.toString();
    }
}
