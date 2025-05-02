package com.at_a_look.economy.dto.response;

import com.at_a_look.economy.dto.InterestRateDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterestRateResponse {
    private Double kbRate;
    private Double fedRate;
    private Double marketRate;
    private List<InterestRateDto> history;
} 