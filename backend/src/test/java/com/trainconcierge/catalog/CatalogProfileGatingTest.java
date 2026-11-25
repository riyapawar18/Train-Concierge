package com.trainconcierge.catalog;

import com.trainconcierge.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:catalog-nodemo;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER"
})
@ActiveProfiles("test")
class CatalogProfileGatingTest {

    @Autowired
    private StationRepository stationRepository;

    @Autowired
    private TrainRepository trainRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void withoutTheDemoProfileNoCatalogDataOrDemoUsersAreLoaded() {
        assertThat(stationRepository.count()).isZero();
        assertThat(trainRepository.count()).isZero();
        assertThat(userRepository.count()).isZero();
    }
}
