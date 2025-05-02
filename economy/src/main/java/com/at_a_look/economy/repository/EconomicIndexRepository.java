package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.EconomicIndex;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EconomicIndexRepository extends JpaRepository<EconomicIndex, Long> {

    Optional<EconomicIndex> findTopByOrderByDateDesc();
} 