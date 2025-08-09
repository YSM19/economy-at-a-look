package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.ChangePasswordRequest;
import com.at_a_look.economy.dto.ChangeUsernameRequest;
import com.at_a_look.economy.dto.LoginRequest;
import com.at_a_look.economy.dto.LoginResponse;
import com.at_a_look.economy.dto.SignupRequest;
import com.at_a_look.economy.dto.UserResponse;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.service.UserService;
import com.at_a_look.economy.util.JwtTokenUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.repository.UserRepository;
import io.jsonwebtoken.ExpiredJwtException;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Validated
@Tag(name = "Auth", description = "인증 API")
public class AuthController {

    private final UserService userService;
    private final JwtTokenUtil jwtTokenUtil;
    private final UserRepository userRepository;

    @Operation(summary = "회원가입", description = "새로운 사용자 계정을 생성합니다.")
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(@Valid @RequestBody SignupRequest request) {
        log.info("📝 [AuthController] 회원가입 요청: username={}", request.getUsername());
        
        try {
            UserResponse userResponse = userService.signup(request);
            log.info("✅ [AuthController] 회원가입 성공: username={}", userResponse.getUsername());
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("회원가입이 완료되었습니다.", userResponse));
                    
        } catch (IllegalArgumentException e) {
            log.warn("❌ [AuthController] 회원가입 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
                    
        } catch (Exception e) {
            log.error("💥 [AuthController] 회원가입 중 예상치 못한 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("회원가입 처리 중 오류가 발생했습니다."));
        }
    }

    @Operation(summary = "로그인", description = "사용자 로그인을 처리합니다.")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("🔐 [AuthController] 로그인 요청: email={}", request.getEmail());
        
        try {
            // 입력값 검증
            if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
                log.warn("❌ [AuthController] 로그인 실패: 이메일이 비어있음");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("이메일을 입력해주세요."));
            }
            
            if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
                log.warn("❌ [AuthController] 로그인 실패: 비밀번호가 비어있음");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("비밀번호를 입력해주세요."));
            }
            
            LoginResponse loginResponse = userService.login(request);
            
            if (loginResponse.getToken() != null) {
                log.info("✅ [AuthController] 로그인 성공: email={}", request.getEmail());
                return ResponseEntity.ok(ApiResponse.success("로그인이 완료되었습니다.", loginResponse));
            } else {
                log.warn("❌ [AuthController] 로그인 실패: email={}, message={}", request.getEmail(), loginResponse.getMessage());
                
                // 실패 원인에 따른 HTTP 상태 코드 결정
                String errorMessage = loginResponse.getMessage();
                HttpStatus status = HttpStatus.UNAUTHORIZED;
                
                if (errorMessage.contains("등록되지 않은 이메일")) {
                    status = HttpStatus.NOT_FOUND;
                } else if (errorMessage.contains("비활성화된 계정")) {
                    status = HttpStatus.FORBIDDEN;
                } else if (errorMessage.contains("이메일을 입력해주세요") || 
                          errorMessage.contains("비밀번호를 입력해주세요") ||
                          errorMessage.contains("올바른 이메일 형식")) {
                    status = HttpStatus.BAD_REQUEST;
                }
                
                return ResponseEntity.status(status)
                        .body(ApiResponse.error(errorMessage));
            }
            
        } catch (IllegalArgumentException e) {
            log.warn("❌ [AuthController] 로그인 실패 - 잘못된 입력: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
                    
        } catch (Exception e) {
            log.error("💥 [AuthController] 로그인 중 예상치 못한 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."));
        }
    }

    @Operation(summary = "토큰 검증", description = "사용자 토큰의 유효성을 검증합니다.")
    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<UserResponse>> validateToken(@RequestHeader("Authorization") String token) {
        log.info("🔍 [AuthController] 토큰 검증 요청");
        
        try {
            // "Bearer " 접두사 제거
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }
            
            return userService.validateToken(token)
                    .map(user -> {
                        log.info("✅ [AuthController] 토큰 검증 성공: username={}", user.getUsername());
                        return ResponseEntity.ok(ApiResponse.success("유효한 토큰입니다.", UserResponse.from(user)));
                    })
                    .orElseGet(() -> {
                        log.warn("❌ [AuthController] 토큰 검증 실패: 유효하지 않은 토큰");
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body(ApiResponse.error("유효하지 않은 토큰입니다."));
                    });
                    
        } catch (Exception e) {
            log.error("💥 [AuthController] 토큰 검증 중 예상치 못한 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("토큰 검증 처리 중 오류가 발생했습니다."));
        }
    }

    @Operation(summary = "토큰 갱신", description = "만료된 토큰을 새로운 토큰으로 갱신합니다.")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(@RequestHeader("Authorization") String token) {
        log.info("🔄 [AuthController] 토큰 갱신 요청");
        
        try {
            // "Bearer " 접두사 제거
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }
            
            // 토큰에서 사용자 정보 추출
            String email = jwtTokenUtil.getEmailFromToken(token);
            Long userId = jwtTokenUtil.getUserIdFromToken(token);
            // username, role은 갱신 시 사용하지 않으므로 조회 생략
            
            if (email == null || userId == null) {
                log.warn("❌ [AuthController] 토큰 갱신 실패: 토큰에서 사용자 정보를 추출할 수 없음");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("유효하지 않은 토큰입니다."));
            }
            
            // 사용자 존재 여부 확인
            Optional<User> userOpt = userRepository.findByEmailAndIsActiveTrue(email);
            if (userOpt.isEmpty()) {
                log.warn("❌ [AuthController] 토큰 갱신 실패: 사용자를 찾을 수 없음 - {}", email);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("사용자를 찾을 수 없습니다."));
            }
            
            User user = userOpt.get();
            
            // 새로운 토큰 생성
            String newToken = jwtTokenUtil.generateToken(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getRole().toString()
            );
            
            log.info("✅ [AuthController] 토큰 갱신 성공: email={}", email);
            
            return ResponseEntity.ok(ApiResponse.success("토큰이 성공적으로 갱신되었습니다.", 
                LoginResponse.success(newToken, user)));
                    
        } catch (ExpiredJwtException e) {
            log.warn("❌ [AuthController] 토큰 갱신 실패: 토큰이 만료됨");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("토큰이 만료되었습니다. 다시 로그인해주세요."));
        } catch (Exception e) {
            log.error("💥 [AuthController] 토큰 갱신 중 예상치 못한 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("토큰 갱신 처리 중 오류가 발생했습니다."));
        }
    }

    @Operation(summary = "닉네임 변경", description = "사용자 닉네임을 변경합니다. (월 1회 제한)")
    @PutMapping("/change-username")
    public ResponseEntity<ApiResponse<UserResponse>> changeUsername(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody ChangeUsernameRequest request) {
        log.info("🔄 [AuthController] 닉네임 변경 요청");
        
        try {
            // "Bearer " 접두사 제거
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }
            
            // 토큰에서 이메일 추출
            String email = jwtTokenUtil.getEmailFromToken(token);
            if (email == null || !jwtTokenUtil.validateToken(token)) {
                log.warn("❌ [AuthController] 닉네임 변경 실패: 유효하지 않은 토큰");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("유효하지 않은 토큰입니다."));
            }
            
            UserResponse userResponse = userService.changeUsername(email, request);
            log.info("✅ [AuthController] 닉네임 변경 성공: email={}, newUsername={}", email, request.getNewUsername());
            
            return ResponseEntity.ok(ApiResponse.success("닉네임이 성공적으로 변경되었습니다.", userResponse));
            
        } catch (IllegalArgumentException e) {
            log.warn("❌ [AuthController] 닉네임 변경 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
                    
        } catch (Exception e) {
            log.error("💥 [AuthController] 닉네임 변경 중 예상치 못한 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("닉네임 변경 처리 중 오류가 발생했습니다."));
        }
    }

    @Operation(summary = "비밀번호 변경", description = "사용자 비밀번호를 변경합니다.")
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody ChangePasswordRequest request) {
        log.info("🔄 [AuthController] 비밀번호 변경 요청");
        
        try {
            // "Bearer " 접두사 제거
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }
            
            // 토큰에서 이메일 추출
            String email = jwtTokenUtil.getEmailFromToken(token);
            if (email == null || !jwtTokenUtil.validateToken(token)) {
                log.warn("❌ [AuthController] 비밀번호 변경 실패: 유효하지 않은 토큰");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("유효하지 않은 토큰입니다."));
            }
            
            userService.changePassword(email, request);
            log.info("✅ [AuthController] 비밀번호 변경 성공: email={}", email);
            
            return ResponseEntity.ok(ApiResponse.success("비밀번호가 성공적으로 변경되었습니다.", null));
            
        } catch (IllegalArgumentException e) {
            log.warn("❌ [AuthController] 비밀번호 변경 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
                    
        } catch (Exception e) {
            log.error("💥 [AuthController] 비밀번호 변경 중 예상치 못한 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("비밀번호 변경 처리 중 오류가 발생했습니다."));
        }
    }

    @Operation(summary = "계정 삭제", description = "사용자 계정을 영구적으로 삭제합니다.")
    @DeleteMapping("/delete-account")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @RequestHeader("Authorization") String token) {
        log.info("🗑️ [AuthController] 계정 삭제 요청");
        
        try {
            // "Bearer " 접두사 제거
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }
            
            // 토큰에서 이메일 추출
            String email = jwtTokenUtil.getEmailFromToken(token);
            if (email == null || !jwtTokenUtil.validateToken(token)) {
                log.warn("❌ [AuthController] 계정 삭제 실패: 유효하지 않은 토큰");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("유효하지 않은 토큰입니다."));
            }
            
            userService.deleteAccount(email);
            log.info("✅ [AuthController] 계정 삭제 성공: email={}", email);
            
            return ResponseEntity.ok(ApiResponse.success("계정이 성공적으로 삭제되었습니다.", null));
            
        } catch (IllegalArgumentException e) {
            log.warn("❌ [AuthController] 계정 삭제 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
                    
        } catch (Exception e) {
            log.error("💥 [AuthController] 계정 삭제 중 예상치 못한 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("계정 삭제 처리 중 오류가 발생했습니다."));
        }
    }
} 