import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

import { MaterialCommunityIcons } from '@expo/vector-icons';
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

export default function AdminApiRequestsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();

  const [isLoading, setIsLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState(false);
  const [isInterestRateLoading, setIsInterestRateLoading] = useState(false);
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false);
  const [isCPILoading, setIsCPILoading] = useState(false);
  const [customYears, setCustomYears] = useState('3');

  // 오늘의 환율 데이터 조회 (외부 API 호출)
  const fetchExchangeRates = async () => {
    setIsExchangeRateLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      const response = await axios.post(`${Config.apiUrl}/api/exchange-rates/fetch`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '오늘의 환율 데이터를 성공적으로 불러와 데이터베이스에 저장했습니다.');
      } else {
        Alert.alert('알림', response.data.message || '환율 데이터를 일부만 가져왔습니다.');
      }
    } catch (error) {
      console.error('환율 데이터 가져오기 에러:', error);
      Alert.alert('오류', '환율 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsExchangeRateLoading(false);
    }
  };

  // 1년 환율 데이터 수동 호출
  const fetchYearlyExchangeRates = async () => {
    setIsExchangeRateLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/exchange-rate/fetch/yearly`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '최근 1년간의 환율 데이터를 성공적으로 가져왔습니다.');
      } else {
        Alert.alert('오류', response.data.message || '1년 환율 데이터를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('1년 환율 데이터 가져오기 에러:', error);
      Alert.alert('오류', '1년 환율 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsExchangeRateLoading(false);
    }
  };

  // 1달 환율 데이터 수동 호출
  const fetchMonthlyExchangeRates = async () => {
    setIsExchangeRateLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/exchange-rate/fetch/monthly`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '최근 1개월간의 환율 데이터를 성공적으로 가져왔습니다.');
      } else {
        Alert.alert('오류', response.data.message || '1달 환율 데이터를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('1달 환율 데이터 가져오기 에러:', error);
      Alert.alert('오류', '1달 환율 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsExchangeRateLoading(false);
    }
  };

  // 1년 금리 데이터 수동 호출
  const fetchYearlyInterestRates = async () => {
    setIsInterestRateLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/interest-rate/fetch/yearly`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '최근 1년간의 금리 데이터를 성공적으로 가져왔습니다.');
      } else {
        Alert.alert('오류', response.data.message || '1년 금리 데이터를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('1년 금리 데이터 가져오기 에러:', error);
      Alert.alert('오류', '1년 금리 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsInterestRateLoading(false);
    }
  };

  // 1달 금리 데이터 수동 호출
  const fetchMonthlyInterestRates = async () => {
    setIsInterestRateLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/interest-rate/fetch/monthly`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '최근 1개월간의 금리 데이터를 성공적으로 가져왔습니다.');
      } else {
        Alert.alert('오류', response.data.message || '1달 금리 데이터를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('1달 금리 데이터 가져오기 에러:', error);
      Alert.alert('오류', '1달 금리 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsInterestRateLoading(false);
    }
  };

  // 1년 소비자물가지수 데이터 가져오기
  const fetchYearlyCPIData = async () => {
    setIsCPILoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/consumer-price-index/fetch/yearly`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '최근 1년간의 소비자물가지수 데이터를 성공적으로 가져왔습니다.');
      } else {
        Alert.alert('오류', response.data.message || '1년 소비자물가지수 데이터를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('1년 소비자물가지수 데이터 가져오기 에러:', error);
      Alert.alert('오류', '1년 소비자물가지수 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsCPILoading(false);
    }
  };

  // 2년 소비자물가지수 데이터 가져오기
  const fetch2YearsCPIData = async () => {
    setIsCPILoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/consumer-price-index/fetch/2years`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '최근 2년간의 소비자물가지수 데이터를 성공적으로 가져왔습니다.');
      } else {
        Alert.alert('오류', response.data.message || '2년 소비자물가지수 데이터를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('2년 소비자물가지수 데이터 가져오기 에러:', error);
      Alert.alert('오류', '2년 소비자물가지수 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsCPILoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'API 데이터 요청',
        headerShown: false
      }} />
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 */}
        <View style={[styles.header, {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
            />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>API 데이터 요청</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        


        <ScrollView style={styles.content}>
          {/* 환율 데이터 관리 영역 */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>🌍 환율 데이터 관리</ThemedText>
            
            <TouchableOpacity 
              style={[styles.button, (isExchangeRateLoading || isLoading) && styles.disabledButton]}
              onPress={fetchExchangeRates}
              disabled={isExchangeRateLoading || isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isExchangeRateLoading ? '가져오는 중...' : '🌐 오늘 환율 데이터 가져오기'}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, (isExchangeRateLoading || isLoading) && styles.disabledButton]}
              onPress={fetchMonthlyExchangeRates}
              disabled={isExchangeRateLoading || isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isExchangeRateLoading ? '📊 가져오는 중...' : '📅 1달 환율 데이터 가져오기'}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, (isExchangeRateLoading || isLoading) && styles.disabledButton]}
              onPress={fetchYearlyExchangeRates}
              disabled={isExchangeRateLoading || isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isExchangeRateLoading ? '📊 가져오는 중...' : '📅 1년 환율 데이터 가져오기'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          {/* 금리 데이터 관리 영역 */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>💰 금리 데이터 관리</ThemedText>
            
            <TouchableOpacity 
              style={[styles.button, (isInterestRateLoading || isLoading) && styles.disabledButton]}
              onPress={fetchMonthlyInterestRates}
              disabled={isInterestRateLoading || isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isInterestRateLoading ? '📊 가져오는 중...' : '📅 1달 금리 데이터 가져오기'}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, (isInterestRateLoading || isLoading) && styles.disabledButton]}
              onPress={fetchYearlyInterestRates}
              disabled={isInterestRateLoading || isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isInterestRateLoading ? '📊 가져오는 중...' : '📅 1년 금리 데이터 가져오기'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          {/* 물가 데이터 관리 영역 */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>📊 물가 데이터 관리</ThemedText>
            
            <TouchableOpacity 
              style={[styles.button, (isCPILoading || isLoading) && styles.disabledButton]}
              onPress={fetchYearlyCPIData}
              disabled={isCPILoading || isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isCPILoading ? '📊 가져오는 중...' : '📅 1년 CPI 데이터 가져오기'}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, (isCPILoading || isLoading) && styles.disabledButton]}
              onPress={fetch2YearsCPIData}
              disabled={isCPILoading || isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isCPILoading ? '📊 가져오는 중...' : '📅 2년 CPI 데이터 가져오기'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40, // 상단 여백 추가
    borderBottomWidth: 1,
  },
  hamburgerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
}); 