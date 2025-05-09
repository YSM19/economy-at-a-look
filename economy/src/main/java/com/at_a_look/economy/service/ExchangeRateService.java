package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.ExchangeRateDto;
import com.at_a_look.economy.dto.ExchangeRateResponseDTO;
import com.at_a_look.economy.dto.koreaexim.ExchangeRateApiResponse;
import com.at_a_look.economy.dto.response.ExchangeRateResponse;
import com.at_a_look.economy.entity.ExchangeRate;
import com.at_a_look.economy.repository.ExchangeRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 환율 데이터를 관리하는 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExchangeRateService {

    private final ExchangeRateRepository exchangeRateRepository;
    private final RestTemplate restTemplate;
    
    @Value("${koreaexim.api.authkey}")
    private String authKey;
    
    @Value("${koreaexim.api.use-mock:false}")
    private boolean useMock;
    
    private static final String API_URL = "https://www.koreaexim.go.kr/site/program/financial/exchangeJSON";
    private static final String DATA_TYPE = "AP01"; // 환율 정보 타입
    private static final List<String> MAJOR_CURRENCIES = Arrays.asList("USD", "EUR", "JPY");

    /**
     * 매일 오전 11시 30분에 환율 데이터를 자동으로 가져옵니다.
     * 운영 환경에서만 실행됩니다.
     */
    @Scheduled(cron = "0 30 11 * * ?")
    @Transactional
    @Profile("prod")
    public void fetchDailyExchangeRates() {
        log.info("일일 환율 데이터 자동 업데이트 시작");
        try {
            fetchExchangeRates(LocalDate.now());
            log.info("일일 환율 데이터 자동 업데이트 완료");
        } catch (Exception e) {
            log.error("일일 환율 데이터 업데이트 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 특정 날짜의 환율 데이터를 API에서 가져와 저장합니다.
     * 이미 저장된 데이터는 중복 저장하지 않습니다.
     * 
     * @param date 조회할 날짜
     * @return 저장된 환율 데이터 수
     * @throws RestClientException API 호출 실패 시 발생
     */
    @Transactional
    public int fetchExchangeRates(LocalDate date) {
        if (useMock) {
            log.info("테스트/개발 환경: 모의 환율 데이터 사용");
            return saveMockExchangeRates(date);
        }
        
        String formattedDate = date.format(DateTimeFormatter.BASIC_ISO_DATE);
        
        // API URL 생성
        // 한국수출입은행 API는 웹 브라우저 환경에서 작동하므로 쿼리 파라미터를 통해 사용자 에이전트 정보를 추가
        String url = UriComponentsBuilder.fromHttpUrl(API_URL)
                .queryParam("authkey", authKey)
                .queryParam("searchdate", formattedDate)
                .queryParam("data", DATA_TYPE)
                .build()
                .toUriString();
        
        log.info("환율 API 호출: {}", url);
        
        try {
            // API 호출 전 로그 추가
            log.debug("API 호출 시도 - URL: {}, 날짜: {}", API_URL, formattedDate);
            
            // API 호출
            ExchangeRateApiResponse[] response = restTemplate.getForObject(url, ExchangeRateApiResponse[].class);
            
            if (response == null || response.length == 0) {
                log.warn("환율 데이터가 없습니다. 날짜: {}", date);
                
                // 데이터가 없으면 모의 데이터 생성 (테스트 및 개발 환경에서만)
                if (isDevelopmentEnvironment()) {
                    log.info("모의 환율 데이터를 생성합니다. 날짜: {}", date);
                    return saveMockExchangeRates(date);
                }
                
                return 0;
            }
            
            log.info("환율 데이터 {}개 조회 완료. 날짜: {}", response.length, date);
            
            return processAndSaveExchangeRates(response, date);
            
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                log.error("API 인증 오류: 인증키를 확인하세요. 상태 코드: {}", e.getStatusCode());
            } else {
                log.error("API 호출 오류: 상태 코드: {}, 메시지: {}", e.getStatusCode(), e.getMessage());
            }
            
            // 개발 환경에서는 인증 오류 시 모의 데이터 사용
            if (isDevelopmentEnvironment()) {
                log.info("API 오류로 인해 모의 환율 데이터를 사용합니다.");
                return saveMockExchangeRates(date);
            }
            
            throw e;
        } catch (Exception e) {
            log.error("환율 데이터 처리 중 오류 발생: {}", e.getMessage(), e);
            
            // 개발 환경에서는 오류 시 모의 데이터 사용
            if (isDevelopmentEnvironment()) {
                log.info("API 오류로 인해 모의 환율 데이터를 사용합니다.");
                return saveMockExchangeRates(date);
            }
            
            throw e;
        }
    }
    
    /**
     * API에서 받아온 환율 데이터를 처리하고 저장합니다.
     */
    private int processAndSaveExchangeRates(ExchangeRateApiResponse[] responseData, LocalDate date) {
        // 기존 데이터 확인
        List<ExchangeRate> existingRates = exchangeRateRepository.findBySearchDate(date);
        Map<String, ExchangeRate> existingRateMap = existingRates.stream()
                .collect(Collectors.toMap(ExchangeRate::getCurUnit, rate -> rate));
        
        List<ExchangeRate> savedEntities = new ArrayList<>();
        
        // 환율 데이터 처리
        for (ExchangeRateApiResponse item : responseData) {
            String curUnit = item.getCurUnit();
            
            // 이미 저장된 통화인지 확인
            if (existingRateMap.containsKey(curUnit)) {
                log.debug("이미 저장된 환율 데이터입니다: {} - {}", date, curUnit);
                continue;
            }
            
            // 엔티티 생성 및 저장
            ExchangeRate entity = ExchangeRate.builder()
                    .curUnit(curUnit)
                    .curNm(item.getCurNm())
                    .ttb(parseExchangeRate(item.getTtb()))
                    .tts(parseExchangeRate(item.getTts()))
                    .dealBasRate(parseExchangeRate(item.getDealBasR()))
                    .searchDate(date)
                    .build();
            
            savedEntities.add(exchangeRateRepository.save(entity));
        }
        
        log.info("{}개의 환율 데이터 저장 완료. 날짜: {}", savedEntities.size(), date);
        return savedEntities.size();
    }
    
    /**
     * 현재 개발 환경인지 확인합니다.
     */
    private boolean isDevelopmentEnvironment() {
        return Arrays.asList(
                System.getProperty("spring.profiles.active", ""),
                System.getenv("SPRING_PROFILES_ACTIVE")
        ).contains("dev");
    }
    
    /**
     * 테스트 환경용 모의 환율 데이터를 생성하고 저장합니다.
     */
    private int saveMockExchangeRates(LocalDate date) {
        // 이미 해당 날짜에 데이터가 있는지 확인
        List<ExchangeRate> existingRates = exchangeRateRepository.findBySearchDate(date);
        if (!existingRates.isEmpty()) {
            log.debug("이미 저장된 모의 환율 데이터가 있습니다. 날짜: {}", date);
            return 0;
        }
        
        // 주요 통화 모의 데이터 생성
        Object[][] mockCurrencies = {
            {"USD", "미국 달러", 1350.50, 1377.51, 1364.00},
            {"EUR", "유럽연합 유로", 1455.25, 1484.36, 1470.00},
            {"JPY", "일본 엔", 9.0134, 9.1937, 9.10}
        };
        
        List<ExchangeRate> savedEntities = new ArrayList<>();
        
        for (Object[] currencyData : mockCurrencies) {
            ExchangeRate entity = ExchangeRate.builder()
                    .curUnit((String) currencyData[0])
                    .curNm((String) currencyData[1])
                    .ttb((Double) currencyData[2])
                    .tts((Double) currencyData[3])
                    .dealBasRate((Double) currencyData[4])
                    .searchDate(date)
                    .build();
                    
            savedEntities.add(exchangeRateRepository.save(entity));
        }
        
        log.info("{}개의 모의 환율 데이터 저장 완료. 날짜: {}", savedEntities.size(), date);
        return savedEntities.size();
    }
    
    /**
     * 문자열 형태의 환율 값을 숫자로 변환합니다.
     */
    private Double parseExchangeRate(String rateStr) {
        if (rateStr == null || rateStr.isBlank()) {
            return null;
        }
        
        try {
            // 콤마 제거 후 변환
            String cleaned = rateStr.replace(",", "");
            return Double.parseDouble(cleaned);
        } catch (NumberFormatException e) {
            log.warn("환율 변환 실패: {}", rateStr);
            return null;
        }
    }

    /**
     * 오늘 날짜의 환율 데이터를 조회합니다.
     * 데이터가 없으면 API에서 가져오기를 시도합니다.
     * 
     * @return 오늘의 환율 데이터 목록
     */
    @Transactional(readOnly = true)
    public List<ExchangeRateResponseDTO> getTodayExchangeRates() {
        return getOrFetchRatesByDate(LocalDate.now());
    }

    /**
     * 특정 날짜의 환율 데이터를 조회하거나 없으면 API에서 가져옵니다.
     */
    private List<ExchangeRateResponseDTO> getOrFetchRatesByDate(LocalDate date) {
        List<ExchangeRate> rates = exchangeRateRepository.findBySearchDate(date);
        
        // 데이터가 없으면 API에서 가져오기 시도
        if (rates.isEmpty()) {
            try {
                fetchExchangeRates(date);
                rates = exchangeRateRepository.findBySearchDate(date);
            } catch (Exception e) {
                log.error("환율 데이터 가져오기 실패: {}", e.getMessage());
                // 기존 빈 목록 반환
            }
        }
        
        return ExchangeRateResponseDTO.fromEntities(rates);
    }

    /**
     * 가장 최근 저장된 환율 데이터를 조회합니다.
     * 
     * @return 최근 환율 데이터 목록 (최대 30개)
     */
    @Transactional(readOnly = true)
    public List<ExchangeRateResponseDTO> getLatestExchangeRates() {
        List<ExchangeRate> rates = exchangeRateRepository.findTop30ByOrderBySearchDateDesc();
        return ExchangeRateResponseDTO.fromEntities(rates);
    }
    
    /**
     * 특정 통화 코드의 환율 데이터를 조회합니다.
     * 
     * @param curUnit 통화 코드 (예: USD, JPY, EUR)
     * @return 해당 통화의 환율 데이터 목록
     */
    @Transactional(readOnly = true)
    public List<ExchangeRateResponseDTO> getExchangeRatesByCurrency(String curUnit) {
        List<ExchangeRate> rates = exchangeRateRepository.findByCurUnitOrderBySearchDateDesc(curUnit);
        return ExchangeRateResponseDTO.fromEntities(rates);
    }
    
    /**
     * 특정 날짜에 저장된 주요 통화(USD, EUR, JPY)의 환율 데이터를 조회합니다.
     * 
     * @param date 조회할 날짜
     * @return 주요 통화의 환율 데이터 목록
     */
    @Transactional(readOnly = true)
    public List<ExchangeRateResponseDTO> getMajorCurrencyRates(LocalDate date) {
        List<ExchangeRate> rates = exchangeRateRepository.findBySearchDate(date);
        
        return rates.stream()
                .filter(rate -> MAJOR_CURRENCIES.contains(rate.getCurUnit()))
                .map(ExchangeRateResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * 최신 환율 정보를 조회하여 프론트엔드에 적합한 형태로 반환합니다.
     * 
     * @return 최신 환율 정보 응답 객체
     */
    @Transactional(readOnly = true)
    public ExchangeRateResponse fetchLatestExchangeRates() {
        LocalDate today = LocalDate.now();
        List<ExchangeRate> rates = getLatestRatesOrFetch(today);
        
        // 주요 통화 환율 추출
        Double usdRate = getExchangeRateValue(rates, "USD");
        Double eurRate = getExchangeRateValue(rates, "EUR");
        Double jpyRate = getExchangeRateValue(rates, "JPY");
        
        // 최근 30일 기록 조회
        List<ExchangeRateResponseDTO> history = ExchangeRateResponseDTO.fromEntities(
                exchangeRateRepository.findTop30ByOrderBySearchDateDesc());
        
        return ExchangeRateResponse.builder()
                .usdRate(usdRate)
                .eurRate(eurRate)
                .jpyRate(jpyRate)
                .history(history)
                .build();
    }
    
    /**
     * 최신 환율 데이터를 가져오거나 없으면 API에서 가져옵니다.
     */
    private List<ExchangeRate> getLatestRatesOrFetch(LocalDate date) {
        List<ExchangeRate> rates = exchangeRateRepository.findBySearchDate(date);
        
        // 오늘 데이터가 없으면 가장 최근 데이터 조회
        if (rates.isEmpty()) {
            try {
                fetchExchangeRates(date);
                rates = exchangeRateRepository.findBySearchDate(date);
            } catch (Exception e) {
                log.error("오늘 환율 데이터 가져오기 실패: {}", e.getMessage());
                rates = exchangeRateRepository.findTop30ByOrderBySearchDateDesc();
            }
        }
        
        return rates;
    }
    
    /**
     * 특정 통화 코드의 환율 값을 추출합니다.
     */
    private Double getExchangeRateValue(List<ExchangeRate> rates, String curUnit) {
        return rates.stream()
                .filter(rate -> rate.getCurUnit().equals(curUnit))
                .findFirst()
                .map(ExchangeRate::getDealBasRate)
                .orElse(null);
    }
    
    /**
     * 가장 최근의 달러 환율 정보를 단일 객체로 반환합니다.
     * 
     * @return 달러 환율 DTO (Optional)
     */
    @Transactional(readOnly = true)
    public Optional<ExchangeRateDto> getLatestExchangeRate() {
        List<ExchangeRate> rates = exchangeRateRepository.findTop30ByOrderBySearchDateDesc();
        
        if (rates.isEmpty()) {
            return Optional.empty();
        }
        
        // USD 환율 찾기
        Double usdRate = rates.stream()
                .filter(rate -> rate.getCurUnit().equals("USD"))
                .findFirst()
                .map(ExchangeRate::getDealBasRate)
                .orElse(null);
        
        if (usdRate == null) {
            return Optional.empty();
        }
        
        return Optional.of(ExchangeRateDto.builder()
                .usdRate(usdRate)
                .date(rates.get(0).getSearchDate())
                .build());
    }
    
    /**
     * 특정 기간 동안의 환율 데이터를 조회합니다.
     * 
     * @param startDate 조회 시작 날짜
     * @param endDate 조회 종료 날짜
     * @return 환율 데이터 목록
     */
    @Transactional(readOnly = true)
    public List<ExchangeRateDto> getExchangeRatesByDateRange(
            LocalDate startDate, LocalDate endDate) {
        
        List<ExchangeRate> rates = exchangeRateRepository.findBySearchDateBetweenOrderBySearchDateAsc(
                startDate, endDate);
        
        // 통화별로 그룹화
        Map<String, List<ExchangeRate>> ratesByUnit = rates.stream()
                .collect(Collectors.groupingBy(ExchangeRate::getCurUnit));
        
        // USD, EUR, JPY 통화별 환율 DTO 생성
        List<ExchangeRateDto> result = new ArrayList<>();
        LocalDate current = startDate;
        
        while (!current.isAfter(endDate)) {
            final LocalDate date = current;
            
            Double usdRate = getExchangeRateForDate(ratesByUnit.getOrDefault("USD", new ArrayList<>()), date);
            Double eurRate = getExchangeRateForDate(ratesByUnit.getOrDefault("EUR", new ArrayList<>()), date);
            Double jpyRate = getExchangeRateForDate(ratesByUnit.getOrDefault("JPY", new ArrayList<>()), date);
            
            // 하나라도 값이 있으면 DTO 생성
            if (usdRate != null || eurRate != null || jpyRate != null) {
                result.add(ExchangeRateDto.builder()
                        .date(date)
                        .usdRate(usdRate)
                        .eurRate(eurRate)
                        .jpyRate(jpyRate)
                        .build());
            }
            
            current = current.plusDays(1);
        }
        
        return result;
    }
    
    /**
     * 특정 날짜의 특정 통화 환율 값을 반환합니다.
     */
    private Double getExchangeRateForDate(List<ExchangeRate> rates, LocalDate date) {
        return rates.stream()
                .filter(rate -> rate.getSearchDate().equals(date))
                .findFirst()
                .map(ExchangeRate::getDealBasRate)
                .orElse(null);
    }
} 