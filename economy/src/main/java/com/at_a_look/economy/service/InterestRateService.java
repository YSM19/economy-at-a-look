package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.InterestRateDto;
import com.at_a_look.economy.dto.InterestRateResponse;
import com.at_a_look.economy.entity.InterestRate;
import com.at_a_look.economy.repository.InterestRateRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterestRateService {

    private final InterestRateRepository interestRateRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ecos.api.key}")
    private String ecosApiKey;

    // 국가 코드 및 정보
    private static final Map<String, CountryInfo> COUNTRIES = Map.of(
        "KR", new CountryInfo("KR", "한국", "한국은행", "기준금리")
    );

    private static class CountryInfo {
        final String code;
        final String name;
        final String bankName;
        final String rateType;

        CountryInfo(String code, String name, String bankName, String rateType) {
            this.code = code;
            this.name = name;
            this.bankName = bankName;
            this.rateType = rateType;
        }
    }

    /**
     * 최신 금리 정보 조회
     */
    @Transactional
    public InterestRateResponse fetchLatestInterestRates() {
        return fetchLatestInterestRates(false);
    }

    /**
     * 최신 금리 정보 조회 (강제 새로고침 옵션)
     * 계기판용: DB에서만 조회, 스케줄러가 데이터 업데이트 담당
     */
    @Transactional(readOnly = true)
    public InterestRateResponse fetchLatestInterestRates(boolean forceRefresh) {
        log.info("📊 최신 금리 정보 조회 시작 (강제새로고침: {})", forceRefresh);
        
        try {
            // 강제 새로고침인 경우에만 API 호출
            if (forceRefresh) {
                log.info("🔄 강제 새로고침 요청 - API에서 데이터 업데이트");
                return fetchLatestInterestRatesWithApiCall();
            }
            
            // 일반 조회: DB에서만 가져오기 (발표일 기준 최신 데이터)
            List<InterestRate> latestRates = interestRateRepository.findLatestRatesByCountry();
            
            // 발표일 데이터가 없는 경우 일반 최신 데이터로 fallback
            if (latestRates.isEmpty()) {
                log.warn("⚠️ 발표일 기준 최신 데이터가 없습니다. 일반 최신 데이터로 대체합니다.");
                latestRates = interestRateRepository.findLatestRatesByCountryAny();
                log.info("🔍 일반 최신 데이터 조회 결과: {}개", latestRates.size());
                latestRates.forEach(rate -> 
                    log.info("  - {}: {}% ({}일, 발표일: {})", 
                            rate.getCountryName(), rate.getInterestRate(), 
                            rate.getDate(), rate.getIsAnnouncementDate()));
            } else {
                log.info("✅ 발표일 기준 최신 데이터 조회 성공: {}개", latestRates.size());
                latestRates.forEach(rate -> 
                    log.info("  - {}: {}% ({}일, 발표일: {})", 
                            rate.getCountryName(), rate.getInterestRate(), 
                            rate.getDate(), rate.getIsAnnouncementDate()));
            }
            
            return buildResponse(latestRates);
            
        } catch (Exception e) {
            log.error("❌ 금리 데이터 조회 실패: {}", e.getMessage());
            return createSampleResponse();
        }
    }

    /**
     * API 호출을 포함한 금리 정보 조회 (강제 새로고침용)
     */
    @Transactional
    public InterestRateResponse fetchLatestInterestRatesWithApiCall() {
        log.info("🌐 API 호출을 포함한 금리 데이터 조회");
        
        try {
            // API에서 최신 데이터 가져오기
            fetchAndSaveYearlyRates();
            
            // 업데이트된 데이터 조회
            List<InterestRate> latestRates = interestRateRepository.findLatestRatesByCountry();
            
            // 여전히 발표일 데이터가 없는 경우 일반 데이터로 fallback
            if (latestRates.isEmpty()) {
                log.warn("⚠️ 업데이트 후에도 발표일 기준 데이터가 없습니다. 일반 최신 데이터로 대체합니다.");
                latestRates = interestRateRepository.findLatestRatesByCountryAny();
            }
            
            return buildResponse(latestRates);
            
        } catch (Exception e) {
            log.error("❌ API 호출 포함 금리 데이터 조회 실패: {}", e.getMessage());
            return createSampleResponse();
        }
    }

    /**
     * 데이터 업데이트 필요 여부 확인 (스케줄러용)
     * 스케줄러가 정기적으로 호출하므로 일반 조회에서는 사용하지 않음
     */
    public boolean shouldUpdateData(List<InterestRate> latestRates) {
        if (latestRates.isEmpty()) {
            log.info("🔍 데이터가 없어 업데이트가 필요합니다.");
            return true;
        }
        
        // 모든 주요국 데이터가 있는지 확인
        Set<String> existingCountries = latestRates.stream()
            .map(InterestRate::getCountryCode)
            .collect(Collectors.toSet());
            
        boolean hasAllCountries = COUNTRIES.keySet().stream()
            .allMatch(existingCountries::contains);
            
        if (!hasAllCountries) {
            log.info("🔍 일부 국가 데이터가 없어 업데이트가 필요합니다. 기존: {}, 필요: {}", 
                    existingCountries, COUNTRIES.keySet());
            return true;
        }
        
        // 최신 데이터가 7일 이상 오래되었는지 확인 (스케줄러가 있으므로 여유 있게 설정)
        LocalDate latestDate = latestRates.stream()
            .map(InterestRate::getDate)
            .max(LocalDate::compareTo)
            .orElse(LocalDate.MIN);
            
        boolean isOld = latestDate.isBefore(LocalDate.now().minusDays(7));
        if (isOld) {
            log.info("🔍 데이터가 오래되어 업데이트가 필요합니다. 최신: {}", latestDate);
        }
        
        return isOld;
    }

    /**
     * 최근 1년간 금리 데이터 조회 및 저장
     */
    @Transactional
    public void fetchAndSaveYearlyRates() {
        log.info("📅 최근 1년간 금리 데이터 조회 시작");
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusYears(1);
        
        for (Map.Entry<String, CountryInfo> entry : COUNTRIES.entrySet()) {
            String countryCode = entry.getKey();
            CountryInfo countryInfo = entry.getValue();
            
            try {
                fetchAndSaveCountryData(countryCode, countryInfo, startDate, endDate);
            } catch (Exception e) {
                log.warn("⚠️ {} 국가 데이터 처리 실패: {}", countryCode, e.getMessage());
            }
        }
        
        log.info("📈 최근 1년간 금리 데이터 조회 완료");
    }

    /**
     * 최근 1개월간 금리 데이터 조회 및 저장 (어드민 전용)
     */
    @Transactional
    public void fetchAndSaveMonthlyRates() {
        log.info("📅 최근 1개월간 금리 데이터 조회 시작");
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(1);
        
        for (Map.Entry<String, CountryInfo> entry : COUNTRIES.entrySet()) {
            String countryCode = entry.getKey();
            CountryInfo countryInfo = entry.getValue();
            
            try {
                fetchAndSaveCountryData(countryCode, countryInfo, startDate, endDate);
            } catch (Exception e) {
                log.warn("⚠️ {} 국가 데이터 처리 실패: {}", countryCode, e.getMessage());
            }
        }
        
        log.info("📈 최근 1개월간 금리 데이터 조회 완료");
    }

    /**
     * 한국 금리 데이터 조회 및 저장
     */
    private void fetchAndSaveCountryData(String countryCode, CountryInfo countryInfo, 
                                        LocalDate startDate, LocalDate endDate) {
        log.info("🌍 {} 국가의 1년간 일별 금리 데이터 조회 중...", countryCode);
        
        if ("KR".equals(countryCode)) {
            // 한국만 일별 데이터 조회
            fetchKoreaDailyData(countryCode, countryInfo, startDate, endDate);
        } else {
            log.warn("⚠️ 한국 외 다른 국가는 지원하지 않습니다: {}", countryCode);
        }
    }

    /**
     * 한국 일별 기준금리 데이터 조회
     */
    private void fetchKoreaDailyData(String countryCode, CountryInfo countryInfo, 
                                    LocalDate startDate, LocalDate endDate) {
        // 기간별로 샘플링하여 기존 데이터 확인 (효율성을 위해)
        // 시작일, 중간일, 종료일에 데이터가 있는지 확인
        LocalDate middleDate = startDate.plusDays(ChronoUnit.DAYS.between(startDate, endDate) / 2);
        
        boolean hasStartData = interestRateRepository.findByDateAndCountryCode(startDate, countryCode).isPresent();
        boolean hasMiddleData = interestRateRepository.findByDateAndCountryCode(middleDate, countryCode).isPresent();
        boolean hasEndData = interestRateRepository.findByDateAndCountryCode(endDate, countryCode).isPresent();
        
        // 샘플 날짜에 모두 데이터가 있으면 전체 기간에 데이터가 있을 가능성이 높으므로 건너뜀
        if (hasStartData && hasMiddleData && hasEndData) {
            log.info("📋 {} 국가의 {}~{} 기간에 충분한 데이터가 있는 것으로 추정됩니다. API 호출을 건너뜁니다.", 
                    countryCode, startDate, endDate);
            return;
        }
        
        String startDateStr = startDate.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String endDateStr = endDate.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        
        String url = String.format(
            "https://ecos.bok.or.kr/api/StatisticSearch/%s/json/kr/1/10000/722Y001/D/%s/%s/0101000",
            ecosApiKey, startDateStr, endDateStr
        );
        
        log.info("🔗 ECOS API 한국 일별 기준금리 호출: {}", url);
        
        try {
            String response = restTemplate.getForObject(url, String.class);
            List<InterestRate> rateData = parseEcosDailyResponse(response, countryInfo);
            
            // 실제 데이터만 저장 (발표일 식별)
            saveActualDataOnly(rateData, countryCode);
            
            log.info("✅ {} 국가 일별 데이터 처리 완료: {}일", countryCode, rateData.size());
            
        } catch (Exception e) {
            log.error("❌ {} 국가 일별 데이터 조회 실패: {}", countryCode, e.getMessage());
            // 한국만 지원하므로 실패시 더 이상 대체 방법 없음
        }
    }

    /**
     * 월별 데이터 조회는 한국만 지원하므로 제거됨
     */

    /**
     * 실제 데이터만 저장 (발표일 식별)
     */
    private void saveActualDataOnly(List<InterestRate> rateData, String countryCode) {
        log.info("🔍 {} 국가의 실제 금리 데이터만 저장 및 발표일 식별 중...", countryCode);
        
        if (rateData.isEmpty()) {
            log.warn("⚠️ {} 국가의 금리 데이터가 없습니다.", countryCode);
            return;
        }
        
        // 날짜순으로 정렬
        rateData.sort((a, b) -> a.getDate().compareTo(b.getDate()));
        
        int announcementCount = 0;
        
        for (InterestRate currentRate : rateData) {
            // 이전 금리 조회 (DB에서)
            Optional<InterestRate> previousRate = interestRateRepository
                .findPreviousRateByCountryAndDate(countryCode, currentRate.getDate());
            
            // 기존 데이터 확인
            Optional<InterestRate> existing = interestRateRepository
                .findByDateAndCountryCode(currentRate.getDate(), currentRate.getCountryCode());
                
            boolean isAnnouncement = false;
            
            // 금리 변경 확인
            if (previousRate.isPresent()) {
                Double prevRateValue = previousRate.get().getInterestRate();
                if (!prevRateValue.equals(currentRate.getInterestRate())) {
                    isAnnouncement = true;
                    announcementCount++;
                    log.info("📢 발표일 식별: {} - {}% → {}%", 
                            currentRate.getDate(), prevRateValue, currentRate.getInterestRate());
                }
            } else {
                // 첫 번째 데이터는 발표일로 간주
                isAnnouncement = true;
                announcementCount++;
                log.info("📢 첫 번째 데이터 (발표일): {} - {}%", 
                        currentRate.getDate(), currentRate.getInterestRate());
            }
            
            currentRate.setIsAnnouncementDate(isAnnouncement);
            
            if (existing.isPresent()) {
                // 이미 존재하는 경우 업데이트
                InterestRate existingRate = existing.get();
                existingRate.setInterestRate(currentRate.getInterestRate());
                existingRate.setBankName(currentRate.getBankName());
                existingRate.setRateType(currentRate.getRateType());
                existingRate.setIsAnnouncementDate(isAnnouncement);
                interestRateRepository.save(existingRate);
            } else {
                // 새로운 데이터 저장
                interestRateRepository.save(currentRate);
            }
        }
        
        log.info("✅ {} 국가 실제 데이터 저장 완료: {}개 데이터, {}개 발표일", 
                countryCode, rateData.size(), announcementCount);
    }

    /**
     * 한국 기준금리 통계표 코드 반환
     */
    private String getStatCodeByCountry(String countryCode) {
        if ("KR".equals(countryCode)) {
            return "722Y001";  // 한국 기준금리 (한국은행 기준금리)
        } else {
            throw new IllegalArgumentException("한국만 지원됩니다: " + countryCode);
        }
    }

    /**
     * ECOS API 일별 응답 파싱
     */
    private List<InterestRate> parseEcosDailyResponse(String response, CountryInfo countryInfo) {
        List<InterestRate> rates = new ArrayList<>();
        
        try {
            JsonNode root = objectMapper.readTree(response);
            JsonNode dataArray = root.path("StatisticSearch").path("row");
            
            for (JsonNode dataNode : dataArray) {
                String timeStr = dataNode.path("TIME").asText();
                String dataValue = dataNode.path("DATA_VALUE").asText();
                
                if (timeStr.isEmpty() || dataValue.isEmpty() || "-".equals(dataValue)) {
                    continue;
                }
                
                LocalDate date = parseDailyDate(timeStr);
                Double rate = Double.parseDouble(dataValue);
                
                InterestRate interestRate = InterestRate.builder()
                    .date(date)
                    .countryCode(countryInfo.code)
                    .countryName(countryInfo.name)
                    .bankName(countryInfo.bankName)
                    .rateType(countryInfo.rateType)
                    .interestRate(rate)
                    .isAnnouncementDate(false)  // 기본값, 나중에 식별
                    .build();
                    
                rates.add(interestRate);
            }
            
        } catch (Exception e) {
            log.error("❌ ECOS 일별 응답 파싱 실패: {}", e.getMessage());
        }
        
        return rates;
    }

    /**
     * 일별 날짜 파싱 (YYYYMMDD -> LocalDate)
     */
    private LocalDate parseDailyDate(String timeStr) {
        if (timeStr.length() == 8) {
            int year = Integer.parseInt(timeStr.substring(0, 4));
            int month = Integer.parseInt(timeStr.substring(4, 6));
            int day = Integer.parseInt(timeStr.substring(6, 8));
            return LocalDate.of(year, month, day);
        }
        throw new IllegalArgumentException("Invalid date format: " + timeStr);
    }



    /**
     * 금리 데이터 저장 또는 업데이트
     */
    private void saveOrUpdateRate(InterestRate newRate) {
        Optional<InterestRate> existing = interestRateRepository
            .findByDateAndCountryCode(newRate.getDate(), newRate.getCountryCode());
            
        if (existing.isPresent()) {
            InterestRate existingRate = existing.get();
            existingRate.setInterestRate(newRate.getInterestRate());
            existingRate.setBankName(newRate.getBankName());
            existingRate.setRateType(newRate.getRateType());
            interestRateRepository.save(existingRate);
        } else {
            interestRateRepository.save(newRate);
        }
    }

    /**
     * 응답 데이터 구성
     */
    private InterestRateResponse buildResponse(List<InterestRate> latestRates) {
        log.info("🔍 응답 데이터 구성 시작 - 입력 데이터: {}개", latestRates.size());
        
        Map<String, InterestRate> rateMap = latestRates.stream()
            .collect(Collectors.toMap(InterestRate::getCountryCode, rate -> rate));
        
        log.info("🔍 rateMap 구성: {}", rateMap.keySet());
        
        // 한국 데이터 확인
        InterestRate koreaRate = rateMap.get("KR");
        if (koreaRate != null) {
            log.info("✅ 한국 금리 데이터 존재: {}% ({})", koreaRate.getInterestRate(), koreaRate.getDate());
        } else {
            log.warn("⚠️ 한국 금리 데이터가 rateMap에 없습니다!");
        }
        
        // 히스토리 데이터 조회 (최근 12개월)
        LocalDate historyStartDate = LocalDate.now().minusMonths(12);
        List<InterestRate> historyRates = interestRateRepository
            .findRecentRatesForHistory(historyStartDate);
        
        List<InterestRateResponse.HistoryData> history = buildHistoryData(historyRates);

        InterestRateResponse.CountryRate koreaCountryRate = buildCountryRate(koreaRate);
        log.info("🔍 한국 CountryRate 생성 결과: {}", koreaCountryRate);

        return InterestRateResponse.builder()
            .korea(koreaCountryRate)
            .history(history)
            .lastUpdated(LocalDate.now())
            .message("실시간 한국은행 ECOS API 데이터 (한국 금리만)")
            .build();
    }

    /**
     * 국가별 금리 응답 데이터 구성
     */
    private InterestRateResponse.CountryRate buildCountryRate(InterestRate rate) {
        if (rate == null) {
            log.warn("⚠️ buildCountryRate: 입력 InterestRate가 null입니다.");
            return null;
        }
        
        log.info("🔍 buildCountryRate: {} - {}% ({})", 
                rate.getCountryName(), rate.getInterestRate(), rate.getDate());
        
        InterestRateResponse.CountryRate countryRate = InterestRateResponse.CountryRate.builder()
            .countryCode(rate.getCountryCode())
            .countryName(rate.getCountryName())
            .bankName(rate.getBankName())
            .rateType(rate.getRateType())
            .rate(rate.getInterestRate())
            .lastUpdated(rate.getDate())
            .build();
            
        log.info("🔍 생성된 CountryRate: {}", countryRate);
        return countryRate;
    }

    /**
     * 히스토리 데이터 구성
     */
    private List<InterestRateResponse.HistoryData> buildHistoryData(List<InterestRate> historyRates) {
        Map<LocalDate, Map<String, Double>> groupedData = historyRates.stream()
            .collect(Collectors.groupingBy(
                InterestRate::getDate,
                Collectors.toMap(
                    InterestRate::getCountryCode,
                    InterestRate::getInterestRate
                )
            ));
        
        return groupedData.entrySet().stream()
            .map(entry -> InterestRateResponse.HistoryData.builder()
                .date(entry.getKey())
                .rates(entry.getValue())
                .build())
            .sorted((a, b) -> b.getDate().compareTo(a.getDate()))
            .limit(12)
            .collect(Collectors.toList());
    }

    /**
     * 샘플 응답 데이터 생성
     */
    private InterestRateResponse createSampleResponse() {
        log.info("🔧 샘플 데이터를 사용합니다.");

        return InterestRateResponse.builder()
            .korea(InterestRateResponse.CountryRate.builder()
                .countryCode("KR")
                .countryName("한국")
                .bankName("한국은행")
                .rateType("기준금리")
                .rate(3.5)
                .lastUpdated(LocalDate.now())
                .build())
            .history(Collections.emptyList())
            .lastUpdated(LocalDate.now())
            .message("샘플 데이터 (API 연결 실패, 한국 금리만)")
                .build();
    }

    /**
     * 월별 데이터 관련 메서드들은 한국만 지원하므로 제거됨
     */

    /**
     * 모든 국가의 금리 발표일 조회
     */
    public List<InterestRateDto> getAnnouncementDates() {
        log.info("📢 모든 국가의 금리 발표일 조회");
        List<InterestRate> announcements = interestRateRepository.findByIsAnnouncementDateTrueOrderByDateDesc();
        return InterestRateDto.fromEntities(announcements);
    }

    /**
     * 특정 국가의 금리 발표일 조회
     */
    public List<InterestRateDto> getAnnouncementDatesByCountry(String countryCode) {
        log.info("📢 {} 국가의 금리 발표일 조회", countryCode);
        List<InterestRate> announcements = interestRateRepository
            .findByCountryCodeAndIsAnnouncementDateTrueOrderByDateDesc(countryCode);
        return InterestRateDto.fromEntities(announcements);
    }

    /**
     * 특정 기간의 금리 발표일 조회
     */
    public List<InterestRateDto> getAnnouncementDatesByPeriod(LocalDate startDate, LocalDate endDate) {
        log.info("📢 {}부터 {}까지의 금리 발표일 조회", startDate, endDate);
        List<InterestRate> announcements = interestRateRepository
            .findByIsAnnouncementDateTrueAndDateBetweenOrderByDateDesc(startDate, endDate);
        return InterestRateDto.fromEntities(announcements);
    }
} 