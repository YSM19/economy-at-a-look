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
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.ProtocolException;
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
    private static final List<String> MAJOR_CURRENCIES = Arrays.asList("USD", "EUR", "JPY(100)", "CNH");

    /**
     * 매일 오전 11npm 시 30분에 환율 데이터를 자동으로 가져옵니다.
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
        log.info("📊 환율 데이터 가져오기 시작: 날짜 = {}", date);
        
        String formattedDate = date.format(DateTimeFormatter.BASIC_ISO_DATE);
        
        // API URL 생성
        String url = UriComponentsBuilder.fromHttpUrl(API_URL)
                .queryParam("authkey", authKey)
                .queryParam("searchdate", formattedDate)
                .queryParam("data", DATA_TYPE)
                .build()
                .toUriString();
        
        log.info("🌐 환율 API 호출: {}", url);
        
        try {
            // API 호출 전 로그 추가
            log.debug("🔄 API 호출 시도 - URL: {}, 날짜: {}", API_URL, formattedDate);
            
            // API 호출
            ExchangeRateApiResponse[] response = restTemplate.getForObject(url, ExchangeRateApiResponse[].class);
            
            if (response == null || response.length == 0) {
                log.warn("📭 외부 API에서 {}일 환율 데이터를 제공하지 않습니다. (주말, 공휴일 등)", date);
                return 0;
            }
            
            log.info("✅ 환율 데이터 {}개 조회 완료. 날짜: {}", response.length, date);
            
            return processAndSaveExchangeRates(response, date);
            
        } catch (ResourceAccessException e) {
            // 리디렉션 루프나 네트워크 연결 문제 등
            log.error("🚫 API 리소스 접근 오류 발생: {}", e.getMessage());
            
            // 리디렉션 루프 오류인지 확인
            if (e.getCause() != null && e.getCause() instanceof ProtocolException && 
                e.getCause().getMessage().contains("redirected too many times")) {
                log.error("🔄 [리디렉션 루프 감지] 외부 API에서 리디렉션 루프 발생: {}", e.getCause().getMessage());
                log.warn("💡 [API 실패] 외부 API 문제로 새로운 데이터를 가져올 수 없습니다.");
            } else {
                log.error("🌐 [네트워크 오류] API 연결 문제: {}", e.getMessage());
            }
            
            // 예외를 다시 던져서 컨트롤러에서 적절히 처리하도록 함
            throw e;
            
        } catch (HttpClientErrorException e) {
            log.error("❌ HTTP 클라이언트 오류 발생");
            
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                log.error("🔑 API 인증 오류: 인증키를 확인하세요. 상태 코드: {}", e.getStatusCode());
            } else if (e.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) {
                log.error("🚫 외부 API 서비스 일시 중단: 상태 코드: {}", e.getStatusCode());
            } else {
                log.error("🌐 API 호출 오류: 상태 코드: {}, 메시지: {}", e.getStatusCode(), e.getMessage());
            }
            
            // 예외를 다시 던져서 컨트롤러에서 적절히 처리하도록 함
            throw e;
            
        } catch (Exception e) {
            log.error("💥 환율 데이터 처리 중 예상치 못한 오류 발생: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
            
            // 예외를 다시 던져서 컨트롤러에서 적절히 처리하도록 함
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
        // 1. useMock 설정이 true이면 개발 환경으로 간주
        if (useMock) {
            return true;
        }
        
        // 2. Spring Profiles 확인
        String activeProfiles = System.getProperty("spring.profiles.active", "");
        String envProfiles = System.getenv("SPRING_PROFILES_ACTIVE");
        
        boolean isDev = activeProfiles.contains("dev") || 
                       (envProfiles != null && envProfiles.contains("dev")) ||
                       activeProfiles.contains("local") || 
                       (envProfiles != null && envProfiles.contains("local"));
        
        log.debug("🔍 환경 감지: spring.profiles.active={}, SPRING_PROFILES_ACTIVE={}, useMock={}, isDev={}", 
                  activeProfiles, envProfiles, useMock, isDev);
        
        return isDev;
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
        LocalDate today = LocalDate.now();
        log.info("오늘({}) 환율 데이터 조회 시작", today);
        
        List<ExchangeRateResponseDTO> rates = getOrFetchRatesByDate(today);
        
        // 데이터가 없으면 빈 목록 반환
        if (rates.isEmpty()) {
            log.warn("⚠️ [환율 데이터 없음] 오늘({}) 환율 데이터가 없습니다.", today);
            log.info("💡 기존에 저장된 최근 환율 데이터를 확인하거나, 수동으로 환율 데이터를 가져와주세요.");
            return new ArrayList<>();
        }
        
        log.info("✅ 오늘({}) 환율 데이터 조회 성공 - {}개 통화", today, rates.size());
        return rates;
    }

    /**
     * 특정 날짜의 환율 데이터를 조회하거나 없으면 API에서 가져옵니다.
     * API에서 데이터를 가져오는 데 실패하면 가장 최근에 저장된 데이터를 사용합니다.
     */
    private List<ExchangeRateResponseDTO> getOrFetchRatesByDate(LocalDate date) {
        List<ExchangeRate> rates = exchangeRateRepository.findBySearchDate(date);
        
        // 데이터가 없으면 API에서 가져오기 시도
        if (rates.isEmpty()) {
            log.warn("📊 {}일의 환율 데이터가 DB에 없습니다. API에서 가져오기를 시도합니다.", date);
            
            try {
                int fetchedCount = fetchExchangeRates(date);
                rates = exchangeRateRepository.findBySearchDate(date);
                
                if (!rates.isEmpty()) {
                    log.info("✅ API에서 {}일 환율 데이터 {}개를 성공적으로 가져왔습니다.", date, fetchedCount);
                } else {
                    log.error("❌ API 호출은 성공했지만 {}일 환율 데이터가 저장되지 않았습니다.", date);
                }
            } catch (Exception e) {
                log.error("❌ [API 호출 실패] {}일 환율 데이터 가져오기 실패: {}", date, e.getMessage());
                log.info("🔄 최근 저장된 환율 데이터로 대체를 시도합니다.");
                
                // 가장 최근 날짜의 모든 환율 데이터 조회
                rates = getLatestStoredRates();
                if (!rates.isEmpty()) {
                    LocalDate latestDate = rates.get(0).getSearchDate();
                    log.info("📈 대체 데이터 사용: {}일 환율 데이터 {}개를 사용합니다.", latestDate, rates.size());
                    log.warn("⚠️ 주의: 요청한 날짜({})가 아닌 {}일 데이터입니다.", date, latestDate);
                } else {
                    log.error("💥 [심각한 오류] 저장된 환율 데이터가 전혀 없습니다!");
                }
            }
        } else {
            log.debug("✅ {}일 환율 데이터 {}개를 DB에서 조회했습니다.", date, rates.size());
        }
        
        return ExchangeRateResponseDTO.fromEntities(rates);
    }

    /**
     * 가장 최근에 저장된 모든 환율 데이터를 조회합니다.
     * 두 단계로 나누어 조회하여 성능과 안정성을 높입니다.
     * 
     * @return 가장 최근 날짜의 모든 환율 데이터 목록
     */
    private List<ExchangeRate> getLatestStoredRates() {
        try {
            Optional<LocalDate> latestDate = exchangeRateRepository.findLatestSearchDate();
            if (latestDate.isPresent()) {
                return exchangeRateRepository.findBySearchDateOrderByCurUnit(latestDate.get());
            } else {
                log.warn("저장된 환율 데이터가 전혀 없습니다.");
                return new ArrayList<>();
            }
        } catch (Exception e) {
            log.error("최근 환율 데이터 조회 중 오류 발생: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 가장 최근 저장된 환율 데이터를 조회합니다.
     * 
     * @return 최근 환율 데이터 목록 (최대 30개 레코드, 최근 날짜 우선)
     */
    @Transactional(readOnly = true)
    public List<ExchangeRateResponseDTO> getLatestExchangeRates() {
        // 가장 최근 30개의 레코드 조회 (기존 방식 유지)
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
        
        log.info("📊 조회된 환율 데이터 개수: {}", rates.size());
        rates.forEach(rate -> {
            log.info("💱 환율 데이터: {} - {} = {}", 
                    rate.getCurUnit(), rate.getCurNm(), rate.getDealBasRate());
        });
        
        // 주요 통화 환율 추출
        Double usdRate = getExchangeRateValue(rates, "USD");
        Double eurRate = getExchangeRateValue(rates, "EUR");
        Double jpyRate = getExchangeRateValue(rates, "JPY(100)");
        Double cnyRate = getExchangeRateValue(rates, "CNH");
        
        log.info("🏦 추출된 환율: USD={}, EUR={}, JPY={}, CNH={}", 
                 usdRate, eurRate, jpyRate, cnyRate);
        
        // 최근 30일 기록 조회
        List<ExchangeRateResponseDTO> history = ExchangeRateResponseDTO.fromEntities(
                exchangeRateRepository.findTop30ByOrderBySearchDateDesc());
        
        return ExchangeRateResponse.builder()
                .usdRate(usdRate)
                .eurRate(eurRate)
                .jpyRate(jpyRate)
                .cnyRate(cnyRate)
                .history(history)
                .build();
    }
    
    /**
     * 최신 환율 데이터를 가져오거나 없으면 API에서 가져옵니다.
     * API에서 데이터를 가져오는 데 실패하면 가장 최근에 저장된 데이터를 사용합니다.
     */
    private List<ExchangeRate> getLatestRatesOrFetch(LocalDate date) {
        List<ExchangeRate> rates = exchangeRateRepository.findBySearchDate(date);
        
        // 오늘 데이터가 없으면 API에서 가져오기 시도
        if (rates.isEmpty()) {
            log.warn("📊 {}일의 최신 환율 데이터가 없습니다. API 호출을 시도합니다.", date);
            
            try {
                fetchExchangeRates(date);
                rates = exchangeRateRepository.findBySearchDate(date);
                
                if (!rates.isEmpty()) {
                    log.info("✅ 최신 환율 데이터 API 호출 성공 - {}개 통화", rates.size());
                }
            } catch (Exception e) {
                log.error("❌ [최신 환율 데이터 API 실패] {}일 데이터 가져오기 실패: {}", date, e.getMessage());
                
                // 가장 최근 날짜의 모든 환율 데이터 조회
                rates = getLatestStoredRates();
                if (!rates.isEmpty()) {
                    LocalDate latestDate = rates.get(0).getSearchDate();
                    log.info("📈 대체 데이터 사용: {}일 환율 데이터로 대체합니다.", latestDate);
                } else {
                    log.error("💥 [심각한 오류] 저장된 환율 데이터가 전혀 없습니다!");
                }
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
     * 데이터가 없으면 API에서 가져오기 시도하고, 실패하면 가장 최근 저장된 데이터를 사용합니다.
     * 
     * @return 달러 환율 DTO (Optional)
     */
    @Transactional(readOnly = true)
    public Optional<ExchangeRateDto> getLatestExchangeRate() {
        LocalDate today = LocalDate.now();
        log.info("최신 환율 정보 조회 시작 (단일 객체)");
        
        List<ExchangeRate> rates = exchangeRateRepository.findBySearchDate(today);
        
        // 오늘 데이터가 없으면 API에서 가져오기 시도
        if (rates.isEmpty()) {
            log.warn("📊 {}일의 환율 데이터가 없습니다. API 호출을 시도합니다.", today);
            
            try {
                fetchExchangeRates(today);
                rates = exchangeRateRepository.findBySearchDate(today);
                
                if (!rates.isEmpty()) {
                    log.info("✅ API에서 오늘 환율 데이터를 성공적으로 가져왔습니다.");
                }
            } catch (Exception e) {
                log.error("❌ [환율 API 실패] {}일 환율 데이터 가져오기 실패: {}", today, e.getMessage());
                
                // 가장 최근 날짜의 모든 환율 데이터 조회
                rates = getLatestStoredRates();
                if (rates.isEmpty()) {
                    log.error("💥 [심각한 오류] 저장된 환율 데이터가 없어 빈 값을 반환합니다.");
                    return Optional.empty();
                }
                LocalDate latestDate = rates.get(0).getSearchDate();
                log.info("📈 대체 데이터 사용: {}일 환율 데이터를 사용합니다.", latestDate);
            }
        }
        
        // USD 환율 찾기
        Double usdRate = rates.stream()
                .filter(rate -> rate.getCurUnit().equals("USD"))
                .findFirst()
                .map(ExchangeRate::getDealBasRate)
                .orElse(null);
        
        if (usdRate == null) {
            log.warn("⚠️ USD 환율 데이터가 없습니다. 다른 주요 통화를 확인합니다.");
            
            // USD가 없으면 다른 주요 통화라도 반환하기 위해 재시도
            Optional<ExchangeRate> anyMajorCurrency = rates.stream()
                    .filter(rate -> MAJOR_CURRENCIES.contains(rate.getCurUnit()))
                    .findFirst();
            
            if (anyMajorCurrency.isEmpty()) {
                log.error("❌ 주요 통화(USD, EUR, JPY) 환율 데이터가 없습니다.");
                return Optional.empty();
            } else {
                log.info("📈 USD 대신 {} 통화 데이터를 찾았습니다.", anyMajorCurrency.get().getCurUnit());
            }
        } else {
            log.info("✅ USD 환율 정보 조회 성공: {}원", usdRate);
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
        
        // USD, EUR, JPY, CNY 통화별 환율 DTO 생성
        List<ExchangeRateDto> result = new ArrayList<>();
        LocalDate current = startDate;
        
        while (!current.isAfter(endDate)) {
            final LocalDate date = current;
            
            Double usdRate = getExchangeRateForDate(ratesByUnit.getOrDefault("USD", new ArrayList<>()), date);
            Double eurRate = getExchangeRateForDate(ratesByUnit.getOrDefault("EUR", new ArrayList<>()), date);
            Double jpyRate = getExchangeRateForDate(ratesByUnit.getOrDefault("JPY(100)", new ArrayList<>()), date);
            Double cnyRate = getExchangeRateForDate(ratesByUnit.getOrDefault("CNH", new ArrayList<>()), date);
            
            // 하나라도 값이 있으면 DTO 생성
            if (usdRate != null || eurRate != null || jpyRate != null || cnyRate != null) {
                result.add(ExchangeRateDto.builder()
                        .date(date)
                        .usdRate(usdRate)
                        .eurRate(eurRate)
                        .jpyRate(jpyRate)
                        .cnyRate(cnyRate)
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

    /**
     * 특정 국가들의 최근 6개월 환율 데이터를 가져와 저장합니다.
     * 
     * @param countries 국가 목록 (예: ["usa", "japan", "china", "europe"])
     * @return 저장된 총 환율 데이터 수
     */
    @Transactional
    public int fetchExchangeRatesForCountries(List<String> countries) {
        log.info("🌍 국가별 환율 데이터 가져오기 시작: 국가 목록 = {}", countries);
        
        int totalCount = 0;
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(6); // 6개월 전부터
        
        // 각 날짜별로 환율 데이터 가져오기
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            try {
                log.info("📅 날짜별 환율 데이터 가져오기: {}", currentDate);
                int dailyCount = fetchExchangeRates(currentDate);
                totalCount += dailyCount;
                
                if (dailyCount > 0) {
                    log.info("✅ {} 날짜 환율 데이터 {}개 저장", currentDate, dailyCount);
                } else {
                    log.debug("📭 {} 날짜 환율 데이터 없음 (주말/공휴일)", currentDate);
                }
                
                // API 호출 간격 제어 (1초 대기)
                Thread.sleep(1000);
                
            } catch (Exception e) {
                log.warn("⚠️ {} 날짜 환율 데이터 가져오기 실패: {}", currentDate, e.getMessage());
                // 개별 날짜 실패는 전체 프로세스를 중단하지 않음
            }
            
            currentDate = currentDate.plusDays(1);
        }
        
        log.info("🎉 국가별 환율 데이터 가져오기 완료: 총 {}개 데이터 저장", totalCount);
        return totalCount;
    }
} 