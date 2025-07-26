package com.at_a_look.economy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class UserSuspensionDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuspendUserRequest {
        private Long userId;
        private Integer suspensionDays;
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnsuspendUserRequest {
        private Long userId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSuspensionResponse {
        private Long userId;
        private String username;
        private String email;
        private String role;
        private Boolean isSuspended;
        private LocalDateTime suspendedUntil;
        private String suspensionReason;
        private String suspendedBy;
        private LocalDateTime suspendedAt;
        private Boolean isSuspensionExpired;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuspensionHistoryResponse {
        private Long id;
        private String username;
        private String email;
        private String role;
        private Boolean isSuspended;
        private LocalDateTime suspendedUntil;
        private String suspensionReason;
        private String suspendedBy;
        private LocalDateTime suspendedAt;
        private Boolean isSuspensionExpired;
        private LocalDateTime createdAt;
    }
} 