package com.at_a_look.economy.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "exchange_rates",
       uniqueConstraints = @UniqueConstraint(columnNames = {"searchDate", "curUnit"}))
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExchangeRate { // 환율

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate searchDate;

    @Column(nullable = false, length = 10)
    private String curUnit; // 통화 코드 (예: USD, EUR, JPY)

    @Column(nullable = false, length = 50)
    private String curNm; // 통화명 (예: 미국 달러, 유로, 일본 엔)

    @Column
    private Double ttb; // 전신환 매입률 (Telegraphic Transfer Buying Rate)

    @Column
    private Double tts; // 전신환 매도율 (Telegraphic Transfer Selling Rate)

    @Column(name = "deal_basr", nullable = false)
    private Double dealBasRate; // 거래 기준율 (Deal Base Rate)

    @Column
    private Double bkpr; // 장부가격 (Book Price)

    @Column
    private Double yeefeR; // 연간 수수료율 (Yearly Effective Fee Rate)

    @Column
    private Double tenDdEfeeR; // 10일 유효 수수료율 (10 Days Effective Fee Rate)

    @Column
    private Double kftcDealBasRate; // 금융결제원 거래 기준율

    @Column
    private Double kftcBkpr; // 금융결제원 기준율
} 