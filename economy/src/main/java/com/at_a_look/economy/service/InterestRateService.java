package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.InterestRateDto;
import com.at_a_look.economy.dto.response.InterestRateResponse;
import com.at_a_look.economy.entity.InterestRate;
import com.at_a_look.economy.repository.InterestRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InterestRateService {

    private final InterestRateRepository interestRateRepository;
    private final RestTemplate restTemplate;

    // 최신 금리 정보 가져오기
    public InterestRateResponse fetchLatestInterestRates() {
        // 실제 API 연결 시 구현
        // 한국은행 API 활용: https://ecos.bok.or.kr/api/#/

        // 임시 데이터 반환
        InterestRate latestRate = interestRateRepository.findTopByOrderByDateDesc()
                .orElse(InterestRate.builder()
                        .date(LocalDate.now())
                        .kbRate(3.5)
                        .fedRate(5.25)
                        .marketRate(4.2)
                        .build());

        List<InterestRate> history = interestRateRepository.findTop6ByOrderByDateDesc();
        List<InterestRateDto> historyDtos = InterestRateDto.fromEntities(history);

        return InterestRateResponse.builder()
                .kbRate(latestRate.getKbRate())
                .fedRate(latestRate.getFedRate())
                .marketRate(latestRate.getMarketRate())
                .history(historyDtos)
                .build();
    }

    // 특정 기간 금리 데이터 가져오기
    public List<InterestRateDto> getInterestRatesByDateRange(LocalDate startDate, LocalDate endDate) {
        List<InterestRate> interestRates = interestRateRepository.findByDateBetween(startDate, endDate);
        return InterestRateDto.fromEntities(interestRates);
    }

    // 금리 데이터 저장
    public InterestRateDto saveInterestRate(InterestRateDto interestRateDto) {
        InterestRate savedEntity = interestRateRepository.save(interestRateDto.toEntity());
        return InterestRateDto.fromEntity(savedEntity);
    }

    // 최신 금리 정보 조회
    public Optional<InterestRateDto> getLatestInterestRate() {
        return interestRateRepository.findTopByOrderByDateDesc()
                .map(InterestRateDto::fromEntity);
    }
} 