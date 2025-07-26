package com.at_a_look.economy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class AdminDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostManagementResponse {
        private Long id;
        private String title;
        private String content;
        private String boardType;
        private String author;
        private String authorEmail;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private Integer viewCount;
        private Integer likeCount;
        private Integer commentCount;
        private Boolean isDeleted;
        private List<String> tags;
        private List<ImageInfo> images;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommentManagementResponse {
        private Long id;
        private String content;
        private String author;
        private String authorEmail;
        private Long postId;
        private String postTitle;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private Integer likeCount;
        private Boolean isDeleted;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageInfo {
        private Long id;
        private String imageUrl;
        private String originalFilename;
        private Long fileSize;
        private Integer displayOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostListResponse {
        private List<PostManagementResponse> posts;
        private Long totalCount;
        private Integer currentPage;
        private Integer totalPages;
        private Boolean hasNext;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommentListResponse {
        private List<CommentManagementResponse> comments;
        private Long totalCount;
        private Integer currentPage;
        private Integer totalPages;
        private Boolean hasNext;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommunityStatsResponse {
        private Long totalPosts;
        private Long totalComments;
        private Long totalUsers;
        private Long todayPosts;
        private Long todayComments;
        private Long deletedPosts;
        private Long deletedComments;
        private List<BoardStats> boardStats;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BoardStats {
        private String boardType;
        private String boardName;
        private Long postCount;
        private Long commentCount;
        private Long todayPosts;
        private Long todayComments;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkActionRequest {
        private List<Long> ids;
        private String action; // "delete", "restore", "hide"
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchRequest {
        private String keyword;
        private String boardType;
        private String author;
        private Boolean isDeleted;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private Integer page;
        private Integer size;
        private String sortBy;
        private String sortOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportManagementResponse {
        private Long id;
        private String targetType; // "post" or "comment"
        private Long targetId;
        private String targetTitle;
        private String targetContent;
        private String targetAuthor;
        private String reason;
        private String reasonText;
        private String details;
        private String reportedBy;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime reviewedAt;
        private String reviewedBy;
        private String reviewNote;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportListResponse {
        private List<ReportManagementResponse> reports;
        private Long totalCount;
        private Integer currentPage;
        private Integer totalPages;
        private Boolean hasNext;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportSearchRequest {
        private String status; // "all", "pending", "approved", "rejected"
        private String targetType; // "post", "comment", "all"
        private String reason; // "spam", "harassment", "misinformation", "inappropriate"
        private String keyword;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private Integer page;
        private Integer size;
        private String sortBy;
        private String sortOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportActionRequest {
        private String reviewNote;
    }
} 