package com.trainconcierge.auth;

import com.trainconcierge.auth.dto.LoginRequest;
import com.trainconcierge.auth.dto.LoginResponse;
import com.trainconcierge.auth.dto.RegisterRequest;
import com.trainconcierge.auth.dto.UserProfileResponse;
import com.trainconcierge.auth.dto.UserSummaryResponse;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.common.security.CurrentUser;
import com.trainconcierge.common.security.PasswordPolicy;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

@Service
public class AuthService {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;
    private final RevokedTokenRepository revokedTokenRepository;

    public AuthService(UserService userService, PasswordEncoder passwordEncoder, JwtService jwtService,
                       LoginAttemptService loginAttemptService,
                       RevokedTokenRepository revokedTokenRepository) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginAttemptService = loginAttemptService;
        this.revokedTokenRepository = revokedTokenRepository;
    }

    public LoginResponse register(RegisterRequest request) {
        if (!PasswordPolicy.isValid(request.password())) {
            throw ApiException.validation("password", PasswordPolicy.MESSAGE);
        }
        if (!request.password().equals(request.confirmPassword())) {
            throw ApiException.validation("confirmPassword", "Passwords do not match.");
        }
        User user = userService.registerPassenger(request.fullName(), request.email(),
                request.mobile(), request.password());
        String token = jwtService.generateToken(user);
        return new LoginResponse(token, "Bearer", jwtService.expiresInSeconds(), summary(user));
    }

    public LoginResponse login(LoginRequest request, String clientIp) {
        String email = UserService.normalizeEmail(request.email());
        if (loginAttemptService.isBlocked(email, clientIp)) {
            throw ApiException.tooManyAttempts();
        }

        Optional<User> candidate = userService.findByEmail(email);
        if (candidate.isEmpty()
                || !candidate.get().isEnabled()
                || !passwordEncoder.matches(request.password(), candidate.get().getPasswordHash())) {
            loginAttemptService.recordFailure(email, clientIp);
            throw ApiException.invalidCredentials();
        }

        User user = candidate.get();
        loginAttemptService.reset(email, clientIp);
        String token = jwtService.generateToken(user);
        return new LoginResponse(token, "Bearer", jwtService.expiresInSeconds(), summary(user));
    }

    public UserProfileResponse me() {
        User user = userService.getAuthenticatedUser(CurrentUser.id());
        return new UserProfileResponse(user.getId(), user.getFullName(), user.getEmail(),
                user.getRole(), user.getMobile(), user.isEmailAlerts());
    }

    @Transactional
    public void logout(JwtService.ParsedToken token) {
        revokedTokenRepository.deleteByExpiresAtBefore(LocalDateTime.now(ZoneOffset.UTC));
        if (!revokedTokenRepository.existsById(token.jti())) {
            revokedTokenRepository.save(new RevokedToken(token.jti(),
                    LocalDateTime.ofInstant(token.expiresAt(), ZoneOffset.UTC)));
        }
    }

    private static UserSummaryResponse summary(User user) {
        return new UserSummaryResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
    }
}
