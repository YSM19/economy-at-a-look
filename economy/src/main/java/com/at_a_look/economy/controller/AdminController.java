package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.AdminDto;
import com.at_a_look.economy.dto.UserSuspensionDto;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.service.AdminService;
import com.at_a_look.economy.service.UserService;
import com.at_a_look.economy.util.JwtTokenUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "관리자 API", description = "커뮤니티 관리 기능")
public class AdminController {

    private final AdminService adminService;
    private final UserService userService;
    private final JwtTokenUtil jwtTokenUtil;

    /**
     * 관리자 권한 확인
     */
    private void checkAdminPermission(HttpServletRequest request) {
        String userEmail = getUserEmailFromToken(request);
        // TODO: 실제 관리자 권한 확인 로직 구현
        // 현재는 임시로 모든 요청 허용
        log.info("관리자 권한 확인 - 사용자: {}", userEmail);
    }

    /**
     * JWT 토큰에서 사용자 이메일 추출
     */
    private String getUserEmailFromToken(HttpServletRequest request) {
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
            return jwtTokenUtil.getEmailFromToken(token);
        }
        return null;
    }

    @GetMapping("/posts")
    @Operation(summary = "게시글 관리 목록 조회", description = "관리자가 게시글을 관리할 수 있는 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<AdminDto.PostListResponse>> getPostManagementList(
            @ModelAttribute AdminDto.SearchRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            AdminDto.PostListResponse response = adminService.getPostManagementList(request);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("게시글 관리 목록 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("게시글 목록을 불러올 수 없습니다."));
        }
    }

    @GetMapping("/comments")
    @Operation(summary = "댓글 관리 목록 조회", description = "관리자가 댓글을 관리할 수 있는 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<AdminDto.CommentListResponse>> getCommentManagementList(
            @ModelAttribute AdminDto.SearchRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            AdminDto.CommentListResponse response = adminService.getCommentManagementList(request);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("댓글 관리 목록 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("댓글 목록을 불러올 수 없습니다."));
        }
    }

    @GetMapping("/stats")
    @Operation(summary = "커뮤니티 통계 조회", description = "커뮤니티 전체 통계를 조회합니다.")
    public ResponseEntity<ApiResponse<AdminDto.CommunityStatsResponse>> getCommunityStats(
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            AdminDto.CommunityStatsResponse response = adminService.getCommunityStats();
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("커뮤니티 통계 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("통계를 불러올 수 없습니다."));
        }
    }

    @PostMapping("/posts/bulk-delete")
    @Operation(summary = "게시글 일괄 삭제", description = "선택된 게시글들을 일괄 삭제합니다.")
    public ResponseEntity<ApiResponse<String>> bulkDeletePosts(
            @RequestBody AdminDto.BulkActionRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            adminService.bulkDeletePosts(request);
            
            return ResponseEntity.ok(ApiResponse.success("게시글이 성공적으로 삭제되었습니다."));
        } catch (Exception e) {
            log.error("게시글 일괄 삭제 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("게시글 삭제에 실패했습니다."));
        }
    }

    @PostMapping("/posts/bulk-restore")
    @Operation(summary = "게시글 일괄 복구", description = "선택된 게시글들을 일괄 복구합니다.")
    public ResponseEntity<ApiResponse<String>> bulkRestorePosts(
            @RequestBody AdminDto.BulkActionRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            adminService.bulkRestorePosts(request);
            
            return ResponseEntity.ok(ApiResponse.success("게시글이 성공적으로 복구되었습니다."));
        } catch (Exception e) {
            log.error("게시글 일괄 복구 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("게시글 복구에 실패했습니다."));
        }
    }

    @PostMapping("/comments/bulk-delete")
    @Operation(summary = "댓글 일괄 삭제", description = "선택된 댓글들을 일괄 삭제합니다.")
    public ResponseEntity<ApiResponse<String>> bulkDeleteComments(
            @RequestBody AdminDto.BulkActionRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            adminService.bulkDeleteComments(request);
            
            return ResponseEntity.ok(ApiResponse.success("댓글이 성공적으로 삭제되었습니다."));
        } catch (Exception e) {
            log.error("댓글 일괄 삭제 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("댓글 삭제에 실패했습니다."));
        }
    }

    @PostMapping("/comments/bulk-restore")
    @Operation(summary = "댓글 일괄 복구", description = "선택된 댓글들을 일괄 복구합니다.")
    public ResponseEntity<ApiResponse<String>> bulkRestoreComments(
            @RequestBody AdminDto.BulkActionRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            adminService.bulkRestoreComments(request);
            
            return ResponseEntity.ok(ApiResponse.success("댓글이 성공적으로 복구되었습니다."));
        } catch (Exception e) {
            log.error("댓글 일괄 복구 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("댓글 복구에 실패했습니다."));
        }
    }

    @GetMapping("/reports")
    @Operation(summary = "신고 관리 목록 조회", description = "관리자가 신고를 관리할 수 있는 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<AdminDto.ReportListResponse>> getReportManagementList(
            @ModelAttribute AdminDto.ReportSearchRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            AdminDto.ReportListResponse response = adminService.getReportManagementList(request);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("신고 관리 목록 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("신고 목록을 불러올 수 없습니다."));
        }
    }

    @PostMapping("/reports/{reportId}/approve")
    @Operation(summary = "신고 승인", description = "신고를 승인하고 해당 게시글/댓글을 삭제합니다.")
    public ResponseEntity<ApiResponse<String>> approveReport(
            @PathVariable Long reportId,
            @RequestBody AdminDto.ReportActionRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            String result = adminService.approveReport(reportId, request);
            
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            log.error("신고 승인 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("신고 승인에 실패했습니다."));
        }
    }

    @PostMapping("/reports/{reportId}/reject")
    @Operation(summary = "신고 반려", description = "신고를 반려합니다.")
    public ResponseEntity<ApiResponse<String>> rejectReport(
            @PathVariable Long reportId,
            @RequestBody AdminDto.ReportActionRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            String result = adminService.rejectReport(reportId, request);
            
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            log.error("신고 반려 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("신고 반려에 실패했습니다."));
        }
    }

    // ========== 사용자 정지 관련 엔드포인트 ==========

    @GetMapping("/users")
    @Operation(summary = "사용자 목록 조회", description = "관리자가 사용자 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<Object>> getUserList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            var pageable = org.springframework.data.domain.PageRequest.of(page, size);
            var response = userService.getUserList(pageable, keyword);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("사용자 목록 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("사용자 목록을 불러올 수 없습니다."));
        }
    }

    @GetMapping("/users/suspended")
    @Operation(summary = "정지된 사용자 목록 조회", description = "정지된 사용자 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<Object>> getSuspendedUserList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            var pageable = org.springframework.data.domain.PageRequest.of(page, size);
            var response = userService.getSuspendedUserList(pageable);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("정지된 사용자 목록 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("정지된 사용자 목록을 불러올 수 없습니다."));
        }
    }

    @PostMapping("/users/suspend")
    @Operation(summary = "사용자 정지", description = "사용자를 지정된 기간 동안 정지시킵니다.")
    public ResponseEntity<ApiResponse<UserSuspensionDto.UserSuspensionResponse>> suspendUser(
            @RequestBody UserSuspensionDto.SuspendUserRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            String adminUsername = getUserEmailFromToken(httpRequest);
            
            UserSuspensionDto.UserSuspensionResponse response = userService.suspendUser(request, adminUsername);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("사용자 정지 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("사용자 정지에 실패했습니다: " + e.getMessage()));
        }
    }

    @PostMapping("/users/unsuspend")
    @Operation(summary = "사용자 정지 해제", description = "사용자의 정지를 해제합니다.")
    public ResponseEntity<ApiResponse<UserSuspensionDto.UserSuspensionResponse>> unsuspendUser(
            @RequestBody UserSuspensionDto.UnsuspendUserRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            UserSuspensionDto.UserSuspensionResponse response = userService.unsuspendUser(request.getUserId());
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("사용자 정지 해제 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("사용자 정지 해제에 실패했습니다: " + e.getMessage()));
        }
    }

    @GetMapping("/users/{userId}/suspension")
    @Operation(summary = "사용자 정지 상태 조회", description = "특정 사용자의 정지 상태를 조회합니다.")
    public ResponseEntity<ApiResponse<UserSuspensionDto.UserSuspensionResponse>> getUserSuspensionStatus(
            @PathVariable Long userId,
            HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            UserSuspensionDto.UserSuspensionResponse response = userService.getUserSuspensionStatus(userId);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("사용자 정지 상태 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("사용자 정지 상태를 조회할 수 없습니다: " + e.getMessage()));
        }
    }

    @PostMapping("/users/release-expired-suspensions")
    @Operation(summary = "만료된 정지 자동 해제", description = "만료된 정지를 자동으로 해제합니다.")
    public ResponseEntity<ApiResponse<String>> releaseExpiredSuspensions(HttpServletRequest httpRequest) {
        
        try {
            checkAdminPermission(httpRequest);
            
            userService.releaseExpiredSuspensions();
            
            return ResponseEntity.ok(ApiResponse.success("만료된 정지가 해제되었습니다."));
        } catch (Exception e) {
            log.error("만료된 정지 해제 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("만료된 정지 해제에 실패했습니다."));
        }
    }
} 