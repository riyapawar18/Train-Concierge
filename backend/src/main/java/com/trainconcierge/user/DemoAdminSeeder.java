package com.trainconcierge.user;

import com.trainconcierge.common.security.PasswordPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Profile("demo")
@Order(20)
public class DemoAdminSeeder implements ApplicationRunner {

    public static final String ADMIN_EMAIL = "admin@trainconcierge.demo";
    public static final String ADMIN_NAME = "Operations Admin";

    public static final List<DemoPassenger> PASSENGERS = List.of(
            new DemoPassenger("Asha Kulkarni", "asha.kulkarni@trainconcierge.demo"),
            new DemoPassenger("Rohan Deshmukh", "rohan.deshmukh@trainconcierge.demo"),
            new DemoPassenger("Meera Iyer", "meera.iyer@trainconcierge.demo"),
            new DemoPassenger("Karan Singh", "karan.singh@trainconcierge.demo"),
            new DemoPassenger("Fatima Sheikh", "fatima.sheikh@trainconcierge.demo"));

    private static final Logger log = LoggerFactory.getLogger(DemoAdminSeeder.class);

    private final UserService userService;
    private final String demoPassword;

    public DemoAdminSeeder(UserService userService, @Value("${app.demo.password:}") String demoPassword) {
        this.userService = userService;
        // Strip surrounding quotes that shells or .env loaders sometimes preserve.
        this.demoPassword = demoPassword != null ? demoPassword.replaceAll("^\"|\"$|^'|'$", "") : "";
    }

    @Override
    public void run(ApplicationArguments args) {
        if (demoPassword == null || demoPassword.isBlank()) {
            log.warn("DEMO_PASSWORD is not set; the demo accounts were not created.");
            return;
        }
        if (!PasswordPolicy.isValid(demoPassword)) {
            log.warn("DEMO_PASSWORD does not meet the password policy; the demo accounts were not created.");
            return;
        }

        int created = 0;
        if (userService.ensureAdmin(ADMIN_NAME, ADMIN_EMAIL, demoPassword)) {
            created++;
        }
        for (DemoPassenger passenger : PASSENGERS) {
            if (userService.ensurePassenger(passenger.fullName(), passenger.email(), demoPassword)) {
                created++;
            }
        }
        int total = PASSENGERS.size() + 1;
        log.info("Demo accounts ready: {} created, {} already existed.", created, total - created);
    }

    public record DemoPassenger(String fullName, String email) {
    }
}
