package com.trainconcierge.notification;

import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PreferenceService {

    private final UserPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    public PreferenceService(UserPreferenceRepository preferenceRepository,
                             UserRepository userRepository) {
        this.preferenceRepository = preferenceRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public UserPreference forUser(User user) {
        return preferenceRepository.findById(user.getId())
                .orElseGet(() -> preferenceRepository.save(
                        UserPreference.defaults(user.getId(), user.isEmailAlerts())));
    }

    @Transactional
    public UserPreference forUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(ApiException::notFound);
        return forUser(user);
    }

    @Transactional
    public UserPreference update(Long userId, boolean emailEnabled, boolean seatAlertsEnabled,
                                 boolean disruptionAlertsEnabled, boolean announcementsEnabled) {
        UserPreference preference = forUser(userId);
        preference.update(emailEnabled, seatAlertsEnabled, disruptionAlertsEnabled,
                announcementsEnabled);
        return preferenceRepository.save(preference);
    }
}
