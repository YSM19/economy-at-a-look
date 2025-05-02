package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.ExchangeRate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExchangeRateDto {
    private Long id;
    private LocalDate date;
    private Double usdRate;
    private Double eurRate;
    private Double jpyRate;

    public static ExchangeRateDto fromEntity(ExchangeRate entity) {
        return ExchangeRateDto.builder()
                .id(entity.getId())
                .date(entity.getDate())
                .usdRate(entity.getUsdRate())
                .eurRate(entity.getEurRate())
                .jpyRate(entity.getJpyRate())
                .build();
    }

    public static List<ExchangeRateDto> fromEntities(List<ExchangeRate> entities) {
        return entities.stream()
                .map(ExchangeRateDto::fromEntity)
                .collect(Collectors.toList());
    }

    public ExchangeRate toEntity() {
        return ExchangeRate.builder()
                .id(id)
                .date(date)
                .usdRate(usdRate)
                .eurRate(eurRate)
                .jpyRate(jpyRate)
                .build();
    }
} 