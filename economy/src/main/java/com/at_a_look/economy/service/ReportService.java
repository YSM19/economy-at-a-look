package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.ReportDto;
import com.at_a_look.economy.entity.Report;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.entity.Post;
import com.at_a_look.economy.entity.Comment;
import com.at_a_look.economy.repository.ReportRepository;
import com.at_a_look.economy.repository.UserRepository;
import com.at_a_look.economy.repository.PostRepository;
import com.at_a_look.economy.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    @Transactional
    public ReportDto.Response createReport(String userEmail, ReportDto.CreateRequest request) {
        User reporter = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 중복 신고 방지
        if (reportRepository.existsByReporterAndTargetTypeAndTargetId(reporter, request.getTargetType(), request.getTargetId())) {
            throw new RuntimeException("이미 신고한 내용입니다.");
        }

        Report report = Report.builder()
                .reporter(reporter)
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .reason(request.getReason())
                .reasonText(request.getReasonText())
                .details(request.getDetails())
                .build();

        Report savedReport = reportRepository.save(report);
        return convertToDto(savedReport);
    }

    public ReportDto.ListResponse getReports(String status, int page, int size) {
        Page<Report> reportPage;
        
        if ("all".equals(status)) {
            reportPage = reportRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        } else {
            Report.ReportStatus reportStatus = Report.ReportStatus.valueOf(status.toUpperCase());
            reportPage = reportRepository.findByStatusOrderByCreatedAtDesc(reportStatus, PageRequest.of(page, size));
        }

        List<ReportDto.Response> reports = reportPage.getContent().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        return ReportDto.ListResponse.builder()
                .reports(reports)
                .totalCount(reportPage.getTotalElements())
                .currentPage(page)
                .totalPages(reportPage.getTotalPages())
                .hasNext(reportPage.hasNext())
                .filterStatus(status)
                .build();
    }

    @Transactional
    public ReportDto.Response reviewReport(String adminEmail, Long reportId, ReportDto.ReviewRequest request) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new RuntimeException("관리자를 찾을 수 없습니다."));

        if (!admin.getRole().equals(User.Role.ADMIN)) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("신고를 찾을 수 없습니다."));

        if (request.getStatus() == Report.ReportStatus.APPROVED) {
            // 승인 시 원본 데이터 저장
            String originalTitle = null;
            String originalContent = null;
            String originalAuthor = null;
            if (report.getTargetType() == Report.TargetType.POST) {
                Post post = postRepository.findById(report.getTargetId()).orElse(null);
                if (post != null) {
                    originalTitle = post.getTitle();
                    originalContent = post.getContent();
                    originalAuthor = post.getUser() != null ? post.getUser().getUsername() : null;
                }
            } else if (report.getTargetType() == Report.TargetType.COMMENT) {
                Comment comment = commentRepository.findById(report.getTargetId()).orElse(null);
                if (comment != null) {
                    originalTitle = comment.getContent();
                    originalContent = comment.getContent();
                    originalAuthor = comment.getUser() != null ? comment.getUser().getUsername() : null;
                }
            }
            report.approve(admin, request.getReviewNote(), originalTitle, originalContent, originalAuthor);
        } else {
            report.reject(admin, request.getReviewNote());
        }

        Report savedReport = reportRepository.save(report);
        return convertToDto(savedReport);
    }

    private ReportDto.Response convertToDto(Report report) {
        ReportDto.Response.ReporterInfo reporterInfo = ReportDto.Response.ReporterInfo.builder()
                .username(report.getReporter().getUsername())
                .build();

        ReportDto.Response.ReviewerInfo reviewerInfo = null;
        if (report.getReviewer() != null) {
            reviewerInfo = ReportDto.Response.ReviewerInfo.builder()
                    .username(report.getReviewer().getUsername())
                    .build();
        }

        ReportDto.Response.TargetInfo targetInfo = null;
        if (report.getTargetType() == Report.TargetType.POST) {
            com.at_a_look.economy.entity.Post post = postRepository.findById(report.getTargetId()).orElse(null);
            if (post != null) {
                targetInfo = ReportDto.Response.TargetInfo.builder()
                        .title(post.getTitle())
                        .content(post.getContent())
                        .authorUsername(post.getUser() != null ? post.getUser().getUsername() : "알 수 없음")
                        .build();
            }
        } else if (report.getTargetType() == Report.TargetType.COMMENT) {
            com.at_a_look.economy.entity.Comment comment = commentRepository.findById(report.getTargetId()).orElse(null);
            if (comment != null) {
                targetInfo = ReportDto.Response.TargetInfo.builder()
                        .title("댓글")
                        .content(comment.getContent())
                        .authorUsername(comment.getUser() != null ? comment.getUser().getUsername() : "알 수 없음")
                        .build();
            }
        }

        return ReportDto.Response.builder()
                .id(report.getId())
                .targetType(report.getTargetType().name())
                .targetId(report.getTargetId())
                .reason(report.getReason().name())
                .reasonText(report.getReasonText())
                .details(report.getDetails())
                .status(report.getStatus().name())
                .reviewNote(report.getReviewNote())
                .createdAt(report.getCreatedAt())
                .reviewedAt(report.getReviewedAt())
                .reporter(reporterInfo)
                .reviewer(reviewerInfo)
                .targetInfo(targetInfo)
                .build();
    }

    /**
     * 특정 신고 조회
     */
    public ReportDto.Response getReport(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("신고를 찾을 수 없습니다."));
        return convertToDto(report);
    }

    public ReportDto.ListResponse getMyReports(String userEmail, int page, int size) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Page<Report> reportPage = reportRepository.findByReporterOrderByCreatedAtDesc(user, PageRequest.of(page, size));

        List<ReportDto.Response> reports = reportPage.getContent().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        return ReportDto.ListResponse.builder()
                .reports(reports)
                .totalCount(reportPage.getTotalElements())
                .currentPage(page)
                .totalPages(reportPage.getTotalPages())
                .hasNext(reportPage.hasNext())
                .filterStatus("my")
                .build();
    }

    public ReportDto.StatisticsResponse getReportStatistics() {
        long totalReports = reportRepository.count();
        long pendingReports = reportRepository.countByStatus(Report.ReportStatus.PENDING);
        long approvedReports = reportRepository.countByStatus(Report.ReportStatus.APPROVED);
        long rejectedReports = reportRepository.countByStatus(Report.ReportStatus.REJECTED);

        // 최근 7일간의 신고 수
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        long recentReports = reportRepository.countByCreatedAtBetween(weekAgo, LocalDateTime.now());

        // 신고 이유별 통계
        Map<String, Long> reasonStats = new HashMap<>();
        for (Report.ReportReason reason : Report.ReportReason.values()) {
            long count = reportRepository.countByReason(reason);
            reasonStats.put(reason.name().toLowerCase(), count);
        }

        // 신고 타입별 통계
        List<ReportDto.StatisticsResponse.TypeStats> typeStats = new ArrayList<>();
        for (Report.TargetType targetType : Report.TargetType.values()) {
            long count = reportRepository.countByTargetType(targetType);
            typeStats.add(ReportDto.StatisticsResponse.TypeStats.builder()
                    .targetType(targetType.name().toLowerCase())
                    .count(count)
                    .build());
        }

        return ReportDto.StatisticsResponse.builder()
                .totalReports(totalReports)
                .pendingReports(pendingReports)
                .approvedReports(approvedReports)
                .rejectedReports(rejectedReports)
                .recentReports(recentReports)
                .reasonStats(reasonStats)
                .typeStats(typeStats)
                .build();
    }



    @Transactional
    public void cancelReport(Long reportId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("신고를 찾을 수 없습니다."));

        // 신고자 본인만 취소 가능
        if (!report.getReporter().equals(user)) {
            throw new SecurityException("신고 취소 권한이 없습니다.");
        }

        // 이미 검토된 신고는 취소 불가
        if (report.getStatus() != Report.ReportStatus.PENDING) {
            throw new IllegalStateException("이미 검토된 신고는 취소할 수 없습니다.");
        }

        reportRepository.delete(report);
    }

    public ReportDto.ListResponse getAdminReports(String adminEmail, String status, int page, int size, String sortBy, String sortOrder) {
        // 관리자 권한 확인
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new RuntimeException("관리자를 찾을 수 없습니다."));

        if (!admin.getRole().equals(User.Role.ADMIN)) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }

        Page<Report> reportPage;
        PageRequest pageRequest = PageRequest.of(page, size);
        
        if (status != null && !"all".equals(status)) {
            Report.ReportStatus reportStatus = Report.ReportStatus.valueOf(status.toUpperCase());
            reportPage = reportRepository.findByStatusOrderByCreatedAtDesc(reportStatus, pageRequest);
        } else {
            reportPage = reportRepository.findAllByOrderByCreatedAtDesc(pageRequest);
        }

        List<ReportDto.Response> reports = reportPage.getContent().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        return ReportDto.ListResponse.builder()
                .reports(reports)
                .totalCount(reportPage.getTotalElements())
                .currentPage(page)
                .totalPages(reportPage.getTotalPages())
                .hasNext(reportPage.hasNext())
                .filterStatus(status)
                .build();
    }
} 