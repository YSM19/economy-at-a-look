package com.at_a_look.economy.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "consumer_price_index")
public class ConsumerPriceIndex {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "cpi_value", nullable = false)
    private Double cpiValue;

    @Column(name = "monthly_change", nullable = false)
    private Double monthlyChange;

    @Column(name = "annual_change", nullable = false)
    private Double annualChange;
} 