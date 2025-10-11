package com.at_a_look.economy.config;

import com.at_a_look.economy.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.core.annotation.Order;
import org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final Environment environment;

    @Value("${cors.allowed-origin-patterns:}")
    private String allowedOriginPatternsProp;

    @Value("${cors.allow-credentials:}")
    private String allowCredentialsProp;

    @Bean
    @Order(0)
    public SecurityFilterChain actuatorSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher(EndpointRequest.toAnyEndpoint())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz.anyRequest().permitAll());
        return http.build();
    }

    /**
     * BCrypt 패스워드 인코더 빈 등록
     * 비밀번호 해싱에 사용됩니다.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Spring Security 필터 체인 설정
     * 현재 API 기반 시스템에 맞게 설정을 조정합니다.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF 비활성화 (API 서버이므로)
            .csrf(csrf -> csrf.disable())
            
            // CORS 설정 적용 (운영은 화이트리스트 기반으로 제한 권장)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // 세션 관리 설정 (무상태)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 인증 규칙 설정
            .authorizeHttpRequests(authz -> authz
                // 공개 엔드포인트 허용
                .requestMatchers("/api/auth/login", "/api/auth/signup").permitAll()
                .requestMatchers("/api/economic/**").permitAll()
                .requestMatchers("/api/exchange-rates/**").permitAll()
                .requestMatchers("/api/health/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                // 커뮤니티 공개 조회 허용 (GET 전용)
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/posts/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/comments/**").permitAll()
                
                // Swagger UI 및 API 문서 허용
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-resources/**").permitAll()
                
                // 관리자 API는 ADMIN 권한 필요
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                
                // 기타 모든 요청은 인증 필요
                .anyRequest().authenticated()
            )
            
            // 기본 로그인 폼 비활성화
            .formLogin(form -> form.disable())
            
            // HTTP Basic 인증 비활성화
            .httpBasic(basic -> basic.disable())
            
            // JWT 필터 추가
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS 설정
     * 프론트엔드에서 API 호출을 허용하기 위한 설정입니다.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // 허용할 오리진 설정 (프로퍼티 우선)
        if (allowedOriginPatternsProp != null && !allowedOriginPatternsProp.isBlank()) {
            configuration.setAllowedOriginPatterns(Arrays.asList(allowedOriginPatternsProp.split(",")));
        } else {
            // 운영 환경에서는 반드시 명시적으로 설정되어야 함
            // 운영에서 미설정 시 애플리케이션 기동 실패를 유도하여 과도한 허용을 방지
            boolean isProd = false;
            if (environment != null) {
                isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");
            }
            if (isProd) {
                throw new IllegalStateException("prod 프로파일에서 cors.allowed-origin-patterns 프로퍼티가 설정되어야 합니다.");
            }
            // 개발 기본값: 로컬/내부망 허용
            configuration.setAllowedOriginPatterns(Arrays.asList(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://192.168.*:*"
            ));
        }
        
        // 허용할 HTTP 메서드
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        
        // 허용할 헤더
        configuration.setAllowedHeaders(Arrays.asList("*"));
        
        // 인증 정보 포함 허용 (프로퍼티로 제어; 빈 값은 false)
        boolean allowCreds = false;
        if (allowCredentialsProp != null && !allowCredentialsProp.isBlank()) {
            allowCreds = Boolean.parseBoolean(allowCredentialsProp.trim());
        }
        configuration.setAllowCredentials(allowCreds);

        // allowCredentials=true 인 경우 와일드카드/광범위 패턴 사용 방지(브라우저 제약 + 보안상)
        if (allowCreds) {
            for (String pattern : configuration.getAllowedOriginPatterns()) {
                if ("*".equals(pattern) || pattern.endsWith("*")) {
                    throw new IllegalStateException("allowCredentials=true 인 경우 와일드카드 오리진 패턴은 허용되지 않습니다.");
                }
            }
        }
        
        // API 경로에만 CORS 설정 적용
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        
        return source;
    }
} 

