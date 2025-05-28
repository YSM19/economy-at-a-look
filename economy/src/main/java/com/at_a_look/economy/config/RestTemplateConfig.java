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
import java.net.HttpURLConnection;
import java.util.Collections;

@Configuration
public class RestTemplateConfig {

    /**
     * 리디렉션 문제를 해결하기 위한 커스텀 RequestFactory
     */
    private SimpleClientHttpRequestFactory createCustomRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws IOException {
                super.prepareConnection(connection, httpMethod);
                
                // 리디렉션 자동 처리 비활성화
                connection.setInstanceFollowRedirects(false);
                
                // 추가 헤더 설정
                connection.setRequestProperty("Accept", "application/json, text/plain, */*");
                connection.setRequestProperty("Accept-Language", "ko-KR,ko;q=0.9,en;q=0.8");
                connection.setRequestProperty("Accept-Encoding", "gzip, deflate, br");
                connection.setRequestProperty("Connection", "keep-alive");
                connection.setRequestProperty("Cache-Control", "no-cache");
                connection.setRequestProperty("Pragma", "no-cache");
            }
        };
        
        factory.setConnectTimeout(15000); // 15초 연결 타임아웃
        factory.setReadTimeout(30000);    // 30초 읽기 타임아웃
        
        return factory;
    }

    /**
     * 개발 환경용 RestTemplate
     * 리디렉션 문제 해결을 위한 강화된 설정
     */
    @Bean
    @Profile("dev")
    public RestTemplate restTemplateForDev() {
        RestTemplate restTemplate = new RestTemplate(createCustomRequestFactory());
        
        // 헤더 추가를 위한 인터셉터 등록
        restTemplate.setInterceptors(
            Collections.singletonList(new ClientHttpRequestInterceptor() {
                @Override
                public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
                    // 브라우저와 유사한 User-Agent 설정
                    request.getHeaders().set("User-Agent", 
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                    // 리퍼러 헤더 추가
                    request.getHeaders().set("Referer", "https://www.koreaexim.go.kr/");
                    // 호스트 헤더 명시적 설정
                    request.getHeaders().set("Host", "www.koreaexim.go.kr");
                    
                    return execution.execute(request, body);
                }
            })
        );
        
        return restTemplate;
    }
    
    /**
     * 운영 환경용 RestTemplate
     * 리디렉션 문제 해결을 위한 강화된 설정
     */
    @Bean
    @Profile("prod")
    public RestTemplate restTemplateForProd() {
        RestTemplate restTemplate = new RestTemplate(createCustomRequestFactory());
        
        // 헤더 추가를 위한 인터셉터 등록
        restTemplate.setInterceptors(
            Collections.singletonList(new ClientHttpRequestInterceptor() {
                @Override
                public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
                    // 브라우저와 유사한 User-Agent 설정
                    request.getHeaders().set("User-Agent", 
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                    // 리퍼러 헤더 추가
                    request.getHeaders().set("Referer", "https://www.koreaexim.go.kr/");
                    // 호스트 헤더 명시적 설정
                    request.getHeaders().set("Host", "www.koreaexim.go.kr");
                    
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
        RestTemplate restTemplate = new RestTemplate(createCustomRequestFactory());
        
        // 기본 인터셉터 등록
        restTemplate.setInterceptors(
            Collections.singletonList(new ClientHttpRequestInterceptor() {
                @Override
                public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
                    request.getHeaders().set("User-Agent", 
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                    request.getHeaders().set("Referer", "https://www.koreaexim.go.kr/");
                    request.getHeaders().set("Host", "www.koreaexim.go.kr");
                    
                    return execution.execute(request, body);
                }
            })
        );
        
        return restTemplate;
    }
} 