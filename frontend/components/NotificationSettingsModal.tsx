import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNotificationPermissions } from '../utils/notificationUtils';

interface NotificationSettings {
  enabled: boolean;
  exchangeRate: {
    enabled: boolean;
    countries: {
      usa: {
        enabled: boolean;
        threshold: string;
      };
      japan: {
        enabled: boolean;
        threshold: string;
      };
      europe: {
        enabled: boolean;
        threshold: string;
      };
      china: {
        enabled: boolean;
        threshold: string;
      };
    };
  };
  interestRate: {
    enabled: boolean;
    threshold: string;
  };
  cpi: {
    enabled: boolean;
    threshold: string;
  };
}

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationSettingsModal({
  visible,
  onClose,
}: NotificationSettingsModalProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    exchangeRate: {
      enabled: false,
      countries: {
        usa: {
          enabled: true,
          threshold: '1300',
        },
        japan: {
          enabled: false,
          threshold: '100',
        },
        europe: {
          enabled: false,
          threshold: '1400',
        },
        china: {
          enabled: false,
          threshold: '180',
        },
      },
    },
    interestRate: {
      enabled: false,
      threshold: '4.0',
    },
    cpi: {
      enabled: false,
      threshold: '3.0',
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        
        // 설정 구조 검증 및 마이그레이션
        if (parsedSettings && typeof parsedSettings === 'object') {
          // exchangeRate 설정 검증
          if (!parsedSettings.exchangeRate || typeof parsedSettings.exchangeRate !== 'object') {
            parsedSettings.exchangeRate = {
              enabled: false,
              countries: {
                usa: { enabled: true, threshold: '1300' },
                japan: { enabled: false, threshold: '100' },
                europe: { enabled: false, threshold: '1400' },
                china: { enabled: false, threshold: '180' },
              },
            };
          } else if (parsedSettings.exchangeRate.countries) {
            // 기존 구조를 새로운 구조로 마이그레이션
            const oldCountries = parsedSettings.exchangeRate.countries;
            if (typeof oldCountries.usa === 'boolean') {
              parsedSettings.exchangeRate.countries = {
                usa: {
                  enabled: oldCountries.usa || false,
                  threshold: '1300',
                },
                japan: {
                  enabled: oldCountries.japan || false,
                  threshold: '100',
                },
                europe: {
                  enabled: oldCountries.europe || false,
                  threshold: '1400',
                },
                china: {
                  enabled: oldCountries.china || false,
                  threshold: '180',
                },
              };
            }
          }
          
          // 다른 설정들도 검증
          if (!parsedSettings.interestRate || typeof parsedSettings.interestRate !== 'object') {
            parsedSettings.interestRate = { enabled: false, threshold: '4.0' };
          }
          if (!parsedSettings.cpi || typeof parsedSettings.cpi !== 'object') {
            parsedSettings.cpi = { enabled: false, threshold: '3.0' };
          }
          if (typeof parsedSettings.enabled !== 'boolean') {
            parsedSettings.enabled = false;
          }
          
          // 마이그레이션된 설정 저장
          await AsyncStorage.setItem('notificationSettings', JSON.stringify(parsedSettings));
          setSettings(parsedSettings);
        } else {
          throw new Error('Invalid settings format');
        }
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
      // 에러 발생 시 설정 초기화
      await AsyncStorage.removeItem('notificationSettings');
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert('알림 설정', '설정이 저장되었습니다.');
    } catch (error) {
      console.error('설정 저장 실패:', error);
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  };

  const updateSettings = (path: string, value: any) => {
    const newSettings = { ...settings };
    const keys = path.split('.');
    let current: any = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setSettings(newSettings);
  };

  const handleSave = async () => {
    // 알림이 활성화된 경우 권한 요청
    if (settings.enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          '알림 권한 필요',
          '알림을 받으려면 알림 권한이 필요합니다. 설정에서 알림 권한을 허용해주세요.',
          [{ text: '확인' }]
        );
        return;
      }
    }
    
    saveSettings(settings);
    onClose();
  };

  const getCountryName = (code: string) => {
    switch (code) {
      case 'usa': return '미국 달러 (USD)';
      case 'japan': return '일본 엔화 (JPY)';
      case 'europe': return '유럽 유로 (EUR)';
      case 'china': return '중국 위안 (CNY)';
      default: return code.toUpperCase();
    }
  };

  const getIndicatorName = (type: string) => {
    switch (type) {
      case 'exchangeRate': return '환율';
      case 'interestRate': return '금리';
      case 'cpi': return '물가';
      default: return type;
    }
  };

  const getThresholdUnit = (type: string) => {
    switch (type) {
      case 'exchangeRate': return '원';
      case 'interestRate': return '%';
      case 'cpi': return '%';
      default: return '';
    }
  };

  const getThresholdDescription = (type: string) => {
    switch (type) {
      case 'exchangeRate': return '설정한 환율을 넘을 때 알림';
      case 'interestRate': return '설정한 금리를 넘을 때 알림';
      case 'cpi': return '설정한 물가상승률을 넘을 때 알림';
      default: return '';
    }
  };

  const getDefaultThreshold = (country: string) => {
    switch (country) {
      case 'usa': return '1300';
      case 'japan': return '100';
      case 'europe': return '1400';
      case 'china': return '180';
      default: return '1000';
    }
  };



  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>알림 설정</ThemedText>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <ThemedText style={styles.saveButtonText}>저장</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 전체 알림 설정 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="bell" size={20} color="#007AFF" />
              <ThemedText style={styles.sectionTitle}>전체 알림</ThemedText>
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>알림 활성화</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  경제 지표 알림을 받으시겠습니까?
                </ThemedText>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={settings.enabled}
                  onValueChange={(value) => {
                    updateSettings('enabled', value);
                                       // 전체 알림이 비활성화되면 개별 알림도 비활성화
                     if (!value) {
                       updateSettings('exchangeRate.enabled', false);
                       updateSettings('interestRate.enabled', false);
                       updateSettings('cpi.enabled', false);
                       // 환율 국가별 알림도 비활성화
                       updateSettings('exchangeRate.countries.usa.enabled', false);
                       updateSettings('exchangeRate.countries.japan.enabled', false);
                       updateSettings('exchangeRate.countries.europe.enabled', false);
                       updateSettings('exchangeRate.countries.china.enabled', false);
                     }
                  }}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor={settings.enabled ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
            </View>
          </View>

          {/* 환율 알림 설정 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="currency-usd" size={20} color="#FF9500" />
              <ThemedText style={styles.sectionTitle}>환율 알림</ThemedText>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText style={[
                  styles.settingLabel, 
                  !settings.enabled && styles.disabledText
                ]}>
                  환율 알림 활성화
                </ThemedText>
                                 <ThemedText style={[
                   styles.settingDescription,
                   !settings.enabled && styles.disabledText
                 ]}>
                   설정한 기준 환율을 넘을 때 알림을 받습니다
                 </ThemedText>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={settings.exchangeRate.enabled}
                  onValueChange={(value) => updateSettings('exchangeRate.enabled', value)}
                  trackColor={{ false: '#E5E5EA', true: '#FF9500' }}
                  thumbColor={settings.exchangeRate.enabled ? '#FFFFFF' : '#FFFFFF'}
                  disabled={!settings.enabled}
                />
              </View>
            </View>

                         {settings.exchangeRate.enabled && (
               <View style={styles.countrySection}>
                 <ThemedText style={styles.countrySectionTitle}>국가별 환율 알림 설정</ThemedText>
                 {Object.entries(settings.exchangeRate.countries).map(([country, countrySettings]) => (
                   <View key={country} style={styles.countryItem}>
                     <View style={styles.countryInfo}>
                       <ThemedText style={styles.countryLabel}>
                         {getCountryName(country)}
                       </ThemedText>
                     </View>
                     <View style={styles.switchContainer}>
                       <Switch
                         value={countrySettings.enabled}
                         onValueChange={(value) => 
                           updateSettings(`exchangeRate.countries.${country}.enabled`, value)
                         }
                         trackColor={{ false: '#E5E5EA', true: '#FF9500' }}
                         thumbColor={countrySettings.enabled ? '#FFFFFF' : '#FFFFFF'}
                       />
                     </View>
                   </View>
                 ))}
                 
                 {/* 국가별 기준 환율 설정 */}
                 {Object.entries(settings.exchangeRate.countries).map(([country, countrySettings]) => (
                   countrySettings.enabled && (
                     <View key={`${country}-threshold`} style={styles.thresholdItem}>
                       <View style={styles.thresholdInfo}>
                         <ThemedText style={styles.thresholdLabel}>
                           {getCountryName(country)} 기준 환율
                         </ThemedText>
                         <ThemedText style={styles.thresholdDescription}>
                           이 환율을 넘을 때 알림을 받습니다
                         </ThemedText>
                       </View>
                       <View style={styles.inputContainer}>
                         <TextInput
                           style={styles.input}
                           value={countrySettings.threshold}
                           onChangeText={(value) => updateSettings(`exchangeRate.countries.${country}.threshold`, value)}
                           keyboardType="numeric"
                           placeholder={getDefaultThreshold(country)}
                           placeholderTextColor="#8E8E93"
                         />
                         <ThemedText style={styles.inputUnit}>원</ThemedText>
                       </View>
                     </View>
                   )
                 ))}
               </View>
             )}
          </View>

          {/* 금리 알림 설정 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="percent" size={20} color="#34C759" />
              <ThemedText style={styles.sectionTitle}>금리 알림</ThemedText>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText style={[
                  styles.settingLabel, 
                  !settings.enabled && styles.disabledText
                ]}>
                  금리 알림 활성화
                </ThemedText>
                                                <ThemedText style={[
                   styles.settingDescription,
                   !settings.enabled && styles.disabledText
                 ]}>
                   설정한 기준 금리를 지나갈 때 알림을 받습니다 (발표일 기준)
                 </ThemedText>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={settings.interestRate.enabled}
                  onValueChange={(value) => updateSettings('interestRate.enabled', value)}
                  trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                  thumbColor={settings.interestRate.enabled ? '#FFFFFF' : '#FFFFFF'}
                  disabled={!settings.enabled}
                />
              </View>
            </View>

            {settings.interestRate.enabled && (
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                                   <ThemedText style={styles.settingLabel}>알림 기준 금리</ThemedText>
                 <ThemedText style={styles.settingDescription}>
                   이 금리를 지나갈 때 알림을 받습니다 (한국은행 기준금리, 발표일 기준)
                 </ThemedText>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={settings.interestRate.threshold}
                    onChangeText={(value) => updateSettings('interestRate.threshold', value)}
                    keyboardType="numeric"
                    placeholder="4.0"
                    placeholderTextColor="#8E8E93"
                  />
                  <ThemedText style={styles.inputUnit}>%</ThemedText>
                </View>
              </View>
            )}
          </View>

          {/* 물가 알림 설정 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="chart-line" size={20} color="#AF52DE" />
              <ThemedText style={styles.sectionTitle}>물가 알림</ThemedText>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText style={[
                  styles.settingLabel, 
                  !settings.enabled && styles.disabledText
                ]}>
                  물가 알림 활성화
                </ThemedText>
                                                <ThemedText style={[
                   styles.settingDescription,
                   !settings.enabled && styles.disabledText
                 ]}>
                   설정한 기준 물가상승률을 지나갈 때 알림을 받습니다 (발표일 기준)
                 </ThemedText>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={settings.cpi.enabled}
                  onValueChange={(value) => updateSettings('cpi.enabled', value)}
                  trackColor={{ false: '#E5E5EA', true: '#AF52DE' }}
                  thumbColor={settings.cpi.enabled ? '#FFFFFF' : '#FFFFFF'}
                  disabled={!settings.enabled}
                />
              </View>
            </View>

            {settings.cpi.enabled && (
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                                   <ThemedText style={styles.settingLabel}>알림 기준 물가상승률</ThemedText>
                 <ThemedText style={styles.settingDescription}>
                   이 물가상승률을 지나갈 때 알림을 받습니다 (CPI 전년동월대비, 발표일 기준)
                 </ThemedText>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={settings.cpi.threshold}
                    onChangeText={(value) => updateSettings('cpi.threshold', value)}
                    keyboardType="numeric"
                    placeholder="3.0"
                    placeholderTextColor="#8E8E93"
                  />
                  <ThemedText style={styles.inputUnit}>%</ThemedText>
                </View>
              </View>
            )}
          </View>


        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // center에서 flex-start로 변경하여 텍스트가 여러 줄일 때도 잘 정렬되도록
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
    minWidth: 0, // 텍스트가 잘리지 않도록 최소 너비 설정
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    flexShrink: 1, // 텍스트가 필요시 줄어들 수 있도록 설정
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  input: {
    fontSize: 16,
    color: '#000',
    textAlign: 'right',
    flex: 1,
    minWidth: 60,
  },
  inputUnit: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 4,
  },
  countrySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  countrySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  countryInfo: {
    flex: 1,
  },
  countryLabel: {
    fontSize: 14,
    color: '#000',
  },
  thresholdItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  thresholdInfo: {
    flex: 1,
    marginRight: 16,
  },
  thresholdLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  thresholdDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  disabledText: {
    color: '#8E8E93',
  },
  switchContainer: {
    marginTop: 4, // 텍스트가 여러 줄일 때 Switch가 적절히 정렬되도록
  },
}); 