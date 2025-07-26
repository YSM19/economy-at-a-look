package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByUsername(String username);
    
    boolean existsByEmail(String email);
    
    boolean existsByUsername(String username);
    
    Optional<User> findByEmailAndIsActiveTrue(String email);
    
    // 정지된 사용자 조회
    List<User> findByIsSuspendedTrue();
    
    // 정지 만료된 사용자 조회
    @Query("SELECT u FROM User u WHERE u.isSuspended = true AND u.suspendedUntil <= :now")
    List<User> findExpiredSuspensions(@Param("now") LocalDateTime now);
    
    // 정지된 사용자 목록 (페이징)
    Page<User> findByIsSuspendedTrue(Pageable pageable);
    
    // 모든 사용자 목록 (페이징)
    Page<User> findAll(Pageable pageable);
    
    // 사용자 검색 (이름, 이메일)
    @Query("SELECT u FROM User u WHERE u.username LIKE %:keyword% OR u.email LIKE %:keyword%")
    Page<User> findByUsernameOrEmailContaining(@Param("keyword") String keyword, Pageable pageable);
} 