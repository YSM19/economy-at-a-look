package com.at_a_look.economy.config;

import com.at_a_look.economy.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserService userService;

    @Override
    public void run(String... args) throws Exception {
        log.info("🚀 [DataInitializer] 데이터 초기화 시작");
        
        try {
            // 관리자 계정 초기화
            userService.initializeAdminAccount();
            log.info("✅ [DataInitializer] 데이터 초기화 완료");
        } catch (Exception e) {
            log.error("❌ [DataInitializer] 데이터 초기화 실패: {}", e.getMessage());
            log.info("📋 [DataInitializer] 테이블이 아직 생성되지 않았을 수 있습니다. 애플리케이션 재시작 후 다시 시도해주세요.");
            // 예외를 다시 던지지 않아서 애플리케이션이 계속 실행되도록 함
        }
    }
} 