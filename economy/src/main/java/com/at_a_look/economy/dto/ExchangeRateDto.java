package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.ExchangeRate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 경제지표 API를 위한 통합 환율 DTO
 * 주요 통화(USD, EUR, JPY)의 환율 정보를 통합하여 제공합니다.
 * 통계, 그래프 표시, 기간별 비교 등에 사용됩니다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExchangeRateDto {
    private LocalDate date;    // 기준 날짜
    private Double usdRate;    // 미국 달러 환율
    private Double eurRate;    // 유럽 유로 환율
    private Double jpyRate;    // 일본 엔화 환율
    
    /**
     * ExchangeRate 엔티티에서 DTO로 변환합니다.
     * 특정 통화의 정보만 설정하는 메서드입니다.
     * 
     * @param entity 환율 엔티티
     * @param curUnit 통화 코드 (USD, EUR, JPY)
     * @return 변환된 DTO 객체
     */
    public static ExchangeRateDto fromEntity(ExchangeRate entity, String curUnit) {
        // 엔티티의 기준 환율 값 가져오기 (이미 Double 타입)
        Double rate = entity.getDealBasRate();
        
        ExchangeRateDto dto = ExchangeRateDto.builder()
                .date(entity.getSearchDate())
                .build();
        
        // 통화코드에 따라 적절한 필드에 값 설정
        switch (curUnit) {
            case "USD" -> dto.setUsdRate(rate);
            case "EUR" -> dto.setEurRate(rate);
            case "JPY" -> dto.setJpyRate(rate);
        }
        
        return dto;
    }
    
    /**
     * 주요 통화(USD, EUR, JPY)가 모두 포함된 DTO를 생성합니다.
     * 
     * @param date 기준 날짜
     * @param usdRate 미국 달러 환율
     * @param eurRate 유럽 유로 환율
     * @param jpyRate 일본 엔화 환율
     * @return 생성된 DTO 객체
     */
    public static ExchangeRateDto createWithAllRates(LocalDate date, Double usdRate, Double eurRate, Double jpyRate) {
        return ExchangeRateDto.builder()
                .date(date)
                .usdRate(usdRate)
                .eurRate(eurRate)
                .jpyRate(jpyRate)
                .build();
    }
} 