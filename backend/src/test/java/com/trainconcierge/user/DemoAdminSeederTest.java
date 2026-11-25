package com.trainconcierge.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "app.demo.password=Str0ng#Pass",
        "app.demo.catalog.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:trainconcierge-demo;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER"
})
@ActiveProfiles({"test", "demo"})
class DemoAdminSeederTest {

    private static final String PASSWORD = "Str0ng#Pass";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void demoProfileCreatesOneAdminAndFivePassengersWithBcryptHashes() {
        assertThat(userRepository.count()).isEqualTo(6);

        User admin = userRepository.findByEmail(DemoAdminSeeder.ADMIN_EMAIL).orElseThrow();
        assertThat(admin.getFullName()).isEqualTo(DemoAdminSeeder.ADMIN_NAME);
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.isEnabled()).isTrue();

        User passenger = userRepository.findByEmail("asha.kulkarni@trainconcierge.demo").orElseThrow();
        assertThat(passenger.getFullName()).isEqualTo("Asha Kulkarni");
        assertThat(passenger.getRole()).isEqualTo(Role.PASSENGER);

        for (User user : userRepository.findAll()) {
            assertThat(user.getPasswordHash()).startsWith("$2");
            assertThat(user.getPasswordHash()).isNotEqualTo(PASSWORD);
            assertThat(passwordEncoder.matches(PASSWORD, user.getPasswordHash())).isTrue();
        }
    }
}
