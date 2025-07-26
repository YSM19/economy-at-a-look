package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public class PostDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String title;
        private String content;
        private String boardType;
        private List<String> tags;
        private Integer viewCount;
        private Integer likeCount;
        private Integer commentCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        
        // 작성자 정보
        private AuthorInfo author;
        
        // 이미지 정보
        private List<ImageInfo> images;
        
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
        public static class UserInteraction {
            private Boolean isLiked;
            private Boolean isBookmarked;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListResponse {
        private List<Response> posts;
        private long totalCount;
        private int currentPage;
        private int totalPages;
        private boolean hasNext;
        private String sortBy;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "제목은 필수입니다")
        @Size(max = 255, message = "제목은 255자를 초과할 수 없습니다")
        private String title;
        
        @NotBlank(message = "내용은 필수입니다")
        private String content;
        
        @NotNull(message = "게시판 타입은 필수입니다")
        private Post.BoardType boardType;
        
        private List<String> tags;
        
        private List<ImageUploadInfo> images;
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ImageUploadInfo {
            private String originalFilename;
            private String contentType;
            private Long fileSize;
            private Integer displayOrder;
            // 실제 파일 업로드는 별도 API를 통해 처리
            private String uploadedImageUrl;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @NotBlank(message = "제목은 필수입니다")
        @Size(max = 255, message = "제목은 255자를 초과할 수 없습니다")
        private String title;
        
        @NotBlank(message = "내용은 필수입니다")
        private String content;
        
        private List<String> tags;
        
        private List<ImageUploadInfo> images;
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ImageUploadInfo {
            private Long id; // 기존 이미지 ID (수정 시)
            private String originalFilename;
            private String contentType;
            private Long fileSize;
            private Integer displayOrder;
            private String uploadedImageUrl;
            private Boolean isDeleted; // 삭제할 이미지 표시
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryResponse {
        private Long id;
        private String title;
        private String contentPreview; // 내용 미리보기 (100자 제한)
        private String boardType;
        private List<String> tags;
        private Integer viewCount;
        private Integer likeCount;
        private Integer commentCount;
        private LocalDateTime createdAt;
        private AuthorInfo author;
        private String thumbnailImageUrl; // 첫 번째 이미지
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
        public static class UserInteraction {
            private Boolean isLiked;
            private Boolean isBookmarked;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchRequest {
        private String keyword;
        private Post.BoardType boardType;
        private List<String> tags;
        private String sortBy = "latest"; // latest, popular, oldest
        private int page = 0;
        private int size = 20;
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
    public static class BookmarkResponse {
        private Boolean isBookmarked;
        private Integer bookmarkCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BoardStatsResponse {
        private List<BoardStat> boardStats;
        private long totalPosts;
        private List<SummaryResponse> recentPosts;
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class BoardStat {
            private String boardType;
            private String boardName;
            private long postCount;
            private SummaryResponse latestPost;
        }
    }
} 