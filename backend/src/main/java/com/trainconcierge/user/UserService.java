package com.trainconcierge.user;

import com.trainconcierge.common.audit.AuditService;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.common.security.PasswordPolicy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional
    public User registerPassenger(String fullName, String email, String mobile, String password) {
        if (!PasswordPolicy.isValid(password)) {
            throw ApiException.validation("password", PasswordPolicy.MESSAGE);
        }
        String normalizedEmail = normalizeEmail(email);
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw ApiException.emailTaken();
        }

        User user = User.create(fullName.trim(), normalizedEmail, normalizeMobile(mobile),
                passwordEncoder.encode(password), Role.PASSENGER, true);
        try {
            User saved = userRepository.saveAndFlush(user);
            auditService.record(saved.getId(), "USER_REGISTERED", "USER", saved.getId(),
                    "{\"role\":\"PASSENGER\"}");
            return saved;
        } catch (DataIntegrityViolationException ex) {
            throw ApiException.emailTaken();
        }
    }

    @Transactional
    public boolean ensureAdmin(String fullName, String email, String password) {
        if (!PasswordPolicy.isValid(password)) {
            throw new IllegalArgumentException("Admin password does not meet the password policy");
        }
        String normalizedEmail = normalizeEmail(email);
        if (userRepository.existsByEmail(normalizedEmail)) {
            return false;
        }
        User user = User.create(fullName.trim(), normalizedEmail, null,
                passwordEncoder.encode(password), Role.ADMIN, true);
        User saved = userRepository.saveAndFlush(user);
        auditService.record(null, "ADMIN_PROVISIONED", "USER", saved.getId(),
                "{\"role\":\"ADMIN\"}");
        return true;
    }

    @Transactional
    public boolean ensurePassenger(String fullName, String email, String password) {
        if (!PasswordPolicy.isValid(password)) {
            throw new IllegalArgumentException("Demo password does not meet the password policy");
        }
        String normalizedEmail = normalizeEmail(email);
        if (userRepository.existsByEmail(normalizedEmail)) {
            return false;
        }
        User user = User.create(fullName.trim(), normalizedEmail, null,
                passwordEncoder.encode(password), Role.PASSENGER, true);
        User saved = userRepository.saveAndFlush(user);
        auditService.record(null, "PASSENGER_PROVISIONED", "USER", saved.getId(),
                "{\"role\":\"PASSENGER\"}");
        return true;
    }

    @Transactional
    public User changeRole(Long actorUserId, Long targetUserId, Role newRole) {
        User user = userRepository.findById(targetUserId).orElseThrow(ApiException::notFound);
        Role previousRole = user.getRole();
        if (previousRole != newRole) {
            user.changeRole(newRole);
            userRepository.save(user);
            auditService.record(actorUserId, "ROLE_CHANGED", "USER", user.getId(),
                    "{\"from\":\"" + previousRole.name() + "\",\"to\":\"" + newRole.name() + "\"}");
        }
        return user;
    }

    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(normalizeEmail(email));
    }

    @Transactional(readOnly = true)
    public User getAuthenticatedUser(Long id) {
        return userRepository.findById(id).orElseThrow(ApiException::unauthorized);
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeMobile(String mobile) {
        if (mobile == null) {
            return null;
        }
        String trimmed = mobile.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
