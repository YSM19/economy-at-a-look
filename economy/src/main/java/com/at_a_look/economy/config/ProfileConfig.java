package com.at_a_look.economy.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 프로파일별 환경 설정을 관리하는 설정 클래스
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class ProfileConfig {

    private final Environment env;

    /**
     * 애플리케이션 시작 시 현재 활성화된 프로필 정보를 로깅
     * @return 현재 활성화된 프로필 정보 문자열
     */
    @Bean
    public String activeProfiles() {
        String[] activeProfiles = env.getActiveProfiles();
        String activeProfile = activeProfiles.length > 0 ? activeProfiles[0] : "default";
        
        log.info("Running with active profile: {}", activeProfile);
        
        return activeProfile;
    }
    
    /**
     * 개발 환경에서만 로드되는 설정
     */
    @Configuration
    @Profile("dev")
    static class DevConfig {
        
        @Bean
        public String devBeanInfo() {
            log.info("개발(dev) 환경으로 애플리케이션이 시작되었습니다.");
            log.info("개발 환경에서는 로컬 MySQL 데이터베이스를 사용합니다.");
            log.info("MySQL 접속 정보: jdbc:mysql://localhost:3306/economy");
            log.info("데이터베이스 사용자: root");
            
            return "dev-config-loaded";
        }
    }
    
    /**
     * 운영 환경에서만 로드되는 설정
     */
    @Configuration
    @Profile("prod")
    static class ProdConfig {
        
        @Bean
        public String prodBeanInfo() {
            log.info("운영(prod) 환경으로 애플리케이션이 시작되었습니다.");
            log.info("운영 환경에서는 실제 MySQL 데이터베이스를 사용합니다.");
            log.info("보안을 위해 민감한 정보는 환경 변수를 통해 주입됩니다.");
            
            return "prod-config-loaded";
        }
    }
    
    /**
     * 테스트 환경에서만 로드되는 설정
     */
    @Configuration
    @Profile("test")
    static class TestConfig {
        
        @Bean
        public String testBeanInfo() {
            log.info("테스트(test) 환경으로 애플리케이션이 시작되었습니다.");
            log.info("테스트 환경에서는 MySQL 테스트 데이터베이스를 사용하며, 외부 API 호출은 모킹됩니다.");
            log.info("MySQL 테스트 DB: jdbc:mysql://localhost:3306/economy_test");
            
            return "test-config-loaded";
        }
    }
} 