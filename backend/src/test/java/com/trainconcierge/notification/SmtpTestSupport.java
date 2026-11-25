package com.trainconcierge.notification;

import jakarta.mail.Multipart;
import jakarta.mail.Part;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

/** Shared plumbing for the SMTP tests: MailService resolves its sender through an ObjectProvider. */
final class SmtpTestSupport {

    private SmtpTestSupport() {
    }

    /** Walks the MIME tree so an assertion sees the same bytes a mailbox would render. */
    static String part(Part part, String contentType) throws Exception {
        if (part.isMimeType(contentType)) {
            return String.valueOf(part.getContent());
        }
        if (part.getContent() instanceof Multipart multipart) {
            StringBuilder text = new StringBuilder();
            for (int index = 0; index < multipart.getCount(); index++) {
                text.append(part(multipart.getBodyPart(index), contentType));
            }
            return text.toString();
        }
        return "";
    }

    static ObjectProvider<JavaMailSender> provider(JavaMailSender sender) {
        return new ObjectProvider<>() {
            @Override
            public JavaMailSender getObject() {
                return sender;
            }

            @Override
            public JavaMailSender getObject(Object... args) {
                return sender;
            }

            @Override
            public JavaMailSender getIfAvailable() {
                return sender;
            }

            @Override
            public JavaMailSender getIfUnique() {
                return sender;
            }
        };
    }
}
