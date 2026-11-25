package com.trainconcierge.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.icegreen.greenmail.configuration.GreenMailConfiguration;
import com.icegreen.greenmail.util.GreenMail;
import com.icegreen.greenmail.util.ServerSetup;
import jakarta.mail.Multipart;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.fail;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The forgot-password flow over a real SMTP socket: a link is mailed to the address stored on the
 * account, only its hash is kept, and it changes the password exactly once. GreenMail stands in for
 * the relay, so nothing here can pass while the message is merely pretended to be sent.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:password-reset;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER",
        "app.auth.reset-token-ttl-minutes=30",
        "app.mail.enabled=true",
        "spring.mail.host=127.0.0.1",
        "spring.mail.username=trainconcierge@localhost",
        "spring.mail.password=mailbox-password",
        "spring.mail.properties.mail.smtp.auth=true",
        "spring.mail.properties.mail.smtp.starttls.enable=false",
        "spring.mail.properties.mail.smtp.starttls.required=false",
        "app.mail.from=trainconcierge@localhost",
        "app.mail.retry-initial-delay-ms=3600000",
        "app.mail.retry-delay-ms=3600000"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PasswordResetFlowTest {

    private static final String OLD_PASSWORD = "Str0ng#Pass";
    private static final String NEW_PASSWORD = "newpass";
    private static final Pattern TOKEN = Pattern.compile("[?&]token=([A-Za-z0-9_-]+)");
    private static final AtomicInteger COUNTER = new AtomicInteger();

    private static final GreenMail MAILBOX =
            new GreenMail(new ServerSetup(0, "127.0.0.1", ServerSetup.PROTOCOL_SMTP));

    static {
        MAILBOX.withConfiguration(GreenMailConfiguration.aConfig()
                .withUser("trainconcierge@localhost", "mailbox-password"));
        MAILBOX.start();
    }

    @DynamicPropertySource
    static void smtpPort(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.port", () -> MAILBOX.getSmtp().getPort());
    }

    @AfterAll
    static void stopMailbox() {
        MAILBOX.stop();
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clearMailboxAndTokens() throws Exception {
        MAILBOX.purgeEmailFromAllMailboxes();
        jdbcTemplate.update("DELETE FROM password_reset_tokens");
    }

    @Test
    void emailsTheStoredAddressAOneTimeLinkAndKeepsOnlyItsHash() throws Exception {
        // Typed with the wrong case on purpose: the mail must follow the row, not the request.
        String email = "Reset.Target" + COUNTER.incrementAndGet() + "@Example.com";
        String stored = email.toLowerCase();
        register(email);

        mockMvc.perform(forgot(email)).andExpect(status().isNoContent());

        MimeMessage message = awaitMail(stored, "Reset your TrainConcierge password");
        assertThat(message.getAllRecipients()).hasSize(1);
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo(stored);
        assertThat(((InternetAddress) message.getFrom()[0]).getAddress())
                .isEqualTo("trainconcierge@localhost");

        String html = part(message, "text/html");
        String token = token(message);
        assertThat(html).contains("Reset password", "http://localhost:5173/auth/reset-password?token=");
        assertThat(part(message, "text/plain")).contains("30 minutes", "did not ask to reset");

        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM password_reset_tokens",
                Integer.class)).isEqualTo(1);
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT token_hash, used_at FROM password_reset_tokens");
        assertThat((String) row.get("token_hash")).hasSize(64).doesNotContain(token);
        assertThat(row.get("used_at")).isNull();
    }

    @Test
    void linkChangesThePasswordOnceAndTellsTheAccountHolder() throws Exception {
        String email = resetTarget();
        register(email);
        mockMvc.perform(forgot(email)).andExpect(status().isNoContent());
        String token = token(awaitMail(email, "Reset your TrainConcierge password"));

        mockMvc.perform(reset(token, NEW_PASSWORD, NEW_PASSWORD)).andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", NEW_PASSWORD))))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", OLD_PASSWORD))))
                .andExpect(status().isUnauthorized());

        MimeMessage notice = awaitMail(email, "Your TrainConcierge password was changed");
        assertThat(part(notice, "text/html")).contains("Your TrainConcierge password was changed");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM password_reset_tokens WHERE used_at IS NOT NULL", Integer.class))
                .isEqualTo(1);

        mockMvc.perform(reset(token, "another", "another"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("token"))
                .andExpect(jsonPath("$.fieldErrors[0].message")
                        .value("This reset link has already been used. Please request a new one."));
    }

    @Test
    void rejectsAnUnknownOrExpiredLink() throws Exception {
        mockMvc.perform(reset("not-a-real-token", NEW_PASSWORD, NEW_PASSWORD))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].message")
                        .value("This reset link is not valid. Please request a new one."));

        String email = resetTarget();
        register(email);
        mockMvc.perform(forgot(email)).andExpect(status().isNoContent());
        String token = token(awaitMail(email, "Reset your TrainConcierge password"));

        jdbcTemplate.update("UPDATE password_reset_tokens "
                + "SET expires_at = DATEADD('MINUTE', -1, CURRENT_TIMESTAMP)");

        mockMvc.perform(reset(token, NEW_PASSWORD, NEW_PASSWORD))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].message")
                        .value("This reset link has expired. Please request a new one."));
        assertThat(loginOk(email, OLD_PASSWORD)).isTrue();
    }

    @Test
    void answersTheSameForAnUnknownAddressButSendsNothing() throws Exception {
        String email = "nobody" + COUNTER.incrementAndGet() + "@example.com";

        mockMvc.perform(forgot(email)).andExpect(status().isNoContent());

        assertThat(MAILBOX.getReceivedMessages()).isEmpty();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM password_reset_tokens",
                Integer.class)).isZero();
    }

    @Test
    void throttlesRepeatedRequestsForTheSameAddress() throws Exception {
        String email = resetTarget();
        register(email);

        for (int attempt = 1; attempt <= 5; attempt++) {
            mockMvc.perform(forgot(email)).andExpect(status().isNoContent());
        }

        mockMvc.perform(forgot(email))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Too many reset requests. "
                        + "Please try again in a few minutes."));
    }

    @Test
    void checksTheNewPasswordBeforeChangingAnything() throws Exception {
        String email = resetTarget();
        register(email);
        mockMvc.perform(forgot(email)).andExpect(status().isNoContent());
        String token = token(awaitMail(email, "Reset your TrainConcierge password"));

        mockMvc.perform(reset(token, "abc", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field")
                        .value(org.hamcrest.Matchers.hasItem("password")))
                .andExpect(jsonPath("$.fieldErrors[*].message")
                        .value(org.hamcrest.Matchers.hasItem("Password must be at least 4 characters.")));

        mockMvc.perform(reset(token, "longenough", "different"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("confirmPassword"))
                .andExpect(jsonPath("$.fieldErrors[0].message").value("Passwords do not match."));

        assertThat(loginOk(email, OLD_PASSWORD)).isTrue();
        // Both attempts above failed validation, so the link is still outstanding.
        mockMvc.perform(reset(token, "longenough", "longenough")).andExpect(status().isNoContent());
    }

    // ------------------------------------------------------------------ helpers

    private String resetTarget() {
        return "passenger" + COUNTER.incrementAndGet() + "@example.com";
    }

    private void register(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("fullName", "Reset Traveller", "email", email,
                                "password", OLD_PASSWORD, "confirmPassword", OLD_PASSWORD))))
                .andExpect(status().isCreated());
    }

    private boolean loginOk(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", password))))
                .andReturn().getResponse().getStatus() == 200;
    }

    private MockHttpServletRequestBuilder forgot(String email) throws Exception {
        return post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", email)));
    }

    private MockHttpServletRequestBuilder reset(String token, String password,
                                                String confirmPassword) throws Exception {
        return post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("token", token, "password", password,
                        "confirmPassword", confirmPassword)));
    }

    private String token(MimeMessage message) throws Exception {
        Matcher matcher = TOKEN.matcher(part(message, "text/html"));
        if (!matcher.find()) {
            fail("The reset email carried no token link");
        }
        return matcher.group(1);
    }

    private MimeMessage awaitMail(String recipient, String subject) throws Exception {
        long deadline = System.currentTimeMillis() + 20_000;
        while (System.currentTimeMillis() < deadline) {
            for (MimeMessage message : MAILBOX.getReceivedMessages()) {
                if (recipient.equalsIgnoreCase(String.valueOf(message.getAllRecipients()[0]))
                        && message.getSubject().contains(subject)) {
                    return message;
                }
            }
            try {
                Thread.sleep(50);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        fail("No '" + subject + "' email for " + recipient + " reached the SMTP mailbox");
        return null;
    }

    private static String part(MimeMessage message, String contentType) throws Exception {
        return render(message, contentType);
    }

    /** Walks the MIME tree so an assertion sees the same bytes a mailbox would render. */
    private static String render(jakarta.mail.Part part, String contentType) throws Exception {
        if (part.isMimeType(contentType)) {
            return String.valueOf(part.getContent());
        }
        if (part.getContent() instanceof Multipart multipart) {
            StringBuilder text = new StringBuilder();
            for (int index = 0; index < multipart.getCount(); index++) {
                text.append(render(multipart.getBodyPart(index), contentType));
            }
            return text.toString();
        }
        return "";
    }

    private String json(Map<String, ?> body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }
}
