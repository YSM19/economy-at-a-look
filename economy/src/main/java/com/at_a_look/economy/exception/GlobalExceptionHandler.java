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