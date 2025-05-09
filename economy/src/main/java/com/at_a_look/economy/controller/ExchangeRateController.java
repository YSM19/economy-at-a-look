package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.ExchangeRateResponseDTO;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.service.ExchangeRateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
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
        log.info("환율 데이터 수동 가져오기 요청: 날짜 = {}", targetDate);
        
        try {
            int count = exchangeRateService.fetchExchangeRates(targetDate);
            String message = String.format("환율 데이터를 성공적으로 가져왔습니다. %d개의 데이터가 저장되었습니다.", count);
            log.info(message);
            return ResponseEntity.ok(ApiResponse.success(message, message));
        } catch (Exception e) {
            // GlobalExceptionHandler에서 처리되므로 여기서는 로그만 남김
            log.error("환율 데이터 가져오기 실패: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * 오늘의 환율 데이터를 조회합니다.
     */
    @GetMapping("/today")
    public ResponseEntity<List<ExchangeRateResponseDTO>> getTodayExchangeRates() {
        List<ExchangeRateResponseDTO> rates = exchangeRateService.getTodayExchangeRates();
        return ResponseEntity.ok(rates);
    }

    /**
     * 최근 환율 데이터를 조회합니다.
     */
    @GetMapping("/latest")
    public ResponseEntity<List<ExchangeRateResponseDTO>> getLatestExchangeRates() {
        List<ExchangeRateResponseDTO> rates = exchangeRateService.getLatestExchangeRates();
        return ResponseEntity.ok(rates);
    }

    /**
     * 특정 통화 코드의 환율 데이터를 조회합니다.
     */
    @GetMapping("/currency/{curUnit}")
    public ResponseEntity<List<ExchangeRateResponseDTO>> getExchangeRatesByCurrency(
            @PathVariable String curUnit) {
        
        List<ExchangeRateResponseDTO> rates = exchangeRateService.getExchangeRatesByCurrency(curUnit);
        return ResponseEntity.ok(rates);
    }
} 