package com.at_a_look.economy.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateExchangeRateRequest {
    private BigDecimal exchangeRate; // 수정할 환율
    private BigDecimal krwAmount; // 수정할 원화 금액
    private BigDecimal foreignAmount; // 수정할 외화 금액
    private String memo; // 수정할 메모
} 