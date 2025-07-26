package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class NotificationDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String title;
        private String message;
        private String type;
        private Boolean isRead;
        private Long postId;
        private Long commentId;
        private Long targetUserId;
        private LocalDateTime createdAt;
        private LocalDateTime readAt;
        
        // 추가 정보
        private PostInfo postInfo;
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class PostInfo {
            private String title;
            private String author;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListResponse {
        private List<Response> notifications;
        private long totalCount;
        private long unreadCount;
        private int currentPage;
        private int totalPages;
        private boolean hasNext;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        private Long userId;
        private String title;
        private String message;
        private Notification.NotificationType type;
        private Long postId;
        private Long commentId;
        private Long toUserId; // targetUserId 대신 toUserId 사용
        
        // 호환성을 위한 getter
        public Long getTargetUserId() {
            return toUserId;
        }
        
        public void setTargetUserId(Long targetUserId) {
            this.toUserId = targetUserId;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarkAsReadRequest {
        private List<Long> notificationIds;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnreadCountResponse {
        private long unreadCount;
    }
} 