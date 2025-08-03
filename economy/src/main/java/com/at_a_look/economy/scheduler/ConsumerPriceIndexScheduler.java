package com.at_a_look.economy.scheduler;

import com.at_a_look.economy.service.ConsumerPriceIndexService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConsumerPriceIndexScheduler {

    private final ConsumerPriceIndexService consumerPriceIndexService;
    
    // 재시도 관련 설정
    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final long RETRY_DELAY_MS = 30000; // 30초
    private final AtomicInteger consecutiveFailures = new AtomicInteger(0);

    /**
     * 매일 오전 11시 30분에 소비자물가지수 데이터 업데이트
     * 통계청에서 보통 월말~월초에 전월 데이터를 발표하므로 매일 체크하여 최신 데이터 확보
     */
    @Scheduled(cron = "0 30 11 * * *")
    public void updateConsumerPriceIndexDaily() {
        log.info("📊 [CPI 스케줄러] 일일 소비자물가지수 데이터 업데이트 시작 - {}", LocalDateTime.now());
        
        try {
            // 최근 2년간 데이터 업데이트
            consumerPriceIndexService.fetchAndSaveLatestData();
            log.info("✅ [CPI 스케줄러] 소비자물가지수 데이터 업데이트 완료");
            
            // 성공 시 연속 실패 카운터 리셋
            consecutiveFailures.set(0);
            
        } catch (ResourceAccessException e) {
            // 네트워크 연결 실패
            handleNetworkError("네트워크 연결 실패", e);
        } catch (RestClientException e) {
            // REST API 호출 실패
            handleApiError("API 호출 실패", e);
        } catch (DataAccessException e) {
            // 데이터베이스 접근 실패
            handleDatabaseError("데이터베이스 접근 실패", e);
        } catch (IllegalArgumentException e) {
            // 잘못된 파라미터
            handleValidationError("잘못된 파라미터", e);
        } catch (RuntimeException e) {
            // 기타 런타임 에러
            handleRuntimeError("런타임 에러", e);
        } catch (Exception e) {
            // 예상치 못한 에러
            handleUnexpectedError("예상치 못한 에러", e);
        }
    }

    /**
     * 애플리케이션 시작 후 3분 뒤에 초기 데이터 로드
     * 서버 시작 시 데이터가 없는 경우를 대비
     */
    @Scheduled(fixedDelay = Long.MAX_VALUE, initialDelay = 180000) // 3분 후 1회 실행
    public void loadInitialData() {
        log.info("🚀 [CPI 스케줄러] 초기 소비자물가지수 데이터 로드 시작");
        
        try {
            // 기존 데이터가 있는지 확인
            var existingData = consumerPriceIndexService.getLatestConsumerPriceIndex();
            
            if (existingData.isEmpty()) {
                log.info("📥 기존 CPI 데이터가 없어 초기 데이터를 로드합니다.");
                consumerPriceIndexService.fetchAndSaveLatestData();
                log.info("✅ [CPI 스케줄러] 초기 소비자물가지수 데이터 로드 완료");
            } else {
                log.info("✅ 기존 CPI 데이터가 있어 초기 로드를 건너뜁니다. (최신: {})", 
                    existingData.get().getDate());
            }
            
            // 성공 시 연속 실패 카운터 리셋
            consecutiveFailures.set(0);
            
        } catch (ResourceAccessException e) {
            handleNetworkError("초기 데이터 로드 중 네트워크 연결 실패", e);
        } catch (DataAccessException e) {
            handleDatabaseError("초기 데이터 로드 중 데이터베이스 접근 실패", e);
        } catch (Exception e) {
            handleUnexpectedError("초기 데이터 로드 중 예상치 못한 에러", e);
        }
    }

    /**
     * 매주 월요일 오전 10시에 데이터 상태 체크
     * 소비자물가지수는 월별 데이터이므로 주간 단위로 체크
     */
    @Scheduled(cron = "0 0 10 * * MON")
    public void checkDataStatusWeekly() {
        log.debug("🔍 [CPI 스케줄러] 주간 데이터 상태 체크 - {}", LocalDateTime.now());
        
        try {
            var latestCPI = consumerPriceIndexService.getLatestConsumerPriceIndex();
            
            if (latestCPI.isEmpty()) {
                log.warn("⚠️ 소비자물가지수 데이터가 없습니다. 긴급 업데이트를 시도합니다.");
                consumerPriceIndexService.fetchAndSaveLatestData();
            } else {
                var cpi = latestCPI.get();
                var latestDate = cpi.getDate();
                log.debug("✅ 소비자물가지수 최신 데이터: {} (CPI: {})", latestDate, cpi.getCpiValue());
                
                // 데이터가 2개월 이상 오래된 경우 추가 업데이트
                String twoMonthsAgo = LocalDateTime.now().toLocalDate().minusMonths(2).format(java.time.format.DateTimeFormatter.ofPattern("yyyyMM"));
                if (latestDate.compareTo(twoMonthsAgo) < 0) {
                    log.warn("⚠️ CPI 데이터가 2개월 이상 오래되었습니다. 업데이트를 시도합니다.");
                    consumerPriceIndexService.fetchAndSaveLatestData();
                }
            }
            
            // 성공 시 연속 실패 카운터 리셋
            consecutiveFailures.set(0);
            
        } catch (ResourceAccessException e) {
            handleNetworkError("주간 데이터 상태 체크 중 네트워크 연결 실패", e);
        } catch (DataAccessException e) {
            handleDatabaseError("주간 데이터 상태 체크 중 데이터베이스 접근 실패", e);
        } catch (Exception e) {
            handleUnexpectedError("주간 데이터 상태 체크 중 예상치 못한 에러", e);
        }
    }

    /**
     * 개발/테스트용: 스케줄러 즉시 실행
     */
    public void runImmediately() {
        log.info("🚀 [CPI 스케줄러] 수동 실행 요청");
        updateConsumerPriceIndexDaily();
    }

    // ==================== 예외 처리 메서드들 ====================

    /**
     * 네트워크 연결 실패 처리
     */
    private void handleNetworkError(String context, ResourceAccessException e) {
        int failureCount = consecutiveFailures.incrementAndGet();
        log.error("🌐 [CPI 스케줄러] {} - {} (연속 실패: {}회)", context, e.getMessage(), failureCount);
        
        if (failureCount <= MAX_RETRY_ATTEMPTS) {
            log.info("🔄 {}초 후 재시도 예정 (시도 {}/{})", RETRY_DELAY_MS / 1000, failureCount, MAX_RETRY_ATTEMPTS);
            scheduleRetry(context);
        } else {
            log.error("❌ [CPI 스케줄러] 최대 재시도 횟수 초과. 다음 스케줄까지 대기합니다.");
            // 여기에 알림 서비스 호출 가능 (이메일, 슬랙 등)
        }
    }

    /**
     * API 호출 실패 처리
     */
    private void handleApiError(String context, RestClientException e) {
        int failureCount = consecutiveFailures.incrementAndGet();
        log.error("🔌 [CPI 스케줄러] {} - {} (연속 실패: {}회)", context, e.getMessage(), failureCount);
        
        if (failureCount <= MAX_RETRY_ATTEMPTS) {
            log.info("🔄 {}초 후 재시도 예정 (시도 {}/{})", RETRY_DELAY_MS / 1000, failureCount, MAX_RETRY_ATTEMPTS);
            scheduleRetry(context);
        } else {
            log.error("❌ [CPI 스케줄러] API 호출 최대 재시도 횟수 초과");
        }
    }

    /**
     * 데이터베이스 접근 실패 처리
     */
    private void handleDatabaseError(String context, DataAccessException e) {
        int failureCount = consecutiveFailures.incrementAndGet();
        log.error("🗄️ [CPI 스케줄러] {} - {} (연속 실패: {}회)", context, e.getMessage(), failureCount);
        
        // 데이터베이스 에러는 즉시 재시도하지 않고 다음 스케줄까지 대기
        log.error("❌ [CPI 스케줄러] 데이터베이스 에러로 인해 다음 스케줄까지 대기합니다.");
        
        // 여기에 데이터베이스 관리자 알림 가능
    }

    /**
     * 파라미터 검증 실패 처리
     */
    private void handleValidationError(String context, IllegalArgumentException e) {
        log.error("⚠️ [CPI 스케줄러] {} - {}", context, e.getMessage());
        // 검증 에러는 재시도하지 않음 (설정 문제일 가능성)
        log.error("❌ [CPI 스케줄러] 파라미터 검증 실패로 인해 다음 스케줄까지 대기합니다.");
    }

    /**
     * 런타임 에러 처리
     */
    private void handleRuntimeError(String context, RuntimeException e) {
        int failureCount = consecutiveFailures.incrementAndGet();
        log.error("⚡ [CPI 스케줄러] {} - {} (연속 실패: {}회)", context, e.getMessage(), failureCount);
        
        if (failureCount <= MAX_RETRY_ATTEMPTS) {
            log.info("🔄 {}초 후 재시도 예정 (시도 {}/{})", RETRY_DELAY_MS / 1000, failureCount, MAX_RETRY_ATTEMPTS);
            scheduleRetry(context);
        } else {
            log.error("❌ [CPI 스케줄러] 런타임 에러 최대 재시도 횟수 초과");
        }
    }

    /**
     * 예상치 못한 에러 처리
     */
    private void handleUnexpectedError(String context, Exception e) {
        int failureCount = consecutiveFailures.incrementAndGet();
        log.error("💥 [CPI 스케줄러] {} - {} (연속 실패: {}회)", context, e.getMessage(), failureCount, e);
        
        if (failureCount <= MAX_RETRY_ATTEMPTS) {
            log.info("🔄 {}초 후 재시도 예정 (시도 {}/{})", RETRY_DELAY_MS / 1000, failureCount, MAX_RETRY_ATTEMPTS);
            scheduleRetry(context);
        } else {
            log.error("❌ [CPI 스케줄러] 예상치 못한 에러 최대 재시도 횟수 초과");
        }
    }

    /**
     * 재시도 스케줄링
     */
    private void scheduleRetry(String context) {
        try {
            Thread.sleep(RETRY_DELAY_MS);
            log.info("🔄 [CPI 스케줄러] 재시도 시작: {}", context);
            consumerPriceIndexService.fetchAndSaveLatestData();
            log.info("✅ [CPI 스케줄러] 재시도 성공");
            consecutiveFailures.set(0);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("⚠️ [CPI 스케줄러] 재시도가 중단되었습니다: {}", e.getMessage());
        } catch (Exception e) {
            log.error("❌ [CPI 스케줄러] 재시도 실패: {}", e.getMessage());
        }
    }
} 