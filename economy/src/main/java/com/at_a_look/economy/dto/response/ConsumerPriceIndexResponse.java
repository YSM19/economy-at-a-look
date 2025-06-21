package com.at_a_look.economy.dto.response;

import com.at_a_look.economy.dto.ConsumerPriceIndexDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsumerPriceIndexResponse {
    private Double currentCPI;
    private Double prevMonthCPI;
    private Double changeRate;
    private Double annualRate;
    private String date; // 최신 데이터의 날짜 (YYYYMM 형식)
    private List<ConsumerPriceIndexDto> history;
} 