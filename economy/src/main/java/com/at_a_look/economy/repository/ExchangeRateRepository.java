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

    Optional<ExchangeRate> findTopByOrderByDateDesc();

    List<ExchangeRate> findTop6ByOrderByDateDesc();

    @Query("SELECT e FROM ExchangeRate e WHERE e.date BETWEEN :startDate AND :endDate ORDER BY e.date")
    List<ExchangeRate> findByDateBetween(LocalDate startDate, LocalDate endDate);
} 