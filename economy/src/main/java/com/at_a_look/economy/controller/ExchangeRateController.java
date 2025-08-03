package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.ExchangeRateResponseDTO;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.service.ExchangeRateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/exchange-rates")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    /**
     * 환율 데이터를 수동으로 가져와 저장합니다.
     */
    @PostMapping("/fetch")
    public ResponseEntity<ApiResponse<String>> fetchExchangeRates(
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        LocalDate targetDate = date != null ? date : LocalDate.now();
        log.info("🎯 [관리자 대시보드] 환율 데이터 수동 가져오기 요청: 날짜 = {}", targetDate);
        
        try {
            int count = exchangeRateService.fetchExchangeRates(targetDate);
            
            if (count > 0) {
                String message = String.format("✅ 환율 데이터를 성공적으로 가져왔습니다. %d개의 데이터가 저장되었습니다.", count);
                log.info("🎉 [관리자 대시보드] {}", message);
                return ResponseEntity.ok(ApiResponse.success(message, message));
            } else {
                String message = String.format("⚠️ %s일 환율 데이터가 외부 API에 없습니다. (주말이거나 공휴일일 수 있습니다)", targetDate);
                log.warn("📅 [관리자 대시보드] {}", message);
                return ResponseEntity.ok(ApiResponse.success(message, message));
            }
            
        } catch (Exception e) {
            log.error("💥 [관리자 대시보드] 환율 데이터 가져오기 실패: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            log.error("📋 [관리자 대시보드] 오류 상세 정보:", e);
            
            // GlobalExceptionHandler에서 처리되도록 예외를 다시 던집니다
            throw e;
        }
    }

    /**
     * 오늘의 환율 데이터를 조회합니다.
     */
    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<ExchangeRateResponseDTO>>> getTodayExchangeRates() {
        try {
            List<ExchangeRateResponseDTO> rates = exchangeRateService.getTodayExchangeRates();
            return ResponseEntity.ok(ApiResponse.success(rates));
        } catch (IllegalArgumentException e) {
            log.warn("❌ [ExchangeRateController] 오늘 환율 데이터 조회 실패 - 잘못된 파라미터: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("💥 [ExchangeRateController] 오늘 환율 데이터 조회 중 예상치 못한 오류: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("오늘 환율 데이터 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 최근 환율 데이터를 조회합니다.
     */
    @GetMapping("/latest")
    public ResponseEntity<ApiResponse<List<ExchangeRateResponseDTO>>> getLatestExchangeRates() {
        try {
            List<ExchangeRateResponseDTO> rates = exchangeRateService.getLatestExchangeRates();
            return ResponseEntity.ok(ApiResponse.success(rates));
        } catch (IllegalArgumentException e) {
            log.warn("❌ [ExchangeRateController] 최근 환율 데이터 조회 실패 - 잘못된 파라미터: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("💥 [ExchangeRateController] 최근 환율 데이터 조회 중 예상치 못한 오류: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("최근 환율 데이터 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 특정 통화 코드의 환율 데이터를 조회합니다.
     */
    @GetMapping("/currency/{curUnit}")
    public ResponseEntity<ApiResponse<List<ExchangeRateResponseDTO>>> getExchangeRatesByCurrency(
            @PathVariable String curUnit) {
        try {
            if (curUnit == null || curUnit.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("통화 코드를 입력해주세요."));
            }
            
            List<ExchangeRateResponseDTO> rates = exchangeRateService.getExchangeRatesByCurrency(curUnit);
            return ResponseEntity.ok(ApiResponse.success(rates));
        } catch (IllegalArgumentException e) {
            log.warn("❌ [ExchangeRateController] 통화별 환율 데이터 조회 실패 - 잘못된 파라미터: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("💥 [ExchangeRateController] 통화별 환율 데이터 조회 중 예상치 못한 오류: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("통화별 환율 데이터 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 특정 국가들의 최근 6개월 환율 데이터를 수동으로 가져와 저장합니다.
     */
    @PostMapping("/fetch-countries")
    public ResponseEntity<ApiResponse<String>> fetchExchangeRatesByCountries(
            @RequestParam List<String> countries) {
        
        log.info("🌍 [관리자 대시보드] 국가별 환율 데이터 수동 가져오기 요청: 국가 목록 = {}", countries);
        
        try {
            int totalCount = exchangeRateService.fetchExchangeRatesForCountries(countries);
            
            if (totalCount > 0) {
                String message = String.format("✅ %s 국가의 최근 6개월 환율 데이터를 성공적으로 가져왔습니다. 총 %d개의 데이터가 저장되었습니다.", 
                    String.join(", ", countries), totalCount);
                log.info("🎉 [관리자 대시보드] {}", message);
                return ResponseEntity.ok(ApiResponse.success(message, message));
            } else {
                String message = String.format("⚠️ %s 국가의 환율 데이터를 가져오지 못했습니다.", String.join(", ", countries));
                log.warn("📅 [관리자 대시보드] {}", message);
                return ResponseEntity.ok(ApiResponse.success(message, message));
            }
            
        } catch (Exception e) {
            log.error("💥 [관리자 대시보드] 국가별 환율 데이터 가져오기 실패: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            log.error("📋 [관리자 대시보드] 오류 상세 정보:", e);
            
            // GlobalExceptionHandler에서 처리되도록 예외를 다시 던집니다
            throw e;
        }
    }
} 