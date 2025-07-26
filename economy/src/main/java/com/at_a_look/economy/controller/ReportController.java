package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.ReportDto;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.service.ReportService;
import com.at_a_look.economy.util.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDateTime;

@Slf4j
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final JwtTokenUtil jwtTokenUtil;

    /**
     * 신고 제출
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ReportDto.Response>> createReport(
            @Valid @RequestBody ReportDto.CreateRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            String email = getUserEmailFromToken(httpRequest);
            ReportDto.Response response = reportService.createReport(email, request);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("잘못된 요청입니다."));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("이미 신고한 콘텐츠입니다."));
        } catch (Exception e) {
            log.error("신고 제출 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("신고 제출에 실패했습니다."));
        }
    }



    /**
     * 관리자용 신고 목록 조회
     */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ReportDto.ListResponse>> getAdminReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder,
            HttpServletRequest httpRequest
    ) {
        try {
            String email = getUserEmailFromToken(httpRequest);
            ReportDto.ListResponse response = reportService.getAdminReports(email, status, page, size, sortBy, sortOrder);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("관리자 신고 목록 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("관리자 신고 목록 조회에 실패했습니다."));
        }
    }

    /**
     * 신고 목록 조회 (관리자용)
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ReportDto.ListResponse>> getReports(
            @RequestParam(defaultValue = "all") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        try {
            ReportDto.ListResponse response = reportService.getReports(status, page, size);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("신고 목록 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("신고 목록 조회에 실패했습니다."));
        }
    }

    /**
     * 신고 검토 (관리자용)
     */
    @PutMapping("/{reportId}/review")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ReportDto.Response>> reviewReport(
            @PathVariable Long reportId,
            @Valid @RequestBody ReportDto.ReviewRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            String reviewerEmail = getUserEmailFromToken(httpRequest);
            ReportDto.Response response = reportService.reviewReport(reviewerEmail, reportId, request);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("잘못된 요청입니다."));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("이미 검토된 신고입니다."));
        } catch (Exception e) {
            log.error("신고 검토 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("신고 검토에 실패했습니다."));
        }
    }

    /**
     * 신고 통계 조회 (관리자용)
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ReportDto.StatisticsResponse>> getReportStatistics() {
        try {
            ReportDto.StatisticsResponse response = reportService.getReportStatistics();
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("신고 통계 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("신고 통계 조회에 실패했습니다."));
        }
    }

    /**
     * 내가 제출한 신고 목록
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<ReportDto.ListResponse>> getMyReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest
    ) {
        try {
            String email = getUserEmailFromToken(httpRequest);
            ReportDto.ListResponse response = reportService.getMyReports(email, page, size);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("내 신고 목록 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("내 신고 목록 조회에 실패했습니다."));
        }
    }

    /**
     * 신고 취소 (신고자 본인만 가능, 검토 전에만)
     */
    @DeleteMapping("/{reportId}")
    public ResponseEntity<ApiResponse<Void>> cancelReport(
            @PathVariable Long reportId,
            HttpServletRequest httpRequest
    ) {
        try {
            String email = getUserEmailFromToken(httpRequest);
            reportService.cancelReport(reportId, email);
            
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("잘못된 요청입니다."));
        } catch (SecurityException e) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("신고 취소 권한이 없습니다."));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("이미 검토된 신고는 취소할 수 없습니다."));
        } catch (Exception e) {
            log.error("신고 취소 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("신고 취소에 실패했습니다."));
        }
    }

    private String getUserEmailFromToken(HttpServletRequest request) {
        String token = jwtTokenUtil.extractTokenFromRequest(request);
        return jwtTokenUtil.getEmailFromToken(token);
    }
} 