package com.at_a_look.economy.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Data
@ToString(exclude = {})
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users", 
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"email"}),
           @UniqueConstraint(columnNames = {"username"})
       })
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false)
    private String password; // BCrypt로 암호화된 비밀번호

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_username_change_date")
    private LocalDateTime lastUsernameChangeDate;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_suspended", nullable = false)
    @Builder.Default
    private Boolean isSuspended = false;

    @Column(name = "suspended_until")
    private LocalDateTime suspendedUntil;

    @Column(name = "suspension_reason")
    private String suspensionReason;

    @Column(name = "suspended_by")
    private String suspendedBy;

    @Column(name = "suspended_at")
    private LocalDateTime suspendedAt;



    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum Role {
        USER, ADMIN
    }
} 