package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.HelpArticleCreateRequest;
import com.at_a_look.economy.dto.HelpArticleDto;
import com.at_a_look.economy.dto.HelpArticleUpdateRequest;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.entity.HelpArticle;
import com.at_a_look.economy.service.HelpArticleService;
import com.at_a_look.economy.util.JwtTokenUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

@RestController
@RequestMapping("/api/help")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "도움말", description = "도움말 관련 API")
public class HelpController {

    private final HelpArticleService helpArticleService;
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

    @GetMapping
    @Operation(summary = "도움말 목록 조회", description = "도움말 게시글 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<Page<HelpArticleDto>>> getHelpArticles(
            @Parameter(description = "페이지 번호 (0부터 시작)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "10") int size) {
        try {
            Page<HelpArticleDto> articles = helpArticleService.getHelpArticles(page, size);
            
            return ResponseEntity.ok(ApiResponse.<Page<HelpArticleDto>>builder()
                    .success(true)
                    .message("도움말 목록을 성공적으로 조회했습니다.")
                    .data(articles)
                    .build());
        } catch (Exception e) {
            log.error("도움말 목록 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<Page<HelpArticleDto>>builder()
                    .success(false)
                    .message("도움말 목록 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/categories")
    @Operation(summary = "도움말 카테고리 목록", description = "도움말 카테고리 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<List<HelpArticleDto>>> getCategories() {
        try {
            List<HelpArticleDto> categories = helpArticleService.getAllCategories();
            
            return ResponseEntity.ok(ApiResponse.<List<HelpArticleDto>>builder()
                    .success(true)
                    .message("카테고리 목록을 성공적으로 조회했습니다.")
                    .data(categories)
                    .build());
        } catch (Exception e) {
            log.error("카테고리 목록 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<List<HelpArticleDto>>builder()
                    .success(false)
                    .message("카테고리 목록 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/category/{category}")
    @Operation(summary = "카테고리별 도움말 조회", description = "특정 카테고리의 도움말 게시글을 조회합니다.")
    public ResponseEntity<ApiResponse<List<HelpArticleDto>>> getHelpArticlesByCategory(
            @Parameter(description = "카테고리") @PathVariable String category) {
        try {
            HelpArticle.Category categoryEnum = HelpArticle.Category.valueOf(category.toUpperCase());
            List<HelpArticleDto> articles = helpArticleService.getHelpArticlesByCategory(categoryEnum);
            
            return ResponseEntity.ok(ApiResponse.<List<HelpArticleDto>>builder()
                    .success(true)
                    .message("카테고리별 도움말을 성공적으로 조회했습니다.")
                    .data(articles)
                    .build());
        } catch (Exception e) {
            log.error("카테고리별 도움말 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<List<HelpArticleDto>>builder()
                    .success(false)
                    .message("카테고리별 도움말 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "도움말 상세 조회", description = "특정 도움말 게시글의 상세 내용을 조회합니다.")
    public ResponseEntity<ApiResponse<HelpArticleDto>> getHelpArticle(
            @Parameter(description = "도움말 게시글 ID") @PathVariable Long id) {
        try {
            HelpArticleDto article = helpArticleService.getHelpArticle(id);
            
            return ResponseEntity.ok(ApiResponse.<HelpArticleDto>builder()
                    .success(true)
                    .message("도움말을 성공적으로 조회했습니다.")
                    .data(article)
                    .build());
        } catch (Exception e) {
            log.error("도움말 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<HelpArticleDto>builder()
                    .success(false)
                    .message("도움말 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/search")
    @Operation(summary = "도움말 검색", description = "키워드로 도움말을 검색합니다.")
    public ResponseEntity<ApiResponse<Page<HelpArticleDto>>> searchHelpArticles(
            @Parameter(description = "검색 키워드") @RequestParam String keyword,
            @Parameter(description = "페이지 번호 (0부터 시작)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "10") int size) {
        try {
            Page<HelpArticleDto> articles = helpArticleService.searchHelpArticles(keyword, page, size);
            
            return ResponseEntity.ok(ApiResponse.<Page<HelpArticleDto>>builder()
                    .success(true)
                    .message("도움말 검색을 성공적으로 완료했습니다.")
                    .data(articles)
                    .build());
        } catch (Exception e) {
            log.error("도움말 검색 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<Page<HelpArticleDto>>builder()
                    .success(false)
                    .message("도움말 검색에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/search/category/{category}")
    @Operation(summary = "카테고리별 도움말 검색", description = "특정 카테고리에서 키워드로 도움말을 검색합니다.")
    public ResponseEntity<ApiResponse<Page<HelpArticleDto>>> searchHelpArticlesByCategory(
            @Parameter(description = "카테고리") @PathVariable String category,
            @Parameter(description = "검색 키워드") @RequestParam String keyword,
            @Parameter(description = "페이지 번호 (0부터 시작)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "10") int size) {
        try {
            HelpArticle.Category categoryEnum = HelpArticle.Category.valueOf(category.toUpperCase());
            Page<HelpArticleDto> articles = helpArticleService.searchHelpArticlesByCategory(categoryEnum, keyword, page, size);
            
            return ResponseEntity.ok(ApiResponse.<Page<HelpArticleDto>>builder()
                    .success(true)
                    .message("카테고리별 도움말 검색을 성공적으로 완료했습니다.")
                    .data(articles)
                    .build());
        } catch (Exception e) {
            log.error("카테고리별 도움말 검색 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<Page<HelpArticleDto>>builder()
                    .success(false)
                    .message("카테고리별 도움말 검색에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    // ========== 관리자용 도움말 관리 API ==========

    @GetMapping("/admin")
    @Operation(summary = "관리자용 도움말 목록 조회", description = "관리자가 도움말을 관리할 수 있는 목록을 조회합니다.")
    public ResponseEntity<ApiResponse<Page<HelpArticleDto>>> getAdminHelpArticles(
            @Parameter(description = "페이지 번호 (0부터 시작)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "검색 키워드") @RequestParam(required = false) String keyword,
            @Parameter(description = "카테고리") @RequestParam(required = false) String category,
            HttpServletRequest httpRequest) {
        try {
            checkAdminPermission(httpRequest);
            
            Page<HelpArticleDto> articles = helpArticleService.getAdminHelpArticles(page, size, keyword, category);
            
            return ResponseEntity.ok(ApiResponse.<Page<HelpArticleDto>>builder()
                    .success(true)
                    .message("관리자용 도움말 목록을 성공적으로 조회했습니다.")
                    .data(articles)
                    .build());
        } catch (Exception e) {
            log.error("관리자용 도움말 목록 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<Page<HelpArticleDto>>builder()
                    .success(false)
                    .message("관리자용 도움말 목록 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @PostMapping("/admin")
    @Operation(summary = "도움말 생성", description = "새로운 도움말을 생성합니다.")
    public ResponseEntity<ApiResponse<HelpArticleDto>> createHelpArticle(
            @RequestBody HelpArticleCreateRequest request,
            HttpServletRequest httpRequest) {
        try {
            checkAdminPermission(httpRequest);
            
            HelpArticleDto article = helpArticleService.createHelpArticle(request);
            
            return ResponseEntity.ok(ApiResponse.<HelpArticleDto>builder()
                    .success(true)
                    .message("도움말을 성공적으로 생성했습니다.")
                    .data(article)
                    .build());
        } catch (Exception e) {
            log.error("도움말 생성 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<HelpArticleDto>builder()
                    .success(false)
                    .message("도움말 생성에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @PutMapping("/admin/{id}")
    @Operation(summary = "도움말 수정", description = "기존 도움말을 수정합니다.")
    public ResponseEntity<ApiResponse<HelpArticleDto>> updateHelpArticle(
            @Parameter(description = "도움말 게시글 ID") @PathVariable Long id,
            @RequestBody HelpArticleUpdateRequest request,
            HttpServletRequest httpRequest) {
        try {
            checkAdminPermission(httpRequest);
            
            HelpArticleDto article = helpArticleService.updateHelpArticle(id, request);
            
            return ResponseEntity.ok(ApiResponse.<HelpArticleDto>builder()
                    .success(true)
                    .message("도움말을 성공적으로 수정했습니다.")
                    .data(article)
                    .build());
        } catch (Exception e) {
            log.error("도움말 수정 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<HelpArticleDto>builder()
                    .success(false)
                    .message("도움말 수정에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @DeleteMapping("/admin/{id}")
    @Operation(summary = "도움말 삭제", description = "도움말을 삭제합니다.")
    public ResponseEntity<ApiResponse<String>> deleteHelpArticle(
            @Parameter(description = "도움말 게시글 ID") @PathVariable Long id,
            HttpServletRequest httpRequest) {
        try {
            checkAdminPermission(httpRequest);
            
            helpArticleService.deleteHelpArticle(id);
            
            return ResponseEntity.ok(ApiResponse.<String>builder()
                    .success(true)
                    .message("도움말을 성공적으로 삭제했습니다.")
                    .data("삭제 완료")
                    .build());
        } catch (Exception e) {
            log.error("도움말 삭제 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<String>builder()
                    .success(false)
                    .message("도움말 삭제에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @PutMapping("/admin/{id}/toggle")
    @Operation(summary = "도움말 활성화/비활성화", description = "도움말의 활성화 상태를 토글합니다.")
    public ResponseEntity<ApiResponse<HelpArticleDto>> toggleHelpArticle(
            @Parameter(description = "도움말 게시글 ID") @PathVariable Long id,
            HttpServletRequest httpRequest) {
        try {
            checkAdminPermission(httpRequest);
            
            HelpArticleDto article = helpArticleService.toggleHelpArticle(id);
            
            return ResponseEntity.ok(ApiResponse.<HelpArticleDto>builder()
                    .success(true)
                    .message("도움말 상태를 성공적으로 변경했습니다.")
                    .data(article)
                    .build());
        } catch (Exception e) {
            log.error("도움말 상태 변경 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<HelpArticleDto>builder()
                    .success(false)
                    .message("도움말 상태 변경에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }
} 