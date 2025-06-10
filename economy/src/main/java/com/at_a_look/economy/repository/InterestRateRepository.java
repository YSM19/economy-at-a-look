package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.InterestRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InterestRateRepository extends JpaRepository<InterestRate, Long> {

    // 특정 날짜와 국가의 금리 조회
    Optional<InterestRate> findByDateAndCountryCode(LocalDate date, String countryCode);
    
    // 특정 국가의 최신 금리 조회
    Optional<InterestRate> findFirstByCountryCodeOrderByDateDesc(String countryCode);
    
    // 모든 국가의 최신 발표일 금리 조회 (is_announcement_date = true인 것 중 가장 최신)
    @Query("SELECT i FROM InterestRate i WHERE i.isAnnouncementDate = true AND i.date = (" +
           "SELECT MAX(i2.date) FROM InterestRate i2 WHERE i2.countryCode = i.countryCode AND i2.isAnnouncementDate = true) " +
           "ORDER BY i.countryCode")
    List<InterestRate> findLatestRatesByCountry();
    
    // 모든 국가의 최신 금리 조회 (발표일 상관없이)
    @Query("SELECT i FROM InterestRate i WHERE i.date = (" +
           "SELECT MAX(i2.date) FROM InterestRate i2 WHERE i2.countryCode = i.countryCode) " +
           "ORDER BY i.countryCode")
    List<InterestRate> findLatestRatesByCountryAny();
    
    // 특정 기간 동안의 모든 금리 데이터 조회
    List<InterestRate> findByDateBetweenOrderByDateDescCountryCode(LocalDate startDate, LocalDate endDate);
    
    // 특정 국가의 특정 기간 금리 히스토리 조회
    List<InterestRate> findByCountryCodeAndDateBetweenOrderByDateDesc(
        String countryCode, LocalDate startDate, LocalDate endDate);
    
    // 최근 N개월의 모든 국가 금리 데이터 조회 (히스토리용)
    @Query("SELECT i FROM InterestRate i WHERE i.date >= :startDate ORDER BY i.date DESC, i.countryCode")
    List<InterestRate> findRecentRatesForHistory(@Param("startDate") LocalDate startDate);
    
    // 특정 날짜 범위에서 기존 데이터 존재 여부 확인
    boolean existsByDateBetweenAndCountryCode(LocalDate startDate, LocalDate endDate, String countryCode);
    
    // 발표일만 조회 (금리 변경이 있는 날짜만)
    List<InterestRate> findByIsAnnouncementDateTrueOrderByDateDesc();
    
    // 특정 국가의 발표일만 조회
    List<InterestRate> findByCountryCodeAndIsAnnouncementDateTrueOrderByDateDesc(String countryCode);
    
    // 특정 기간의 발표일만 조회
    List<InterestRate> findByIsAnnouncementDateTrueAndDateBetweenOrderByDateDesc(
        LocalDate startDate, LocalDate endDate);
    
    // 특정 국가의 특정 기간 발표일만 조회
    List<InterestRate> findByCountryCodeAndIsAnnouncementDateTrueAndDateBetweenOrderByDateDesc(
        String countryCode, LocalDate startDate, LocalDate endDate);
    
    // 특정 국가의 이전 금리값 조회 (발표일 식별용)
    @Query("SELECT i FROM InterestRate i WHERE i.countryCode = :countryCode AND i.date < :date " +
           "ORDER BY i.date DESC LIMIT 1")
    Optional<InterestRate> findPreviousRateByCountryAndDate(@Param("countryCode") String countryCode, 
                                                           @Param("date") LocalDate date);
} 