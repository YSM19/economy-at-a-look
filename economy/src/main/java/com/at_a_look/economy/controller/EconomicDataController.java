package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.ConsumerPriceIndexDto;
import com.at_a_look.economy.dto.ExchangeRateDto;
import com.at_a_look.economy.dto.InterestRateDto;
import com.at_a_look.economy.dto.InterestRateResponse;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.dto.response.ConsumerPriceIndexResponse;
import com.at_a_look.economy.dto.response.EconomicIndexResponse;
import com.at_a_look.economy.dto.response.ExchangeRateResponse;
import com.at_a_look.economy.scheduler.ConsumerPriceIndexScheduler;
import com.at_a_look.economy.scheduler.InterestRateScheduler;
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
    private final InterestRateScheduler interestRateScheduler;
    private final ConsumerPriceIndexScheduler consumerPriceIndexScheduler;

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
    
    // 금리 데이터 강제 새로고침
    @PostMapping("/interest-rate/refresh")
    @Operation(summary = "금리 데이터 새로고침", description = "한국은행 API에서 최신 금리 데이터를 강제로 가져옵니다.")
    public ResponseEntity<ApiResponse<String>> refreshInterestRate() {
        try {
            interestRateService.fetchLatestInterestRatesWithApiCall();
            return ResponseEntity.ok(ApiResponse.success("금리 데이터가 성공적으로 업데이트되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("금리 데이터 업데이트 실패: " + e.getMessage()));
        }
    }

    // 스케줄러 수동 실행 (개발/테스트용)
    @PostMapping("/interest-rate/scheduler/run")
    @Operation(summary = "[개발용] 스케줄러 수동 실행", description = "스케줄러를 수동으로 실행하여 금리 데이터를 업데이트합니다.")
    public ResponseEntity<ApiResponse<String>> runSchedulerManually() {
        try {
            interestRateScheduler.runImmediately();
            return ResponseEntity.ok(ApiResponse.success("스케줄러가 수동으로 실행되어 데이터가 업데이트되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("스케줄러 수동 실행 실패: " + e.getMessage()));
        }
    }

    // 특정 기간 금리 정보 조회
    @GetMapping("/interest-rate/period")
    @Operation(summary = "특정 기간 금리 정보 조회", description = "지정된 기간 동안의 금리 정보를 조회합니다.")
    public ResponseEntity<ApiResponse<String>> getInterestRateByPeriod(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        // 새로운 구조에서는 기간별 조회가 다른 방식으로 구현됨
        return ResponseEntity.ok(ApiResponse.success("기간별 금리 조회 기능은 새로운 구조로 개선 중입니다."));
    }

    // 금리 발표일만 조회 (모든 국가)
    @GetMapping("/interest-rate/announcements")
    @Operation(summary = "금리 발표일 조회", description = "모든 국가의 금리 발표일(변경일)만 조회합니다.")
    public ResponseEntity<ApiResponse<List<InterestRateDto>>> getInterestRateAnnouncements() {
        List<InterestRateDto> announcements = interestRateService.getAnnouncementDates();
        return ResponseEntity.ok(ApiResponse.success(announcements));
    }

    // 특정 국가의 금리 발표일만 조회
    @GetMapping("/interest-rate/announcements/{countryCode}")
    @Operation(summary = "특정 국가 금리 발표일 조회", description = "특정 국가의 금리 발표일(변경일)만 조회합니다.")
    public ResponseEntity<ApiResponse<List<InterestRateDto>>> getInterestRateAnnouncementsByCountry(
            @PathVariable String countryCode) {
        List<InterestRateDto> announcements = interestRateService.getAnnouncementDatesByCountry(countryCode);
        return ResponseEntity.ok(ApiResponse.success(announcements));
    }

    // 특정 기간의 금리 발표일만 조회
    @GetMapping("/interest-rate/announcements/period")
    @Operation(summary = "특정 기간 금리 발표일 조회", description = "지정된 기간 동안의 금리 발표일(변경일)만 조회합니다.")
    public ResponseEntity<ApiResponse<List<InterestRateDto>>> getInterestRateAnnouncementsByPeriod(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        List<InterestRateDto> announcements = interestRateService.getAnnouncementDatesByPeriod(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(announcements));
    }

    // 어드민용: 1년 금리 데이터 수동 호출
    @PostMapping("/admin/interest-rate/fetch/yearly")
    @Operation(summary = "[어드민] 1년 금리 데이터 수동 호출", description = "한국은행 API에서 최근 1년간의 금리 데이터를 수동으로 가져옵니다.")
    public ResponseEntity<ApiResponse<String>> fetchYearlyInterestRateData() {
        try {
            interestRateService.fetchAndSaveYearlyRates();
            return ResponseEntity.ok(ApiResponse.success("최근 1년간의 금리 데이터가 성공적으로 업데이트되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("1년 금리 데이터 가져오기 실패: " + e.getMessage()));
        }
    }

    // 어드민용: 1달 금리 데이터 수동 호출
    @PostMapping("/admin/interest-rate/fetch/monthly")
    @Operation(summary = "[어드민] 1달 금리 데이터 수동 호출", description = "한국은행 API에서 최근 1개월간의 금리 데이터를 수동으로 가져옵니다.")
    public ResponseEntity<ApiResponse<String>> fetchMonthlyInterestRateData() {
        try {
            interestRateService.fetchAndSaveMonthlyRates();
            return ResponseEntity.ok(ApiResponse.success("최근 1개월간의 금리 데이터가 성공적으로 업데이트되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("1달 금리 데이터 가져오기 실패: " + e.getMessage()));
        }
    }

    // 어드민용: 커스텀 연도 금리 데이터 수동 호출
    @PostMapping("/admin/interest-rate/fetch/custom")
    @Operation(summary = "[어드민] 커스텀 연도 금리 데이터 수동 호출", description = "한국은행 API에서 지정된 연도만큼의 금리 데이터를 수동으로 가져옵니다.")
    public ResponseEntity<ApiResponse<String>> fetchCustomYearsInterestRateData(@RequestParam int years) {
        try {
            if (years < 1 || years > 10) {
                return ResponseEntity.ok(ApiResponse.error("연도는 1년에서 10년 사이로 입력해주세요."));
            }
            
            interestRateService.fetchAndSaveCustomYearsRates(years);
            return ResponseEntity.ok(ApiResponse.success("최근 " + years + "년간의 금리 데이터가 성공적으로 업데이트되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(years + "년 금리 데이터 가져오기 실패: " + e.getMessage()));
        }
    }

    // 어드민용: 1년 환율 데이터 수동 호출
    @PostMapping("/admin/exchange-rate/fetch/yearly")
    @Operation(summary = "[어드민] 1년 환율 데이터 수동 호출", description = "외부 API에서 최근 1년간의 환율 데이터를 수동으로 가져옵니다.")
    public ResponseEntity<ApiResponse<String>> fetchYearlyExchangeRateData() {
        try {
            int totalCount = exchangeRateService.fetchYearlyExchangeRates();
            return ResponseEntity.ok(ApiResponse.success("최근 1년간의 환율 데이터가 성공적으로 업데이트되었습니다. (총 " + totalCount + "개 데이터)"));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("1년 환율 데이터 가져오기 실패: " + e.getMessage()));
        }
    }

    // 어드민용: 1달 환율 데이터 수동 호출
    @PostMapping("/admin/exchange-rate/fetch/monthly")
    @Operation(summary = "[어드민] 1달 환율 데이터 수동 호출", description = "외부 API에서 최근 1개월간의 환율 데이터를 수동으로 가져옵니다.")
    public ResponseEntity<ApiResponse<String>> fetchMonthlyExchangeRateData() {
        try {
            int totalCount = exchangeRateService.fetchMonthlyExchangeRates();
            return ResponseEntity.ok(ApiResponse.success("최근 1개월간의 환율 데이터가 성공적으로 업데이트되었습니다. (총 " + totalCount + "개 데이터)"));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("1달 환율 데이터 가져오기 실패: " + e.getMessage()));
        }
    }

    // 디버깅용: 데이터베이스 금리 데이터 확인
    @GetMapping("/interest-rate/debug")
    @Operation(summary = "[디버깅] 금리 데이터 상태 확인", description = "현재 데이터베이스의 금리 데이터 상태를 확인합니다.")
    public ResponseEntity<ApiResponse<String>> debugInterestRateData() {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append("=== 금리 데이터 디버깅 정보 ===\n");
            
            // 실제 API 응답 확인
            var actualResponse = interestRateService.fetchLatestInterestRates();
            sb.append(String.format("실제 API 응답:\n"));
            sb.append(String.format("  - 한국 금리: %s\n", 
                    actualResponse.getKorea() != null ? 
                    actualResponse.getKorea().getRate() + "%" : "null"));
            sb.append(String.format("  - 메시지: %s\n", actualResponse.getMessage()));
            sb.append(String.format("  - 업데이트 날짜: %s\n\n", actualResponse.getLastUpdated()));
            
            // 발표일 기준 최신 데이터
            var latestAnnouncement = interestRateService.getAnnouncementDates();
            sb.append(String.format("발표일 기준 최신 데이터: %d개\n", latestAnnouncement.size()));
            
            if (!latestAnnouncement.isEmpty()) {
                sb.append("최근 발표일 데이터:\n");
                latestAnnouncement.stream().limit(5).forEach(rate -> 
                    sb.append(String.format("  - %s: %s%% (%s)\n", 
                            rate.getCountryName(), rate.getInterestRate(), rate.getDate())));
            }
            
            // 한국 금리 발표일만
            var koreaAnnouncements = interestRateService.getAnnouncementDatesByCountry("KR");
            sb.append(String.format("\n한국 금리 발표일: %d개\n", koreaAnnouncements.size()));
            
            if (!koreaAnnouncements.isEmpty()) {
                sb.append("한국 최근 발표일:\n");
                koreaAnnouncements.stream().limit(3).forEach(rate -> 
                    sb.append(String.format("  - %s%% (%s)\n", rate.getInterestRate(), rate.getDate())));
            }
            
            return ResponseEntity.ok(ApiResponse.success(sb.toString()));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("디버깅 조회 실패: " + e.getMessage()));
        }
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
        String startDateStr = startDate.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMM"));
        String endDateStr = endDate.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMM"));
        List<ConsumerPriceIndexDto> response = consumerPriceIndexService.getConsumerPriceIndexByDateRange(startDateStr, endDateStr);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 소비자물가지수 데이터 강제 새로고침
    @PostMapping("/consumer-price-index/refresh")
    @Operation(summary = "소비자물가지수 데이터 새로고침", description = "한국은행 ECOS API에서 최신 소비자물가지수 데이터를 강제로 가져옵니다.")
    public ResponseEntity<ApiResponse<String>> refreshConsumerPriceIndex() {
        try {
            consumerPriceIndexService.fetchLatestConsumerPriceIndexWithApiCall();
            return ResponseEntity.ok(ApiResponse.success("소비자물가지수 데이터가 성공적으로 업데이트되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("소비자물가지수 데이터 업데이트 실패: " + e.getMessage()));
        }
    }

    // CPI 스케줄러 수동 실행 (개발/테스트용)
    @PostMapping("/consumer-price-index/scheduler/run")
    @Operation(summary = "[개발용] CPI 스케줄러 수동 실행", description = "소비자물가지수 스케줄러를 수동으로 실행하여 데이터를 업데이트합니다.")
    public ResponseEntity<ApiResponse<String>> runCPISchedulerManually() {
        try {
            consumerPriceIndexScheduler.runImmediately();
            return ResponseEntity.ok(ApiResponse.success("소비자물가지수 스케줄러가 수동으로 실행되어 데이터가 업데이트되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("소비자물가지수 스케줄러 수동 실행 실패: " + e.getMessage()));
        }
    }

    // 어드민용: 2년 소비자물가지수 데이터 수동 호출
    @PostMapping("/admin/consumer-price-index/fetch/2years")
    @Operation(summary = "[어드민] 2년 소비자물가지수 데이터 수동 호출", description = "한국은행 ECOS API에서 최근 2년간의 소비자물가지수 데이터를 수동으로 가져옵니다.")
    public ResponseEntity<ApiResponse<String>> fetch2YearsConsumerPriceIndexData() {
        try {
            consumerPriceIndexService.fetchAndSave2YearsData();
            return ResponseEntity.ok(ApiResponse.success("최근 2년간의 소비자물가지수 데이터가 성공적으로 업데이트되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("2년 소비자물가지수 데이터 가져오기 실패: " + e.getMessage()));
        }
    }

    // 어드민용: 1년 소비자물가지수 데이터 수동 호출
    @PostMapping("/admin/consumer-price-index/fetch/yearly")
    @Operation(summary = "[어드민] 1년 소비자물가지수 데이터 수동 호출", description = "한국은행 ECOS API에서 최근 1년간의 소비자물가지수 데이터를 수동으로 가져옵니다.")
    public ResponseEntity<ApiResponse<String>> fetch1YearConsumerPriceIndexData() {
        try {
            consumerPriceIndexService.fetchAndSave1YearData();
            return ResponseEntity.ok(ApiResponse.success("최근 1년간의 소비자물가지수 데이터가 성공적으로 업데이트되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("1년 소비자물가지수 데이터 가져오기 실패: " + e.getMessage()));
        }
    }

    // 디버깅용: 데이터베이스 소비자물가지수 데이터 확인
    @GetMapping("/consumer-price-index/debug")
    @Operation(summary = "[디버깅] 소비자물가지수 데이터 상태 확인", description = "현재 데이터베이스의 소비자물가지수 데이터 상태를 확인합니다.")
    public ResponseEntity<ApiResponse<String>> debugConsumerPriceIndexData() {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append("=== 소비자물가지수 데이터 디버깅 정보 ===\n");
            
            // 실제 API 응답 확인
            var actualResponse = consumerPriceIndexService.fetchLatestConsumerPriceIndex();
            sb.append(String.format("실제 API 응답:\n"));
            sb.append(String.format("  - 현재 CPI: %s\n", actualResponse.getCurrentCPI()));
            sb.append(String.format("  - 월별 변화율: %s%%\n", actualResponse.getChangeRate()));
            sb.append(String.format("  - 연간 변화율: %s%%\n", actualResponse.getAnnualRate()));
            sb.append(String.format("  - 히스토리 데이터: %d개\n\n", 
                actualResponse.getHistory() != null ? actualResponse.getHistory().size() : 0));
            
            // 최신 데이터 확인
            var latestCPI = consumerPriceIndexService.getLatestConsumerPriceIndex();
            sb.append(String.format("최신 CPI 데이터: %s\n", 
                latestCPI.isPresent() ? "존재" : "없음"));
            
            if (latestCPI.isPresent()) {
                var cpi = latestCPI.get();
                sb.append(String.format("  - 날짜: %s\n", cpi.getDate()));
                sb.append(String.format("  - CPI 값: %s\n", cpi.getCpiValue()));
                sb.append(String.format("  - 월별 변화율: %s%%\n", cpi.getMonthlyChange()));
                sb.append(String.format("  - 연간 변화율: %s%%\n", cpi.getAnnualChange()));
            }
            
            return ResponseEntity.ok(ApiResponse.success(sb.toString()));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("디버깅 조회 실패: " + e.getMessage()));
        }
    }
}