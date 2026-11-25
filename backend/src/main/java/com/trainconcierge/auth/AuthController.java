package com.trainconcierge.auth;

import com.trainconcierge.auth.dto.ForgotPasswordRequest;
import com.trainconcierge.auth.dto.LoginRequest;
import com.trainconcierge.auth.dto.LoginResponse;
import com.trainconcierge.auth.dto.RegisterRequest;
import com.trainconcierge.auth.dto.ResetPasswordRequest;
import com.trainconcierge.auth.dto.UserProfileResponse;
import com.trainconcierge.common.error.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(request, clientIp(httpRequest));
    }

    /**
     * Emails a reset link to whichever account this address has. The reply is the same whether or
     * not the address is known, so the endpoint cannot be used to confirm registrations.
     */
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request,
                               HttpServletRequest httpRequest) {
        passwordResetService.request(request.email(), clientIp(httpRequest));
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.complete(request.token(), request.password(), request.confirmPassword());
    }

    @GetMapping("/me")
    public UserProfileResponse me() {
        return authService.me();
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        Object token = request.getAttribute(JwtAuthFilter.TOKEN_ATTRIBUTE);
        if (!(token instanceof JwtService.ParsedToken parsedToken)) {
            throw ApiException.unauthorized();
        }
        authService.logout(parsedToken);
    }

    private static String clientIp(HttpServletRequest request) {
        String remoteAddress = request.getRemoteAddr();
        return remoteAddress == null || remoteAddress.isBlank() ? "unknown" : remoteAddress;
    }
}
