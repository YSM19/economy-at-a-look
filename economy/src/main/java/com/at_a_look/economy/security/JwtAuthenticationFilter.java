package com.at_a_look.economy.security;

import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.repository.UserRepository;
import com.at_a_look.economy.util.JwtTokenUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenUtil jwtTokenUtil;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String token = jwtTokenUtil.extractTokenFromRequest(request);
        
        if (token != null && jwtTokenUtil.validateToken(token)) {
            try {
                String email = jwtTokenUtil.getEmailFromToken(token);
                
                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    Optional<User> userOpt = userRepository.findByEmailAndIsActiveTrue(email);
                    
                    if (userOpt.isPresent()) {
                        User user = userOpt.get();
                        
                        // 정지된 사용자는 인증하지 않음
                        if (user.getIsSuspended()) {
                            log.warn("정지된 사용자의 토큰 요청: {}", email);
                            filterChain.doFilter(request, response);
                            return;
                        }
                        
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            email,
                            null,
                            Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        
                        log.debug("JWT 인증 성공: {} (역할: {})", email, user.getRole());
                    }
                }
            } catch (Exception e) {
                log.error("JWT 토큰 처리 중 오류: {}", e.getMessage());
                SecurityContextHolder.clearContext();
            }
        }
        
        filterChain.doFilter(request, response);
    }
}