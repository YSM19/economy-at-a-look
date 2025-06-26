package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    
    private Long id;
    private String email;
    private User.Role role;
    private LocalDateTime createdAt;
    private Boolean isActive;
    private String username;
    
    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .isActive(user.getIsActive())
                .username(user.getUsername())
                .build();
    }
} 