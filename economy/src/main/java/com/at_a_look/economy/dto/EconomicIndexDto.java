package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.EconomicIndex;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EconomicIndexDto {
    private Long id;
    private LocalDate date;
    private Double indexValue;
    private String indexStatus;

    public static EconomicIndexDto fromEntity(EconomicIndex entity) {
        return EconomicIndexDto.builder()
                .id(entity.getId())
                .date(entity.getDate())
                .indexValue(entity.getIndexValue())
                .indexStatus(entity.getIndexStatus())
                .build();
    }

    public EconomicIndex toEntity() {
        return EconomicIndex.builder()
                .id(id)
                .date(date)
                .indexValue(indexValue)
                .indexStatus(indexStatus)
                .build();
    }
} 