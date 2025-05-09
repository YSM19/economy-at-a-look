package com.at_a_look.economy.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import lombok.extern.slf4j.Slf4j;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.X509Certificate;

/**
 * 개발 환경에서만 SSL 인증서 검증을 비활성화하는 설정 클래스
 * 주의: 이 설정은 개발 목적으로만 사용하고, 운영 환경에서는 사용하지 않아야 합니다.
 */
@Slf4j
@Configuration
@Profile("dev")
public class SSLConfig {

    /**
     * 애플리케이션 시작 시 SSL 인증서 검증을 비활성화합니다.
     */
    @PostConstruct
    public void disableSslVerification() {
        try {
            // 모든 인증서를 신뢰하는 TrustManager 생성
            TrustManager[] trustAllCertificates = new TrustManager[] {
                new X509TrustManager() {
                    public X509Certificate[] getAcceptedIssuers() {
                        return null;
                    }
                    
                    public void checkClientTrusted(X509Certificate[] certs, String authType) {
                        // 검증 없음
                    }
                    
                    public void checkServerTrusted(X509Certificate[] certs, String authType) {
                        // 검증 없음
                    }
                }
            };
            
            // SSL 컨텍스트 설정
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllCertificates, new java.security.SecureRandom());
            
            // 전역 SSL 설정 변경
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);
            
            // 시스템 속성 설정
            System.setProperty("jdk.internal.httpclient.disableHostnameVerification", "true");
            
            log.info("개발 환경용 SSL 인증서 검증이 비활성화되었습니다.");
        } catch (NoSuchAlgorithmException | KeyManagementException e) {
            log.error("SSL 인증서 검증 비활성화 실패: {}", e.getMessage(), e);
        }
    }
} 