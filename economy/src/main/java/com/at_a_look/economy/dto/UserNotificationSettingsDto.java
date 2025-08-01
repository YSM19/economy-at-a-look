package com.at_a_look.economy.dto;

import com.at_a_look.economy.entity.UserNotificationSettings;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationSettingsDto {
    
    private Long id;
    private Long userId;
    private Boolean exchangeRateNotifications;
    private Boolean interestRateNotifications;
    private Boolean cpiNotifications;
    private Boolean economicIndexNotifications;
    private Boolean communityNotifications;
    private Boolean emailNotifications;
    private Boolean pushNotifications;
    private String notificationFrequency;
    
    public static UserNotificationSettingsDto fromEntity(UserNotificationSettings settings) {
        return UserNotificationSettingsDto.builder()
                .id(settings.getId())
                .userId(settings.getUser().getId())
                .exchangeRateNotifications(settings.getExchangeRateNotifications())
                .interestRateNotifications(settings.getInterestRateNotifications())
                .cpiNotifications(settings.getCpiNotifications())
                .economicIndexNotifications(settings.getEconomicIndexNotifications())
                .communityNotifications(settings.getCommunityNotifications())
                .emailNotifications(settings.getEmailNotifications())
                .pushNotifications(settings.getPushNotifications())
                .notificationFrequency(settings.getNotificationFrequency().name())
                .build();
    }
} 