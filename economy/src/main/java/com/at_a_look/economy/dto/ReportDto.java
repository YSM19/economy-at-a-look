package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.Report;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class ReportDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String targetType;
        private Long targetId;
        private String reason;
        private String reasonText;
        private String details;
        private String status;
        private String reviewNote;
        private LocalDateTime createdAt;
        private LocalDateTime reviewedAt;
        
        // 신고자 정보
        private ReporterInfo reporter;
        
        // 검토자 정보
        private ReviewerInfo reviewer;
        
        // 신고 대상 정보
        private TargetInfo targetInfo;
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ReporterInfo {
            private String username;
        }
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ReviewerInfo {
            private String username;
        }
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class TargetInfo {
            private String title;
            private String content;
            private String authorUsername;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListResponse {
        private List<Response> reports;
        private long totalCount;
        private int currentPage;
        private int totalPages;
        private boolean hasNext;
        private String filterStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotNull(message = "신고 대상 타입은 필수입니다")
        private Report.TargetType targetType;
        
        @NotNull(message = "신고 대상 ID는 필수입니다")
        private Long targetId;
        
        @NotNull(message = "신고 이유는 필수입니다")
        private Report.ReportReason reason;
        
        @NotBlank(message = "신고 이유 설명은 필수입니다")
        private String reasonText;
        
        private String details; // 추가 상세 내용
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewRequest {
        @NotNull(message = "처리 상태는 필수입니다")
        private Report.ReportStatus status;
        
        private String reviewNote; // 검토 의견
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatisticsResponse {
        private long totalReports;
        private long pendingReports;
        private long approvedReports;
        private long rejectedReports;
        private long recentReports;
        private Map<String, Long> reasonStats;
        private List<TypeStats> typeStats;
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ReasonStats {
            private String reason;
            private String reasonText;
            private long count;
        }
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class TypeStats {
            private String targetType;
            private long count;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryResponse {
        private Long id;
        private String targetType;
        private String reason;
        private String reasonText;
        private String status;
        private String reporterUsername;
        private LocalDateTime createdAt;
        private String targetTitle;
    }
} 