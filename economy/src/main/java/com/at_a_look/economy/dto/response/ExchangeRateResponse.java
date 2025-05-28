package com.at_a_look.economy.dto.response;

import com.at_a_look.economy.dto.ExchangeRateResponseDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExchangeRateResponse {
    private Double usdRate;
    private Double eurRate;
    private Double jpyRate;
    private Double cnyRate;
    private List<ExchangeRateResponseDTO> history;
} 