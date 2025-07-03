package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.ConsumerPriceIndexDto;
import com.at_a_look.economy.dto.response.ConsumerPriceIndexResponse;
import com.at_a_look.economy.entity.ConsumerPriceIndex;
import com.at_a_look.economy.repository.ConsumerPriceIndexRepository;
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
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConsumerPriceIndexService {

    private final ConsumerPriceIndexRepository consumerPriceIndexRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ecos.api.key}")
    private String ecosApiKey;

    // 소비자물가지수 통계표 코드
    private static final String STAT_CODE = "901Y009";
    
    // 통계항목 코드 매핑 (이미지 참고)
    private static final Map<String, String> ITEM_CODES;
    static {
        ITEM_CODES = new HashMap<>();
        ITEM_CODES.put("0", "총지수");
        ITEM_CODES.put("A", "식료품 및 비주류음료");
        ITEM_CODES.put("B", "주류 및 담배");
        ITEM_CODES.put("C", "의류 및 신발");
        ITEM_CODES.put("D", "주택, 수도, 전기 및 연료");
        ITEM_CODES.put("E", "가정용품 및 가사 서비스");
        ITEM_CODES.put("F", "보건");
        ITEM_CODES.put("G", "교통");
        ITEM_CODES.put("H", "통신");
        ITEM_CODES.put("I", "오락 및 문화");
        ITEM_CODES.put("J", "교육");
        ITEM_CODES.put("K", "음식 및 숙박");
        ITEM_CODES.put("L", "기타 상품 및 서비스");
    }

    /**
     * 최신 소비자물가지수 정보 조회
     */
    @Transactional
    public ConsumerPriceIndexResponse fetchLatestConsumerPriceIndex() {
        log.info("📊 최신 소비자물가지수 정보 조회 시작");
        
        try {
            // DB에서 최신 데이터 조회
            Optional<ConsumerPriceIndex> latestCPI = consumerPriceIndexRepository.findTopByOrderByDateDesc();
            long totalCount = consumerPriceIndexRepository.count();
            
            log.info("🔍 DB 현재 상태: 총 {}개 데이터, 최신 데이터 존재여부: {}", 
                    totalCount, latestCPI.isPresent());
            
            // 추가 디버그: 실제 데이터 확인
            if (latestCPI.isPresent()) {
                ConsumerPriceIndex cpi = latestCPI.get();
                log.info("🔍 최신 CPI 데이터: 날짜={}, 값={}, 월변화율={}, 년변화율={}", 
                        cpi.getDate(), cpi.getCpiValue(), cpi.getMonthlyChange(), cpi.getAnnualChange());
            }
            
            // 전체 데이터 샘플 조회
            List<ConsumerPriceIndex> sampleData = consumerPriceIndexRepository.findTop7ByOrderByDateDesc();
            log.info("🔍 최근 7개 데이터 샘플:");
            for (ConsumerPriceIndex data : sampleData) {
                log.info("  - 날짜: {}, CPI: {}", data.getDate(), data.getCpiValue());
            }
            
            // 데이터가 없거나 충분하지 않거나 오래된 경우 API 호출
            boolean isEmpty = latestCPI.isEmpty();
            boolean isLowCount = totalCount < 12;
            boolean isOutdated = latestCPI.isPresent() && isDataOutdated(latestCPI.get().getDate());
            
            log.info("🔍 조건 체크: isEmpty={}, isLowCount={}, isOutdated={}", isEmpty, isLowCount, isOutdated);
            
            if (isEmpty || isLowCount || isOutdated) {
                log.info("🔄 데이터 초기화 필요. API에서 최신 데이터 가져오기 (총 데이터: {}, 최신 날짜: {})", 
                        totalCount, latestCPI.map(cpi -> cpi.getDate()).orElse("없음"));
                        
                // 강제로 API 호출하여 데이터 초기화
                fetchAndSaveLatestData();
                latestCPI = consumerPriceIndexRepository.findTopByOrderByDateDesc();
                
                log.info("🔄 데이터 초기화 후 상태: 총 {}개 데이터, 최신 데이터 존재여부: {}", 
                        consumerPriceIndexRepository.count(), latestCPI.isPresent());
            }
            
            if (latestCPI.isPresent()) {
                log.info("✅ 실제 DB 데이터 사용: 날짜={}, CPI={}", latestCPI.get().getDate(), latestCPI.get().getCpiValue());
                return buildResponse(latestCPI.get());
            } else {
                log.warn("⚠️ DB에서 데이터를 찾을 수 없어 샘플 데이터 사용");
                return buildResponse(createSampleData());
            }
            
        } catch (Exception e) {
            log.error("❌ 소비자물가지수 데이터 조회 실패: {}", e.getMessage(), e);
            return buildResponse(createSampleData());
        }
    }

    /**
     * API에서 최신 소비자물가지수 데이터 가져오기 (강제 새로고침)
     */
    @Transactional
    public ConsumerPriceIndexResponse fetchLatestConsumerPriceIndexWithApiCall() {
        log.info("🌐 API 호출을 포함한 소비자물가지수 데이터 조회");
        
        try {
            // API에서 최신 데이터 가져오기
            fetchAndSaveLatestData();
            
            // 업데이트된 데이터 조회
            Optional<ConsumerPriceIndex> latestCPI = consumerPriceIndexRepository.findTopByOrderByDateDesc();
            
            if (latestCPI.isPresent()) {
                log.info("✅ API 호출 후 실제 DB 데이터 사용: 날짜={}, CPI={}", latestCPI.get().getDate(), latestCPI.get().getCpiValue());
                return buildResponse(latestCPI.get());
            } else {
                log.warn("⚠️ API 호출 후에도 DB에서 데이터를 찾을 수 없어 샘플 데이터 사용");
                return buildResponse(createSampleData());
            }
            
        } catch (Exception e) {
            log.error("❌ API 호출 포함 소비자물가지수 데이터 조회 실패: {}", e.getMessage());
            // 예외 발생 시에도 기존 DB 데이터 확인
            Optional<ConsumerPriceIndex> latestCPI = consumerPriceIndexRepository.findTopByOrderByDateDesc();
            if (latestCPI.isPresent()) {
                log.info("✅ 예외 발생했지만 기존 DB 데이터 사용: 날짜={}, CPI={}", latestCPI.get().getDate(), latestCPI.get().getCpiValue());
                return buildResponse(latestCPI.get());
            } else {
                log.warn("⚠️ 예외 발생 + DB 데이터 없음, 샘플 데이터 사용");
                return buildResponse(createSampleData());
            }
        }
    }

    /**
     * 최근 2년간 월별 소비자물가지수 데이터 조회 및 저장
     */
    @Transactional
    public void fetchAndSaveLatestData() {
        log.info("📅 최근 2년간 월별 소비자물가지수 데이터 조회 시작");
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusYears(2);
        
        String startDateStr = startDate.format(DateTimeFormatter.ofPattern("yyyyMM"));
        String endDateStr = endDate.format(DateTimeFormatter.ofPattern("yyyyMM"));
        
        fetchAndSaveCPIData(startDateStr, endDateStr, "M"); // 월별 데이터
        
        log.info("📈 소비자물가지수 데이터 조회 완료");
    }

    /**
     * 특정 기간의 소비자물가지수 데이터 조회 및 저장
     */
    @Transactional
    public void fetchAndSaveCPIData(String startDate, String endDate, String cycle) {
        log.info("📅 CPI 데이터 수집 시작: {} ~ {} (주기: {})", startDate, endDate, cycle);
        
        // 현재 DB 데이터 상태 확인
        long totalCount = consumerPriceIndexRepository.count();
        log.info("🔍 현재 DB 총 CPI 데이터: {}개", totalCount);
        
        // 기존 데이터 확인을 덜 엄격하게 (API 호출을 더 자주 허용)
        if (totalCount >= 24) { // 2년치 데이터가 있는 경우만 건너뛰기
            log.info("📋 충분한 데이터({}개)가 있습니다. 하지만 강제로 최신 데이터를 확인합니다.", totalCount);
        }
        
        // ECOS API URL
        String url = String.format(
            "https://ecos.bok.or.kr/api/StatisticSearch/%s/json/kr/1/10000/%s/%s/%s/%s/0",
            ecosApiKey, STAT_CODE, cycle, startDate, endDate
        );
        
        log.info("🌐 ECOS API 호출 시작");
        log.info("🔗 URL: {}", url.replaceAll(ecosApiKey, "***API_KEY***"));
        
        try {
            String response = restTemplate.getForObject(url, String.class);
            
            if (response == null) {
                throw new RuntimeException("한국은행 API로부터 응답을 받지 못했습니다.");
            }
            
            // API 응답 검증
            String errorMessage = validateCPIEcosApiResponse(response);
            if (errorMessage != null) {
                log.error("❌ ECOS API 에러 응답: {}", errorMessage);
                throw new RuntimeException("한국은행 API 에러: " + errorMessage);
            }
            
            log.info("✅ API 응답 수신 완료 (길이: {} 문자)", response.length());
            log.debug("📝 API 응답 내용: {}", response.substring(0, Math.min(500, response.length())));
            
            List<ConsumerPriceIndex> cpiData = parseEcosResponse(response);
            
            if (cpiData.isEmpty()) {
                throw new RuntimeException("파싱된 소비자물가지수 데이터가 없습니다. 요청한 기간에 데이터가 없거나 API 응답 형식이 변경되었을 가능성이 있습니다.");
            }
            
            log.info("🔧 파싱 완료: {}개 데이터 추출", cpiData.size());
            
            // 월별/연별 변화율 계산 및 저장
            saveCPIDataWithChanges(cpiData);
            
            log.info("✅ 소비자물가지수 데이터 저장 완료: {}개", cpiData.size());
            
        } catch (Exception e) {
            String errorMsg;
            
            // 이미 한국은행 API 에러인 경우 (에러 코드 포함)
            if (e.getMessage() != null && e.getMessage().startsWith("한국은행 API 에러:")) {
                errorMsg = e.getMessage();
                log.error("❌ ECOS API 에러: {}", errorMsg);
            } else if (e.getMessage() != null && (e.getMessage().contains("ecos.bok.or.kr") || e.getMessage().contains("I/O error"))) {
                // 네트워크 에러인 경우
                errorMsg = "한국은행 서버에 연결할 수 없습니다. 네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.";
                log.error("❌ 네트워크 에러: {}", e.getMessage());
            } else {
                // 기타 에러
                errorMsg = "소비자물가지수 데이터 조회 실패: " + e.getMessage();
                log.error("❌ 소비자물가지수 API 호출 실패: {}", e.getMessage(), e);
            }
            
            throw new RuntimeException(errorMsg, e);
        }
    }

    /**
     * ECOS API 응답 검증 및 에러 메시지 추출
     */
    private String validateCPIEcosApiResponse(String response) {
        if (response == null || response.trim().isEmpty()) {
            return "한국은행 API로부터 응답을 받지 못했습니다.";
        }
        
        try {
            JsonNode root = objectMapper.readTree(response);
            
            // 에러 정보 확인
            if (root.has("RESULT")) {
                JsonNode result = root.get("RESULT");
                if (result.has("CODE")) {
                    String code = result.get("CODE").asText();
                    String message = result.has("MESSAGE") ? result.get("MESSAGE").asText() : "";
                    
                    // 성공이 아닌 경우 에러 메시지 반환
                    if (!"INFO-000".equals(code)) {
                        return getCPIEcosErrorMessage(code, message);
                    }
                }
            }
            
            // StatisticSearch가 있는지 확인 (정상 응답)
            if (root.has("StatisticSearch")) {
                JsonNode search = root.get("StatisticSearch");
                if (search.has("RESULT")) {
                    JsonNode result = search.get("RESULT");
                    if (result.has("CODE")) {
                        String code = result.get("CODE").asText();
                        String message = result.has("MESSAGE") ? result.get("MESSAGE").asText() : "";
                        
                        if (!"INFO-000".equals(code)) {
                            return getCPIEcosErrorMessage(code, message);
                        }
                    }
                }
            }
            
            return null; // 에러 없음
            
        } catch (Exception e) {
            log.warn("⚠️ API 응답 파싱 중 오류 발생: {}", e.getMessage());
            return null; // 파싱 실패시 기존 로직 계속 진행
        }
    }
    
    /**
     * ECOS API 에러 코드를 사용자 친화적인 메시지로 변환
     */
    private String getCPIEcosErrorMessage(String code, String originalMessage) {
        String userMessage;
        switch (code) {
            case "INFO-100":
                userMessage = "인증키가 유효하지 않습니다. API 키를 확인해주세요.";
                break;
            case "INFO-200":
                userMessage = "요청하신 기간에 해당하는 소비자물가지수 데이터가 없습니다. 다른 기간을 선택해주세요.";
                break;
            case "ERROR-100":
                userMessage = "필수 파라미터가 누락되었습니다. 요청 정보를 확인해주세요.";
                break;
            case "ERROR-101":
                userMessage = "날짜 형식이 올바르지 않습니다. 날짜 형식을 확인해주세요.";
                break;
            case "ERROR-200":
                userMessage = "파일 타입 값이 유효하지 않습니다.";
                break;
            case "ERROR-300":
                userMessage = "조회 건수 값이 누락되었습니다.";
                break;
            case "ERROR-301":
                userMessage = "조회 건수 값의 타입이 유효하지 않습니다.";
                break;
            case "ERROR-400":
                userMessage = "검색 범위가 너무 큽니다. 기간을 줄여서 다시 시도해주세요.";
                break;
            case "ERROR-500":
                userMessage = "한국은행 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
                break;
            case "ERROR-600":
                userMessage = "한국은행 데이터베이스 연결 오류가 발생했습니다.";
                break;
            case "ERROR-601":
                userMessage = "한국은행 데이터베이스 SQL 오류가 발생했습니다.";
                break;
            case "ERROR-602":
                userMessage = "과도한 API 호출로 이용이 제한되었습니다. 잠시 후 다시 시도해주세요.";
                break;
            default:
                userMessage = originalMessage != null && !originalMessage.isEmpty() ? originalMessage : "알 수 없는 오류가 발생했습니다.";
                break;
        }
        
        // 에러 코드와 메시지를 함께 반환
        return String.format("[%s] %s", code, userMessage);
    }

    /**
     * ECOS API 응답 파싱
     */
    private List<ConsumerPriceIndex> parseEcosResponse(String response) {
        List<ConsumerPriceIndex> cpiList = new ArrayList<>();
        
        try {
            JsonNode root = objectMapper.readTree(response);
            
            JsonNode dataArray = root.path("StatisticSearch").path("row");
            
            if (!dataArray.isArray() || dataArray.size() == 0) {
                log.warn("⚠️ 응답에서 데이터 배열을 찾을 수 없거나 비어있습니다.");
                log.info("📝 응답 구조: {}", root.toPrettyString());
                return cpiList;
            }
            
            log.info("🔍 파싱할 데이터 개수: {}", dataArray.size());
            
            for (JsonNode dataNode : dataArray) {
                String timeStr = dataNode.path("TIME").asText();
                String dataValue = dataNode.path("DATA_VALUE").asText();
                String itemCode = dataNode.path("ITEM_CODE1").asText();
                
                log.debug("📊 데이터 항목: 시간={}, 값={}, 항목코드={}", timeStr, dataValue, itemCode);
                
                if (timeStr.isEmpty() || dataValue.isEmpty() || "-".equals(dataValue)) {
                    log.debug("⚠️ 유효하지 않은 데이터 건너뜀: 시간={}, 값={}", timeStr, dataValue);
                    continue;
                }
                
                try {
                    // YYYYMM 형식 그대로 사용
                    String date = timeStr;
                    Double cpiValue = Double.parseDouble(dataValue);
                    
                    ConsumerPriceIndex cpi = ConsumerPriceIndex.builder()
                        .date(date)
                        .cpiValue(cpiValue)
                        .monthlyChange(0.0) // 나중에 계산
                        .annualChange(0.0)  // 나중에 계산
                        .build();
                        
                    cpiList.add(cpi);
                    log.debug("✅ CPI 데이터 생성: 날짜={}, 값={}", date, cpiValue);
                    
                } catch (Exception e) {
                    log.warn("⚠️ 데이터 파싱 실패 - 시간: {}, 값: {}, 에러: {}", timeStr, dataValue, e.getMessage());
                }
            }
            
            log.info("🔧 파싱 완료: 총 {}개 데이터 생성", cpiList.size());
            
        } catch (Exception e) {
            log.error("❌ ECOS 응답 파싱 실패: {}", e.getMessage(), e);
        }
        
        return cpiList;
    }

    /**
     * 변화율 계산하여 CPI 데이터 저장
     */
    private void saveCPIDataWithChanges(List<ConsumerPriceIndex> cpiData) {
        log.info("💾 CPI 데이터 저장 시작: {}개 데이터", cpiData.size());
        
        // 날짜 순으로 정렬 (YYYYMM 문자열 정렬)
        cpiData.sort(Comparator.comparing(ConsumerPriceIndex::getDate));
        
        int savedCount = 0;
        int updatedCount = 0;
        
        for (int i = 0; i < cpiData.size(); i++) {
            ConsumerPriceIndex current = cpiData.get(i);
            
            // 월별 변화율 계산 (전월 대비)
            if (i > 0) {
                ConsumerPriceIndex previous = cpiData.get(i - 1);
                double monthlyChange = ((current.getCpiValue() - previous.getCpiValue()) / previous.getCpiValue()) * 100;
                current.setMonthlyChange(Math.round(monthlyChange * 100.0) / 100.0);
            }
            
            // 연간 변화율 계산 (전년 동월 대비)
            if (i >= 12) {
                ConsumerPriceIndex yearAgo = cpiData.get(i - 12);
                double annualChange = ((current.getCpiValue() - yearAgo.getCpiValue()) / yearAgo.getCpiValue()) * 100;
                current.setAnnualChange(Math.round(annualChange * 100.0) / 100.0);
            }
            
            // 저장 또는 업데이트
            boolean isNew = saveOrUpdateCPI(current);
            if (isNew) {
                savedCount++;
            } else {
                updatedCount++;
            }
            
            log.debug("📊 처리 완료: 날짜={}, CPI={}, 월변화율={}, 년변화율={}", 
                    current.getDate(), current.getCpiValue(), 
                    current.getMonthlyChange(), current.getAnnualChange());
        }
        
        log.info("✅ CPI 데이터 저장 완료: 신규 {}개, 업데이트 {}개", savedCount, updatedCount);
    }

    /**
     * CPI 데이터 저장 또는 업데이트
     * @return true if new data saved, false if existing data updated
     */
    private boolean saveOrUpdateCPI(ConsumerPriceIndex newCPI) {
        Optional<ConsumerPriceIndex> existing = consumerPriceIndexRepository.findByDate(newCPI.getDate());
        
        if (existing.isPresent()) {
            ConsumerPriceIndex existingCPI = existing.get();
            existingCPI.setCpiValue(newCPI.getCpiValue());
            existingCPI.setMonthlyChange(newCPI.getMonthlyChange());
            existingCPI.setAnnualChange(newCPI.getAnnualChange());
            consumerPriceIndexRepository.save(existingCPI);
            return false; // 기존 데이터 업데이트
        } else {
            consumerPriceIndexRepository.save(newCPI);
            return true; // 신규 데이터 저장
        }
    }

    /**
     * 응답 데이터 구성
     */
    private ConsumerPriceIndexResponse buildResponse(ConsumerPriceIndex latestCPI) {
        log.info("🔍 소비자물가지수 응답 데이터 구성 시작");
        
        List<ConsumerPriceIndex> history = consumerPriceIndexRepository.findTop12ByOrderByDateDesc();
        List<ConsumerPriceIndexDto> historyDtos = ConsumerPriceIndexDto.fromEntities(history);

        // 전월 CPI 계산
        Double prevMonthCPI = null;
        if (history.size() >= 2) {
            // history는 최신순으로 정렬되어 있으므로 두 번째가 전월
            prevMonthCPI = history.get(1).getCpiValue();
        }
        
        log.info("📊 응답 데이터: 현재CPI={}, 전월CPI={}, 히스토리={}개", 
                latestCPI.getCpiValue(), prevMonthCPI, history.size());

        return ConsumerPriceIndexResponse.builder()
                .currentCPI(latestCPI.getCpiValue())
                .prevMonthCPI(prevMonthCPI)
                .changeRate(latestCPI.getMonthlyChange())
                .annualRate(latestCPI.getAnnualChange())
                .date(latestCPI.getDate()) // 최신 데이터의 날짜 추가
                .history(historyDtos)
                .build();
    }

    /**
     * 데이터가 오래되었는지 확인 (2개월 이상)
     */
    private boolean isDataOutdated(String lastDataDate) {
        try {
            // YYYYMM 형식을 현재 월보다 2개월 이전과 비교
            String twoMonthsAgo = LocalDate.now().minusMonths(2).format(DateTimeFormatter.ofPattern("yyyyMM"));
            boolean isOutdated = lastDataDate.compareTo(twoMonthsAgo) < 0;
            
            log.info("🔍 날짜 비교: 최신데이터={}, 2개월전={}, 오래됨={}", lastDataDate, twoMonthsAgo, isOutdated);
            
            return isOutdated;
        } catch (Exception e) {
            log.warn("⚠️ 날짜 비교 실패: {}", e.getMessage());
            return true; // 에러 시 오래된 것으로 간주
        }
    }

    /**
     * 샘플 데이터 생성
     */
    private ConsumerPriceIndex createSampleData() {
        log.info("🔧 샘플 CPI 데이터를 사용합니다.");
        
        String currentMonth = LocalDate.now().minusMonths(1).format(DateTimeFormatter.ofPattern("yyyyMM"));
        
        return ConsumerPriceIndex.builder()
                .date(currentMonth)
                .cpiValue(110.5)
                .monthlyChange(0.64)
                .annualChange(3.8)
                .build();
    }

    // 기존 메서드들 유지
    public List<ConsumerPriceIndexDto> getConsumerPriceIndexByDateRange(String startDate, String endDate) {
        List<ConsumerPriceIndex> cpiList = consumerPriceIndexRepository.findByDateBetween(startDate, endDate);
        return ConsumerPriceIndexDto.fromEntities(cpiList);
    }

    public ConsumerPriceIndexDto saveConsumerPriceIndex(ConsumerPriceIndexDto cpiDto) {
        ConsumerPriceIndex savedEntity = consumerPriceIndexRepository.save(cpiDto.toEntity());
        return ConsumerPriceIndexDto.fromEntity(savedEntity);
    }

    public Optional<ConsumerPriceIndexDto> getLatestConsumerPriceIndex() {
        return consumerPriceIndexRepository.findTopByOrderByDateDesc()
                .map(ConsumerPriceIndexDto::fromEntity);
    }

    /**
     * 어드민용: 최근 2년간 데이터 수동 호출
     */
    @Transactional
    public void fetchAndSave2YearsData() {
        log.info("📅 최근 2년간 소비자물가지수 데이터 수동 호출");
        
        try {
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusYears(2);
            
            String startDateStr = startDate.format(DateTimeFormatter.ofPattern("yyyyMM"));
            String endDateStr = endDate.format(DateTimeFormatter.ofPattern("yyyyMM"));
            
            fetchAndSaveCPIData(startDateStr, endDateStr, "M");
            
            log.info("📈 최근 2년간 소비자물가지수 데이터 호출 완료");
        } catch (Exception e) {
            log.error("❌ 최근 2년간 소비자물가지수 데이터 호출 실패: {}", e.getMessage());
            throw new RuntimeException("2년간 소비자물가지수 데이터 가져오기 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 어드민용: 최근 1년간 데이터 수동 호출  
     */
    @Transactional
    public void fetchAndSave1YearData() {
        log.info("📅 최근 1년간 소비자물가지수 데이터 수동 호출");
        
        try {
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusYears(1);
            
            String startDateStr = startDate.format(DateTimeFormatter.ofPattern("yyyyMM"));
            String endDateStr = endDate.format(DateTimeFormatter.ofPattern("yyyyMM"));
            
            fetchAndSaveCPIData(startDateStr, endDateStr, "M");
            
            log.info("📈 최근 1년간 소비자물가지수 데이터 호출 완료");
        } catch (Exception e) {
            log.error("❌ 최근 1년간 소비자물가지수 데이터 호출 실패: {}", e.getMessage());
            throw new RuntimeException("1년간 소비자물가지수 데이터 가져오기 실패: " + e.getMessage(), e);
        }
    }
} 