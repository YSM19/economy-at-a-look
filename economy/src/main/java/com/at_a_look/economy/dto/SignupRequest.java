package com.at_a_look.economy.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignupRequest {
    
    @NotBlank(message = "이메일을 입력해주세요")
    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String email;
    
    @NotBlank(message = "비밀번호를 입력해주세요")
    @Size(min = 6, message = "비밀번호는 6자 이상이어야 합니다")
    private String password;
    
    @NotBlank(message = "닉네임을 입력해주세요")
    @Size(min = 2, max = 50, message = "닉네임은 2자 이상 50자 이하여야 합니다")
    private String username;
} 