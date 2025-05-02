package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.ConsumerPriceIndexDto;
import com.at_a_look.economy.dto.response.ConsumerPriceIndexResponse;
import com.at_a_look.economy.entity.ConsumerPriceIndex;
import com.at_a_look.economy.repository.ConsumerPriceIndexRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ConsumerPriceIndexService {

    private final ConsumerPriceIndexRepository consumerPriceIndexRepository;
    private final RestTemplate restTemplate;

    // 최신 소비자물가지수 정보 가져오기
    public ConsumerPriceIndexResponse fetchLatestConsumerPriceIndex() {
        // 실제 API 연결 시 구현
        // 통계청 API 활용: https://kostat.go.kr/

        // 임시 데이터 반환
        ConsumerPriceIndex latestCPI = consumerPriceIndexRepository.findTopByOrderByDateDesc()
                .orElse(ConsumerPriceIndex.builder()
                        .date(LocalDate.now())
                        .cpiValue(110.5)
                        .monthlyChange(0.64)
                        .annualChange(3.8)
                        .build());

        List<ConsumerPriceIndex> history = consumerPriceIndexRepository.findTop7ByOrderByDateDesc();
        List<ConsumerPriceIndexDto> historyDtos = ConsumerPriceIndexDto.fromEntities(history);

        return ConsumerPriceIndexResponse.builder()
                .currentCPI(latestCPI.getCpiValue())
                .changeRate(latestCPI.getMonthlyChange())
                .annualRate(latestCPI.getAnnualChange())
                .history(historyDtos)
                .build();
    }

    // 특정 기간 소비자물가지수 데이터 가져오기
    public List<ConsumerPriceIndexDto> getConsumerPriceIndexByDateRange(LocalDate startDate, LocalDate endDate) {
        List<ConsumerPriceIndex> cpiList = consumerPriceIndexRepository.findByDateBetween(startDate, endDate);
        return ConsumerPriceIndexDto.fromEntities(cpiList);
    }

    // 소비자물가지수 데이터 저장
    public ConsumerPriceIndexDto saveConsumerPriceIndex(ConsumerPriceIndexDto cpiDto) {
        ConsumerPriceIndex savedEntity = consumerPriceIndexRepository.save(cpiDto.toEntity());
        return ConsumerPriceIndexDto.fromEntity(savedEntity);
    }

    // 최신 소비자물가지수 정보 조회
    public Optional<ConsumerPriceIndexDto> getLatestConsumerPriceIndex() {
        return consumerPriceIndexRepository.findTopByOrderByDateDesc()
                .map(ConsumerPriceIndexDto::fromEntity);
    }
} 