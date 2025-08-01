package com.at_a_look.economy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HelpArticleCreateRequest {
    private String title;
    private String content;
    private String category;
    private Integer displayOrder;
} 