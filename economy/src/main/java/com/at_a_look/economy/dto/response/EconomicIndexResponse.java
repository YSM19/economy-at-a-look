package com.at_a_look.economy.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EconomicIndexResponse {
    private Double indexValue;
    private String indexStatus;
    private LocalDate date;
} 