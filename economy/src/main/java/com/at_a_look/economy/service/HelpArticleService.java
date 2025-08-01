package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.HelpArticleCreateRequest;
import com.at_a_look.economy.dto.HelpArticleDto;
import com.at_a_look.economy.dto.HelpArticleUpdateRequest;
import com.at_a_look.economy.entity.HelpArticle;
import com.at_a_look.economy.repository.HelpArticleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class HelpArticleService {

    private final HelpArticleRepository helpArticleRepository;

    public Page<HelpArticleDto> getHelpArticles(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<HelpArticle> articles = helpArticleRepository.findByIsActiveTrueOrderByDisplayOrderAsc(pageable);
        return articles.map(HelpArticleDto::fromEntity);
    }

    public List<HelpArticleDto> getHelpArticlesByCategory(HelpArticle.Category category) {
        List<HelpArticle> articles = helpArticleRepository.findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(category);
        return articles.stream()
                .map(HelpArticleDto::fromEntity)
                .collect(Collectors.toList());
    }

    public HelpArticleDto getHelpArticle(Long id) {
        HelpArticle article = helpArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("도움말 게시글을 찾을 수 없습니다."));

        if (!article.getIsActive()) {
            throw new RuntimeException("비활성화된 도움말 게시글입니다.");
        }

        // 조회수 증가
        article.setViewCount(article.getViewCount() + 1);
        helpArticleRepository.save(article);

        return HelpArticleDto.fromEntity(article);
    }

    public Page<HelpArticleDto> searchHelpArticles(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<HelpArticle> articles = helpArticleRepository.searchByKeyword(keyword, pageable);
        return articles.map(HelpArticleDto::fromEntity);
    }

    public Page<HelpArticleDto> searchHelpArticlesByCategory(HelpArticle.Category category, String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<HelpArticle> articles = helpArticleRepository.searchByCategoryAndKeyword(category, keyword, pageable);
        return articles.map(HelpArticleDto::fromEntity);
    }

    public List<HelpArticleDto> getAllCategories() {
        List<HelpArticleDto> categories = List.of(
            HelpArticleDto.builder()
                .category("GENERAL")
                .categoryDisplayName("일반")
                .build(),
            HelpArticleDto.builder()
                .category("ECONOMIC_INDICATORS")
                .categoryDisplayName("경제지표")
                .build(),
            HelpArticleDto.builder()
                .category("COMMUNITY")
                .categoryDisplayName("커뮤니티")
                .build(),
            HelpArticleDto.builder()
                .category("ACCOUNT")
                .categoryDisplayName("계정")
                .build(),
            HelpArticleDto.builder()
                .category("NOTIFICATIONS")
                .categoryDisplayName("알림")
                .build(),
            HelpArticleDto.builder()
                .category("TROUBLESHOOTING")
                .categoryDisplayName("문제해결")
                .build()
        );
        return categories;
    }

    // ========== 관리자용 메서드 ==========

    public Page<HelpArticleDto> getAdminHelpArticles(int page, int size, String keyword, String category) {
        Pageable pageable = PageRequest.of(page, size);
        Page<HelpArticle> articles;
        
        if (keyword != null && !keyword.trim().isEmpty()) {
            if (category != null && !category.trim().isEmpty()) {
                HelpArticle.Category categoryEnum = HelpArticle.Category.valueOf(category.toUpperCase());
                articles = helpArticleRepository.searchByCategoryAndKeywordAdmin(categoryEnum, keyword, pageable);
            } else {
                articles = helpArticleRepository.searchByKeywordAdmin(keyword, pageable);
            }
        } else if (category != null && !category.trim().isEmpty()) {
            HelpArticle.Category categoryEnum = HelpArticle.Category.valueOf(category.toUpperCase());
            articles = helpArticleRepository.findByCategoryOrderByDisplayOrderAsc(categoryEnum, pageable);
        } else {
            articles = helpArticleRepository.findAllByOrderByDisplayOrderAsc(pageable);
        }
        
        return articles.map(HelpArticleDto::fromEntity);
    }

    public HelpArticleDto createHelpArticle(HelpArticleCreateRequest request) {
        HelpArticle.Category category = HelpArticle.Category.valueOf(request.getCategory().toUpperCase());
        
        HelpArticle article = HelpArticle.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .category(category)
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .isActive(true)
                .viewCount(0)
                .build();
        
        HelpArticle savedArticle = helpArticleRepository.save(article);
        return HelpArticleDto.fromEntity(savedArticle);
    }

    public HelpArticleDto updateHelpArticle(Long id, HelpArticleUpdateRequest request) {
        HelpArticle article = helpArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("도움말 게시글을 찾을 수 없습니다."));
        
        if (request.getTitle() != null) {
            article.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            article.setContent(request.getContent());
        }
        if (request.getCategory() != null) {
            HelpArticle.Category category = HelpArticle.Category.valueOf(request.getCategory().toUpperCase());
            article.setCategory(category);
        }
        if (request.getDisplayOrder() != null) {
            article.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getIsActive() != null) {
            article.setIsActive(request.getIsActive());
        }
        
        HelpArticle savedArticle = helpArticleRepository.save(article);
        return HelpArticleDto.fromEntity(savedArticle);
    }

    public void deleteHelpArticle(Long id) {
        HelpArticle article = helpArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("도움말 게시글을 찾을 수 없습니다."));
        
        helpArticleRepository.delete(article);
    }

    public HelpArticleDto toggleHelpArticle(Long id) {
        HelpArticle article = helpArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("도움말 게시글을 찾을 수 없습니다."));
        
        article.setIsActive(!article.getIsActive());
        HelpArticle savedArticle = helpArticleRepository.save(article);
        return HelpArticleDto.fromEntity(savedArticle);
    }
} 