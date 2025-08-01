import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Switch, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../../components/ToastProvider';
import { notificationSettingsApi } from '../../services/api';
import { checkLoginStatusWithValidation } from '../../utils/authUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  exchangeRateNotifications: boolean;
  interestRateNotifications: boolean;
  consumerPriceIndexNotifications: boolean;
  communityNotifications: boolean;
  pushNotifications: boolean;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    exchangeRateNotifications: true,
    interestRateNotifications: true,
    consumerPriceIndexNotifications: true,
    communityNotifications: true,
    pushNotifications: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { isLoggedIn } = await checkLoginStatusWithValidation();
      if (!isLoggedIn) {
        showToast('로그인이 필요합니다.', 'error');
        router.push('/(tabs)/login');
        return;
      }

      // 토큰 가져오기
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('로그인 토큰을 찾을 수 없습니다.', 'error');
        router.push('/(tabs)/login');
        return;
      }

      const response = await notificationSettingsApi.getNotificationSettings(token);
      if (response.data.success) {
        setSettings(response.data.data);
      } else {
        showToast('설정을 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('설정 로드 오류:', error);
      showToast('설정을 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    setIsSaving(true);
    try {
      // 토큰 가져오기
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('로그인 토큰을 찾을 수 없습니다.', 'error');
        return;
      }

      const response = await notificationSettingsApi.updateNotificationSettings(newSettings, token);
      if (response.data.success) {
        setSettings(newSettings);
        showToast('설정이 저장되었습니다.', 'success');
      } else {
        showToast('설정 저장에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('설정 저장 오류:', error);
      showToast('설정 저장에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const resetSettings = async () => {
    const defaultSettings: NotificationSettings = {
      exchangeRateNotifications: true,
      interestRateNotifications: true,
      consumerPriceIndexNotifications: true,
      communityNotifications: true,
      pushNotifications: true,
    };
    await saveSettings(defaultSettings);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>알림 설정</ThemedText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText>설정을 불러오는 중...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>알림 설정</ThemedText>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetSettings}
          disabled={isSaving}
        >
          <ThemedText style={[styles.resetButtonText, isSaving && styles.disabledText]}>
            {isSaving ? '저장 중...' : '초기화'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* 알림 채널 설정 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>알림 채널</ThemedText>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="bell" size={24} color="#FF9500" />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingTitle}>푸시 알림</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  앱 푸시로 알림을 받습니다
                </ThemedText>
              </View>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={() => handleToggle('pushNotifications')}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFFFFF"
              disabled={isSaving}
            />
          </View>
        </ThemedView>

        {/* 경제 지표 알림 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>경제 지표 알림</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="currency-usd" size={24} color="#FF6B6B" />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingTitle}>환율 변동 알림</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  주요 통화 환율 변동 시 알림
                </ThemedText>
              </View>
            </View>
            <Switch
              value={settings.exchangeRateNotifications}
              onValueChange={() => handleToggle('exchangeRateNotifications')}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFFFFF"
              disabled={isSaving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="percent" size={24} color="#4ECDC4" />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingTitle}>금리 변동 알림</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  기준금리 변동 시 알림
                </ThemedText>
              </View>
            </View>
            <Switch
              value={settings.interestRateNotifications}
              onValueChange={() => handleToggle('interestRateNotifications')}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFFFFF"
              disabled={isSaving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="chart-line" size={24} color="#FFEAA7" />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingTitle}>소비자물가지수 알림</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  CPI 변동 시 알림
                </ThemedText>
              </View>
            </View>
            <Switch
              value={settings.consumerPriceIndexNotifications}
              onValueChange={() => handleToggle('consumerPriceIndexNotifications')}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFFFFF"
              disabled={isSaving}
            />
          </View>
        </ThemedView>

        {/* 커뮤니티 알림 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>커뮤니티 알림</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="account-group" size={24} color="#A29BFE" />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingTitle}>커뮤니티 알림</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  댓글, 좋아요, 팔로우 알림
                </ThemedText>
              </View>
            </View>
            <Switch
              value={settings.communityNotifications}
              onValueChange={() => handleToggle('communityNotifications')}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFFFFF"
              disabled={isSaving}
            />
          </View>
        </ThemedView>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40, // Adjust as needed for spacing
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resetButton: {
    padding: 8,
  },
  resetButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledText: {
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
}); 