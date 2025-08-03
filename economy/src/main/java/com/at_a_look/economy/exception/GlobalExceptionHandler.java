package com.at_a_look.economy.exception;

import com.at_a_look.economy.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SecurityException;

import java.net.SocketTimeoutException;
import java.net.ProtocolException;
import java.net.ConnectException;

/**
 * 애플리케이션 전체의 예외를 처리하는 전역 예외 핸들러
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * API 리소스 접근 예외 처리
     */
    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceAccessException(ResourceAccessException ex) {
        log.error("🚫 [GlobalExceptionHandler] API 리소스 접근 예외 발생: {}", ex.getMessage());
        log.error("📋 [GlobalExceptionHandler] 상세 스택 트레이스:", ex);
        
        String errorMessage = "외부 API 서버에 접근할 수 없습니다.";
        String userFriendlyMessage = "환율 데이터를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.";
        
        // 원인에 따른 세부 메시지 추가
        Throwable cause = ex.getCause();
        if (cause != null) {
            log.error("🔍 [GlobalExceptionHandler] 근본 원인: {} - {}", cause.getClass().getSimpleName(), cause.getMessage());
            
            if (cause instanceof SocketTimeoutException) {
                errorMessage = "외부 API 서버 응답 시간 초과: " + cause.getMessage();
                userFriendlyMessage = "외부 서버 응답이 지연되고 있습니다. 네트워크 상태를 확인하고 잠시 후 다시 시도해주세요.";
            } else if (cause instanceof ConnectException) {
                errorMessage = "외부 API 서버 연결 실패: " + cause.getMessage();
                userFriendlyMessage = "외부 서버에 연결할 수 없습니다. 네트워크 연결을 확인하고 다시 시도해주세요.";
            } else if (cause instanceof ProtocolException) {
                if (cause.getMessage().contains("redirected too many times")) {
                    errorMessage = "외부 API 서버 리디렉션 루프 오류. 잠시 후 다시 시도해주세요.";
                    userFriendlyMessage = "외부 서버에서 리디렉션 문제가 발생했습니다. 5분 후 다시 시도해주세요.";
                }
            }
        }
        
        log.warn("💬 [GlobalExceptionHandler] 사용자에게 전달되는 메시지: {}", userFriendlyMessage);
        
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiResponse.error(userFriendlyMessage));
    }
    
    /**
     * HTTP 클라이언트 예외 처리
     */
    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpClientErrorException(HttpClientErrorException ex) {
        log.error("🌐 [GlobalExceptionHandler] HTTP 클라이언트 예외: {}, 상태 코드: {}", ex.getMessage(), ex.getStatusCode());
        log.error("📋 [GlobalExceptionHandler] HTTP 오류 상세 정보:", ex);
        
        String errorMessage = "외부 API 호출 중 오류가 발생했습니다.";
        
        if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED) {
            errorMessage = "외부 API 인증에 실패했습니다. 관리자에게 문의하세요.";
        } else if (ex.getStatusCode() == HttpStatus.NOT_FOUND) {
            errorMessage = "요청한 환율 데이터를 찾을 수 없습니다. 날짜를 확인하고 다시 시도해주세요.";
        } else if (ex.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) {
            errorMessage = "외부 환율 서비스가 일시적으로 사용 불가능합니다. 잠시 후 다시 시도해주세요.";
        } else if (ex.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
            errorMessage = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
        }
        
        log.warn("💬 [GlobalExceptionHandler] HTTP 오류 - 사용자에게 전달되는 메시지: {}", errorMessage);
        
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(ApiResponse.error(errorMessage));
    }
    
    /**
     * REST 클라이언트 관련 예외 처리
     */
    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<ApiResponse<Void>> handleRestClientException(RestClientException ex) {
        log.error("🔌 [GlobalExceptionHandler] REST 클라이언트 예외: {}", ex.getMessage());
        log.error("📋 [GlobalExceptionHandler] REST 클라이언트 오류 상세 정보:", ex);
        
        String userMessage = "외부 서비스와의 통신 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
        log.warn("💬 [GlobalExceptionHandler] REST 오류 - 사용자에게 전달되는 메시지: {}", userMessage);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(userMessage));
    }
    
    /**
     * 데이터베이스 접근 예외 처리
     */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataAccessException(DataAccessException ex) {
        log.error("🗄️ [GlobalExceptionHandler] 데이터베이스 접근 예외: {}", ex.getMessage());
        log.error("📋 [GlobalExceptionHandler] 데이터베이스 오류 상세 정보:", ex);
        
        String userMessage = "데이터베이스 접근 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        log.warn("💬 [GlobalExceptionHandler] 데이터베이스 오류 - 사용자에게 전달되는 메시지: {}", userMessage);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(userMessage));
    }
    
    /**
     * 데이터 무결성 위반 예외 처리
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        log.error("🔒 [GlobalExceptionHandler] 데이터 무결성 위반 예외: {}", ex.getMessage());
        log.error("📋 [GlobalExceptionHandler] 데이터 무결성 오류 상세 정보:", ex);
        
        String userMessage = "데이터 무결성 검증에 실패했습니다. 입력 데이터를 확인하고 다시 시도해주세요.";
        log.warn("💬 [GlobalExceptionHandler] 데이터 무결성 오류 - 사용자에게 전달되는 메시지: {}", userMessage);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(userMessage));
    }
    
    /**
     * 파라미터 검증 예외 처리
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.error("⚠️ [GlobalExceptionHandler] 파라미터 검증 예외: {}", ex.getMessage());
        log.error("📋 [GlobalExceptionHandler] 파라미터 검증 오류 상세 정보:", ex);
        
        String userMessage = "잘못된 파라미터가 전달되었습니다. 요청 정보를 확인하고 다시 시도해주세요.";
        log.warn("💬 [GlobalExceptionHandler] 파라미터 검증 오류 - 사용자에게 전달되는 메시지: {}", userMessage);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(userMessage));
    }
    
    /**
     * JWT 토큰 만료 예외 처리
     */
    @ExceptionHandler(ExpiredJwtException.class)
    public ResponseEntity<ApiResponse<Void>> handleExpiredJwtException(ExpiredJwtException ex) {
        log.warn("⏰ [GlobalExceptionHandler] JWT 토큰 만료: {}", ex.getMessage());
        
        String userMessage = "토큰이 만료되었습니다. 다시 로그인해주세요.";
        log.warn("💬 [GlobalExceptionHandler] JWT 만료 - 사용자에게 전달되는 메시지: {}", userMessage);
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(userMessage));
    }

    /**
     * JWT 토큰 형식 오류 예외 처리
     */
    @ExceptionHandler(MalformedJwtException.class)
    public ResponseEntity<ApiResponse<Void>> handleMalformedJwtException(MalformedJwtException ex) {
        log.warn("🔧 [GlobalExceptionHandler] JWT 토큰 형식 오류: {}", ex.getMessage());
        
        String userMessage = "유효하지 않은 토큰입니다. 다시 로그인해주세요.";
        log.warn("💬 [GlobalExceptionHandler] JWT 형식 오류 - 사용자에게 전달되는 메시지: {}", userMessage);
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(userMessage));
    }

    /**
     * JWT 토큰 서명 오류 예외 처리
     */
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Void>> handleJwtSecurityException(SecurityException ex) {
        log.warn("🔒 [GlobalExceptionHandler] JWT 토큰 서명 오류: {}", ex.getMessage());
        
        String userMessage = "토큰 인증에 실패했습니다. 다시 로그인해주세요.";
        log.warn("💬 [GlobalExceptionHandler] JWT 서명 오류 - 사용자에게 전달되는 메시지: {}", userMessage);
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(userMessage));
    }

    /**
     * JWT 토큰 지원되지 않는 형식 예외 처리
     */
    @ExceptionHandler(UnsupportedJwtException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnsupportedJwtException(UnsupportedJwtException ex) {
        log.warn("🚫 [GlobalExceptionHandler] 지원되지 않는 JWT 토큰: {}", ex.getMessage());
        
        String userMessage = "지원되지 않는 토큰 형식입니다. 다시 로그인해주세요.";
        log.warn("💬 [GlobalExceptionHandler] JWT 지원되지 않는 형식 - 사용자에게 전달되는 메시지: {}", userMessage);
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(userMessage));
    }

    /**
     * 스케줄러 관련 런타임 예외 처리
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        log.error("⚡ [GlobalExceptionHandler] 런타임 예외: {}", ex.getMessage());
        log.error("📋 [GlobalExceptionHandler] 런타임 오류 상세 정보:", ex);
        
        String userMessage;
        
        // 스케줄러 관련 메시지인지 확인
        if (ex.getMessage() != null) {
            if (ex.getMessage().contains("한국은행 API 에러:")) {
                userMessage = "한국은행 API에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
            } else if (ex.getMessage().contains("네트워크 연결")) {
                userMessage = "네트워크 연결에 문제가 있습니다. 연결 상태를 확인하고 다시 시도해주세요.";
            } else if (ex.getMessage().contains("데이터베이스")) {
                userMessage = "데이터베이스 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
            } else if (ex.getMessage().contains("API 호출")) {
                userMessage = "외부 API 호출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
            } else if (ex.getMessage().contains("토큰 생성")) {
                userMessage = "인증 토큰 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
            } else {
                userMessage = "서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
            }
        } else {
            userMessage = "서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        }
        
        log.warn("💬 [GlobalExceptionHandler] 런타임 오류 - 사용자에게 전달되는 메시지: {}", userMessage);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(userMessage));
    }
    
    /**
     * 기타 모든 예외 처리
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        log.error("💥 [GlobalExceptionHandler] 처리되지 않은 예외: {} - {}", ex.getClass().getSimpleName(), ex.getMessage());
        log.error("📋 [GlobalExceptionHandler] 예상치 못한 오류 상세 정보:", ex);
        
        String userMessage = "서버에서 예상치 못한 오류가 발생했습니다. 관리자에게 문의하세요.";
        log.warn("💬 [GlobalExceptionHandler] 일반 오류 - 사용자에게 전달되는 메시지: {}", userMessage);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(userMessage));
    }
} 