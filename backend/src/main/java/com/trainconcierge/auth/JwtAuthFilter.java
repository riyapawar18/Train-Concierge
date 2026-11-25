package com.trainconcierge.auth;

import com.trainconcierge.common.error.ApiErrorWriter;
import com.trainconcierge.common.security.UserPrincipal;
import com.trainconcierge.user.User;
import com.trainconcierge.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String TOKEN_ATTRIBUTE = JwtAuthFilter.class.getName() + ".token";

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RevokedTokenRepository revokedTokenRepository;
    private final ApiErrorWriter apiErrorWriter;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository,
                         RevokedTokenRepository revokedTokenRepository, ApiErrorWriter apiErrorWriter) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.revokedTokenRepository = revokedTokenRepository;
        this.apiErrorWriter = apiErrorWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || header.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!header.regionMatches(true, 0, "Bearer ", 0, "Bearer ".length())) {
            reject(response);
            return;
        }

        String token = header.substring("Bearer ".length()).trim();
        if (token.isEmpty()) {
            reject(response);
            return;
        }

        JwtService.ParsedToken parsedToken;
        try {
            parsedToken = jwtService.parseToken(token);
        } catch (RuntimeException ex) {
            if (!JwtService.isJwtFailure(ex)) {
                throw ex;
            }
            reject(response);
            return;
        }

        if (revokedTokenRepository.existsById(parsedToken.jti())) {
            reject(response);
            return;
        }

        Optional<User> user = userRepository.findById(parsedToken.userId());
        if (user.isEmpty() || !user.get().isEnabled()) {
            reject(response);
            return;
        }

        UserPrincipal principal = new UserPrincipal(user.get().getId(), user.get().getEmail(),
                user.get().getRole());
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority(user.get().getRole().authority())));
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        request.setAttribute(TOKEN_ATTRIBUTE, parsedToken);

        filterChain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response) throws IOException {
        apiErrorWriter.write(response, HttpStatus.UNAUTHORIZED, "INVALID_TOKEN",
                "Invalid or expired token.");
    }
}
