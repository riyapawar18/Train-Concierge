package com.trainconcierge.notification;

import com.trainconcierge.common.security.CurrentUser;
import com.trainconcierge.notification.dto.PreferenceRequest;
import com.trainconcierge.notification.dto.PreferenceResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/preferences")
public class PreferenceController {

    private final PreferenceService preferenceService;

    public PreferenceController(PreferenceService preferenceService) {
        this.preferenceService = preferenceService;
    }

    @GetMapping
    public PreferenceResponse get() {
        return PreferenceResponse.from(preferenceService.forUser(CurrentUser.id()));
    }

    @PutMapping
    public PreferenceResponse update(@Valid @RequestBody PreferenceRequest request) {
        UserPreference preference = preferenceService.update(
                CurrentUser.id(),
                request.emailEnabled(),
                request.seatAlertsEnabled(),
                request.disruptionAlertsEnabled(),
                request.announcementsEnabled());
        return PreferenceResponse.from(preference);
    }
}
