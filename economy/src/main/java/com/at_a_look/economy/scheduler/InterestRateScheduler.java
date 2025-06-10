package com.at_a_look.economy.scheduler;

import com.at_a_look.economy.service.InterestRateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class InterestRateScheduler {

    private final InterestRateService interestRateService;

    /**
     * 매일 정오 12시에 기준금리 데이터 업데이트
     * 한국은행 발표 시간을 고려하여 정오 12시로 설정
     */
    @Scheduled(cron = "0 0 12 * * *")
    public void updateInterestRateDaily() {
        log.info("🕛 [스케줄러] 매일 기준금리 데이터 업데이트 시작 - {}", LocalDateTime.now());
        
        try {
            // 강제 새로고침으로 최신 데이터 가져오기
            interestRateService.fetchAndSaveYearlyRates();
            log.info("✅ [스케줄러] 기준금리 데이터 업데이트 완료");
        } catch (Exception e) {
            log.error("❌ [스케줄러] 기준금리 데이터 업데이트 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 애플리케이션 시작 후 5분 뒤에 초기 데이터 로드
     * 서버 시작 시 데이터가 없는 경우를 대비
     */
    @Scheduled(fixedDelay = Long.MAX_VALUE, initialDelay = 300000) // 5분 후 1회 실행
    public void loadInitialData() {
        log.info("🚀 [스케줄러] 초기 기준금리 데이터 로드 시작");
        
        try {
            // 기존 데이터가 있는지 확인
            var existingData = interestRateService.getAnnouncementDatesByCountry("KR");
            
            if (existingData.isEmpty()) {
                log.info("📥 기존 데이터가 없어 초기 데이터를 로드합니다.");
                interestRateService.fetchAndSaveYearlyRates();
                log.info("✅ [스케줄러] 초기 기준금리 데이터 로드 완료");
            } else {
                log.info("✅ 기존 데이터가 있어 초기 로드를 건너뜁니다. ({}개 발표일)", existingData.size());
            }
        } catch (Exception e) {
            log.error("❌ [스케줄러] 초기 기준금리 데이터 로드 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 매시간 정각에 데이터 상태 체크 (평일 9시-18시만)
     * 금융통화위원회 회의일 등 중요한 발표가 있을 수 있는 시간대
     */
    @Scheduled(cron = "0 0 9-18 * * MON-FRI")
    public void checkDataStatusHourly() {
        log.debug("🔍 [스케줄러] 시간별 데이터 상태 체크 - {}", LocalDateTime.now());
        
        try {
            var koreaData = interestRateService.getAnnouncementDatesByCountry("KR");
            if (koreaData.isEmpty()) {
                log.warn("⚠️ 한국 기준금리 발표일 데이터가 없습니다. 긴급 업데이트를 시도합니다.");
                interestRateService.fetchAndSaveYearlyRates();
            } else {
                var latestDate = koreaData.get(0).getDate();
                log.debug("✅ 한국 기준금리 최신 발표일: {} ({}%)", latestDate, koreaData.get(0).getInterestRate());
                
                // 데이터가 너무 오래된 경우 추가 업데이트
                if (latestDate.isBefore(LocalDateTime.now().toLocalDate().minusDays(30))) {
                    log.warn("⚠️ 데이터가 30일 이상 오래되었습니다. 업데이트를 시도합니다.");
                    interestRateService.fetchAndSaveYearlyRates();
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ [스케줄러] 데이터 상태 체크 실패: {}", e.getMessage());
        }
    }

    /**
     * 개발/테스트용: 스케줄러 즉시 실행
     */
    public void runImmediately() {
        log.info("🚀 [스케줄러] 수동 실행 요청");
        updateInterestRateDaily();
    }
} 