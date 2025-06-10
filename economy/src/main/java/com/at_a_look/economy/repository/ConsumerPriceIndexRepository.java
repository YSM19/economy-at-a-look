package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.ConsumerPriceIndex;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConsumerPriceIndexRepository extends JpaRepository<ConsumerPriceIndex, Long> {

    Optional<ConsumerPriceIndex> findTopByOrderByDateDesc();

    List<ConsumerPriceIndex> findTop7ByOrderByDateDesc();
    
    List<ConsumerPriceIndex> findTop12ByOrderByDateDesc();
    
    Optional<ConsumerPriceIndex> findByDate(String date);

    @Query("SELECT c FROM ConsumerPriceIndex c WHERE c.date BETWEEN :startDate AND :endDate ORDER BY c.date")
    List<ConsumerPriceIndex> findByDateBetween(String startDate, String endDate);
} 