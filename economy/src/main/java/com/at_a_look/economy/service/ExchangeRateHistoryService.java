package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.ExchangeRateHistoryRequest;
import com.at_a_look.economy.dto.ExchangeRateHistoryResponse;
import com.at_a_look.economy.dto.UpdateMemoRequest;
import com.at_a_look.economy.dto.UpdateExchangeRateRequest;
import com.at_a_look.economy.entity.ExchangeRateHistory;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.repository.ExchangeRateHistoryRepository;
import com.at_a_look.economy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExchangeRateHistoryService {

    private final ExchangeRateHistoryRepository exchangeRateHistoryRepository;
    private final UserRepository userRepository;

    /**
     * 환율 계산 결과 저장
     */
    @Transactional
    public ExchangeRateHistoryResponse saveExchangeRateHistory(String userEmail, ExchangeRateHistoryRequest request) {
        log.info("환율 저장 요청 - 사용자: {}, 통화코드: {}", userEmail, request.getCurrencyCode());
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        ExchangeRateHistory history = ExchangeRateHistory.builder()
                .user(user)
                .currencyCode(request.getCurrencyCode())
                .currencyName(request.getCurrencyName())
                .exchangeRate(request.getExchangeRate())
                .krwAmount(request.getKrwAmount())
                .foreignAmount(request.getForeignAmount())
                .memo(request.getMemo())
                .isKrwFirst(request.getIsKrwFirst() != null ? request.getIsKrwFirst() : true)
                .build();

        ExchangeRateHistory savedHistory = exchangeRateHistoryRepository.save(history);
        log.info("환율 저장 완료 - ID: {}", savedHistory.getId());

        return convertToResponse(savedHistory);
    }

    /**
     * 특정 사용자의 환율 저장 기록 조회
     */
    @Transactional(readOnly = true)
    public List<ExchangeRateHistoryResponse> getUserExchangeRateHistory(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        List<ExchangeRateHistory> histories = exchangeRateHistoryRepository.findByUserOrderByCreatedAtDesc(user);
        
        return histories.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * 환율 저장 기록의 메모 업데이트
     */
    @Transactional
    public ExchangeRateHistoryResponse updateMemo(String userEmail, Long historyId, UpdateMemoRequest request) {
        log.info("메모 업데이트 요청 - 사용자: {}, 기록 ID: {}", userEmail, historyId);
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        ExchangeRateHistory history = exchangeRateHistoryRepository.findById(historyId)
                .orElseThrow(() -> new RuntimeException("저장 기록을 찾을 수 없습니다."));

        // 본인의 기록만 수정 가능
        if (!history.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("본인의 기록만 수정할 수 있습니다.");
        }

        history.setMemo(request.getMemo());
        ExchangeRateHistory updatedHistory = exchangeRateHistoryRepository.save(history);
        
        log.info("메모 업데이트 완료 - 기록 ID: {}", historyId);
        
        return convertToResponse(updatedHistory);
    }

    /**
     * 환율 저장 기록의 환율 및 금액 업데이트
     */
    @Transactional
    public ExchangeRateHistoryResponse updateExchangeRateHistory(String userEmail, Long historyId, UpdateExchangeRateRequest request) {
        log.info("환율 정보 업데이트 요청 - 사용자: {}, 기록 ID: {}", userEmail, historyId);
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        ExchangeRateHistory history = exchangeRateHistoryRepository.findById(historyId)
                .orElseThrow(() -> new RuntimeException("저장 기록을 찾을 수 없습니다."));

        // 본인의 기록만 수정 가능
        if (!history.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("본인의 기록만 수정할 수 있습니다.");
        }

        // 필드별로 null이 아닌 경우에만 업데이트
        if (request.getExchangeRate() != null) {
            history.setExchangeRate(request.getExchangeRate());
        }
        if (request.getKrwAmount() != null) {
            history.setKrwAmount(request.getKrwAmount());
        }
        if (request.getForeignAmount() != null) {
            history.setForeignAmount(request.getForeignAmount());
        }
        if (request.getMemo() != null) {
            history.setMemo(request.getMemo());
        }

        ExchangeRateHistory updatedHistory = exchangeRateHistoryRepository.save(history);
        
        log.info("환율 정보 업데이트 완료 - 기록 ID: {}", historyId);
        
        return convertToResponse(updatedHistory);
    }

    /**
     * 환율 저장 기록 삭제
     */
    @Transactional
    public void deleteExchangeRateHistory(String userEmail, Long historyId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        ExchangeRateHistory history = exchangeRateHistoryRepository.findById(historyId)
                .orElseThrow(() -> new RuntimeException("저장 기록을 찾을 수 없습니다."));

        // 본인의 기록만 삭제 가능
        if (!history.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("본인의 기록만 삭제할 수 있습니다.");
        }

        exchangeRateHistoryRepository.delete(history);
        log.info("환율 저장 기록 삭제 완료 - ID: {}", historyId);
    }

    /**
     * 사용자의 모든 환율 저장 기록 삭제
     */
    @Transactional
    public void deleteAllExchangeRateHistory(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        List<ExchangeRateHistory> histories = exchangeRateHistoryRepository.findByUser(user);
        
        if (!histories.isEmpty()) {
            exchangeRateHistoryRepository.deleteAll(histories);
            log.info("사용자 {}의 모든 환율 저장 기록 삭제 완료 - 삭제된 기록 수: {}", userEmail, histories.size());
        } else {
            log.info("사용자 {}의 삭제할 환율 저장 기록이 없습니다.", userEmail);
        }
    }

    /**
     * 사용자의 총 저장 기록 개수
     */
    @Transactional(readOnly = true)
    public long getUserHistoryCount(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        return exchangeRateHistoryRepository.countByUser(user);
    }

    /**
     * 엔티티를 응답 DTO로 변환
     */
    private ExchangeRateHistoryResponse convertToResponse(ExchangeRateHistory history) {
        return ExchangeRateHistoryResponse.builder()
                .id(history.getId())
                .currencyCode(history.getCurrencyCode())
                .currencyName(history.getCurrencyName())
                .exchangeRate(history.getExchangeRate())
                .krwAmount(history.getKrwAmount())
                .foreignAmount(history.getForeignAmount())
                .createdAt(history.getCreatedAt())
                .memo(history.getMemo())
                .isKrwFirst(history.getIsKrwFirst() != null ? history.getIsKrwFirst() : true)
                .build();
    }
} 