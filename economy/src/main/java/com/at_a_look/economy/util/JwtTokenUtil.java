package com.at_a_look.economy.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Slf4j
@Component
public class JwtTokenUtil {

    // JWT 시크릿 키 (실제 운영환경에서는 환경변수나 설정파일로 관리)
    @Value("${jwt.secret:mySecretKeyForEconomyAtALookApplicationThatShouldBeAtLeast256BitsLong}")
    private String secret;

    // 토큰 만료 시간 (24시간)
    @Value("${jwt.expiration:86400}")
    private Long expiration;

    // 리프레시 토큰 만료 시간 (7일)
    @Value("${jwt.refresh-expiration:604800}")
    private Long refreshExpiration;

    /**
     * 시크릿 키 생성
     */
    private SecretKey getSigningKey() {
        try {
            if (secret == null || secret.trim().isEmpty()) {
                throw new IllegalStateException("JWT 시크릿 키가 설정되지 않았습니다.");
            }
            
            if (secret.length() < 32) {
                log.warn("⚠️ [JwtTokenUtil] JWT 시크릿 키가 너무 짧습니다. 최소 32자 이상을 권장합니다.");
            }
            
            return Keys.hmacShaKeyFor(secret.getBytes());
        } catch (IllegalStateException e) {
            log.error("❌ [JwtTokenUtil] 시크릿 키 생성 실패 - 설정 오류: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("❌ [JwtTokenUtil] 시크릿 키 생성 중 예상치 못한 오류: {}", e.getMessage(), e);
            throw new RuntimeException("시크릿 키 생성 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * JWT 토큰에서 사용자명(이메일) 추출
     */
    public String getEmailFromToken(String token) {
        return getClaimFromToken(token, Claims::getSubject);
    }

    /**
     * JWT 토큰에서 만료일 추출
     */
    public Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }

    /**
     * JWT 토큰에서 사용자 ID 추출
     */
    public Long getUserIdFromToken(String token) {
        return getClaimFromToken(token, claims -> claims.get("userId", Long.class));
    }

    /**
     * JWT 토큰에서 사용자 역할 추출
     */
    public String getRoleFromToken(String token) {
        return getClaimFromToken(token, claims -> claims.get("role", String.class));
    }

    /**
     * JWT 토큰에서 사용자명 추출
     */
    public String getUsernameFromToken(String token) {
        return getClaimFromToken(token, claims -> claims.get("username", String.class));
    }

    /**
     * JWT 토큰에서 특정 클레임 추출
     */
    public <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }

    /**
     * JWT 토큰에서 모든 클레임 추출
     */
    private Claims getAllClaimsFromToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            log.warn("JWT 토큰이 만료되었습니다: {}", e.getMessage());
            throw e;
        } catch (UnsupportedJwtException e) {
            log.error("지원되지 않는 JWT 토큰입니다: {}", e.getMessage());
            throw e;
        } catch (MalformedJwtException e) {
            log.error("잘못된 형식의 JWT 토큰입니다: {}", e.getMessage());
            throw e;
        } catch (SecurityException e) {
            log.error("JWT 서명이 잘못되었습니다: {}", e.getMessage());
            throw e;
        } catch (IllegalArgumentException e) {
            log.error("JWT 토큰이 비어있습니다: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * JWT 토큰 만료 확인
     */
    private Boolean isTokenExpired(String token) {
        try {
            final Date expiration = getExpirationDateFromToken(token);
            return expiration.before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        }
    }

    /**
     * 사용자 정보로 JWT 토큰 생성
     */
    public String generateToken(Long userId, String email, String username, String role) {
        try {
            // 파라미터 검증
            if (userId == null || userId <= 0) {
                throw new IllegalArgumentException("유효하지 않은 사용자 ID입니다.");
            }
            if (email == null || email.trim().isEmpty()) {
                throw new IllegalArgumentException("이메일이 비어있습니다.");
            }
            if (username == null || username.trim().isEmpty()) {
                throw new IllegalArgumentException("사용자명이 비어있습니다.");
            }
            if (role == null || role.trim().isEmpty()) {
                throw new IllegalArgumentException("사용자 역할이 비어있습니다.");
            }
            
            Map<String, Object> claims = new HashMap<>();
            claims.put("userId", userId);
            claims.put("username", username);
            claims.put("role", role);
            
            return createToken(claims, email, expiration);
        } catch (IllegalArgumentException e) {
            log.error("❌ [JwtTokenUtil] 토큰 생성 실패 - 잘못된 파라미터: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("❌ [JwtTokenUtil] 토큰 생성 중 예상치 못한 오류: {}", e.getMessage(), e);
            throw new RuntimeException("토큰 생성 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 리프레시 토큰 생성
     */
    public String generateRefreshToken(Long userId, String email) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("tokenType", "refresh");
        
        return createToken(claims, email, refreshExpiration);
    }

    /**
     * JWT 토큰 생성 (내부 메서드)
     */
    private String createToken(Map<String, Object> claims, String subject, Long expiration) {
        try {
            // 파라미터 검증
            if (claims == null) {
                throw new IllegalArgumentException("클레임이 null입니다.");
            }
            if (subject == null || subject.trim().isEmpty()) {
                throw new IllegalArgumentException("주체(subject)가 비어있습니다.");
            }
            if (expiration == null || expiration <= 0) {
                throw new IllegalArgumentException("유효하지 않은 만료 시간입니다.");
            }
            
            Date now = new Date();
            Date expiryDate = new Date(now.getTime() + expiration * 1000);

            return Jwts.builder()
                    .claims(claims)
                    .subject(subject)
                    .issuedAt(now)
                    .expiration(expiryDate)
                    .signWith(getSigningKey())
                    .compact();
        } catch (IllegalArgumentException e) {
            log.error("❌ [JwtTokenUtil] 토큰 생성 실패 - 잘못된 파라미터: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("❌ [JwtTokenUtil] 토큰 생성 중 예상치 못한 오류: {}", e.getMessage(), e);
            throw new RuntimeException("토큰 생성 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * JWT 토큰 유효성 검증
     */
    public Boolean validateToken(String token, String email) {
        try {
            final String tokenEmail = getEmailFromToken(token);
            return (tokenEmail.equals(email) && !isTokenExpired(token));
        } catch (JwtException e) {
            log.warn("JWT 토큰 검증 실패: {}", e.getMessage());
            return false;
        }
    }

    /**
     * JWT 토큰 유효성 검증 (이메일 확인 없이)
     */
    public Boolean validateToken(String token) {
        try {
            return !isTokenExpired(token);
        } catch (JwtException e) {
            log.warn("JWT 토큰 검증 실패: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 토큰 만료 시간을 LocalDateTime으로 반환
     */
    public LocalDateTime getExpirationAsLocalDateTime(String token) {
        Date expiration = getExpirationDateFromToken(token);
        return expiration.toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();
    }

    /**
     * 토큰이 곧 만료되는지 확인 (30분 이내)
     */
    public Boolean isTokenExpiringSoon(String token) {
        try {
            Date expiration = getExpirationDateFromToken(token);
            Date thirtyMinutesFromNow = new Date(System.currentTimeMillis() + (30 * 60 * 1000));
            return expiration.before(thirtyMinutesFromNow);
        } catch (JwtException e) {
            return true;
        }
    }

    /**
     * HTTP 요청에서 JWT 토큰 추출
     */
    public String extractTokenFromRequest(jakarta.servlet.http.HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    /**
     * HTTP 요청에서 JWT 토큰 추출 (별칭 메서드)
     */
    public String getTokenFromRequest(jakarta.servlet.http.HttpServletRequest request) {
        return extractTokenFromRequest(request);
    }
} 