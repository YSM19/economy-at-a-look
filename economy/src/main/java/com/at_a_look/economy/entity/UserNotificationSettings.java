package com.at_a_look.economy.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "user_notification_settings")
public class UserNotificationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "exchange_rate_notifications", nullable = false)
    @Builder.Default
    private Boolean exchangeRateNotifications = true;

    @Column(name = "interest_rate_notifications", nullable = false)
    @Builder.Default
    private Boolean interestRateNotifications = true;

    @Column(name = "cpi_notifications", nullable = false)
    @Builder.Default
    private Boolean cpiNotifications = true;

    @Column(name = "economic_index_notifications", nullable = false)
    @Builder.Default
    private Boolean economicIndexNotifications = true;

    @Column(name = "community_notifications", nullable = false)
    @Builder.Default
    private Boolean communityNotifications = true;

    @Column(name = "email_notifications", nullable = false)
    @Builder.Default
    private Boolean emailNotifications = false;

    @Column(name = "push_notifications", nullable = false)
    @Builder.Default
    private Boolean pushNotifications = true;

    @Column(name = "notification_frequency", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private NotificationFrequency notificationFrequency = NotificationFrequency.DAILY;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum NotificationFrequency {
        IMMEDIATE, HOURLY, DAILY, WEEKLY
    }
} 