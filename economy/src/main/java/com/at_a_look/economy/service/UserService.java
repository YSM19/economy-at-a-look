package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.ChangePasswordRequest;
import com.at_a_look.economy.dto.ChangeUsernameRequest;
import com.at_a_look.economy.dto.LoginRequest;
import com.at_a_look.economy.dto.LoginResponse;
import com.at_a_look.economy.dto.SignupRequest;
import com.at_a_look.economy.dto.UserResponse;
import com.at_a_look.economy.dto.UserSuspensionDto;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.repository.UserRepository;
import com.at_a_look.economy.util.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
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
        
        // 이메일 중복 체크 (활성 계정만)
        Optional<User> existingUser = userRepository.findByEmail(request.getEmail());
        if (existingUser.isPresent() && existingUser.get().getIsActive()) {
            log.warn("❌ [UserService] 회원가입 실패: 이미 존재하는 이메일 - {}", request.getEmail());
            throw new IllegalArgumentException("이미 존재하는 이메일입니다.");
        }
        
        // 삭제된 계정이 있다면 완전히 삭제하고 새로 생성
        if (existingUser.isPresent() && !existingUser.get().getIsActive()) {
            log.info("🔄 [UserService] 삭제된 계정 발견, 완전 삭제 후 재생성: email={}", request.getEmail());
            userRepository.delete(existingUser.get());
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
        
        // 입력값 검증
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            log.warn("❌ [UserService] 로그인 실패: 이메일이 비어있음");
            return LoginResponse.failure("이메일을 입력해주세요.");
        }
        
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            log.warn("❌ [UserService] 로그인 실패: 비밀번호가 비어있음 - {}", request.getEmail());
            return LoginResponse.failure("비밀번호를 입력해주세요.");
        }
        
        // 이메일 형식 검증
        String emailRegex = "^[A-Za-z0-9+_.-]+@(.+)$";
        if (!request.getEmail().trim().matches(emailRegex)) {
            log.warn("❌ [UserService] 로그인 실패: 잘못된 이메일 형식 - {}", request.getEmail());
            return LoginResponse.failure("올바른 이메일 형식을 입력해주세요.");
        }
        
        // 먼저 이메일로 사용자 찾기 (활성 상태와 관계없이)
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail().trim());
        
        if (userOpt.isEmpty()) {
            log.warn("❌ [UserService] 로그인 실패: 존재하지 않는 이메일 - {}", request.getEmail());
            return LoginResponse.failure("등록되지 않은 이메일입니다.");
        }
        
        User user = userOpt.get();
        
        // 계정 상태 확인 (삭제된 계정인지 확인)
        if (!user.getIsActive()) {
            log.warn("❌ [UserService] 로그인 실패: 삭제된 계정 - {}", request.getEmail());
            return LoginResponse.failure("삭제된 계정입니다. 다시 가입해주세요.");
        }
        
        // 비밀번호 확인 (BCrypt로 암호화된 비밀번호와 비교)
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("❌ [UserService] 로그인 실패: 비밀번호 불일치 - {}", request.getEmail());
            return LoginResponse.failure("비밀번호가 올바르지 않습니다.");
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
        
        try {
            // 설정값 검증
            if (adminEmail == null || adminEmail.trim().isEmpty()) {
                log.error("❌ [UserService] 관리자 이메일이 설정되지 않았습니다.");
                throw new IllegalStateException("관리자 이메일이 설정되지 않았습니다.");
            }
            
            if (adminPassword == null || adminPassword.trim().isEmpty()) {
                log.error("❌ [UserService] 관리자 비밀번호가 설정되지 않았습니다.");
                throw new IllegalStateException("관리자 비밀번호가 설정되지 않았습니다.");
            }
            
            log.info("📧 [UserService] 관리자 이메일: {}", adminEmail);
            log.info("🔑 [UserService] 관리자 비밀번호 길이: {}", adminPassword.length());
            log.info("🔧 [UserService] PasswordEncoder 상태: {}", passwordEncoder != null ? "정상" : "null");
            log.info("🗄️ [UserService] UserRepository 상태: {}", userRepository != null ? "정상" : "null");
            
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
        } catch (org.springframework.dao.DataAccessException e) {
            log.error("❌ [UserService] 관리자 계정 초기화 중 데이터베이스 오류: {}", e.getMessage(), e);
            throw new RuntimeException("관리자 계정 초기화 중 데이터베이스 오류가 발생했습니다.", e);
        } catch (IllegalStateException e) {
            log.error("❌ [UserService] 관리자 계정 초기화 중 설정 오류: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("❌ [UserService] 관리자 계정 초기화 중 예상치 못한 오류: {}", e.getMessage(), e);
            throw new RuntimeException("관리자 계정 초기화 중 예상치 못한 오류가 발생했습니다.", e);
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

    /**
     * 사용자 정지
     */
    @Transactional
    public UserSuspensionDto.UserSuspensionResponse suspendUser(UserSuspensionDto.SuspendUserRequest request, String adminUsername) {
        log.info("🚫 [UserService] 사용자 정지 시도: userId={}, days={}, reason={}", 
                request.getUserId(), request.getSuspensionDays(), request.getReason());
        
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        
        // 관리자는 정지할 수 없음
        if (user.getRole() == User.Role.ADMIN) {
            log.warn("❌ [UserService] 사용자 정지 실패: 관리자는 정지할 수 없음 - userId={}", request.getUserId());
            throw new IllegalArgumentException("관리자는 정지할 수 없습니다.");
        }
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime suspendedUntil = now.plusDays(request.getSuspensionDays());
        
        user.setIsSuspended(true);
        user.setSuspendedUntil(suspendedUntil);
        user.setSuspensionReason(request.getReason());
        user.setSuspendedBy(adminUsername);
        user.setSuspendedAt(now);
        
        User savedUser = userRepository.save(user);
        log.info("✅ [UserService] 사용자 정지 성공: userId={}, suspendedUntil={}", 
                savedUser.getId(), savedUser.getSuspendedUntil());
        
        return convertToSuspensionResponse(savedUser);
    }

    /**
     * 사용자 정지 해제
     */
    @Transactional
    public UserSuspensionDto.UserSuspensionResponse unsuspendUser(Long userId) {
        log.info("✅ [UserService] 사용자 정지 해제 시도: userId={}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        
        user.setIsSuspended(false);
        user.setSuspendedUntil(null);
        user.setSuspensionReason(null);
        user.setSuspendedBy(null);
        user.setSuspendedAt(null);
        
        User savedUser = userRepository.save(user);
        log.info("✅ [UserService] 사용자 정지 해제 성공: userId={}", savedUser.getId());
        
        return convertToSuspensionResponse(savedUser);
    }

    /**
     * 만료된 정지 자동 해제
     */
    @Transactional
    public void releaseExpiredSuspensions() {
        log.info("🔄 [UserService] 만료된 정지 자동 해제 시작");
        
        LocalDateTime now = LocalDateTime.now();
        List<User> expiredUsers = userRepository.findExpiredSuspensions(now);
        
        for (User user : expiredUsers) {
            user.setIsSuspended(false);
            user.setSuspendedUntil(null);
            user.setSuspensionReason(null);
            user.setSuspendedBy(null);
            user.setSuspendedAt(null);
            userRepository.save(user);
            log.info("✅ [UserService] 만료된 정지 자동 해제: userId={}", user.getId());
        }
        
        log.info("✅ [UserService] 만료된 정지 자동 해제 완료: {}명", expiredUsers.size());
    }

    /**
     * 사용자 목록 조회 (관리자용)
     */
    public Page<UserSuspensionDto.SuspensionHistoryResponse> getUserList(Pageable pageable, String keyword) {
        log.info("📋 [UserService] 사용자 목록 조회: page={}, size={}, keyword={}", 
                pageable.getPageNumber(), pageable.getPageSize(), keyword);
        
        Page<User> users;
        if (keyword != null && !keyword.trim().isEmpty()) {
            users = userRepository.findByUsernameOrEmailContaining(keyword.trim(), pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        
        Page<UserSuspensionDto.SuspensionHistoryResponse> response = users.map(this::convertToSuspensionHistoryResponse);
        log.info("✅ [UserService] 사용자 목록 조회 완료: 총 {}명", response.getTotalElements());
        
        return response;
    }

    /**
     * 정지된 사용자 목록 조회
     */
    public Page<UserSuspensionDto.SuspensionHistoryResponse> getSuspendedUserList(Pageable pageable) {
        log.info("🚫 [UserService] 정지된 사용자 목록 조회");
        
        Page<User> suspendedUsers = userRepository.findByIsSuspendedTrue(pageable);
        Page<UserSuspensionDto.SuspensionHistoryResponse> response = suspendedUsers.map(this::convertToSuspensionHistoryResponse);
        
        log.info("✅ [UserService] 정지된 사용자 목록 조회 완료: 총 {}명", response.getTotalElements());
        return response;
    }

    /**
     * 사용자 정지 상태 조회
     */
    public UserSuspensionDto.UserSuspensionResponse getUserSuspensionStatus(Long userId) {
        log.info("🔍 [UserService] 사용자 정지 상태 조회: userId={}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        
        return convertToSuspensionResponse(user);
    }

    /**
     * 계정 삭제
     */
    @Transactional
    public void deleteAccount(String email) {
        log.info("🗑️ [UserService] 계정 삭제 시도: email={}", email);
        
        User user = userRepository.findByEmailAndIsActiveTrue(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        
        // 관리자 계정은 삭제 불가
        if (user.getRole() == User.Role.ADMIN) {
            log.warn("❌ [UserService] 관리자 계정 삭제 시도 차단: email={}", email);
            throw new IllegalArgumentException("관리자 계정은 삭제할 수 없습니다.");
        }
        
        // 계정 비활성화 (실제 삭제 대신)
        user.setIsActive(false);
        userRepository.save(user);
        
        log.info("✅ [UserService] 계정 삭제 완료: email={}, userId={}", email, user.getId());
    }

    /**
     * DTO 변환 메서드들
     */
    private UserSuspensionDto.UserSuspensionResponse convertToSuspensionResponse(User user) {
        LocalDateTime now = LocalDateTime.now();
        boolean isExpired = user.getIsSuspended() && 
                           user.getSuspendedUntil() != null && 
                           user.getSuspendedUntil().isBefore(now);
        
        return UserSuspensionDto.UserSuspensionResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().toString())
                .isSuspended(user.getIsSuspended())
                .suspendedUntil(user.getSuspendedUntil())
                .suspensionReason(user.getSuspensionReason())
                .suspendedBy(user.getSuspendedBy())
                .suspendedAt(user.getSuspendedAt())
                .isSuspensionExpired(isExpired)
                .build();
    }

    private UserSuspensionDto.SuspensionHistoryResponse convertToSuspensionHistoryResponse(User user) {
        LocalDateTime now = LocalDateTime.now();
        boolean isExpired = user.getIsSuspended() && 
                           user.getSuspendedUntil() != null && 
                           user.getSuspendedUntil().isBefore(now);
        
        return UserSuspensionDto.SuspensionHistoryResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().toString())
                .isSuspended(user.getIsSuspended())
                .suspendedUntil(user.getSuspendedUntil())
                .suspensionReason(user.getSuspensionReason())
                .suspendedBy(user.getSuspendedBy())
                .suspendedAt(user.getSuspendedAt())
                .isSuspensionExpired(isExpired)
                .createdAt(user.getCreatedAt())
                .build();
    }
} 