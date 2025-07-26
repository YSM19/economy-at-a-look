package com.at_a_look.economy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public class CommentDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String content;
        private Integer likeCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        
        // 작성자 정보
        private AuthorInfo author;
        
        // 부모 댓글 정보 (대댓글인 경우)
        private ParentInfo parent;
        
        // 대댓글 목록
        private List<Response> replies;
        
        // 사용자 상호작용 정보
        private UserInteraction userInteraction;
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class AuthorInfo {
            private String username;
        }
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ParentInfo {
            private Long id;
            private String authorUsername;
        }
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class UserInteraction {
            private Boolean isLiked;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListResponse {
        private List<Response> comments;
        private long totalCount;
        private int currentPage;
        private int totalPages;
        private boolean hasNext;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotNull(message = "게시글 ID는 필수입니다")
        private Long postId;
        
        @NotBlank(message = "댓글 내용은 필수입니다")
        private String content;
        
        private Long parentId; // 대댓글인 경우 부모 댓글 ID
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @NotBlank(message = "댓글 내용은 필수입니다")
        private String content;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LikeResponse {
        private Boolean isLiked;
        private Integer likeCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryResponse {
        private Long id;
        private String content;
        private String authorUsername;
        private LocalDateTime createdAt;
        private Integer likeCount;
        private Boolean isReply;
    }
} 