package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.ExchangeRateHistoryRequest;
import com.at_a_look.economy.dto.ExchangeRateHistoryResponse;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.service.ExchangeRateHistoryService;
import com.at_a_look.economy.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exchange-rate-history")
@RequiredArgsConstructor
@Slf4j
public class ExchangeRateHistoryController {

    private final ExchangeRateHistoryService exchangeRateHistoryService;
    private final UserService userService;

    /**
     * 환율 계산 결과 저장
     */
    @PostMapping("/save")
    public ResponseEntity<ApiResponse<ExchangeRateHistoryResponse>> saveExchangeRateHistory(
            @RequestHeader("Authorization") String token,
            @RequestBody ExchangeRateHistoryRequest request) {
        try {
            String userEmail = userService.getUserEmailFromToken(token);
            ExchangeRateHistoryResponse response = exchangeRateHistoryService.saveExchangeRateHistory(userEmail, request);
            
            return ResponseEntity.ok(ApiResponse.success("환율 저장이 완료되었습니다.", response));
        } catch (Exception e) {
            log.error("환율 저장 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("환율 저장에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 사용자의 환율 저장 기록 조회
     */
    @GetMapping("/my-history")
    public ResponseEntity<ApiResponse<List<ExchangeRateHistoryResponse>>> getMyExchangeRateHistory(
            @RequestHeader("Authorization") String token) {
        try {
            String userEmail = userService.getUserEmailFromToken(token);
            List<ExchangeRateHistoryResponse> histories = exchangeRateHistoryService.getUserExchangeRateHistory(userEmail);
            
            return ResponseEntity.ok(ApiResponse.success("환율 저장 기록을 조회했습니다.", histories));
        } catch (Exception e) {
            log.error("환율 기록 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("환율 기록 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 환율 저장 기록 삭제
     */
    @DeleteMapping("/{historyId}")
    public ResponseEntity<ApiResponse<String>> deleteExchangeRateHistory(
            @RequestHeader("Authorization") String token,
            @PathVariable Long historyId) {
        try {
            String userEmail = userService.getUserEmailFromToken(token);
            exchangeRateHistoryService.deleteExchangeRateHistory(userEmail, historyId);
            
            return ResponseEntity.ok(ApiResponse.success(null, "환율 저장 기록이 삭제되었습니다."));
        } catch (Exception e) {
            log.error("환율 기록 삭제 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("환율 기록 삭제에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 사용자의 모든 환율 저장 기록 삭제
     */
    @DeleteMapping("/all")
    public ResponseEntity<ApiResponse<String>> deleteAllExchangeRateHistory(
            @RequestHeader("Authorization") String token) {
        try {
            String userEmail = userService.getUserEmailFromToken(token);
            exchangeRateHistoryService.deleteAllExchangeRateHistory(userEmail);
            
            return ResponseEntity.ok(ApiResponse.success(null, "모든 환율 저장 기록이 삭제되었습니다."));
        } catch (Exception e) {
            log.error("모든 환율 기록 삭제 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("모든 환율 기록 삭제에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 사용자의 환율 저장 기록 개수 조회
     */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> getHistoryCount(
            @RequestHeader("Authorization") String token) {
        try {
            String userEmail = userService.getUserEmailFromToken(token);
            long count = exchangeRateHistoryService.getUserHistoryCount(userEmail);
            
            return ResponseEntity.ok(ApiResponse.success("저장 기록 개수를 조회했습니다.", count));
        } catch (Exception e) {
            log.error("기록 개수 조회 실패", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("기록 개수 조회에 실패했습니다: " + e.getMessage()));
        }
    }
} 