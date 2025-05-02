package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.InterestRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InterestRateRepository extends JpaRepository<InterestRate, Long> {

    Optional<InterestRate> findTopByOrderByDateDesc();

    List<InterestRate> findTop6ByOrderByDateDesc();

    @Query("SELECT i FROM InterestRate i WHERE i.date BETWEEN :startDate AND :endDate ORDER BY i.date")
    List<InterestRate> findByDateBetween(LocalDate startDate, LocalDate endDate);
} 