package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.LoginRequest;
import com.at_a_look.economy.dto.LoginResponse;
import com.at_a_look.economy.dto.SignupRequest;
import com.at_a_look.economy.dto.UserResponse;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    
    @Value("${ADMIN_EMAIL}")
    private String adminEmail;
    
    @Value("${ADMIN_PASSWORD}")
    private String adminPassword;

    /**
     * 사용자 회원가입
     */
    @Transactional
    public UserResponse signup(SignupRequest request) {
        log.info("🔐 [UserService] 회원가입 시도: email={}, username={}", request.getEmail(), request.getUsername());
        
        // 이메일 중복 체크
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("❌ [UserService] 회원가입 실패: 이미 존재하는 이메일 - {}", request.getEmail());
            throw new IllegalArgumentException("이미 존재하는 이메일입니다.");
        }
        
        // 닉네임 중복 체크
        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("❌ [UserService] 회원가입 실패: 이미 존재하는 닉네임 - {}", request.getUsername());
            throw new IllegalArgumentException("이미 존재하는 닉네임입니다.");
        }
        
        // 사용자 생성
        User user = User.builder()
                .email(request.getEmail())
                .password(request.getPassword()) // 실제로는 BCrypt 등으로 암호화 필요
                .username(request.getUsername())
                .role(User.Role.USER)
                .build();
        
        User savedUser = userRepository.save(user);
        log.info("✅ [UserService] 회원가입 성공: email={}, username={}, id={}", savedUser.getEmail(), savedUser.getUsername(), savedUser.getId());
        
        return UserResponse.from(savedUser);
    }

    /**
     * 사용자 로그인
     */
    public LoginResponse login(LoginRequest request) {
        log.info("🔐 [UserService] 로그인 시도: email={}", request.getEmail());
        
        Optional<User> userOpt = userRepository.findByEmailAndIsActiveTrue(request.getEmail());
        
        if (userOpt.isEmpty()) {
            log.warn("❌ [UserService] 로그인 실패: 사용자를 찾을 수 없음 - {}", request.getEmail());
            return LoginResponse.failure("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        
        User user = userOpt.get();
        
        // 비밀번호 확인 (실제로는 BCrypt 등으로 검증 필요)
        if (!user.getPassword().equals(request.getPassword())) {
            log.warn("❌ [UserService] 로그인 실패: 비밀번호 불일치 - {}", request.getEmail());
            return LoginResponse.failure("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        
        // 토큰 생성 (실제로는 JWT 등 사용)
        String token = generateToken(user);
        
        log.info("✅ [UserService] 로그인 성공: email={}, role={}", user.getEmail(), user.getRole());
        
        return LoginResponse.success(token, user);
    }

    /**
     * 관리자 계정 초기화 (시스템 시작 시 호출)
     */
    @Transactional
    public void initializeAdminAccount() {
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                    .email(adminEmail)
                    .password(adminPassword)
                    .username("관리자")
                    .role(User.Role.ADMIN)
                    .build();
            
            userRepository.save(admin);
            log.info("✅ [UserService] 관리자 계정 초기화 완료: email={}, username=관리자", adminEmail);
        } else {
            log.info("📋 [UserService] 관리자 계정이 이미 존재합니다: email={}", adminEmail);
        }
    }

    /**
     * 토큰 검증
     */
    public Optional<User> validateToken(String token) {
        if (token == null || token.isEmpty()) {
            return Optional.empty();
        }
        
        // 실제로는 JWT 토큰 파싱 및 검증
        // 여기서는 간단히 email을 추출한다고 가정
        String email = extractEmailFromToken(token);
        if (email != null) {
            return userRepository.findByEmailAndIsActiveTrue(email);
        }
        
        return Optional.empty();
    }

    /**
     * 토큰 생성 (간단한 구현)
     */
    private String generateToken(User user) {
        // 실제로는 JWT 등을 사용
        // 여기서는 간단히 email + UUID 조합
        return user.getEmail() + ":" + UUID.randomUUID().toString();
    }

    /**
     * 토큰에서 이메일 추출
     */
    private String extractEmailFromToken(String token) {
        if (token.contains(":")) {
            return token.split(":")[0];
        }
        return null;
    }
} 