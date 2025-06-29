package com.at_a_look.economy.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "exchange_rate_history")
public class ExchangeRateHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode; // USD, EUR 등

    @Column(name = "currency_name", nullable = false, length = 50)
    private String currencyName; // 미국 달러, 유로 등

    @Column(name = "exchange_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal exchangeRate; // 환율

    @Column(name = "krw_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal krwAmount; // 원화 금액

    @Column(name = "foreign_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal foreignAmount; // 외화 금액

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "memo", length = 200)
    private String memo; // 메모 (선택사항)

    @Column(name = "is_krw_first", nullable = false)
    @Builder.Default
    private Boolean isKrwFirst = true; // 원화가 첫 번째인지 여부 (true: 원화→외화, false: 외화→원화)
} 