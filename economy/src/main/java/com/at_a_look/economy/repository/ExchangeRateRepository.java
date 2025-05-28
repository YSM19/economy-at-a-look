package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {
    
    List<ExchangeRate> findBySearchDate(LocalDate searchDate);
    
    Optional<ExchangeRate> findBySearchDateAndCurUnit(LocalDate searchDate, String curUnit);
    
    boolean existsBySearchDateAndCurUnit(LocalDate searchDate, String curUnit);
    
    List<ExchangeRate> findTop30ByOrderBySearchDateDesc();
    
    List<ExchangeRate> findByCurUnitOrderBySearchDateDesc(String curUnit);
    
    /**
     * 지정된 날짜 범위 내의 모든 환율 데이터를 조회합니다.
     * 
     * @param startDate 조회 시작 날짜 (포함)
     * @param endDate 조회 종료 날짜 (포함)
     * @return 날짜 범위 내의 환율 데이터 목록 (날짜 오름차순 정렬)
     */
    List<ExchangeRate> findBySearchDateBetweenOrderBySearchDateAsc(LocalDate startDate, LocalDate endDate);
    
    /**
     * 가장 최근 날짜를 조회합니다.
     * 
     * @return 가장 최근 날짜 (Optional)
     */
    @Query("SELECT MAX(e.searchDate) FROM ExchangeRate e")
    Optional<LocalDate> findLatestSearchDate();
    
    /**
     * 가장 최근 날짜의 모든 환율 데이터를 조회합니다.
     * 서브쿼리 대신 두 단계로 나누어 조회하여 성능과 안정성을 높입니다.
     * 
     * @param latestDate 가장 최근 날짜
     * @return 해당 날짜의 모든 환율 데이터 목록
     */
    List<ExchangeRate> findBySearchDateOrderByCurUnit(LocalDate latestDate);
} 