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
@Table(name = "reports")
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private TargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportReason reason;

    @Column(name = "reason_text", nullable = false)
    private String reasonText;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    // 승인 시 원본 데이터 저장용 필드
    @Column(name = "original_title", columnDefinition = "TEXT")
    private String originalTitle;

    @Column(name = "original_content", columnDefinition = "TEXT")
    private String originalContent;

    @Column(name = "original_author")
    private String originalAuthor;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    public enum TargetType {
        POST("게시글"),
        COMMENT("댓글");

        private final String description;

        TargetType(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    public enum ReportReason {
        SPAM("스팸 또는 광고"),
        HARASSMENT("괴롭힘 또는 혐오"),
        INAPPROPRIATE("부적절한 콘텐츠"),
        MISINFORMATION("잘못된 정보"),
        COPYRIGHT("저작권 침해"),
        PERSONAL_INFO("개인정보 노출"),
        OTHER("기타");

        private final String description;

        ReportReason(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    public enum ReportStatus {
        PENDING("대기중"),
        APPROVED("승인됨"),
        REJECTED("반려됨");

        private final String description;

        ReportStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    // 신고 승인 처리
    public void approve(User reviewer, String reviewNote, String originalTitle, String originalContent, String originalAuthor) {
        this.status = ReportStatus.APPROVED;
        this.reviewer = reviewer;
        this.reviewNote = reviewNote;
        this.reviewedAt = LocalDateTime.now();
        this.originalTitle = originalTitle;
        this.originalContent = originalContent;
        this.originalAuthor = originalAuthor;
    }

    // 신고 반려 처리
    public void reject(User reviewer, String reviewNote) {
        this.status = ReportStatus.REJECTED;
        this.reviewer = reviewer;
        this.reviewNote = reviewNote;
        this.reviewedAt = LocalDateTime.now();
    }

    // 검토 중인지 확인
    public boolean isPending() {
        return this.status == ReportStatus.PENDING;
    }
} 