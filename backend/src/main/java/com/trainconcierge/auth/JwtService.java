package com.trainconcierge.auth;

import com.trainconcierge.user.Role;
import com.trainconcierge.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKey key;
    private final long expiresInSeconds;

    public JwtService(@Value("${app.jwt.secret:}") String secret,
                      @Value("${app.jwt.expiry-minutes:60}") long expiryMinutes) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET must be set to at least 32 random bytes (for example, openssl rand -base64 48)");
        }
        if (expiryMinutes <= 0) {
            throw new IllegalStateException("JWT_EXPIRY_MINUTES must be greater than zero");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiresInSeconds = expiryMinutes * 60;
    }

    public String generateToken(User user) {
        return generateToken(user.getId(), user.getRole());
    }

    public String generateToken(Long userId, Role role) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusSeconds(expiresInSeconds);
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role.name())
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
    }

    public ParsedToken parseToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        if (claims.getSubject() == null || claims.getSubject().isBlank()
                || claims.getId() == null || claims.getId().isBlank()
                || claims.getIssuedAt() == null || claims.getExpiration() == null
                || claims.get("role", String.class) == null) {
            throw new MalformedJwtException("Token is missing required claims");
        }

        Long userId;
        Role role;
        try {
            userId = Long.valueOf(claims.getSubject());
            role = Role.valueOf(claims.get("role", String.class));
        } catch (IllegalArgumentException ex) {
            throw new MalformedJwtException("Token contains invalid claims", ex);
        }

        return new ParsedToken(userId, role, claims.getId(),
                claims.getIssuedAt().toInstant(), claims.getExpiration().toInstant());
    }

    public long expiresInSeconds() {
        return expiresInSeconds;
    }

    public record ParsedToken(Long userId, Role role, String jti, Instant issuedAt, Instant expiresAt) {
    }

    public static boolean isJwtFailure(Throwable ex) {
        return ex instanceof JwtException || ex instanceof IllegalArgumentException;
    }
}
