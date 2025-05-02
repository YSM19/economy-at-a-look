package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.ConsumerPriceIndexDto;
import com.at_a_look.economy.dto.ExchangeRateDto;
import com.at_a_look.economy.dto.InterestRateDto;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.dto.response.ConsumerPriceIndexResponse;
import com.at_a_look.economy.dto.response.EconomicIndexResponse;
import com.at_a_look.economy.dto.response.ExchangeRateResponse;
import com.at_a_look.economy.dto.response.InterestRateResponse;
import com.at_a_look.economy.service.ConsumerPriceIndexService;
import com.at_a_look.economy.service.EconomicIndexService;
import com.at_a_look.economy.service.ExchangeRateService;
import com.at_a_look.economy.service.InterestRateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/economic")
@CrossOrigin(origins = "*")
@Tag(name = "경제 지표 API", description = "환율, 금리, 물가지수, 경제 심리 지수 정보를 제공하는 API")
public class EconomicDataController {

    private final ExchangeRateService exchangeRateService;
    private final InterestRateService interestRateService;
    private final ConsumerPriceIndexService consumerPriceIndexService;
    private final EconomicIndexService economicIndexService;

    // 종합 경제 심리 지수 조회
    @GetMapping("/index")
    @Operation(summary = "경제 심리 지수 조회", description = "금리, 환율, 물가지수를 종합한 경제 심리 지수를 조회합니다.")
    public ResponseEntity<ApiResponse<EconomicIndexResponse>> getEconomicIndex() {
        EconomicIndexResponse response = economicIndexService.getEconomicIndex();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 최신 환율 정보 조회
    @GetMapping("/exchange-rate")
    @Operation(summary = "최신 환율 정보 조회", description = "최신 원/달러, 원/유로, 원/엔 환율 정보를 조회합니다.")
    public ResponseEntity<ApiResponse<ExchangeRateResponse>> getExchangeRate() {
        ExchangeRateResponse response = exchangeRateService.fetchLatestExchangeRates();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 특정 기간 환율 정보 조회
    @GetMapping("/exchange-rate/period")
    @Operation(summary = "특정 기간 환율 정보 조회", description = "지정된 기간 동안의 환율 정보를 조회합니다.")
    public ResponseEntity<ApiResponse<List<ExchangeRateDto>>> getExchangeRateByPeriod(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        List<ExchangeRateDto> response = exchangeRateService.getExchangeRatesByDateRange(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 최신 금리 정보 조회
    @GetMapping("/interest-rate")
    @Operation(summary = "최신 금리 정보 조회", description = "최신 한국은행 기준금리, 미 연준 기준금리, 시장금리 정보를 조회합니다.")
    public ResponseEntity<ApiResponse<InterestRateResponse>> getInterestRate() {
        InterestRateResponse response = interestRateService.fetchLatestInterestRates();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 특정 기간 금리 정보 조회
    @GetMapping("/interest-rate/period")
    @Operation(summary = "특정 기간 금리 정보 조회", description = "지정된 기간 동안의 금리 정보를 조회합니다.")
    public ResponseEntity<ApiResponse<List<InterestRateDto>>> getInterestRateByPeriod(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        List<InterestRateDto> response = interestRateService.getInterestRatesByDateRange(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 최신 소비자물가지수 조회
    @GetMapping("/consumer-price-index")
    @Operation(summary = "최신 소비자물가지수 조회", description = "최신 소비자물가지수(CPI) 정보와 변화율을 조회합니다.")
    public ResponseEntity<ApiResponse<ConsumerPriceIndexResponse>> getConsumerPriceIndex() {
        ConsumerPriceIndexResponse response = consumerPriceIndexService.fetchLatestConsumerPriceIndex();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 특정 기간 소비자물가지수 조회
    @GetMapping("/consumer-price-index/period")
    @Operation(summary = "특정 기간 소비자물가지수 조회", description = "지정된 기간 동안의 소비자물가지수 정보를 조회합니다.")
    public ResponseEntity<ApiResponse<List<ConsumerPriceIndexDto>>> getConsumerPriceIndexByPeriod(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        List<ConsumerPriceIndexDto> response = consumerPriceIndexService.getConsumerPriceIndexByDateRange(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}