package com.at_a_look.economy.controller;

import com.at_a_look.economy.dto.UserNotificationSettingsDto;
import com.at_a_look.economy.dto.response.ApiResponse;
import com.at_a_look.economy.service.UserNotificationSettingsService;
import com.at_a_look.economy.util.JwtTokenUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notification-settings")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "알림 설정", description = "사용자 알림 설정 관련 API")
public class UserNotificationSettingsController {

    private final UserNotificationSettingsService notificationSettingsService;
    private final JwtTokenUtil jwtTokenUtil;

    @GetMapping
    @Operation(summary = "알림 설정 조회", description = "현재 사용자의 알림 설정을 조회합니다.")
    public ResponseEntity<ApiResponse<UserNotificationSettingsDto>> getNotificationSettings(
            @RequestHeader("Authorization") String token) {
        try {
            String jwt = token.replace("Bearer ", "");
            Long userId = jwtTokenUtil.getUserIdFromToken(jwt);
            
            UserNotificationSettingsDto settings = notificationSettingsService.getNotificationSettings(userId);
            
            return ResponseEntity.ok(ApiResponse.<UserNotificationSettingsDto>builder()
                    .success(true)
                    .message("알림 설정을 성공적으로 조회했습니다.")
                    .data(settings)
                    .build());
        } catch (Exception e) {
            log.error("알림 설정 조회 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<UserNotificationSettingsDto>builder()
                    .success(false)
                    .message("알림 설정 조회에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }

    @PutMapping
    @Operation(summary = "알림 설정 업데이트", description = "현재 사용자의 알림 설정을 업데이트합니다.")
    public ResponseEntity<ApiResponse<UserNotificationSettingsDto>> updateNotificationSettings(
            @RequestHeader("Authorization") String token,
            @RequestBody UserNotificationSettingsDto dto) {
        try {
            String jwt = token.replace("Bearer ", "");
            Long userId = jwtTokenUtil.getUserIdFromToken(jwt);
            
            UserNotificationSettingsDto updatedSettings = notificationSettingsService.updateNotificationSettings(userId, dto);
            
            return ResponseEntity.ok(ApiResponse.<UserNotificationSettingsDto>builder()
                    .success(true)
                    .message("알림 설정을 성공적으로 업데이트했습니다.")
                    .data(updatedSettings)
                    .build());
        } catch (Exception e) {
            log.error("알림 설정 업데이트 중 오류 발생: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.<UserNotificationSettingsDto>builder()
                    .success(false)
                    .message("알림 설정 업데이트에 실패했습니다: " + e.getMessage())
                    .build());
        }
    }
} 