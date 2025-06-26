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
        
        // 관리자 계정 초기화
        userService.initializeAdminAccount();
        
        log.info("✅ [DataInitializer] 데이터 초기화 완료");
    }
} 