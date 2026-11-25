package com.trainconcierge.user;

public enum Role {
    PASSENGER,
    ADMIN;

    public String authority() {
        return "ROLE_" + name();
    }
}
