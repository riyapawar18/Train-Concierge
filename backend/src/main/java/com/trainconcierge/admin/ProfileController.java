package com.trainconcierge.admin;

import com.trainconcierge.common.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ProfileResponse get() {
        return profileService.getProfile(CurrentUser.id());
    }

    @PutMapping
    public ProfileResponse update(@RequestBody Map<String, String> body) {
        return profileService.updateProfile(CurrentUser.id(),
                body.get("fullName"), body.get("mobile"));
    }

    @PostMapping("/password")
    public ResponseEntity<Void> changePassword(@RequestBody Map<String, String> body,
                                                HttpServletRequest request) {
        profileService.changePassword(CurrentUser.id(),
                body.get("currentPassword"), body.get("newPassword"), request);
        return ResponseEntity.ok().build();
    }
}
