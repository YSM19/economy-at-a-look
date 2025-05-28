import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert, Platform, TextInput } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../../constants/Config';

export default function AdminDashboardScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState('');

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

  // 오늘의 환율 데이터 조회
  const fetchExchangeRates = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      console.log('🎯 관리자 대시보드: 오늘 환율 데이터 조회 시작');
      const response = await axios.get(`${Config.apiUrl}/api/exchange-rates/today`);
      setApiResult({
        success: true,
        message: '오늘의 환율 데이터 조회 성공',
        data: response.data
      });
      
      console.log('✅ 오늘 환율 데이터 조회 성공:', response.data);
      Alert.alert('조회 성공', `오늘의 환율 데이터 ${response.data.length}개를 확인했습니다.`);
      
    } catch (error) {
      console.error('💥 오늘 환율 데이터 조회 에러:', error);
      
      let userMessage = '오늘의 환율 데이터를 조회하는 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          
          if (status === 404) {
            userMessage = '오늘의 환율 데이터가 아직 저장되지 않았습니다.\n"외부 API에서 환율 데이터 가져오기" 버튼을 사용해주세요.';
          } else {
            userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
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
      
      Alert.alert('조회 실패', userMessage);
      
    } finally {
      setIsLoading(false);
    }
  };

  // 외부 API에서 새로운 환율 데이터 가져오기
  const fetchNewExchangeRates = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      console.log('🌐 관리자 대시보드: 외부 API에서 환율 데이터 가져오기 시작');
      const response = await axios.post(`${Config.apiUrl}/api/exchange-rates/fetch`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 외부 API 환율 데이터 가져오기 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '환율 데이터를 성공적으로 불러와 데이터베이스에 저장했습니다.');
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
              {isLoading ? '조회 중...' : '📊 오늘 환율 데이터 조회'}
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton, isLoading && styles.disabledButton]}
            onPress={fetchNewExchangeRates}
            disabled={isLoading}
          >
            <ThemedText style={styles.buttonText}>
              {isLoading ? '가져오는 중...' : '🌐 외부 API에서 환율 데이터 가져오기'}
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
}); 