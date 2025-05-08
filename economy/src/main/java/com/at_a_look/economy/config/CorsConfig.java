package com.at_a_look.economy.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.Collections;

@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins:*}")
    private String allowedOrigins;

    @Value("${cors.allowed-methods:GET,POST,PUT,DELETE,OPTIONS}")
    private String allowedMethods;

    @Value("${cors.allowed-headers:*}")
    private String allowedHeaders;

    @Value("${cors.max-age:3600}")
    private long maxAge;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // 설정 파일에서 가져온 허용 도메인 설정
        if ("*".equals(allowedOrigins)) {
            // 와일드카드 대신 특정 주소를 명시적으로 허용
            // 모바일 앱에서 사용하는 Expo 개발 서버와 백엔드 서버 주소 추가
            config.addAllowedOrigin("http://localhost:8081");
            config.addAllowedOrigin("http://192.168.0.2:8081");
            config.addAllowedOrigin("exp://192.168.0.2:8081");
            config.addAllowedOrigin("http://localhost:19000");
            config.addAllowedOrigin("http://localhost:19006");
            config.addAllowedOrigin("http://192.168.0.2:19000");
            config.addAllowedOrigin("http://192.168.0.2:19006");
            // credentials를 true로 설정할 경우 와일드카드(*) 오리진을 사용할 수 없음
            config.setAllowCredentials(true);
        } else {
            config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
            config.setAllowCredentials(true);
        }
        
        // 허용 헤더 설정
        if ("*".equals(allowedHeaders)) {
            config.addAllowedHeader("*");
        } else {
            config.setAllowedHeaders(Arrays.asList(allowedHeaders.split(",")));
        }
        
        // 허용 메소드 설정
        config.setAllowedMethods(Arrays.asList(allowedMethods.split(",")));
        
        // 캐시 시간 설정 (초단위)
        config.setMaxAge(maxAge);
        
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
} 