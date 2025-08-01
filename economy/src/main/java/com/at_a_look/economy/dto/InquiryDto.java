package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.Inquiry;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InquiryDto {
    
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private String title;
    private String content;
    private String type;
    private String typeDisplayName;
    private String status;
    private String statusDisplayName;
    private String adminResponse;
    private LocalDateTime respondedAt;
    private String respondedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static InquiryDto fromEntity(Inquiry inquiry) {
        return InquiryDto.builder()
                .id(inquiry.getId())
                .userId(inquiry.getUser() != null ? inquiry.getUser().getId() : null)
                .userName(inquiry.getUserName())
                .userEmail(inquiry.getUserEmail())
                .title(inquiry.getTitle())
                .content(inquiry.getContent())
                .type(inquiry.getType().name())
                .typeDisplayName(inquiry.getType().getDisplayName())
                .status(inquiry.getStatus().name())
                .statusDisplayName(inquiry.getStatus().getDisplayName())
                .adminResponse(inquiry.getAdminResponse())
                .respondedAt(inquiry.getRespondedAt())
                .respondedBy(inquiry.getRespondedBy())
                .createdAt(inquiry.getCreatedAt())
                .updatedAt(inquiry.getUpdatedAt())
                .build();
    }
} 