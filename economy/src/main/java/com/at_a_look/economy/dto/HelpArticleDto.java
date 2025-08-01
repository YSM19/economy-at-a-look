package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.HelpArticle;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HelpArticleDto {
    
    private Long id;
    private String title;
    private String content;
    private String category;
    private String categoryDisplayName;
    private Integer displayOrder;
    private Boolean isActive;
    private Integer viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static HelpArticleDto fromEntity(HelpArticle article) {
        return HelpArticleDto.builder()
                .id(article.getId())
                .title(article.getTitle())
                .content(article.getContent())
                .category(article.getCategory().name())
                .categoryDisplayName(article.getCategory().getDisplayName())
                .displayOrder(article.getDisplayOrder())
                .isActive(article.getIsActive())
                .viewCount(article.getViewCount())
                .createdAt(article.getCreatedAt())
                .updatedAt(article.getUpdatedAt())
                .build();
    }
} 