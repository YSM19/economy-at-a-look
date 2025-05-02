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
@Table(name = "economic_index")
public class EconomicIndex {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "index_value", nullable = false)
    private Double indexValue;

    @Column(name = "index_status", nullable = false)
    private String indexStatus;

    public String calculateStatus() {
        if (indexValue <= 25) {
            return "극심한 경기침체";
        } else if (indexValue <= 45) {
            return "경기침체";
        } else if (indexValue <= 55) {
            return "중립";
        } else if (indexValue <= 75) {
            return "경기확장";
        } else {
            return "경기과열";
        }
    }
} 