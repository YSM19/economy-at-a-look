package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.Report;
import com.at_a_look.economy.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    // 모든 신고 목록 (상태별 필터링, 페이징)
    Page<Report> findByStatusOrderByCreatedAtDesc(Report.ReportStatus status, Pageable pageable);

    // 모든 신고 목록 (페이징)
    Page<Report> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // 대기 중인 신고 목록
    Page<Report> findByStatusOrderByCreatedAtAsc(Report.ReportStatus status, Pageable pageable);

    // 특정 사용자가 신고한 목록
    Page<Report> findByReporterOrderByCreatedAtDesc(User reporter, Pageable pageable);

    // 특정 타겟에 대한 신고 목록
    List<Report> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(Report.TargetType targetType, Long targetId);

    // 특정 사용자가 특정 타겟을 이미 신고했는지 확인
    boolean existsByReporterAndTargetTypeAndTargetId(User reporter, Report.TargetType targetType, Long targetId);

    // 상태별 신고 수
    long countByStatus(Report.ReportStatus status);

    // 특정 기간 내 신고 수
    @Query("SELECT COUNT(r) FROM Report r WHERE r.createdAt BETWEEN :startDate AND :endDate")
    long countByCreatedAtBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // 특정 신고 이유별 통계
    long countByReason(Report.ReportReason reason);

    // 특정 타겟 타입별 신고 수
    long countByTargetType(Report.TargetType targetType);

    // 가장 많이 신고된 컨텐츠 (게시글/댓글)
    @Query("SELECT r.targetType, r.targetId, COUNT(r) as reportCount FROM Report r WHERE r.targetType = :targetType GROUP BY r.targetType, r.targetId ORDER BY reportCount DESC")
    List<Object[]> findMostReportedTargets(@Param("targetType") Report.TargetType targetType, Pageable pageable);

    // 특정 기간 내 처리된 신고 목록
    @Query("SELECT r FROM Report r WHERE r.status != 'PENDING' AND r.reviewedAt BETWEEN :startDate AND :endDate ORDER BY r.reviewedAt DESC")
    Page<Report> findProcessedReportsBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, Pageable pageable);

    // 특정 관리자가 처리한 신고 목록
    Page<Report> findByReviewerOrderByReviewedAtDesc(User reviewer, Pageable pageable);

    // 처리되지 않은 오래된 신고 찾기
    @Query("SELECT r FROM Report r WHERE r.status = 'PENDING' AND r.createdAt < :cutoffDate ORDER BY r.createdAt ASC")
    List<Report> findOldPendingReports(@Param("cutoffDate") LocalDateTime cutoffDate);
} 