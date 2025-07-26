package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.CommentDto;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.service.CommentService;
import com.at_a_look.economy.util.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@Slf4j
@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final JwtTokenUtil jwtTokenUtil;

    /**
     * 특정 게시글의 댓글 목록 조회
     */
    @GetMapping("/post/{postId}")
    public ResponseEntity<ApiResponse<CommentDto.ListResponse>> getCommentsByPost(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest request
    ) {
        try {
            log.info("댓글 목록 조회 요청 - postId: {}, page: {}, size: {}", postId, page, size);
            String userEmail = null;
            try {
                userEmail = getUserEmailFromToken(request);
            } catch (Exception e) {
                // 비로그인 사용자의 경우 null로 처리
                log.info("비로그인 사용자 댓글 조회");
            }
            CommentDto.ListResponse response = commentService.getCommentsByPost(postId, page, size, userEmail);
            log.info("댓글 목록 조회 성공 - 댓글 수: {}", response.getComments().size());
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("댓글 목록 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("댓글 목록 조회에 실패했습니다."));
        }
    }

    /**
     * 새 댓글 작성
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CommentDto.Response>> createComment(
            @Valid @RequestBody CommentDto.CreateRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            log.info("댓글 작성 요청 받음: {}", request);
            
            String userEmail = getUserEmailFromToken(httpRequest);
            log.info("댓글 작성자 이메일: {}", userEmail);
            
            CommentDto.Response response = commentService.createComment(userEmail, request);
            log.info("댓글 작성 성공: {}", response);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (IllegalArgumentException e) {
            log.error("댓글 작성 - 잘못된 요청: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("잘못된 요청입니다."));
        } catch (Exception e) {
            log.error("댓글 작성 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("댓글 작성에 실패했습니다."));
        }
    }

    /**
     * 댓글 수정
     */
    @PutMapping("/{commentId}")
    public ResponseEntity<ApiResponse<CommentDto.Response>> updateComment(
            @PathVariable Long commentId,
            @Valid @RequestBody CommentDto.UpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            String email = getUserEmailFromToken(httpRequest);
            CommentDto.Response response = commentService.updateComment(commentId, request, email);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("잘못된 요청입니다."));
        } catch (SecurityException e) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("수정 권한이 없습니다."));
        } catch (Exception e) {
            log.error("댓글 수정 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("댓글 수정에 실패했습니다."));
        }
    }

    /**
     * 댓글 삭제
     */
    @DeleteMapping("/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long commentId,
            HttpServletRequest httpRequest
    ) {
        try {
            String email = getUserEmailFromToken(httpRequest);
            commentService.deleteComment(commentId, email);
            
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("잘못된 요청입니다."));
        } catch (SecurityException e) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("삭제 권한이 없습니다."));
        } catch (Exception e) {
            log.error("댓글 삭제 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("댓글 삭제에 실패했습니다."));
        }
    }

    /**
     * 댓글 좋아요/좋아요 취소
     */
    @PostMapping("/{commentId}/like")
    public ResponseEntity<ApiResponse<CommentDto.LikeResponse>> toggleLike(
            @PathVariable Long commentId,
            HttpServletRequest httpRequest
    ) {
        try {
            String email = getUserEmailFromToken(httpRequest);
            CommentDto.LikeResponse response = commentService.toggleLike(commentId, email);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("존재하지 않는 댓글입니다."));
        } catch (Exception e) {
            log.error("댓글 좋아요 처리 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("좋아요 처리에 실패했습니다."));
        }
    }

    /**
     * 내가 작성한 댓글 목록
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<CommentDto.ListResponse>> getMyComments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest
    ) {
        try {
            String email = getUserEmailFromToken(httpRequest);
            CommentDto.ListResponse response = commentService.getMyComments(email, page, size);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("내 댓글 목록 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("내 댓글 목록 조회에 실패했습니다."));
        }
    }

    /**
     * 특정 댓글의 답글 목록 조회
     */
    @GetMapping("/{commentId}/replies")
    public ResponseEntity<ApiResponse<CommentDto.ListResponse>> getReplies(
            @PathVariable Long commentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest request
    ) {
        try {
            String userEmail = null;
            try {
                userEmail = getUserEmailFromToken(request);
            } catch (Exception e) {
                // 비로그인 사용자의 경우 null로 처리
                log.info("비로그인 사용자 답글 조회");
            }
            CommentDto.ListResponse response = commentService.getReplies(commentId, page, size, userEmail);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("답글 목록 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("답글 목록 조회에 실패했습니다."));
        }
    }

    private String getUserEmailFromToken(HttpServletRequest request) {
        String token = jwtTokenUtil.extractTokenFromRequest(request);
        return jwtTokenUtil.getEmailFromToken(token);
    }
} 