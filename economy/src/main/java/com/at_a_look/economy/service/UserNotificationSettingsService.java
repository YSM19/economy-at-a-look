package com.at_a_look.economy.service;

import com.at_a_look.economy.dto.UserNotificationSettingsDto;
import com.at_a_look.economy.entity.User;
import com.at_a_look.economy.entity.UserNotificationSettings;
import com.at_a_look.economy.repository.UserNotificationSettingsRepository;
import com.at_a_look.economy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserNotificationSettingsService {

    private final UserNotificationSettingsRepository notificationSettingsRepository;
    private final UserRepository userRepository;

    public UserNotificationSettingsDto getNotificationSettings(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        UserNotificationSettings settings = notificationSettingsRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultSettings(user));

        return UserNotificationSettingsDto.fromEntity(settings);
    }

    public UserNotificationSettingsDto updateNotificationSettings(Long userId, UserNotificationSettingsDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        UserNotificationSettings settings = notificationSettingsRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultSettings(user));

        // 설정 업데이트
        settings.setExchangeRateNotifications(dto.getExchangeRateNotifications());
        settings.setInterestRateNotifications(dto.getInterestRateNotifications());
        settings.setCpiNotifications(dto.getCpiNotifications());
        settings.setEconomicIndexNotifications(dto.getEconomicIndexNotifications());
        settings.setCommunityNotifications(dto.getCommunityNotifications());
        settings.setEmailNotifications(dto.getEmailNotifications());
        settings.setPushNotifications(dto.getPushNotifications());
        
        if (dto.getNotificationFrequency() != null) {
            settings.setNotificationFrequency(
                UserNotificationSettings.NotificationFrequency.valueOf(dto.getNotificationFrequency())
            );
        }

        UserNotificationSettings savedSettings = notificationSettingsRepository.save(settings);
        return UserNotificationSettingsDto.fromEntity(savedSettings);
    }

    private UserNotificationSettings createDefaultSettings(User user) {
        UserNotificationSettings defaultSettings = UserNotificationSettings.builder()
                .user(user)
                .exchangeRateNotifications(true)
                .interestRateNotifications(true)
                .cpiNotifications(true)
                .economicIndexNotifications(true)
                .communityNotifications(true)
                .emailNotifications(false)
                .pushNotifications(true)
                .notificationFrequency(UserNotificationSettings.NotificationFrequency.DAILY)
                .build();

        return notificationSettingsRepository.save(defaultSettings);
    }

    public boolean isNotificationEnabled(Long userId, String notificationType) {
        UserNotificationSettings settings = notificationSettingsRepository.findByUserId(userId)
                .orElse(null);

        if (settings == null) {
            return true; // 기본값은 활성화
        }

        return switch (notificationType) {
            case "EXCHANGE_RATE" -> settings.getExchangeRateNotifications();
            case "INTEREST_RATE" -> settings.getInterestRateNotifications();
            case "CPI" -> settings.getCpiNotifications();
            case "ECONOMIC_INDEX" -> settings.getEconomicIndexNotifications();
            case "COMMUNITY" -> settings.getCommunityNotifications();
            default -> true;
        };
    }
} 