package com.trainconcierge.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.demo.password=Str0ng#Pass",
        "spring.datasource.url=jdbc:h2:mem:catalog-api;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "demo"})
class CatalogControllerTest {

    private static final String PASSWORD = "Str0ng#Pass";
    private static final AtomicInteger COUNTER = new AtomicInteger();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String token;

    @BeforeEach
    void signIn() throws Exception {
        String email = "catalog" + COUNTER.incrementAndGet() + "@example.com";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Catalog Tester");
        body.put("email", email);
        body.put("password", PASSWORD);
        body.put("confirmPassword", PASSWORD);
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        token = objectMapper.readTree(login.getResponse().getContentAsString())
                .path("accessToken").asText();
    }

    @Test
    void catalogEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/stations").param("q", "pune"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        mockMvc.perform(get("/api/stations/PUNE"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/trains/11007"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void stationSearchMatchesCodeNameAndCityIgnoringCase() throws Exception {
        mockMvc.perform(get("/api/stations").param("q", "pune")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.lessThanOrEqualTo(10)))
                .andExpect(jsonPath("$[*].code", hasItems("PUNE", "KK")));

        mockMvc.perform(get("/api/stations").param("q", "PUNE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", hasItems("PUNE", "KK")));

        mockMvc.perform(get("/api/stations").param("q", "zzz")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void stationLookupIsCaseInsensitiveAndReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/stations/pune")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("PUNE"))
                .andExpect(jsonPath("$.name").value("Pune Junction"))
                .andExpect(jsonPath("$.city").value("Pune"));

        mockMvc.perform(get("/api/stations/XXXX")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void trainSummaryIncludesClassesAndOrderedSchedule() throws Exception {
        mockMvc.perform(get("/api/trains/11007")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number").value("11007"))
                .andExpect(jsonPath("$.name").value("Deccan Express"))
                .andExpect(jsonPath("$.type").value("EXPRESS"))
                .andExpect(jsonPath("$.sourceCode").value("PUNE"))
                .andExpect(jsonPath("$.destinationCode").value("CSMT"))
                .andExpect(jsonPath("$.classes.length()").value(4))
                .andExpect(jsonPath("$.schedule.length()").value(5))
                .andExpect(jsonPath("$.schedule[0].stationCode").value("PUNE"))
                .andExpect(jsonPath("$.schedule[0].departureTime").value("16:30"))
                .andExpect(jsonPath("$.schedule[4].stationCode").value("CSMT"))
                .andExpect(jsonPath("$.schedule[4].arrivalTime").value("19:45"));

        mockMvc.perform(get("/api/trains/99999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
