package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.InterestRate;
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
public class InterestRateDto {
    private Long id;
    private LocalDate date;
    private Double kbRate;
    private Double fedRate;
    private Double marketRate;

    public static InterestRateDto fromEntity(InterestRate entity) {
        return InterestRateDto.builder()
                .id(entity.getId())
                .date(entity.getDate())
                .kbRate(entity.getKbRate())
                .fedRate(entity.getFedRate())
                .marketRate(entity.getMarketRate())
                .build();
    }

    public static List<InterestRateDto> fromEntities(List<InterestRate> entities) {
        return entities.stream()
                .map(InterestRateDto::fromEntity)
                .collect(Collectors.toList());
    }

    public InterestRate toEntity() {
        return InterestRate.builder()
                .id(id)
                .date(date)
                .kbRate(kbRate)
                .fedRate(fedRate)
                .marketRate(marketRate)
                .build();
    }
} 