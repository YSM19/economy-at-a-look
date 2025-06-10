package com.at_a_look.economy.scheduler;

import com.at_a_look.economy.service.ConsumerPriceIndexService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConsumerPriceIndexScheduler {

    private final ConsumerPriceIndexService consumerPriceIndexService;

    /**
     * 매월 1일 오후 2시에 소비자물가지수 데이터 업데이트
     * 통계청에서 보통 월말~월초에 전월 데이터를 발표하므로 월초에 업데이트
     */
    @Scheduled(cron = "0 0 14 1 * *")
    public void updateConsumerPriceIndexMonthly() {
        log.info("📊 [CPI 스케줄러] 월별 소비자물가지수 데이터 업데이트 시작 - {}", LocalDateTime.now());
        
        try {
            // 최근 2년간 데이터 업데이트
            consumerPriceIndexService.fetchAndSaveLatestData();
            log.info("✅ [CPI 스케줄러] 소비자물가지수 데이터 업데이트 완료");
        } catch (Exception e) {
            log.error("❌ [CPI 스케줄러] 소비자물가지수 데이터 업데이트 실패: {}", e.getMessage(), e);
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
        } catch (Exception e) {
            log.error("❌ [CPI 스케줄러] 초기 소비자물가지수 데이터 로드 실패: {}", e.getMessage(), e);
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
        } catch (Exception e) {
            log.warn("⚠️ [CPI 스케줄러] 데이터 상태 체크 실패: {}", e.getMessage());
        }
    }

    /**
     * 개발/테스트용: 스케줄러 즉시 실행
     */
    public void runImmediately() {
        log.info("🚀 [CPI 스케줄러] 수동 실행 요청");
        updateConsumerPriceIndexMonthly();
    }
} 