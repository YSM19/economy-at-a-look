import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert, Platform, TextInput } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../../constants/Config';

// 국가 목록 정의
const COUNTRIES = [
  { key: 'usa', label: '미국 (USD)', currency: 'USD' },
  { key: 'japan', label: '일본 (JPY)', currency: 'JPY(100)' },
  { key: 'china', label: '중국 (CNY)', currency: 'CNH' },
  { key: 'europe', label: '유럽 (EUR)', currency: 'EUR' }
];

export default function AdminDashboardScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState(false);

  useEffect(() => {
    // 인증 확인
    checkAuthentication();
  }, []);

  // 관리자 인증 확인
  const checkAuthentication = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        // 토큰이 없으면 로그인 페이지로 리디렉션
        router.replace('/admin/login');
        return;
      }
      setIsAuthenticated(true);
    } catch (error) {
      console.error('인증 확인 에러:', error);
      router.replace('/admin/login');
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('adminToken');
      router.replace('/admin/login');
    } catch (error) {
      console.error('로그아웃 에러:', error);
      Alert.alert('오류', '로그아웃 처리 중 오류가 발생했습니다.');
    }
  };

  // 오늘의 환율 데이터 조회 (외부 API 호출)
  const fetchExchangeRates = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      console.log('🌐 관리자 대시보드: 외부 API에서 오늘 환율 데이터 가져오기 시작');
      const response = await axios.post(`${Config.apiUrl}/api/exchange-rates/fetch`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 외부 API 환율 데이터 가져오기 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '오늘의 환율 데이터를 성공적으로 불러와 데이터베이스에 저장했습니다.');
      } else {
        console.warn('⚠️ 외부 API 환율 데이터 가져오기 부분 실패:', response.data.message);
        Alert.alert('알림', response.data.message || '환율 데이터를 일부만 가져왔습니다.');
      }
      
    } catch (error) {
      console.error('💥 외부 API 환율 데이터 가져오기 에러:', error);
      
      let userMessage = '외부 API에서 환율 데이터를 가져오는 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          
          switch (status) {
            case 503:
              userMessage = '외부 환율 서비스가 일시적으로 사용 불가능합니다.\n5-10분 후 다시 시도해주세요.';
              break;
            case 502:
              userMessage = '외부 서비스와의 연결에 문제가 있습니다.\n잠시 후 다시 시도해주세요.';
              break;
            default:
              userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
              break;
          }
          
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else if (error.request) {
          userMessage = '서버에 연결할 수 없습니다.\n인터넷 연결을 확인하고 다시 시도해주세요.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        } else {
          userMessage = '요청 처리 중 오류가 발생했습니다.';
          setErrorMessage(`요청 오류: ${error.message}`);
        }
      } else {
        userMessage = '예상치 못한 오류가 발생했습니다.';
        setErrorMessage('예상치 못한 오류가 발생했습니다.');
      }
      
      Alert.alert('오류', userMessage);
      
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜별 환율 데이터 API 요청
  const fetchExchangeRatesByDate = async (date: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      const formattedDate = date || new Date().toISOString().split('T')[0];
      const response = await axios.post(`${Config.apiUrl}/api/exchange-rates/fetch?date=${formattedDate}`);
      setApiResult(response.data);
      Alert.alert('성공', `${formattedDate} 기준 환율 데이터를 성공적으로 불러와 데이터베이스에 저장했습니다.`);
    } catch (error) {
      console.error('환율 API 요청 에러:', error);
      if (axios.isAxiosError(error) && error.response) {
        setErrorMessage(`오류: ${error.response.status} - ${error.response.statusText}`);
      } else {
        setErrorMessage('환율 데이터를 가져오는 중 오류가 발생했습니다.');
      }
      Alert.alert('오류', '환율 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜 입력값 유효성 검사
  const isValidDate = (dateString: string) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  // 커스텀 날짜로 환율 데이터 가져오기
  const fetchCustomDateExchangeRates = () => {
    if (!customDate) {
      Alert.alert('알림', '날짜를 입력해주세요.');
      return;
    }
    
    if (!isValidDate(customDate)) {
      Alert.alert('오류', '유효한 날짜 형식(YYYY-MM-DD)으로 입력해주세요.');
      return;
    }
    
    fetchExchangeRatesByDate(customDate);
  };

  // 국가 선택 토글
  const toggleCountrySelection = (countryKey: string) => {
    setSelectedCountries(prev => {
      if (prev.includes(countryKey)) {
        return prev.filter(key => key !== countryKey);
      } else {
        return [...prev, countryKey];
      }
    });
  };

  // 국가별 환율 데이터 6개월 가져오기
  const fetchExchangeRatesByCountries = async () => {
    if (selectedCountries.length === 0) {
      Alert.alert('알림', '최소 하나의 국가를 선택해주세요.');
      return;
    }

    setIsCountriesLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      console.log('🌍 관리자 대시보드: 국가별 환율 데이터 가져오기 시작', selectedCountries);
      
      const params = new URLSearchParams();
      selectedCountries.forEach(country => {
        params.append('countries', country);
      });
      
      const response = await axios.post(
        `${Config.apiUrl}/api/exchange-rates/fetch-countries?${params.toString()}`
      );
      
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 국가별 환율 데이터 가져오기 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '선택한 국가들의 최근 6개월 환율 데이터를 성공적으로 가져왔습니다.');
      } else {
        console.warn('⚠️ 국가별 환율 데이터 가져오기 부분 실패:', response.data.message);
        Alert.alert('알림', response.data.message || '일부 국가의 환율 데이터만 가져왔습니다.');
      }
      
    } catch (error) {
      console.error('💥 국가별 환율 데이터 가져오기 에러:', error);
      
      let userMessage = '국가별 환율 데이터를 가져오는 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          
          switch (status) {
            case 503:
              userMessage = '외부 환율 서비스가 일시적으로 사용 불가능합니다.\n시간이 오래 걸릴 수 있으니 잠시 후 확인해주세요.';
              break;
            case 502:
              userMessage = '외부 서비스와의 연결에 문제가 있습니다.\n잠시 후 다시 시도해주세요.';
              break;
            default:
              userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
              break;
          }
          
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else if (error.request) {
          userMessage = '서버에 연결할 수 없습니다.\n인터넷 연결을 확인하고 다시 시도해주세요.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        } else {
          userMessage = '요청 처리 중 오류가 발생했습니다.';
          setErrorMessage(`요청 오류: ${error.message}`);
        }
      } else {
        userMessage = '예상치 못한 오류가 발생했습니다.';
        setErrorMessage('예상치 못한 오류가 발생했습니다.');
      }
      
      Alert.alert('오류', userMessage);
      
    } finally {
      setIsCountriesLoading(false);
    }
  };

  // 인증 안된 경우 로딩 화면 표시
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ThemedText>인증 확인 중...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: '관리자 대시보드',
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <ThemedText style={styles.logoutText}>로그아웃</ThemedText>
          </TouchableOpacity>
        )
      }} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>경제 한눈에 보기 - 관리자 페이지</ThemedText>
          <ThemedText style={styles.headerSubtitle}>데이터 관리 및 API 요청</ThemedText>
        </View>
        
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>환율 데이터 관리</ThemedText>
          
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={fetchExchangeRates}
            disabled={isLoading}
          >
            <ThemedText style={styles.buttonText}>
              {isLoading ? '가져오는 중...' : '🌐 오늘 환율 데이터 가져오기'}
            </ThemedText>
          </TouchableOpacity>
          
          <View style={styles.dateInputContainer}>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              value={customDate}
              onChangeText={setCustomDate}
              editable={!isLoading}
            />
            <TouchableOpacity 
              style={[styles.dateButton, isLoading && styles.disabledButton]}
              onPress={fetchCustomDateExchangeRates}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? '요청 중...' : '날짜별 조회'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>국가별 환율 데이터 수집 (6개월)</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            선택한 국가의 최근 6개월 환율 데이터를 외부 API에서 가져와 저장합니다.
          </ThemedText>
          
          <View style={styles.countrySelectionContainer}>
            <ThemedText style={styles.countrySelectionTitle}>📍 수집할 국가 선택 (중복 선택 가능)</ThemedText>
            
            <View style={styles.countryGrid}>
              {COUNTRIES.map(country => (
                <TouchableOpacity
                  key={country.key}
                  style={[
                    styles.countryItem,
                    selectedCountries.includes(country.key) && styles.countryItemSelected,
                    (isCountriesLoading || isLoading) && styles.disabledButton
                  ]}
                  onPress={() => toggleCountrySelection(country.key)}
                  disabled={isCountriesLoading || isLoading}
                >
                  <View style={styles.countryCheckbox}>
                    <View style={[
                      styles.checkbox,
                      selectedCountries.includes(country.key) && styles.checkboxSelected
                    ]}>
                      {selectedCountries.includes(country.key) && (
                        <ThemedText style={styles.checkboxText}>✓</ThemedText>
                      )}
                    </View>
                    <View style={styles.countryInfo}>
                      <ThemedText style={[
                        styles.countryLabel,
                        selectedCountries.includes(country.key) && styles.countryLabelSelected
                      ]}>
                        {country.label}
                      </ThemedText>
                      <ThemedText style={styles.currencyCode}>
                        {country.currency}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.selectedCountriesInfo}>
              <ThemedText style={styles.selectedCountriesText}>
                선택된 국가: {selectedCountries.length > 0 
                  ? COUNTRIES
                      .filter(c => selectedCountries.includes(c.key))
                      .map(c => c.label.split(' ')[0])
                      .join(', ')
                  : '없음'
                }
              </ThemedText>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.countriesButton, 
              (isCountriesLoading || isLoading || selectedCountries.length === 0) && styles.disabledButton
            ]}
            onPress={fetchExchangeRatesByCountries}
            disabled={isCountriesLoading || isLoading || selectedCountries.length === 0}
          >
            <ThemedText style={styles.buttonText}>
              {isCountriesLoading ? '📊 수집 중... (최대 수 분 소요)' : '🌍 선택한 국가 환율 데이터 수집'}
            </ThemedText>
          </TouchableOpacity>
          
          {isCountriesLoading && (
            <View style={styles.loadingNotice}>
              <ThemedText style={styles.loadingNoticeText}>
                ⏱️ 6개월간의 데이터를 수집하고 있습니다. 시간이 오래 걸릴 수 있으니 잠시만 기다려주세요.
              </ThemedText>
            </View>
          )}
        </View>
        
        {errorMessage && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
          </View>
        )}
        
        {apiResult && (
          <View style={styles.resultContainer}>
            <ThemedText style={styles.resultTitle}>API 요청 결과</ThemedText>
            <ThemedText style={styles.resultText}>
              {typeof apiResult === 'string'
                ? apiResult
                : JSON.stringify(apiResult, null, 2)}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      web: {
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  logoutButton: {
    paddingHorizontal: 10,
  },
  logoutText: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  errorText: {
    color: '#D32F2F',
  },
  resultContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2E7D32',
  },
  resultText: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'normal',
    fontSize: 14,
  },
  dateInputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    backgroundColor: 'white',
    marginRight: 8,
    fontSize: 16,
  },
  dateButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  countrySelectionContainer: {
    marginBottom: 20,
  },
  countrySelectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  countryItem: {
    width: '48%',
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  countryItemSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  countryCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 8,
  },
  checkboxSelected: {
    backgroundColor: '#0066CC',
  },
  checkboxText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countryInfo: {
    flexDirection: 'column',
  },
  countryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  countryLabelSelected: {
    color: '#0066CC',
  },
  currencyCode: {
    fontSize: 14,
    color: '#666',
  },
  selectedCountriesInfo: {
    marginTop: 10,
    marginBottom: 10,
  },
  selectedCountriesText: {
    fontSize: 14,
    color: '#666',
  },
  countriesButton: {
    backgroundColor: '#0066CC',
  },
  loadingNotice: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  loadingNoticeText: {
    fontSize: 14,
    color: '#666',
  },
}); 