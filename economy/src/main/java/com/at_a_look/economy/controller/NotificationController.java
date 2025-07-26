package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.NotificationDto;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.service.NotificationService;
import com.at_a_look.economy.util.JwtTokenUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification", description = "알림 관리 API")
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtTokenUtil jwtTokenUtil;

    @GetMapping
    @Operation(summary = "알림 목록 조회", description = "사용자의 알림 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<NotificationDto.ListResponse>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest request) {
        
        try {
            String userEmail = getUserEmailFromToken(request);
            
            NotificationDto.ListResponse response = notificationService.getNotifications(userEmail, page, size);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("알림 목록 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("알림 목록 조회에 실패했습니다."));
        }
    }

    @GetMapping("/unread-count")
    @Operation(summary = "읽지 않은 알림 개수 조회", description = "사용자의 읽지 않은 알림 개수를 조회합니다.")
    public ResponseEntity<ApiResponse<NotificationDto.UnreadCountResponse>> getUnreadCount(
            HttpServletRequest request) {
        
        try {
            String userEmail = getUserEmailFromToken(request);
            
            NotificationDto.UnreadCountResponse response = notificationService.getUnreadCount(userEmail);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("읽지 않은 알림 개수 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("읽지 않은 알림 개수 조회에 실패했습니다."));
        }
    }

    @PutMapping("/{notificationId}/read")
    @Operation(summary = "알림 읽음 처리", description = "특정 알림을 읽음 처리합니다.")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long notificationId,
            HttpServletRequest request) {
        
        try {
            String userEmail = getUserEmailFromToken(request);
            
            notificationService.markAsRead(userEmail, notificationId);
            
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("알림 읽음 처리 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("알림 읽음 처리에 실패했습니다."));
        }
    }

    @PutMapping("/read-all")
    @Operation(summary = "모든 알림 읽음 처리", description = "사용자의 모든 알림을 읽음 처리합니다.")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            HttpServletRequest request) {
        
        try {
            String userEmail = getUserEmailFromToken(request);
            
            notificationService.markAllAsRead(userEmail);
            
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("모든 알림 읽음 처리 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("모든 알림 읽음 처리에 실패했습니다."));
        }
    }

    @DeleteMapping("/{notificationId}")
    @Operation(summary = "알림 삭제", description = "특정 알림을 삭제합니다.")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @PathVariable Long notificationId,
            HttpServletRequest request) {
        
        try {
            String userEmail = getUserEmailFromToken(request);
            
            notificationService.deleteNotification(userEmail, notificationId);
            
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("알림 삭제 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("알림 삭제에 실패했습니다."));
        }
    }

    @PostMapping("/create-like")
    @Operation(summary = "좋아요 알림 생성", description = "좋아요 알림을 생성합니다.")
    public ResponseEntity<ApiResponse<Void>> createLikeNotification(
            @RequestBody NotificationDto.CreateRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            String fromUserEmail = getUserEmailFromToken(httpRequest);
            
            // TODO: 실제로는 fromUser의 username을 가져와야 함
            notificationService.createLikeNotification(
                request.getToUserId(), 
                request.getPostId(), 
                fromUserEmail // username 대신 email 사용
            );
            
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("좋아요 알림 생성 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("좋아요 알림 생성에 실패했습니다."));
        }
    }

    @PostMapping("/create-comment")
    @Operation(summary = "댓글 알림 생성", description = "댓글 알림을 생성합니다.")
    public ResponseEntity<ApiResponse<Void>> createCommentNotification(
            @RequestBody NotificationDto.CreateRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            String fromUserEmail = getUserEmailFromToken(httpRequest);
            
            // TODO: 실제로는 fromUser의 username을 가져와야 함
            notificationService.createCommentNotification(
                request.getToUserId(), 
                request.getPostId(), 
                request.getCommentId(),
                fromUserEmail // username 대신 email 사용
            );
            
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("댓글 알림 생성 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("댓글 알림 생성에 실패했습니다."));
        }
    }

    private Long getUserIdFromToken(HttpServletRequest request) {
        String token = jwtTokenUtil.extractTokenFromRequest(request);
        return jwtTokenUtil.getUserIdFromToken(token);
    }
    
    private String getUserEmailFromToken(HttpServletRequest request) {
        String token = jwtTokenUtil.extractTokenFromRequest(request);
        return jwtTokenUtil.getEmailFromToken(token);
    }
} 