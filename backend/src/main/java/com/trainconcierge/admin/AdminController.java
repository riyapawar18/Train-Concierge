package com.trainconcierge.admin;

import com.trainconcierge.common.security.CurrentUser;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final ProfileService profileService;

    public AdminController(AdminService adminService, ProfileService profileService) {
        this.adminService = adminService;
        this.profileService = profileService;
    }

    // ── Stats ────────────────────────────────────────────────────────────────
    @GetMapping("/stats")
    public AdminStatsResponse stats() {
        return adminService.getStats();
    }

    @GetMapping("/stats/delay-trend")
    public List<DelayTrendPoint> delayTrend(@RequestParam(defaultValue = "7") int days) {
        return adminService.getDelayTrend(days);
    }

    @GetMapping("/stats/activity")
    public List<AuditLogEntry> recentActivity(@RequestParam(defaultValue = "20") int limit) {
        return adminService.getRecentActivity(limit);
    }

    // ── Passengers ───────────────────────────────────────────────────────────
    @GetMapping("/passengers")
    public Page<PassengerSummary> passengers(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminService.listPassengers(q, page, size);
    }

    @GetMapping("/passengers/{id}")
    public PassengerDetail passenger(@PathVariable Long id) {
        return adminService.getPassenger(id);
    }

    @PatchMapping("/passengers/{id}/enabled")
    public PassengerSummary setEnabled(@PathVariable Long id,
                                        @RequestBody Map<String, Boolean> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        return adminService.setPassengerEnabled(id, enabled, CurrentUser.id());
    }

    // ── Journeys ─────────────────────────────────────────────────────────────
    @GetMapping("/journeys")
    public Page<JourneyAdminSummary> journeys(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String train,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String passenger,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminService.listJourneys(status, train, date, passenger, page, size);
    }

    @PostMapping("/journeys/{id}/cancel")
    public JourneyAdminSummary cancelJourney(@PathVariable Long id,
                                              @RequestBody Map<String, String> body) {
        return adminService.cancelJourney(id, body.get("reason"), CurrentUser.id());
    }

    @PatchMapping("/journeys/{id}/flag")
    public JourneyAdminSummary flagJourney(@PathVariable Long id,
                                            @RequestBody Map<String, Boolean> body) {
        return adminService.flagJourney(id, Boolean.TRUE.equals(body.get("flagged")), CurrentUser.id());
    }

    // ── Recommendations ───────────────────────────────────────────────────────
    @GetMapping("/recommendations")
    public List<RecommendationAdminEntry> recommendations(
            @RequestParam Long disruptionId) {
        return adminService.listRecommendations(disruptionId);
    }

    @PostMapping("/impacts/{id}/regenerate")
    public ResponseEntity<Void> regenerate(@PathVariable Long id) {
        adminService.regenerateRecommendations(id, CurrentUser.id());
        return ResponseEntity.ok().build();
    }

    // ── Extension requests ────────────────────────────────────────────────────
    @GetMapping("/extension-requests")
    public Page<ExtensionRequestAdminEntry> extensionRequests(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminService.listExtensionRequests(status, page, size);
    }

    @PatchMapping("/extension-requests/{id}")
    public ExtensionRequestAdminEntry resolveRequest(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        return adminService.resolveExtensionRequest(id, body.get("decision"),
                body.get("note"), CurrentUser.id());
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    @GetMapping("/notifications")
    public Page<NotificationAdminEntry> notifications(
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminService.listNotifications(channel, status, page, size);
    }

    @PostMapping("/notifications/announce")
    public ResponseEntity<Void> announce(@RequestBody Map<String, String> body) {
        adminService.announce(body.get("target"), body.get("trainNumber"),
                body.containsKey("userId") ? Long.parseLong(body.get("userId")) : null,
                body.get("title"), body.get("body"), CurrentUser.id());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/notifications/{id}/retry")
    public ResponseEntity<Void> retry(@PathVariable Long id) {
        adminService.retryNotification(id, CurrentUser.id());
        return ResponseEntity.ok().build();
    }

    // ── Roles ─────────────────────────────────────────────────────────────────
    @GetMapping("/users")
    public Page<UserRoleEntry> users(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminService.listUsers(page, size);
    }

    @PatchMapping("/users/{id}/role")
    public UserRoleEntry changeRole(@PathVariable Long id,
                                     @RequestBody Map<String, String> body) {
        return adminService.changeRole(id, body.get("role"), CurrentUser.id());
    }

    // ── Reports ───────────────────────────────────────────────────────────────
    @GetMapping("/reports/{name}")
    public ReportData report(
            @PathVariable String name,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate f = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate t = to != null ? to : LocalDate.now();
        return adminService.getReport(name, f, t);
    }

    @GetMapping("/reports/{name}/export.csv")
    public void exportCsv(
            @PathVariable String name,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletResponse response) throws IOException {
        LocalDate f = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate t = to != null ? to : LocalDate.now();
        ReportData data = adminService.getReport(name, f, t);
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"" + name + ".csv\"");
        PrintWriter writer = response.getWriter();
        writer.println(String.join(",", data.headers()));
        for (List<String> row : data.rows()) {
            writer.println(row.stream()
                    .map(v -> "\"" + v.replace("\"", "\"\"") + "\"")
                    .reduce("", (a, b) -> a.isEmpty() ? b : a + "," + b));
        }
        writer.flush();
    }

    // ── Settings ──────────────────────────────────────────────────────────────
    @GetMapping("/settings")
    public List<SettingEntry> settings() {
        return adminService.listSettings();
    }

    @PutMapping("/settings/{key}")
    public SettingEntry updateSetting(@PathVariable String key,
                                       @RequestBody Map<String, String> body) {
        return adminService.updateSetting(key, body.get("value"), CurrentUser.id());
    }
}
