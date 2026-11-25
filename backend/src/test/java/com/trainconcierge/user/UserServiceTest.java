package com.trainconcierge.user;

import com.trainconcierge.common.audit.AuditLog;
import com.trainconcierge.common.audit.AuditLogRepository;
import com.trainconcierge.auth.RevokedTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private RevokedTokenRepository revokedTokenRepository;

    @BeforeEach
    void cleanDatabase() {
        revokedTokenRepository.deleteAll();
        auditLogRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void changeRoleUpdatesUserAndWritesAuditRow() {
        User passenger = userService.registerPassenger("Passenger One", "audit-passenger@example.com",
                null, "Str0ng#Pass");
        assertThat(userService.ensureAdmin("Administrator", "audit-admin@example.com", "Str0ng#Pass"))
                .isTrue();
        User admin = userRepository.findByEmail("audit-admin@example.com").orElseThrow();

        userService.changeRole(admin.getId(), passenger.getId(), Role.ADMIN);

        User updated = userRepository.findById(passenger.getId()).orElseThrow();
        assertThat(updated.getRole()).isEqualTo(Role.ADMIN);

        AuditLog roleChange = auditLogRepository.findAll().stream()
                .filter(log -> log.getAction().equals("ROLE_CHANGED"))
                .findFirst()
                .orElseThrow();
        assertThat(roleChange.getActorUserId()).isEqualTo(admin.getId());
        assertThat(roleChange.getTargetType()).isEqualTo("USER");
        assertThat(roleChange.getTargetId()).isEqualTo(passenger.getId());
        assertThat(roleChange.getDetails()).contains("\"from\":\"PASSENGER\"", "\"to\":\"ADMIN\"");
    }
}
