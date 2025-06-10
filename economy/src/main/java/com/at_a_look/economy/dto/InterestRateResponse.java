package com.at_a_look.economy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterestRateResponse {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CountryRate {
        private String countryCode;
        private String countryName;
        private String bankName;
        private String rateType;
        private Double rate;
        private LocalDate lastUpdated;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoryData {
        private LocalDate date;
        private Map<String, Double> rates; // 국가코드 -> 금리 값
    }

    private CountryRate korea;      // 한국 (기준금리)
    
    private List<HistoryData> history; // 12개월 히스토리
    private LocalDate lastUpdated;
    private String message;
} 