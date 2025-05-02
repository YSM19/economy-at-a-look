package com.at_a_look.economy.dto.koreaexim;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExchangeRateApiResponse {
    @JsonProperty("result")
    private Integer result;
    
    @JsonProperty("cur_unit")
    private String curUnit;
    
    @JsonProperty("cur_nm")
    private String curNm;
    
    @JsonProperty("ttb")
    private String ttb;
    
    @JsonProperty("tts")
    private String tts;
    
    @JsonProperty("deal_bas_r")
    private String dealBasR;
    
    @JsonProperty("bkpr")
    private String bkpr;
    
    @JsonProperty("yy_efee_r")
    private String yyEfeeR;
    
    @JsonProperty("ten_dd_efee_r")
    private String tenDdEfeeR;
    
    @JsonProperty("kftc_deal_bas_r")
    private String kftcDealBasR;
    
    @JsonProperty("kftc_bkpr")
    private String kftcBkpr;
} 