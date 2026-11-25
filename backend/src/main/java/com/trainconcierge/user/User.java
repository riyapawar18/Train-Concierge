package com.trainconcierge.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 190, unique = true)
    private String email;

    @Column(length = 20)
    private String mobile;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "email_alerts", nullable = false)
    private boolean emailAlerts = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected User() {
    }

    private User(String fullName, String email, String mobile, String passwordHash,
                 Role role, boolean emailAlerts) {
        this.fullName = fullName;
        this.email = email;
        this.mobile = mobile;
        this.passwordHash = passwordHash;
        this.role = role;
        this.emailAlerts = emailAlerts;
    }

    public static User create(String fullName, String email, String mobile, String passwordHash,
                              Role role, boolean emailAlerts) {
        return new User(fullName, email, mobile, passwordHash, role, emailAlerts);
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void changeRole(Role newRole) {
        this.role = newRole;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getMobile() {
        return mobile;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isEmailAlerts() {
        return emailAlerts;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
