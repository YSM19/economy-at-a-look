package com.at_a_look.economy.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ExchangeRateHistoryRequest {
    private String currencyCode; // USD, EUR 등
    private String currencyName; // 미국 달러, 유로 등
    private BigDecimal exchangeRate; // 환율
    private BigDecimal krwAmount; // 원화 금액
    private BigDecimal foreignAmount; // 외화 금액
    private String memo; // 메모 (선택사항)
    private Boolean isKrwFirst; // 원화가 첫 번째인지 여부 (true: 원화→외화, false: 외화→원화)
} 