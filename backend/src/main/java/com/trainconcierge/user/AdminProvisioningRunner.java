package com.trainconcierge.user;

import com.trainconcierge.common.security.PasswordPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("provision-admin")
public class AdminProvisioningRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminProvisioningRunner.class);

    private final UserService userService;
    private final String adminEmail;
    private final String adminPassword;
    private final String adminName;

    public AdminProvisioningRunner(
            UserService userService,
            @Value("${ADMIN_EMAIL:}") String adminEmail,
            @Value("${ADMIN_PASSWORD:}") String adminPassword,
            @Value("${ADMIN_NAME:Administrator}") String adminName) {
        this.userService = userService;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.adminName = adminName;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            throw new IllegalStateException("ADMIN_EMAIL and ADMIN_PASSWORD are required for provisioning");
        }
        if (!PasswordPolicy.isValid(adminPassword)) {
            throw new IllegalStateException("ADMIN_PASSWORD does not meet the password policy");
        }
        if (userService.ensureAdmin(adminName, adminEmail, adminPassword)) {
            log.info("Administrator account created for {}. You can stop the application now.", adminEmail);
        } else {
            log.info("An account already exists for {}. Nothing was changed.", adminEmail);
        }
    }
}
