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
            // 잠시 대기 (데이터베이스 초기화 완료를 기다림)
            Thread.sleep(2000);
            
            log.info("🔐 [DataInitializer] 관리자 계정 초기화 시작...");
            // 관리자 계정 초기화
            userService.initializeAdminAccount();
            log.info("✅ [DataInitializer] 데이터 초기화 완료");
        } catch (Exception e) {
            log.error("❌ [DataInitializer] 데이터 초기화 실패: {}", e.getMessage());
            log.error("🔍 [DataInitializer] 오류 상세 정보: ", e);
            
            // 스택 트레이스 출력
            e.printStackTrace();
            
            // UserService 의존성 상태 확인
            log.info("🔍 [DataInitializer] UserService 주입 상태: {}", userService != null ? "정상" : "null");
            
            log.info("📋 [DataInitializer] 테이블이 아직 생성되지 않았거나 BCrypt 설정에 문제가 있을 수 있습니다.");
            
            // 디버깅을 위해 예외를 다시 던짐 (선택사항)
            // throw e;
        }
    }
} 