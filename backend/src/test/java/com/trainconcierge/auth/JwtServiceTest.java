package com.trainconcierge.auth;

import com.trainconcierge.user.Role;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-0123456789-abcdefghijklmnop";
    private static final String ROLE_CLAIM = "role";

    private final JwtService jwtService = new JwtService(SECRET, 60);

    @Test
    void generatesTokenWithRequiredClaims() {
        String token = jwtService.generateToken(7L, Role.ADMIN);

        JwtService.ParsedToken parsed = jwtService.parseToken(token);

        assertThat(parsed.userId()).isEqualTo(7L);
        assertThat(parsed.role()).isEqualTo(Role.ADMIN);
        assertThat(parsed.jti()).isNotBlank();
        assertThat(parsed.issuedAt()).isBefore(parsed.expiresAt());
        assertThat(Duration.between(parsed.issuedAt(), parsed.expiresAt()).toSeconds())
                .isBetween(3599L, 3601L);
        assertThat(jwtService.expiresInSeconds()).isEqualTo(3600);
    }

    @Test
    void rejectsExpiredToken() {
        Instant issuedAt = Instant.now().minusSeconds(7200);
        Instant expiresAt = Instant.now().minusSeconds(3600);
        String token = signedToken(issuedAt, expiresAt);

        assertThatThrownBy(() -> jwtService.parseToken(token))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void rejectsTamperedToken() {
        String token = jwtService.generateToken(7L, Role.PASSENGER);

        assertThatThrownBy(() -> jwtService.parseToken(tamperedSignature(token)))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsMalformedToken() {
        assertThatThrownBy(() -> jwtService.parseToken("not-a-token"))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsTokenWithoutRoleClaim() {
        Instant now = Instant.now();
        String token = Jwts.builder()
                .subject("7")
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThatThrownBy(() -> jwtService.parseToken(token))
                .isInstanceOf(MalformedJwtException.class);
    }

    @Test
    void rejectsShortSecret() {
        assertThatThrownBy(() -> new JwtService("too-short", 60))
                .isInstanceOf(IllegalStateException.class);
    }

    // Changing the last signature char may not change its decoded bytes; the first always does.
    private static String tamperedSignature(String token) {
        int signatureStart = token.lastIndexOf('.') + 1;
        char original = token.charAt(signatureStart);
        char replacement = original == 'A' ? 'B' : 'A';
        return token.substring(0, signatureStart) + replacement + token.substring(signatureStart + 1);
    }

    private static String signedToken(Instant issuedAt, Instant expiresAt) {
        return Jwts.builder()
                .subject("7")
                .claim(ROLE_CLAIM, Role.PASSENGER.name())
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }
}
