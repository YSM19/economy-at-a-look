package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    
    private String token;
    private UserResponse user;
    private String message;
    
    public static LoginResponse success(String token, User user) {
        return LoginResponse.builder()
                .token(token)
                .user(UserResponse.from(user))
                .message("로그인에 성공했습니다.")
                .build();
    }
    
    public static LoginResponse failure(String message) {
        return LoginResponse.builder()
                .message(message)
                .build();
    }
} 