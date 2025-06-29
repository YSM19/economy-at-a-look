package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.ExchangeRateHistory;
import com.at_a_look.economy.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExchangeRateHistoryRepository extends JpaRepository<ExchangeRateHistory, Long> {
    
    // 특정 사용자의 환율 저장 기록을 최신순으로 조회
    List<ExchangeRateHistory> findByUserOrderByCreatedAtDesc(User user);
    
    // 특정 사용자의 환율 저장 기록 조회 (순서 무관)
    List<ExchangeRateHistory> findByUser(User user);
    
    // 특정 사용자의 환율 저장 기록을 최신순으로 제한된 개수만 조회
    @Query("SELECT e FROM ExchangeRateHistory e WHERE e.user = :user ORDER BY e.createdAt DESC")
    List<ExchangeRateHistory> findTopByUserOrderByCreatedAtDesc(@Param("user") User user);
    
    // 특정 사용자의 저장 기록 개수
    long countByUser(User user);
} 