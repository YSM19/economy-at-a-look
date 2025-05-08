package com.at_a_look.economy.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Collections;

@Configuration
public class RestTemplateConfig {

    /**
     * 개발 환경용 RestTemplate
     * 타임아웃 설정 및 리디렉션 제한 추가
     */
    @Bean
    @Profile("dev")
    public RestTemplate restTemplateForDev() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10000); // 10초 연결 타임아웃
        requestFactory.setReadTimeout(30000);    // 30초 읽기 타임아웃
        
        // 리디렉션 루프 방지를 위한 설정
        System.setProperty("http.maxRedirects", "5");  // 최대 5번까지만 리디렉션 허용
        
        RestTemplate restTemplate = new RestTemplate(requestFactory);
        
        // 헤더 추가를 위한 인터셉터 등록
        restTemplate.setInterceptors(
            Collections.singletonList(new ClientHttpRequestInterceptor() {
                @Override
                public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
                    // User-Agent 헤더 추가
                    request.getHeaders().add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
                    // 리퍼러 헤더 추가
                    request.getHeaders().add("Referer", "https://www.koreaexim.go.kr");
                    return execution.execute(request, body);
                }
            })
        );
        
        return restTemplate;
    }
    
    /**
     * 운영 환경용 RestTemplate
     */
    @Bean
    @Profile("prod")
    public RestTemplate restTemplateForProd() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(30000); // 30초 연결 타임아웃
        requestFactory.setReadTimeout(30000);    // 30초 읽기 타임아웃
        
        // 리디렉션 루프 방지를 위한 설정
        System.setProperty("http.maxRedirects", "5");  // 최대 5번까지만 리디렉션 허용
        
        RestTemplate restTemplate = new RestTemplate(requestFactory);
        
        // 헤더 추가를 위한 인터셉터 등록
        restTemplate.setInterceptors(
            Collections.singletonList(new ClientHttpRequestInterceptor() {
                @Override
                public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
                    // User-Agent 헤더 추가
                    request.getHeaders().add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
                    // 리퍼러 헤더 추가
                    request.getHeaders().add("Referer", "https://www.koreaexim.go.kr");
                    return execution.execute(request, body);
                }
            })
        );
        
        return restTemplate;
    }
    
    /**
     * 기본 RestTemplate
     * 특정 프로필이 활성화되지 않은 경우 사용
     */
    @Bean
    @Profile("default")
    public RestTemplate defaultRestTemplate() {
        return new RestTemplate();
    }
} 