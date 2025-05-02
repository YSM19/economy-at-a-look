package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.ConsumerPriceIndex;
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
public class ConsumerPriceIndexDto {
    private Long id;
    private LocalDate date;
    private Double cpiValue;
    private Double monthlyChange;
    private Double annualChange;

    public static ConsumerPriceIndexDto fromEntity(ConsumerPriceIndex entity) {
        return ConsumerPriceIndexDto.builder()
                .id(entity.getId())
                .date(entity.getDate())
                .cpiValue(entity.getCpiValue())
                .monthlyChange(entity.getMonthlyChange())
                .annualChange(entity.getAnnualChange())
                .build();
    }

    public static List<ConsumerPriceIndexDto> fromEntities(List<ConsumerPriceIndex> entities) {
        return entities.stream()
                .map(ConsumerPriceIndexDto::fromEntity)
                .collect(Collectors.toList());
    }

    public ConsumerPriceIndex toEntity() {
        return ConsumerPriceIndex.builder()
                .id(id)
                .date(date)
                .cpiValue(cpiValue)
                .monthlyChange(monthlyChange)
                .annualChange(annualChange)
                .build();
    }
} 