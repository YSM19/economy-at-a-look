package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.PostDto;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.entity.Post;
import com.at_a_look.economy.service.PostService;
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
import jakarta.validation.Valid;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Tag(name = "Post", description = "게시글 관리 API")
public class PostController {

    private final PostService postService;
    private final JwtTokenUtil jwtTokenUtil;

    @GetMapping
    @Operation(summary = "게시글 목록 조회", description = "게시판별 게시글 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<PostDto.ListResponse>> getPosts(
            @RequestParam(required = false) Post.BoardType boardType,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        
        try {
            PostDto.ListResponse response = postService.getPosts(boardType, sort, page, size);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("게시글 목록 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("게시글 목록 조회에 실패했습니다."));
        }
    }

    @GetMapping("/{postId}")
    @Operation(summary = "게시글 상세 조회", description = "특정 게시글의 상세 정보를 조회합니다.")
    public ResponseEntity<ApiResponse<PostDto.Response>> getPost(
            @PathVariable Long postId,
            HttpServletRequest request) {
        
        try {
            String userEmail = null;
            try {
                userEmail = getUserEmailFromToken(request);
            } catch (Exception e) {
                // 비로그인 사용자의 경우 null로 처리
            }
            
            PostDto.Response response = postService.getPost(postId, userEmail);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("게시글 상세 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("게시글 조회에 실패했습니다."));
        }
    }

    @PostMapping
    @Operation(summary = "게시글 작성", description = "새로운 게시글을 작성합니다.")
    public ResponseEntity<ApiResponse<PostDto.Response>> createPost(
            @Valid @RequestBody PostDto.CreateRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            log.info("게시글 작성 요청 받음: {}", request);
            String userEmail = getUserEmailFromToken(httpRequest);
            
            PostDto.Response response = postService.createPost(userEmail, request);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("게시글 작성 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("게시글 작성에 실패했습니다."));
        }
    }

    @PutMapping("/{postId}")
    @Operation(summary = "게시글 수정", description = "기존 게시글을 수정합니다.")
    public ResponseEntity<ApiResponse<PostDto.Response>> updatePost(
            @PathVariable Long postId,
            @Valid @RequestBody PostDto.UpdateRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            String userEmail = getUserEmailFromToken(httpRequest);
            
            PostDto.Response response = postService.updatePost(userEmail, postId, request);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("게시글 수정 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("게시글 수정에 실패했습니다."));
        }
    }

    @DeleteMapping("/{postId}")
    @Operation(summary = "게시글 삭제", description = "게시글을 삭제합니다.")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long postId,
            HttpServletRequest request) {
        
        try {
            String userEmail = getUserEmailFromToken(request);
            
            postService.deletePost(userEmail, postId);
            
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("게시글 삭제 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("게시글 삭제에 실패했습니다."));
        }
    }

    @PostMapping("/{postId}/like")
    @Operation(summary = "게시글 좋아요", description = "게시글에 좋아요를 추가하거나 제거합니다.")
    public ResponseEntity<ApiResponse<PostDto.LikeResponse>> toggleLike(
            @PathVariable Long postId,
            HttpServletRequest request) {
        
        try {
            String userEmail = getUserEmailFromToken(request);
            
            PostDto.LikeResponse response = postService.toggleLike(userEmail, postId);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("게시글 좋아요 처리 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("좋아요 처리에 실패했습니다."));
        }
    }

    @PostMapping("/{postId}/bookmark")
    @Operation(summary = "게시글 북마크", description = "게시글을 북마크에 추가하거나 제거합니다.")
    public ResponseEntity<ApiResponse<PostDto.BookmarkResponse>> toggleBookmark(
            @PathVariable Long postId,
            HttpServletRequest request) {
        
        try {
            String userEmail = getUserEmailFromToken(request);
            
            PostDto.BookmarkResponse response = postService.toggleBookmark(userEmail, postId);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("게시글 북마크 처리 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("북마크 처리에 실패했습니다."));
        }
    }

    @GetMapping("/trending")
    @Operation(summary = "인기 게시글 조회", description = "최근 인기 게시글을 조회합니다.")
    public ResponseEntity<ApiResponse<List<PostDto.SummaryResponse>>> getTrendingPosts(
            @RequestParam(defaultValue = "10") int size) {
        
        try {
            List<PostDto.SummaryResponse> response = postService.getTrendingPosts(size);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("인기 게시글 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("인기 게시글 조회에 실패했습니다."));
        }
    }

    @GetMapping("/my")
    @Operation(summary = "내 게시글 조회", description = "사용자가 작성한 게시글 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<PostDto.ListResponse>> getMyPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest request) {
        
        try {
            String userEmail = getUserEmailFromToken(request);
            
            PostDto.ListResponse response = postService.getMyPosts(userEmail, page, size);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("내 게시글 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("내 게시글 조회에 실패했습니다."));
        }
    }

    @GetMapping("/bookmarks")
    @Operation(summary = "북마크 목록 조회", description = "사용자가 북마크한 게시글 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<PostDto.ListResponse>> getBookmarks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest request) {
        
        try {
            String userEmail = getUserEmailFromToken(request);
            
            PostDto.ListResponse response = postService.getBookmarks(userEmail, page, size);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("북마크 목록 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("북마크 목록 조회에 실패했습니다."));
        }
    }

    @GetMapping("/board-stats")
    @Operation(summary = "게시판 통계 조회", description = "각 게시판별 게시글 수와 최근 게시글 정보를 조회합니다.")
    public ResponseEntity<ApiResponse<PostDto.BoardStatsResponse>> getBoardStats() {
        
        try {
            PostDto.BoardStatsResponse response = postService.getBoardStats();
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("게시판 통계 조회 실패", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("게시판 통계 조회에 실패했습니다."));
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