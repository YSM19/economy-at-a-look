package com.at_a_look.economy.repository;

import com.at_a_look.economy.entity.UserNotificationSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserNotificationSettingsRepository extends JpaRepository<UserNotificationSettings, Long> {
    
    Optional<UserNotificationSettings> findByUserId(Long userId);
    
    boolean existsByUserId(Long userId);
} 