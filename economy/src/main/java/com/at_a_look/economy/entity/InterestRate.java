package com.at_a_look.economy.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "interest_rate", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"date", "country_code"}))
public class InterestRate { // 금리

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;  // KR, US, JP, CN, GB

    @Column(name = "country_name", nullable = false, length = 50)
    private String countryName;  // 한국, 미국, 일본, 중국, 영국

    @Column(name = "interest_rate", nullable = false, precision = 5)
    private Double interestRate;  // 금리 값

    @Column(name = "bank_name", length = 100)
    private String bankName;  // 한국은행, 연방준비제도, 일본은행 등

    @Column(name = "rate_type", length = 50)
    private String rateType;  // 기준금리, 정책금리 등

    @Column(name = "is_announcement_date", nullable = false)
    @Builder.Default
    private Boolean isAnnouncementDate = false;  // 금리 발표일 여부
} 