package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.ExchangeRate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 프론트엔드에 환율 데이터를 응답하기 위한 DTO 클래스
 * ExchangeRateApiResponse와 다르게 원시 API 응답을 가공하여 필요한 형태로 제공합니다.
 * 주요 환율 정보만 포함하여 프론트엔드에 전달합니다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExchangeRateResponseDTO {
    
    private LocalDate date;         // 조회 날짜
    private String curUnit;         // 통화 코드 (예: USD, EUR, JPY)
    private String curNm;           // 통화명 (예: 미국 달러, 유로, 일본 엔)
    private Double dealBasRate;     // 거래 기준율
    private Double bkpr;            // 장부가격
    private Double ttb;             // 전신환 매입률
    private Double tts;             // 전신환 매도율
    
    /**
     * 엔티티로부터 응답 DTO 객체를 생성합니다.
     * 
     * @param exchangeRate 변환할 환율 엔티티
     * @return 변환된 DTO 객체
     */
    public static ExchangeRateResponseDTO fromEntity(ExchangeRate exchangeRate) {
        return ExchangeRateResponseDTO.builder()
                .date(exchangeRate.getSearchDate())
                .curUnit(exchangeRate.getCurUnit())
                .curNm(exchangeRate.getCurNm())
                .dealBasRate(exchangeRate.getDealBasRate())
                .bkpr(exchangeRate.getBkpr())
                .ttb(exchangeRate.getTtb())
                .tts(exchangeRate.getTts())
                .build();
    }
    
    /**
     * 엔티티 목록을 응답 DTO 목록으로 변환합니다.
     * 
     * @param exchangeRates 변환할 환율 엔티티 목록
     * @return 변환된 DTO 객체 목록
     */
    public static List<ExchangeRateResponseDTO> fromEntities(List<ExchangeRate> exchangeRates) {
        return exchangeRates.stream()
                .map(ExchangeRateResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * 화폐 단위를 추가한 거래 기준율 문자열을 반환합니다.
     * 프론트엔드 표시용으로 사용됩니다.
     */
    public String getFormattedDealBasRate() {
        if (dealBasRate == null) {
            return "정보 없음";
        }
        
        // 통화별 포맷팅
        if ("JPY(100)".equals(curUnit)) {
            return String.format("%.1f원/100엔", dealBasRate);
        } else if ("USD".equals(curUnit)) {
            return String.format("%.1f원/달러", dealBasRate);
        } else if ("EUR".equals(curUnit)) {
            return String.format("%.1f원/유로", dealBasRate);
        } else if ("CNH".equals(curUnit)) {
            return String.format("%.1f원/위안", dealBasRate);
        } else {
            return String.format("%.1f원", dealBasRate);
        }
    }
} 