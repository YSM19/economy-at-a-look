package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.ChangePasswordRequest;
import com.at_a_look.economy.dto.ChangeUsernameRequest;
import com.at_a_look.economy.dto.LoginRequest;
import com.at_a_look.economy.dto.LoginResponse;
import com.at_a_look.economy.dto.SignupRequest;
import com.at_a_look.economy.dto.UserResponse;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.repository.UserRepository;
import com.at_a_look.economy.util.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenUtil jwtTokenUtil;
    
    @Value("${admin.account.email}")
    private String adminEmail;
    
    @Value("${admin.account.password}")
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
        
        // 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(request.getPassword());
        
        // 사용자 생성
        User user = User.builder()
                .email(request.getEmail())
                .password(encodedPassword)
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
        
        // 비밀번호 확인 (BCrypt로 암호화된 비밀번호와 비교)
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("❌ [UserService] 로그인 실패: 비밀번호 불일치 - {}", request.getEmail());
            return LoginResponse.failure("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        
        // JWT 토큰 생성
        String token = jwtTokenUtil.generateToken(
            user.getId(),
            user.getEmail(),
            user.getUsername(),
            user.getRole().toString()
        );
        
        log.info("✅ [UserService] 로그인 성공: email={}, role={}", user.getEmail(), user.getRole());
        
        return LoginResponse.success(token, user);
    }

    /**
     * 관리자 계정 초기화 (시스템 시작 시 호출)
     */
    @Transactional
    public void initializeAdminAccount() {
        log.info("🔐 [UserService] 관리자 계정 초기화 시작");
        log.info("📧 [UserService] 관리자 이메일: {}", adminEmail);
        log.info("🔑 [UserService] 관리자 비밀번호 길이: {}", adminPassword != null ? adminPassword.length() : "null");
        log.info("🔧 [UserService] PasswordEncoder 상태: {}", passwordEncoder != null ? "정상" : "null");
        log.info("🗄️ [UserService] UserRepository 상태: {}", userRepository != null ? "정상" : "null");
        
        try {
            boolean emailExists = userRepository.existsByEmail(adminEmail);
            log.info("📊 [UserService] 관리자 이메일 존재 여부: {}", emailExists);
            
            if (!emailExists) {
                log.info("🔒 [UserService] 새 관리자 계정 생성 - 비밀번호 암호화 시작...");
                // 관리자 비밀번호도 암호화
                String encodedAdminPassword = passwordEncoder.encode(adminPassword);
                log.info("✅ [UserService] 비밀번호 암호화 완료 (길이: {})", encodedAdminPassword.length());
                
                log.info("👤 [UserService] 관리자 사용자 객체 생성 중...");
                User admin = User.builder()
                        .email(adminEmail)
                        .password(encodedAdminPassword)
                        .username("관리자")
                        .role(User.Role.ADMIN)
                        .build();
                
                log.info("💾 [UserService] 관리자 계정 데이터베이스 저장 중...");
                User savedAdmin = userRepository.save(admin);
                log.info("✅ [UserService] 관리자 계정 초기화 완료: id={}, email={}, username={}", 
                    savedAdmin.getId(), savedAdmin.getEmail(), savedAdmin.getUsername());
            } else {
                log.info("📋 [UserService] 기존 관리자 계정 발견: email={}", adminEmail);
                
                // 기존 관리자 계정의 비밀번호가 평문인지 확인하고 업데이트
                Optional<User> existingAdminOpt = userRepository.findByEmailAndIsActiveTrue(adminEmail);
                if (existingAdminOpt.isPresent()) {
                    User existingAdmin = existingAdminOpt.get();
                    String currentPassword = existingAdmin.getPassword();
                    
                    // BCrypt 패스워드인지 확인 (BCrypt는 항상 $2a$, $2b$, $2y$ 등으로 시작)
                    boolean isBCryptPassword = currentPassword != null && 
                        (currentPassword.startsWith("$2a$") || currentPassword.startsWith("$2b$") || 
                         currentPassword.startsWith("$2y$") || currentPassword.startsWith("$2"));
                    
                    log.info("🔍 [UserService] 기존 비밀번호 BCrypt 여부: {}, 길이: {}", 
                        isBCryptPassword, currentPassword != null ? currentPassword.length() : "null");
                    
                    if (!isBCryptPassword) {
                        log.warn("⚠️ [UserService] 기존 관리자 비밀번호가 평문으로 저장되어 있습니다. BCrypt로 업데이트합니다.");
                        
                        String encodedAdminPassword = passwordEncoder.encode(adminPassword);
                        existingAdmin.setPassword(encodedAdminPassword);
                        existingAdmin.setUpdatedAt(LocalDateTime.now());
                        
                        User updatedAdmin = userRepository.save(existingAdmin);
                        log.info("✅ [UserService] 관리자 비밀번호를 BCrypt로 업데이트 완료: id={}", updatedAdmin.getId());
                    } else {
                        log.info("✅ [UserService] 관리자 비밀번호가 이미 BCrypt로 암호화되어 있습니다.");
                    }
                } else {
                    log.error("❌ [UserService] 관리자 계정을 찾을 수 없습니다: email={}", adminEmail);
                }
            }
        } catch (Exception e) {
            log.error("💥 [UserService] 관리자 계정 초기화 중 예외 발생: {}", e.getMessage());
            throw e; // 예외를 다시 던져서 DataInitializer에서 확인할 수 있도록 함
        }
    }

    /**
     * JWT 토큰 검증
     */
    public Optional<User> validateToken(String token) {
        if (token == null || token.isEmpty()) {
            return Optional.empty();
        }
        
        try {
            // JWT 토큰 유효성 검증
            if (jwtTokenUtil.validateToken(token)) {
                // 토큰에서 이메일 추출
                String email = jwtTokenUtil.getEmailFromToken(token);
                if (email != null) {
                    return userRepository.findByEmailAndIsActiveTrue(email);
                }
            }
        } catch (Exception e) {
            log.warn("❌ [UserService] JWT 토큰 검증 실패: {}", e.getMessage());
        }
        
        return Optional.empty();
    }

    /**
     * JWT 토큰에서 사용자 이메일 추출
     */
    public String getUserEmailFromToken(String token) {
        if (token == null || token.isEmpty()) {
            throw new IllegalArgumentException("토큰이 비어있습니다.");
        }
        
        // Bearer 토큰 형식인 경우 Bearer 부분 제거
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        
        try {
            if (jwtTokenUtil.validateToken(token)) {
                return jwtTokenUtil.getEmailFromToken(token);
            } else {
                throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
            }
        } catch (Exception e) {
            log.warn("❌ [UserService] 토큰에서 이메일 추출 실패: {}", e.getMessage());
            throw new IllegalArgumentException("토큰 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * 닉네임 변경 (월 1회 제한)
     */
    @Transactional
    public UserResponse changeUsername(String email, ChangeUsernameRequest request) {
        log.info("🔄 [UserService] 닉네임 변경 요청: email={}, newUsername={}", email, request.getNewUsername());
        
        Optional<User> userOpt = userRepository.findByEmailAndIsActiveTrue(email);
        if (userOpt.isEmpty()) {
            log.warn("❌ [UserService] 닉네임 변경 실패: 사용자를 찾을 수 없음 - {}", email);
            throw new IllegalArgumentException("사용자를 찾을 수 없습니다.");
        }
        
        User user = userOpt.get();
        
        // 월 1회 제한 확인
        LocalDateTime now = LocalDateTime.now();
        if (user.getLastUsernameChangeDate() != null) {
            LocalDateTime oneMonthAgo = now.minusMonths(1);
            if (user.getLastUsernameChangeDate().isAfter(oneMonthAgo)) {
                log.warn("❌ [UserService] 닉네임 변경 실패: 월 1회 제한 - {}", email);
                throw new IllegalArgumentException("닉네임은 월 1회만 변경할 수 있습니다.");
            }
        }
        
        // 닉네임 중복 체크 (기존 닉네임과 다른 경우만)
        if (!user.getUsername().equals(request.getNewUsername())) {
            if (userRepository.existsByUsername(request.getNewUsername())) {
                log.warn("❌ [UserService] 닉네임 변경 실패: 이미 존재하는 닉네임 - {}", request.getNewUsername());
                throw new IllegalArgumentException("이미 존재하는 닉네임입니다.");
            }
        }
        
        // 닉네임 변경
        user.setUsername(request.getNewUsername());
        user.setLastUsernameChangeDate(now);
        user.setUpdatedAt(now);
        
        User savedUser = userRepository.save(user);
        log.info("✅ [UserService] 닉네임 변경 성공: email={}, newUsername={}", email, request.getNewUsername());
        
        return UserResponse.from(savedUser);
    }

    /**
     * 비밀번호 변경
     */
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        log.info("🔄 [UserService] 비밀번호 변경 요청: email={}", email);
        
        Optional<User> userOpt = userRepository.findByEmailAndIsActiveTrue(email);
        if (userOpt.isEmpty()) {
            log.warn("❌ [UserService] 비밀번호 변경 실패: 사용자를 찾을 수 없음 - {}", email);
            throw new IllegalArgumentException("사용자를 찾을 수 없습니다.");
        }
        
        User user = userOpt.get();
        
        // 현재 비밀번호 확인
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            log.warn("❌ [UserService] 비밀번호 변경 실패: 현재 비밀번호 불일치 - {}", email);
            throw new IllegalArgumentException("현재 비밀번호가 올바르지 않습니다.");
        }
        
        // 새 비밀번호 암호화 및 저장
        String encodedNewPassword = passwordEncoder.encode(request.getNewPassword());
        user.setPassword(encodedNewPassword);
        user.setUpdatedAt(LocalDateTime.now());
        
        userRepository.save(user);
        log.info("✅ [UserService] 비밀번호 변경 성공: email={}", email);
    }
} 