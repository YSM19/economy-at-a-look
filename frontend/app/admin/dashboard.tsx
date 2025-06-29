import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert, Platform, TextInput, Dimensions } from 'react-native';
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
  const [isInterestRateLoading, setIsInterestRateLoading] = useState(false);
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false);
  const [isCPILoading, setIsCPILoading] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    // 인증 확인
    checkAuthentication();
  }, []);

  useEffect(() => {
    // 화면 크기 변경 감지
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => {
      if (subscription && subscription.remove) {
        subscription.remove();
      }
    };
  }, []);

  // 관리자 인증 확인
  const checkAuthentication = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      if (!token) {
        // 토큰이 없으면 로그인 페이지로 리디렉션
        router.replace('/login');
        return;
      }
      setIsAuthenticated(true);
    } catch (error) {
      console.error('인증 확인 에러:', error);
      router.replace('/login');
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('adminToken');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      router.replace('/login');
    } catch (error) {
      console.error('로그아웃 에러:', error);
      Alert.alert('오류', '로그아웃 처리 중 오류가 발생했습니다.');
    }
  };

  // 오늘의 환율 데이터 조회 (외부 API 호출)
  const fetchExchangeRates = async () => {
    setIsExchangeRateLoading(true);
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
      setIsExchangeRateLoading(false);
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

  // 1년 금리 데이터 수동 호출
  const fetchYearlyInterestRates = async () => {
    setIsInterestRateLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      console.log('📅 관리자 대시보드: 1년 금리 데이터 가져오기 시작');
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/interest-rate/fetch/yearly`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 1년 금리 데이터 가져오기 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '최근 1년간의 금리 데이터를 성공적으로 가져왔습니다.');
      } else {
        console.warn('⚠️ 1년 금리 데이터 가져오기 실패:', response.data.message);
        Alert.alert('오류', response.data.message || '1년 금리 데이터를 가져오는데 실패했습니다.');
      }
      
    } catch (error) {
      console.error('💥 1년 금리 데이터 가져오기 에러:', error);
      let userMessage = '1년 금리 데이터를 가져오는 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else {
          userMessage = '서버에 연결할 수 없습니다.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        }
      }
      
      Alert.alert('오류', userMessage);
      
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
      console.log('📅 관리자 대시보드: 1달 금리 데이터 가져오기 시작');
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/interest-rate/fetch/monthly`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 1달 금리 데이터 가져오기 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '최근 1개월간의 금리 데이터를 성공적으로 가져왔습니다.');
      } else {
        console.warn('⚠️ 1달 금리 데이터 가져오기 실패:', response.data.message);
        Alert.alert('오류', response.data.message || '1달 금리 데이터를 가져오는데 실패했습니다.');
      }
      
    } catch (error) {
      console.error('💥 1달 금리 데이터 가져오기 에러:', error);
      let userMessage = '1달 금리 데이터를 가져오는 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else {
          userMessage = '서버에 연결할 수 없습니다.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        }
      }
      
      Alert.alert('오류', userMessage);
      
    } finally {
      setIsInterestRateLoading(false);
    }
  };

  // 1년 환율 데이터 수동 호출
  const fetchYearlyExchangeRates = async () => {
    setIsExchangeRateLoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      console.log('📅 관리자 대시보드: 1년 환율 데이터 가져오기 시작');
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/exchange-rate/fetch/yearly`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 1년 환율 데이터 가져오기 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '최근 1년간의 환율 데이터를 성공적으로 가져왔습니다.');
      } else {
        console.warn('⚠️ 1년 환율 데이터 가져오기 실패:', response.data.message);
        Alert.alert('오류', response.data.message || '1년 환율 데이터를 가져오는데 실패했습니다.');
      }
      
    } catch (error) {
      console.error('💥 1년 환율 데이터 가져오기 에러:', error);
      let userMessage = '1년 환율 데이터를 가져오는 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else {
          userMessage = '서버에 연결할 수 없습니다.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        }
      }
      
      Alert.alert('오류', userMessage);
      
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
      console.log('📅 관리자 대시보드: 1달 환율 데이터 가져오기 시작');
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/exchange-rate/fetch/monthly`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 1달 환율 데이터 가져오기 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '최근 1개월간의 환율 데이터를 성공적으로 가져왔습니다.');
      } else {
        console.warn('⚠️ 1달 환율 데이터 가져오기 실패:', response.data.message);
        Alert.alert('오류', response.data.message || '1달 환율 데이터를 가져오는데 실패했습니다.');
      }
      
    } catch (error) {
      console.error('💥 1달 환율 데이터 가져오기 에러:', error);
      let userMessage = '1달 환율 데이터를 가져오는 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else {
          userMessage = '서버에 연결할 수 없습니다.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        }
      }
      
      Alert.alert('오류', userMessage);
      
    } finally {
      setIsExchangeRateLoading(false);
    }
  };

  // 1년 소비자물가지수 데이터 가져오기
  const fetchYearlyCPIData = async () => {
    setIsCPILoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      console.log('📊 관리자 대시보드: 1년 소비자물가지수 데이터 가져오기 시작');
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/consumer-price-index/fetch/yearly`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 1년 소비자물가지수 데이터 가져오기 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '최근 1년간의 소비자물가지수 데이터를 성공적으로 가져왔습니다.');
      } else {
        console.warn('⚠️ 1년 소비자물가지수 데이터 가져오기 실패:', response.data.message);
        Alert.alert('오류', response.data.message || '1년 소비자물가지수 데이터를 가져오는데 실패했습니다.');
      }
      
    } catch (error) {
      console.error('💥 1년 소비자물가지수 데이터 가져오기 에러:', error);
      let userMessage = '1년 소비자물가지수 데이터를 가져오는 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else {
          userMessage = '서버에 연결할 수 없습니다.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        }
      }
      
      Alert.alert('오류', userMessage);
      
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
      console.log('📊 관리자 대시보드: 2년 소비자물가지수 데이터 가져오기 시작');
      const response = await axios.post(`${Config.apiUrl}/api/economic/admin/consumer-price-index/fetch/2years`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 2년 소비자물가지수 데이터 가져오기 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '최근 2년간의 소비자물가지수 데이터를 성공적으로 가져왔습니다.');
      } else {
        console.warn('⚠️ 2년 소비자물가지수 데이터 가져오기 실패:', response.data.message);
        Alert.alert('오류', response.data.message || '2년 소비자물가지수 데이터를 가져오는데 실패했습니다.');
      }
      
    } catch (error) {
      console.error('💥 2년 소비자물가지수 데이터 가져오기 에러:', error);
      let userMessage = '2년 소비자물가지수 데이터를 가져오는 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else {
          userMessage = '서버에 연결할 수 없습니다.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        }
      }
      
      Alert.alert('오류', userMessage);
      
    } finally {
      setIsCPILoading(false);
    }
  };

  // 소비자물가지수 데이터 강제 새로고침
  const refreshCPIData = async () => {
    setIsCPILoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      console.log('🔄 관리자 대시보드: 소비자물가지수 데이터 강제 새로고침 시작');
      const response = await axios.post(`${Config.apiUrl}/api/economic/consumer-price-index/refresh`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 소비자물가지수 데이터 새로고침 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '소비자물가지수 데이터가 성공적으로 새로고침되었습니다.');
      } else {
        console.warn('⚠️ 소비자물가지수 데이터 새로고침 실패:', response.data.message);
        Alert.alert('오류', response.data.message || '소비자물가지수 데이터 새로고침에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('💥 소비자물가지수 데이터 새로고침 에러:', error);
      let userMessage = '소비자물가지수 데이터 새로고침 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else {
          userMessage = '서버에 연결할 수 없습니다.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        }
      }
      
      Alert.alert('오류', userMessage);
      
    } finally {
      setIsCPILoading(false);
    }
  };

  // 소비자물가지수 스케줄러 수동 실행
  const runCPIScheduler = async () => {
    setIsCPILoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      console.log('⚙️ 관리자 대시보드: 소비자물가지수 스케줄러 수동 실행 시작');
      const response = await axios.post(`${Config.apiUrl}/api/economic/consumer-price-index/scheduler/run`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 소비자물가지수 스케줄러 수동 실행 성공:', response.data.message);
        Alert.alert('성공', response.data.message || '소비자물가지수 스케줄러가 성공적으로 실행되었습니다.');
      } else {
        console.warn('⚠️ 소비자물가지수 스케줄러 수동 실행 실패:', response.data.message);
        Alert.alert('오류', response.data.message || '소비자물가지수 스케줄러 실행에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('💥 소비자물가지수 스케줄러 수동 실행 에러:', error);
      let userMessage = '소비자물가지수 스케줄러 실행 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else {
          userMessage = '서버에 연결할 수 없습니다.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        }
      }
      
      Alert.alert('오류', userMessage);
      
    } finally {
      setIsCPILoading(false);
    }
  };

  // 소비자물가지수 데이터 상태 디버깅
  const debugCPIData = async () => {
    setIsCPILoading(true);
    setErrorMessage(null);
    setApiResult(null);
    
    try {
      console.log('🔍 관리자 대시보드: 소비자물가지수 데이터 상태 확인 시작');
      const response = await axios.get(`${Config.apiUrl}/api/economic/consumer-price-index/debug`);
      setApiResult(response.data);
      
      if (response.data?.success) {
        console.log('✅ 소비자물가지수 데이터 상태 확인 성공:', response.data.message);
        Alert.alert('디버깅 정보', response.data.data || '소비자물가지수 데이터 상태를 확인했습니다.');
      } else {
        console.warn('⚠️ 소비자물가지수 데이터 상태 확인 실패:', response.data.message);
        Alert.alert('오류', response.data.message || '소비자물가지수 데이터 상태 확인에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('💥 소비자물가지수 데이터 상태 확인 에러:', error);
      let userMessage = '소비자물가지수 데이터 상태 확인 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          userMessage = data?.message || `서버 오류가 발생했습니다. (오류 코드: ${status})`;
          setErrorMessage(`HTTP ${status}: ${data?.message || error.response.statusText}`);
        } else {
          userMessage = '서버에 연결할 수 없습니다.';
          setErrorMessage('네트워크 오류: 서버에 연결할 수 없습니다.');
        }
      }
      
      Alert.alert('오류', userMessage);
      
    } finally {
      setIsCPILoading(false);
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
          <View style={styles.headerTop}>
            <View style={styles.headerInfo}>
              <ThemedText style={styles.headerTitle}>경제 한눈에 보기 - 관리자 페이지</ThemedText>
              <ThemedText style={styles.headerSubtitle}>데이터 관리 및 API 요청</ThemedText>
            </View>
            <TouchableOpacity 
              style={styles.logoutButtonMain}
              onPress={handleLogout}
            >
              <ThemedText style={styles.logoutButtonMainText}>로그아웃</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 환율과 금리 데이터 관리 영역 */}
        <View style={screenData.width > 768 ? styles.mainContainer : styles.mainContainerMobile}>
          {/* 환율 데이터 관리 영역 */}
          <View style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
              <ThemedText style={styles.categoryTitle}>🌍 환율 데이터 관리</ThemedText>
              <View style={styles.categoryLine} />
            </View>
            
            <View style={[styles.section, styles.exchangeRateSection]}>
              <ThemedText style={styles.sectionTitle}>💱 실시간 환율 데이터</ThemedText>
          
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
              style={[
                styles.button, 
                styles.exchangeRateButton,
                (isExchangeRateLoading || isLoading) && styles.disabledButton
              ]}
              onPress={fetchMonthlyExchangeRates}
              disabled={isExchangeRateLoading || isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isExchangeRateLoading ? '📊 가져오는 중...' : '📅 1달 환율 데이터 가져오기'}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.exchangeRateButtonSecondary,
                (isExchangeRateLoading || isLoading) && styles.disabledButton
              ]}
              onPress={fetchYearlyExchangeRates}
              disabled={isExchangeRateLoading || isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isExchangeRateLoading ? '📊 가져오는 중...' : '📅 1년 환율 데이터 가져오기'}
              </ThemedText>
            </TouchableOpacity>
            
            {isExchangeRateLoading && (
              <View style={styles.loadingNotice}>
                <ThemedText style={styles.loadingNoticeText}>
                  ⏱️ 외부 API에서 환율 데이터를 가져오고 있습니다. 중복된 데이터는 자동으로 건너뛰므로 시간이 절약됩니다.
                </ThemedText>
              </View>
            )}
          
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
          
          <View style={[styles.section, styles.exchangeRateSection]}>
            <ThemedText style={styles.sectionTitle}>🌐 국가별 환율 데이터 수집 (6개월)</ThemedText>
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
          </View>
          
          {/* 금리 데이터 관리 영역 */}
          <View style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
              <ThemedText style={styles.categoryTitle}>💰 금리 데이터 관리</ThemedText>
              <View style={styles.categoryLine} />
            </View>
            
            <View style={[styles.section, styles.interestRateSection]}>
              <ThemedText style={styles.sectionTitle}>📊 한국은행 기준금리</ThemedText>
              <ThemedText style={styles.sectionDescription}>
                한국은행 ECOS API에서 기준금리 데이터를 수동으로 가져옵니다.
              </ThemedText>
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.interestRateButton,
                  (isInterestRateLoading || isLoading) && styles.disabledButton
                ]}
                onPress={fetchMonthlyInterestRates}
                disabled={isInterestRateLoading || isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isInterestRateLoading ? '📊 가져오는 중...' : '📅 1달 금리 데이터 가져오기'}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.interestRateButtonSecondary,
                  (isInterestRateLoading || isLoading) && styles.disabledButton
                ]}
                onPress={fetchYearlyInterestRates}
                disabled={isInterestRateLoading || isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isInterestRateLoading ? '📊 가져오는 중...' : '📅 1년 금리 데이터 가져오기'}
                </ThemedText>
              </TouchableOpacity>
              
              {isInterestRateLoading && (
                <View style={styles.loadingNotice}>
                  <ThemedText style={styles.loadingNoticeText}>
                    ⏱️ 한국은행 ECOS API에서 금리 데이터를 가져오고 있습니다. 중복된 데이터는 자동으로 건너뛰므로 시간이 절약됩니다.
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* 소비자물가지수 데이터 관리 영역 */}
          <View style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
              <ThemedText style={styles.categoryTitle}>📊 소비자물가지수 데이터 관리</ThemedText>
              <View style={styles.categoryLine} />
            </View>
            
            <View style={[styles.section, styles.cpiSection]}>
              <ThemedText style={styles.sectionTitle}>📈 소비자물가지수 (CPI)</ThemedText>
              <ThemedText style={styles.sectionDescription}>
                한국은행 ECOS API에서 소비자물가지수 데이터를 수동으로 가져옵니다. (통계표: 901Y009)
              </ThemedText>
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.cpiButton,
                  (isCPILoading || isLoading) && styles.disabledButton
                ]}
                onPress={refreshCPIData}
                disabled={isCPILoading || isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isCPILoading ? '🔄 새로고침 중...' : '🔄 CPI 데이터 강제 새로고침'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.cpiButton,
                  (isCPILoading || isLoading) && styles.disabledButton
                ]}
                onPress={fetchYearlyCPIData}
                disabled={isCPILoading || isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isCPILoading ? '📊 가져오는 중...' : '📅 1년 CPI 데이터 가져오기'}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.cpiButtonSecondary,
                  (isCPILoading || isLoading) && styles.disabledButton
                ]}
                onPress={fetch2YearsCPIData}
                disabled={isCPILoading || isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isCPILoading ? '📊 가져오는 중...' : '📅 2년 CPI 데이터 가져오기'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.cpiSchedulerButton,
                  (isCPILoading || isLoading) && styles.disabledButton
                ]}
                onPress={runCPIScheduler}
                disabled={isCPILoading || isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isCPILoading ? '⚙️ 실행 중...' : '⚙️ CPI 스케줄러 수동 실행'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.secondaryButton,
                  (isCPILoading || isLoading) && styles.disabledButton
                ]}
                onPress={debugCPIData}
                disabled={isCPILoading || isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isCPILoading ? '🔍 확인 중...' : '🔍 CPI 데이터 상태 확인'}
                </ThemedText>
              </TouchableOpacity>
              
              {isCPILoading && (
                <View style={styles.loadingNotice}>
                  <ThemedText style={styles.loadingNoticeText}>
                    ⏱️ 한국은행 ECOS API에서 소비자물가지수 데이터를 가져오고 있습니다. 월별 데이터이므로 금리보다 처리 시간이 짧습니다.
                  </ThemedText>
                </View>
              )}

              <View style={styles.cpiInfoContainer}>
                <ThemedText style={styles.cpiInfoTitle}>📋 CPI 데이터 정보</ThemedText>
                <ThemedText style={styles.cpiInfoText}>
                  • 통계표 코드: 901Y009 (소비자물가지수){'\n'}
                  • 데이터 주기: 월별 (M){'\n'}
                  • 통계항목: 총지수(0) 및 12개 세부 항목{'\n'}
                  • 자동 계산: 월별/연간 변화율 포함{'\n'}
                  • 스케줄링: 매월 1일 오후 2시 자동 업데이트
                </ThemedText>
              </View>
            </View>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0066CC',
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 30,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  logoutButtonMain: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 20,
  },
  logoutButtonMainText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      web: {
        width: '100%',
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 24,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4A90E2',
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
    fontWeight: '700',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
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
  interestRateButton: {
    backgroundColor: '#FF8C42',
  },
  interestRateButtonSecondary: {
    backgroundColor: '#FF7A2B',
  },
  exchangeRateButton: {
    backgroundColor: '#4A90E2', // 환율 섹션 주요 버튼 색상 (밝은 블루)
  },
  exchangeRateButtonSecondary: {
    backgroundColor: '#357ABD', // 조금 더 진한 파란색
  },
  // 메인 컨테이너 (가로 배치용)
  mainContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  mainContainerMobile: {
    flexDirection: 'column',
    gap: 20,
  },
  // 카테고리 구분 스타일
  categoryContainer: {
    flex: 1,
    marginBottom: 30,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginRight: 10,
  },
  categoryLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
  },
  exchangeRateSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    backgroundColor: '#F0F6FF',
  },
  interestRateSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
    backgroundColor: '#FFF7F0',
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
  // 소비자물가지수 관련 스타일 (생동감 있는 민트 그린)
  cpiSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#20B2AA',
    backgroundColor: '#F0FDFF',
  },
  cpiButton: {
    backgroundColor: '#20B2AA',
  },
  cpiButtonSecondary: {
    backgroundColor: '#17A2B8',
  },
  cpiSchedulerButton: {
    backgroundColor: '#138496',
  },
  cpiInfoContainer: {
    backgroundColor: '#E8F8F9',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#B8E6E8',
  },
  cpiInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D7377',
    marginBottom: 8,
  },
  cpiInfoText: {
    fontSize: 14,
    color: '#155A5E',
    lineHeight: 20,
  },
}); 