package com.trainconcierge.auth;

import com.trainconcierge.common.audit.AuditService;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.common.security.PasswordPolicy;
import com.trainconcierge.notification.MailService;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import com.trainconcierge.user.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The forgot-password flow: a random link is emailed to the address on the account, and only the
 * SHA-256 of that link's token is stored. The email is sent through the same SMTP relay as every
 * other message, so a reset is only reported as sent when the mail server actually accepts it.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    /** Shares the sign-in throttle's window and limit, keyed so the two never overlap. */
    private static final String THROTTLE_PREFIX = "reset:";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final AuditService auditService;
    private final LoginAttemptService loginAttemptService;
    private final String frontendOrigin;
    private final int tokenTtlMinutes;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository resetTokenRepository,
                                PasswordEncoder passwordEncoder,
                                MailService mailService,
                                AuditService auditService,
                                LoginAttemptService loginAttemptService,
                                @Value("${app.frontend-origin:http://localhost:5173}") String frontendOrigin,
                                @Value("${app.auth.reset-token-ttl-minutes:30}") int tokenTtlMinutes) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.auditService = auditService;
        this.loginAttemptService = loginAttemptService;
        this.frontendOrigin = stripTrailingSlash(frontendOrigin);
        this.tokenTtlMinutes = tokenTtlMinutes;
    }

    /**
     * Emails a reset link to the address on file. An unknown address answers the same way as a
     * delivered link, so the endpoint never confirms whether an account exists; a known address
     * whose mail the server rejected is reported as a failure rather than a silent success.
     */
    @Transactional
    public void request(String rawEmail, String clientIp) {
        String email = UserService.normalizeEmail(rawEmail);
        if (loginAttemptService.isBlocked(THROTTLE_PREFIX + email, clientIp)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS",
                    "Too many reset requests. Please try again in a few minutes.");
        }
        loginAttemptService.recordFailure(THROTTLE_PREFIX + email, clientIp);

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        resetTokenRepository.deleteByExpiresAtBefore(now.minusDays(1));
        resetTokenRepository.deleteByUserId(user.getId());
        String token = newToken();
        resetTokenRepository.save(new PasswordResetToken(sha256(token), user.getId(), now,
                now.plusMinutes(tokenTtlMinutes)));

        Map<String, Object> variables = new HashMap<>();
        variables.put("recipientName", user.getFullName());
        variables.put("expiresInMinutes", tokenTtlMinutes);
        variables.put("resetUrl", frontendOrigin + "/auth/reset-password?token=" + token);
        variables.put("year", now.getYear());

        Optional<String> failure = mailService.sendOne(user.getEmail(),
                "Reset your TrainConcierge password", "password-reset", variables);
        if (failure.isPresent()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "MAIL_FAILED",
                    "We could not send the reset email just now. Please try again in a moment.");
        }
    }

    /** Applies a reset and tells the account holder afterwards, once the change is committed. */
    @Transactional
    public void complete(String token, String password, String confirmPassword) {
        if (!PasswordPolicy.isValid(password)) {
            throw ApiException.validation("password", PasswordPolicy.MESSAGE);
        }
        if (!password.equals(confirmPassword)) {
            throw ApiException.validation("confirmPassword", "Passwords do not match.");
        }

        PasswordResetToken reset = resetTokenRepository.findById(sha256(token))
                .orElseThrow(() -> ApiException.validation("token",
                        "This reset link is not valid. Please request a new one."));
        LocalDateTime now = LocalDateTime.now();
        if (reset.getUsedAt() != null) {
            throw ApiException.validation("token",
                    "This reset link has already been used. Please request a new one.");
        }
        if (now.isAfter(reset.getExpiresAt())) {
            throw ApiException.validation("token",
                    "This reset link has expired. Please request a new one.");
        }

        User user = userRepository.findById(reset.getUserId()).orElseThrow(ApiException::notFound);
        user.setPasswordHash(passwordEncoder.encode(password));
        userRepository.save(user);
        reset.markUsedAt(now);
        resetTokenRepository.save(reset);
        auditService.record(user.getId(), "PASSWORD_RESET", "USER", user.getId(), null);

        afterCommit(() -> sendChangedNotice(user, now));
    }

    /** The account holder hears about the change even though they asked for it — standard practice. */
    private void sendChangedNotice(User user, LocalDateTime when) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("recipientName", user.getFullName());
        variables.put("title", "Your TrainConcierge password was changed");
        variables.put("body", "The password for " + user.getEmail()
                + " was reset. If you did not do this, reset it again from the sign-in page and "
                + "contact support.");
        variables.put("actionLabel", "Sign in");
        variables.put("actionUrl", frontendOrigin + "/auth");
        variables.put("details", List.of());
        variables.put("hasDetails", false);
        variables.put("detailsSection", "");
        variables.put("sectionHeading", "Account security");
        variables.put("year", when.getYear());
        mailService.sendOne(user.getEmail(), "Your TrainConcierge password was changed",
                "notification", variables).ifPresent(reason -> log.warn(
                        "The password-changed notice for user {} could not be sent: {}",
                        user.getId(), reason));
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is required for reset tokens", ex);
        }
    }

    private static void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    private static String stripTrailingSlash(String value) {
        return value != null && value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
