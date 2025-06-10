package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.ConsumerPriceIndexDto;
import com.at_a_look.economy.dto.EconomicIndexDto;
import com.at_a_look.economy.dto.ExchangeRateDto;
import com.at_a_look.economy.dto.InterestRateDto;
import com.at_a_look.economy.dto.InterestRateResponse;
import com.at_a_look.economy.dto.response.EconomicIndexResponse;
import com.at_a_look.economy.entity.EconomicIndex;
import com.at_a_look.economy.repository.EconomicIndexRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EconomicIndexService {

    private final EconomicIndexRepository economicIndexRepository;
    private final ExchangeRateService exchangeRateService;
    private final InterestRateService interestRateService;
    private final ConsumerPriceIndexService consumerPriceIndexService;

    // 종합 경제 심리 지수 계산 및 가져오기
    public EconomicIndexResponse getEconomicIndex() {
        Optional<EconomicIndex> latestIndex = economicIndexRepository.findTopByOrderByDateDesc();
        
        // 저장된 지수가 있으면 반환
        if (latestIndex.isPresent() && latestIndex.get().getDate().equals(LocalDate.now())) {
            EconomicIndex index = latestIndex.get();
            return createIndexResponse(index);
        }
        
        // 없으면 계산하여 저장 후 반환
        double indexValue = calculateEconomicIndex();
        String indexStatus = getStatusForIndex(indexValue);
        
        EconomicIndex newIndex = EconomicIndex.builder()
                .date(LocalDate.now())
                .indexValue(indexValue)
                .indexStatus(indexStatus)
                .build();
        
        EconomicIndex savedIndex = economicIndexRepository.save(newIndex);
        return createIndexResponse(savedIndex);
    }

    // 경제 지수 계산 (금리, 환율, 물가지수 종합)
    private double calculateEconomicIndex() {
        // 실제 구현 시 각 지표의 가중치와 정규화 방식을 결정해야 함
        // 임시 계산 로직
        double interestRateWeight = 0.33;
        double exchangeRateWeight = 0.33;
        double cpiWeight = 0.34;
        
        // 각 지표 최신값 가져오기
        InterestRateResponse interestRateResponse = interestRateService.fetchLatestInterestRates();
        Optional<ExchangeRateDto> exchangeRate = exchangeRateService.getLatestExchangeRate();
        Optional<ConsumerPriceIndexDto> cpi = consumerPriceIndexService.getLatestConsumerPriceIndex();
        
        // 지표별 점수 계산 (0-100 사이 값)
        double interestRateScore = calculateInterestRateScore(interestRateResponse);
        double exchangeRateScore = exchangeRate.map(this::calculateExchangeRateScore).orElse(50.0);
        double cpiScore = cpi.map(this::calculateCPIScore).orElse(50.0);
        
        // 가중 평균으로 종합 지수 계산
        return (interestRateScore * interestRateWeight) + 
               (exchangeRateScore * exchangeRateWeight) + 
               (cpiScore * cpiWeight);
    }
    
    // 금리 점수 계산
    private double calculateInterestRateScore(InterestRateResponse interestRateResponse) {
        // 실제 구현 시 금리 범위와 점수 매핑을 정교하게 설정
        // 임시 계산 로직 - 한국 금리 사용
        if (interestRateResponse.getKorea() == null) return 50.0;
        
        double kbRate = interestRateResponse.getKorea().getRate();
        if (kbRate < 2.0) return 85.0; // 매우 낮은 금리 -> 경기확장/과열
        else if (kbRate < 2.5) return 75.0; // 낮은 금리 -> 경기확장
        else if (kbRate < 3.0) return 65.0; // 약간 낮은 금리 -> 경기확장
        else if (kbRate < 3.5) return 55.0; // 중간 금리 -> 중립
        else if (kbRate < 4.0) return 45.0; // 약간 높은 금리 -> 경기침체
        else if (kbRate < 4.5) return 35.0; // 높은 금리 -> 경기침체
        else return 25.0; // 매우 높은 금리 -> 경기침체
    }
    
    // 환율 점수 계산
    private double calculateExchangeRateScore(ExchangeRateDto exchangeRate) {
        // 실제 구현 시 환율 범위와 점수 매핑을 정교하게 설정
        // 임시 계산 로직
        double usdRate = exchangeRate.getUsdRate();
        if (usdRate < 1100) return 75.0; // 매우 낮은 환율 -> 경기확장
        else if (usdRate < 1200) return 65.0; // 낮은 환율 -> 경기확장
        else if (usdRate < 1300) return 55.0; // 중간 환율 -> 중립
        else if (usdRate < 1400) return 45.0; // 약간 높은 환율 -> 경기침체
        else if (usdRate < 1500) return 35.0; // 높은 환율 -> 경기침체
        else return 25.0; // 매우 높은 환율 -> 경기침체
    }
    
    // 물가지수 점수 계산
    private double calculateCPIScore(ConsumerPriceIndexDto cpi) {
        // 실제 구현 시 CPI 변화율 범위와 점수 매핑을 정교하게 설정
        // 임시 계산 로직 (연간 변화율 기준)
        double annualChange = cpi.getAnnualChange();
        if (annualChange < 1.0) return 35.0; // 매우 낮은 물가상승률 -> 경기침체
        else if (annualChange < 2.0) return 50.0; // 적정 물가상승률 -> 중립
        else if (annualChange < 3.0) return 60.0; // 약간 높은 물가상승률 -> 경기확장
        else if (annualChange < 4.0) return 70.0; // 높은 물가상승률 -> 경기확장
        else if (annualChange < 5.0) return 80.0; // 매우 높은 물가상승률 -> 경기과열
        else return 90.0; // 극도로 높은 물가상승률 -> 경기과열
    }
    
    // 지수 값에 따른 상태 텍스트 반환
    private String getStatusForIndex(double index) {
        if (index <= 25) {
            return "극심한 경기침체";
        } else if (index <= 45) {
            return "경기침체";
        } else if (index <= 55) {
            return "중립";
        } else if (index <= 75) {
            return "경기확장";
        } else {
            return "경기과열";
        }
    }
    
    // 응답 데이터 생성
    private EconomicIndexResponse createIndexResponse(EconomicIndex index) {
        return EconomicIndexResponse.builder()
                .indexValue(index.getIndexValue())
                .indexStatus(index.getIndexStatus())
                .date(index.getDate())
                .build();
    }
    
    // 경제 지수 DTO로 가져오기
    public Optional<EconomicIndexDto> getLatestEconomicIndexDto() {
        return economicIndexRepository.findTopByOrderByDateDesc()
                .map(EconomicIndexDto::fromEntity);
    }
    
    // 경제 지수 저장
    public EconomicIndexDto saveEconomicIndex(EconomicIndexDto dto) {
        EconomicIndex savedEntity = economicIndexRepository.save(dto.toEntity());
        return EconomicIndexDto.fromEntity(savedEntity);
    }
} 