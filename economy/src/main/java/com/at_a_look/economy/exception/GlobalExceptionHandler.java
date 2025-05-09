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
        log.error("API 리소스 접근 예외: {}", ex.getMessage(), ex);
        
        String errorMessage = "외부 API 서버에 접근할 수 없습니다.";
        
        // 원인에 따른 세부 메시지 추가
        Throwable cause = ex.getCause();
        if (cause != null) {
            if (cause instanceof SocketTimeoutException) {
                errorMessage = "외부 API 서버 응답 시간 초과: " + cause.getMessage();
            } else if (cause instanceof ConnectException) {
                errorMessage = "외부 API 서버 연결 실패: " + cause.getMessage();
            } else if (cause instanceof ProtocolException) {
                if (cause.getMessage().contains("redirected too many times")) {
                    errorMessage = "외부 API 서버 리디렉션 루프 오류. 잠시 후 다시 시도해주세요.";
                }
            }
        }
        
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiResponse.error(errorMessage));
    }
    
    /**
     * HTTP 클라이언트 예외 처리
     */
    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpClientErrorException(HttpClientErrorException ex) {
        log.error("HTTP 클라이언트 예외: {}, 상태 코드: {}", ex.getMessage(), ex.getStatusCode(), ex);
        
        String errorMessage = "외부 API 호출 중 오류가 발생했습니다.";
        
        if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED) {
            errorMessage = "API 인증 키가 유효하지 않습니다.";
        } else if (ex.getStatusCode() == HttpStatus.NOT_FOUND) {
            errorMessage = "요청한 API 리소스를 찾을 수 없습니다.";
        } else if (ex.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) {
            errorMessage = "외부 API 서비스가 일시적으로 사용 불가능합니다.";
        }
        
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(ApiResponse.error(errorMessage));
    }
    
    /**
     * REST 클라이언트 관련 예외 처리
     */
    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<ApiResponse<Void>> handleRestClientException(RestClientException ex) {
        log.error("REST 클라이언트 예외: {}", ex.getMessage(), ex);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("외부 API 통신 중 오류가 발생했습니다."));
    }
    
    /**
     * 기타 모든 예외 처리
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        log.error("처리되지 않은 예외: {}", ex.getMessage(), ex);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("서버 내부 오류가 발생했습니다."));
    }
} 