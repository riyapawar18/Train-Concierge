package com.trainconcierge.common.security;

import java.util.regex.Pattern;

public final class PasswordPolicy {

    /** Only length is enforced so that any user can register without a composition complaint. */
    public static final int MIN_LENGTH = 4;
    public static final int MAX_LENGTH = 72;
    public static final String REGEX = "(?s)^.{4,}$";
    public static final String MESSAGE = "Password must be at least 4 characters.";

    private static final Pattern PATTERN = Pattern.compile(REGEX);

    private PasswordPolicy() {
    }

    public static boolean isValid(String password) {
        return password != null
                && password.length() >= MIN_LENGTH
                && password.length() <= MAX_LENGTH
                && PATTERN.matcher(password).matches();
    }
}
