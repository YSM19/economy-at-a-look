package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.ExchangeRateDto;
import com.at_a_look.economy.dto.koreaexim.ExchangeRateApiResponse;
import com.at_a_look.economy.dto.response.ExchangeRateResponse;
import com.at_a_look.economy.entity.ExchangeRate;
import com.at_a_look.economy.repository.ExchangeRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ExchangeRateService {

    private final ExchangeRateRepository exchangeRateRepository;
    private final RestTemplate restTemplate;

    @Value("${koreaexim.api.authkey}")
    private String authKey;

    // API 호출을 통해 최신 환율 정보 가져오기
    public ExchangeRateResponse fetchLatestExchangeRates() {
        try {
            // 오늘 날짜 포맷팅 (YYYYMMDD)
            String today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

            // API URL 구성
            String apiUrl = UriComponentsBuilder.fromHttpUrl("https://www.koreaexim.go.kr/site/program/financial/exchangeJSON")
                    .queryParam("authkey", authKey)
                    .queryParam("searchdate", today)
                    .queryParam("data", "AP01")
                    .toUriString();

            // API 호출
            ResponseEntity<ExchangeRateApiResponse[]> response = restTemplate.getForEntity(apiUrl, ExchangeRateApiResponse[].class);
            ExchangeRateApiResponse[] exchangeRates = response.getBody();

            if (exchangeRates != null && exchangeRates.length > 0) {
                // USD, EUR, JPY 환율 값 추출
                Double usdRate = null;
                Double eurRate = null;
                Double jpyRate = null;

                for (ExchangeRateApiResponse er : exchangeRates) {
                    if ("USD".equals(er.getCurUnit())) {
                        usdRate = parseExchangeRate(er.getDealBasR());
                    } else if ("EUR".equals(er.getCurUnit())) {
                        eurRate = parseExchangeRate(er.getDealBasR());
                    } else if ("JPY(100)".equals(er.getCurUnit())) {
                        jpyRate = parseExchangeRate(er.getDealBasR()) / 100; // 100엔 단위를 1엔 단위로 변환
                    }
                }

                // 모든 필요한 환율을 가져왔는지 확인
                if (usdRate != null && eurRate != null && jpyRate != null) {
                    // DB에 저장
                    ExchangeRate exchangeRate = ExchangeRate.builder()
                            .date(LocalDate.now())
                            .usdRate(usdRate)
                            .eurRate(eurRate)
                            .jpyRate(jpyRate)
                            .build();
                    
                    ExchangeRate savedExchangeRate = exchangeRateRepository.save(exchangeRate);
                    
                    // 최근 6개 데이터 조회
                    List<ExchangeRate> history = exchangeRateRepository.findTop6ByOrderByDateDesc();
                    List<ExchangeRateDto> historyDtos = ExchangeRateDto.fromEntities(history);
                    
                    return ExchangeRateResponse.builder()
                            .usdRate(savedExchangeRate.getUsdRate())
                            .eurRate(savedExchangeRate.getEurRate())
                            .jpyRate(savedExchangeRate.getJpyRate())
                            .history(historyDtos)
                            .build();
                }
            }
            
            // API 호출 실패 또는 필요한 데이터가 없는 경우 DB의 최신 데이터 반환
            return getFallbackExchangeRateResponse();
            
        } catch (Exception e) {
            // 오류 발생 시 로깅 후 DB의 최신 데이터 반환
            System.err.println("Error fetching exchange rates from API: " + e.getMessage());
            return getFallbackExchangeRateResponse();
        }
    }

    // 숫자 형식의 문자열(쉼표 포함 가능)을 Double로 변환
    private Double parseExchangeRate(String rateStr) {
        if (rateStr == null || rateStr.isEmpty()) {
            return null;
        }
        return Double.parseDouble(rateStr.replace(",", ""));
    }
    
    // API 호출 실패 시 DB에서 최신 데이터 반환
    private ExchangeRateResponse getFallbackExchangeRateResponse() {
        ExchangeRate latestRate = exchangeRateRepository.findTopByOrderByDateDesc()
                .orElse(ExchangeRate.builder()
                        .date(LocalDate.now())
                        .usdRate(1350.50)
                        .eurRate(1450.75)
                        .jpyRate(9.25)
                        .build());

        List<ExchangeRate> history = exchangeRateRepository.findTop6ByOrderByDateDesc();
        List<ExchangeRateDto> historyDtos = ExchangeRateDto.fromEntities(history);

        return ExchangeRateResponse.builder()
                .usdRate(latestRate.getUsdRate())
                .eurRate(latestRate.getEurRate())
                .jpyRate(latestRate.getJpyRate())
                .history(historyDtos)
                .build();
    }

    // 특정 기간 환율 데이터 가져오기
    public List<ExchangeRateDto> getExchangeRatesByDateRange(LocalDate startDate, LocalDate endDate) {
        List<ExchangeRate> exchangeRates = exchangeRateRepository.findByDateBetween(startDate, endDate);
        return ExchangeRateDto.fromEntities(exchangeRates);
    }

    // 환율 데이터 저장
    public ExchangeRateDto saveExchangeRate(ExchangeRateDto exchangeRateDto) {
        ExchangeRate savedEntity = exchangeRateRepository.save(exchangeRateDto.toEntity());
        return ExchangeRateDto.fromEntity(savedEntity);
    }

    // 최신 환율 정보 조회
    public Optional<ExchangeRateDto> getLatestExchangeRate() {
        return exchangeRateRepository.findTopByOrderByDateDesc()
                .map(ExchangeRateDto::fromEntity);
    }
} 