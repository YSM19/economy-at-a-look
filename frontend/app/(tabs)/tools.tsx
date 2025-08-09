import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { economicIndexApi, exchangeRateHistoryApi } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../components/ToastProvider';
import { ConfirmationModal } from '../../components/ConfirmationModal';


interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route?: string;
  onPress?: () => void;
}

export default function ToolsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [activeTab, setActiveTab] = useState(
    typeof params.tab === 'string' ? params.tab : 'calculator'
  );

  // 환율 계산기 관련 상태
  const [krwAmount, setKrwAmount] = useState('');
  const [foreignAmount, setForeignAmount] = useState('');
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [customRate, setCustomRate] = useState('');
  const [isCustomRate, setIsCustomRate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCalculatingFromKRW, setIsCalculatingFromKRW] = useState(true);
  const [isKRWFirst, setIsKRWFirst] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isMemoModalVisible, setIsMemoModalVisible] = useState(false);
  const [memo, setMemo] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('usa');
  
  // 환율 저장 기록 관련 상태
  const [histories, setHistories] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingMemo, setEditingMemo] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isMemoEditModalVisible, setIsMemoEditModalVisible] = useState(false);
  const [isExchangeRateModalVisible, setIsExchangeRateModalVisible] = useState(false);
  const [editingExchangeRate, setEditingExchangeRate] = useState<any>(null);
  
  // 통일된 모달 상태들
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [deleteAllConfirmModalVisible, setDeleteAllConfirmModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  

  
  const { showToast } = useToast();



  // params.tab이 변경되면 activeTab도 업데이트
  useEffect(() => {
    if (params.tab && typeof params.tab === 'string') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  // 환율 계산기 초기화
  useEffect(() => {
    if (activeTab === 'calculator') {
      fetchExchangeRate();
      checkLoginStatus();
    }
  }, [activeTab, selectedCountry]);

  // 환율 저장 기록 초기화
  useEffect(() => {
    if (activeTab === 'exchange-history') {
      loadExchangeRateHistory();
    }
  }, [activeTab]);



  // 환율 계산기 관련 함수들
  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error);
      setIsLoggedIn(false);
    }
  };

  const fetchExchangeRate = async () => {
    setLoading(true);
    
    try {
      const response = await economicIndexApi.getExchangeRate();
      
      if (response.data && response.data.success && response.data.data) {
        const exchangeData = response.data.data;
        let rate = null;
        
        switch(selectedCountry) {
          case 'usa':
            rate = exchangeData.usdRate;
            break;
          case 'japan':
            rate = exchangeData.jpyRate;
            break;
          case 'china':
            rate = exchangeData.cnyRate;
            break;
          case 'europe':
            rate = exchangeData.eurRate;
            break;
          default:
            rate = exchangeData.usdRate;
        }
        
        setCurrentRate(rate);
      }
    } catch (error) {
      console.error('환율 데이터 가져오기 실패:', error);
      // 기본값 설정
      const defaultRates = {
        usa: 1350,
        japan: 950,
        china: 190,
        europe: 1400
      };
      setCurrentRate(defaultRates[selectedCountry as keyof typeof defaultRates] || 1350);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencyInfo = () => {
    switch(selectedCountry) {
      case 'usa':
        return { name: '달러', symbol: 'USD', unit: '달러' };
      case 'japan':
        return { name: '엔화', symbol: 'JPY', unit: '엔' };
      case 'china':
        return { name: '위안', symbol: 'CNY', unit: '위안' };
      case 'europe':
        return { name: '유로', symbol: 'EUR', unit: '유로' };
      default:
        return { name: '달러', symbol: 'USD', unit: '달러' };
    }
  };

  const currencyInfo = getCurrencyInfo();

  const calculateFromKRW = (amount: string) => {
    const rate = getEffectiveRate();
    if (!rate || !amount) {
      setForeignAmount('');
      return;
    }
    
    const numAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numAmount)) {
      setForeignAmount('');
      return;
    }
    
    let result;
    if (selectedCountry === 'japan') {
      // 일본 엔은 100엔 단위로 환율이 표시되므로
      result = (numAmount / rate) * 100;
    } else {
      result = numAmount / rate;
    }
    
    setForeignAmount(formatNumber(result.toFixed(2)));
  };

  const calculateFromForeign = (amount: string) => {
    const rate = getEffectiveRate();
    if (!rate || !amount) {
      setKrwAmount('');
      return;
    }
    
    const numAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numAmount)) {
      setKrwAmount('');
      return;
    }
    
    let result;
    if (selectedCountry === 'japan') {
      // 일본 엔은 100엔 단위로 환율이 표시되므로
      result = (numAmount * rate) / 100;
    } else {
      result = numAmount * rate;
    }
    
    setKrwAmount(formatNumber(Math.round(result).toString()));
  };

  // 현재 사용할 환율을 반환하는 함수
  const getEffectiveRate = (): number | null => {
    if (isCustomRate && customRate) {
      const rate = parseFloat(customRate.replace(/,/g, ''));
      return isNaN(rate) ? null : rate;
    }
    return currentRate;
  };

  // 커스텀 환율 토글
  const toggleCustomRate = () => {
    setIsCustomRate(!isCustomRate);
    if (!isCustomRate && currentRate) {
      setCustomRate(currentRate.toString());
    }
    // 현재 입력된 값들을 다시 계산
    if (krwAmount) {
      calculateFromKRW(krwAmount);
    } else if (foreignAmount) {
      calculateFromForeign(foreignAmount);
    }
  };

  // 커스텀 환율 변경
  const handleCustomRateChange = (text: string) => {
    const cleanText = text.replace(/[^0-9.]/g, '');
    setCustomRate(cleanText);
    
    // 현재 입력된 값들을 다시 계산
    if (krwAmount) {
      calculateFromKRW(krwAmount);
    } else if (foreignAmount) {
      calculateFromForeign(foreignAmount);
    }
  };

  // 실시간 환율로 되돌리기
  const resetToCurrentRate = () => {
    setIsCustomRate(false);
    setCustomRate('');
    // 현재 입력된 값들을 다시 계산
    if (krwAmount) {
      calculateFromKRW(krwAmount);
    } else if (foreignAmount) {
      calculateFromForeign(foreignAmount);
    }
  };

  const formatNumber = (value: string) => {
    if (!value) return '';
    // 콤마 제거 후 숫자만 추출
    const numericValue = value.replace(/[^0-9.]/g, '');
    if (!numericValue) return '';
    
    // 소수점 처리
    const parts = numericValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // 정수 부분에 콤마 추가
    const formattedInteger = parseInt(integerPart).toLocaleString();
    
    // 소수점이 있으면 추가
    if (decimalPart !== undefined) {
      return `${formattedInteger}.${decimalPart}`;
    }
    
    return formattedInteger;
  };

  const handleKRWChange = (text: string) => {
    // 숫자와 콤마만 허용
    const cleanText = text.replace(/[^0-9]/g, '');
    if (!cleanText) {
      setKrwAmount('');
      setForeignAmount('');
      return;
    }
    
    const formattedText = formatNumber(cleanText);
    setKrwAmount(formattedText);
    setIsCalculatingFromKRW(true);
    calculateFromKRW(formattedText);
  };

  const handleForeignChange = (text: string) => {
    // 숫자, 소수점만 허용
    const cleanText = text.replace(/[^0-9.]/g, '');
    if (!cleanText) {
      setForeignAmount('');
      setKrwAmount('');
      return;
    }
    
    // 소수점은 하나만 허용
    const dotCount = (cleanText.match(/\./g) || []).length;
    if (dotCount > 1) return;
    
    const formattedText = formatNumber(cleanText);
    setForeignAmount(formattedText);
    setIsCalculatingFromKRW(false);
    calculateFromForeign(formattedText);
  };

  // 통화 정보를 동적으로 반환하는 함수
  const getFirstCurrencyInfo = () => {
    if (isKRWFirst) {
      return {
        name: '한국 원화',
        symbol: 'KRW',
        unit: '원',
        icon: 'currency-krw',
        color: '#4CAF50'
      };
    } else {
      return currencyInfo;
    }
  };

  const getSecondCurrencyInfo = () => {
    if (isKRWFirst) {
      return currencyInfo;
    } else {
      return {
        name: '한국 원화',
        symbol: 'KRW',
        unit: '원',
        icon: 'currency-krw',
        color: '#4CAF50'
      };
    }
  };

  const swapCurrencies = () => {
    // 현재 첫 번째 칸의 값을 저장
    const currentFirstValue = isKRWFirst ? krwAmount : foreignAmount;
    const wasKRWFirst = isKRWFirst; // 변경 전 상태 저장
    
    // 통화 순서만 바꾸기
    setIsKRWFirst(!isKRWFirst);
    
    if (currentFirstValue) {
      setTimeout(() => {
        if (wasKRWFirst) {
          // 원화가 첫 번째였음 → 외화가 첫 번째로 바뀜
          // 현재 첫 번째 칸의 값을 외화로 설정하고, 원화 계산
          setForeignAmount(currentFirstValue);
          calculateFromForeign(currentFirstValue);
        } else {
          // 외화가 첫 번째였음 → 원화가 첫 번째로 바뀜  
          // 현재 첫 번째 칸의 값을 원화로 설정하고, 외화 계산
          setKrwAmount(currentFirstValue);
          calculateFromKRW(currentFirstValue);
        }
      }, 0);
    }
  };

  const clearAll = () => {
    setKrwAmount('');
    setForeignAmount('');
  };

  const saveExchangeRateHistory = async () => {
    if (!isLoggedIn) {
      setIsLoginModalVisible(true);
      return;
    }

    const rate = getEffectiveRate();
    const krw = parseFloat(krwAmount.replace(/,/g, ''));
    const foreign = parseFloat(foreignAmount.replace(/,/g, ''));

    if (!rate || isNaN(krw) || isNaN(foreign) || krw === 0 || foreign === 0) {
      showToast('저장할 금액을 입력해주세요.', 'info');
      return;
    }

    // 메모 입력 모달 열기
    setMemo('');
    setIsMemoModalVisible(true);
  };

  const confirmSaveWithMemo = async () => {
    setIsSaving(true);
    setIsMemoModalVisible(false);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoginModalVisible(true);
        return;
      }

      const rate = getEffectiveRate();
      const krw = parseFloat(krwAmount.replace(/,/g, ''));
      const foreign = parseFloat(foreignAmount.replace(/,/g, ''));
      const currencyInfo = getCurrencyInfo();
      
      const requestData = {
        currencyCode: currencyInfo.symbol,
        currencyName: currencyInfo.name,
        exchangeRate: rate,
        krwAmount: krw,
        foreignAmount: foreign,
        memo: memo || '',
        isKrwFirst: isKRWFirst
      };

      console.log('저장하는 데이터:', requestData);
      console.log('isKRWFirst 값:', isKRWFirst);

      const response = await exchangeRateHistoryApi.saveHistory(requestData, token);

      if (response.data.success) {
        showToast('환율이 저장되었습니다!', 'success');
        setMemo('');
      } else {
        showToast(response.data.message || '저장에 실패했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('환율 저장 실패:', error);
      if (error?.response) {
        // 서버에서 응답을 받았지만 오류 상태 코드인 경우
        const errorMessage = error.response.data?.message || '서버 오류가 발생했습니다.';
        showToast(errorMessage, 'error');
      } else if (error?.request) {
        // 요청을 보냈지만 응답을 받지 못한 경우 (네트워크 오류)
        showToast('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.', 'error');
      } else {
        // 요청 설정 중 오류가 발생한 경우
        showToast('요청 설정 오류가 발생했습니다.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 환율 저장 기록 관련 함수들
  const loadExchangeRateHistory = async () => {
    if (!historyLoading) setRefreshing(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoginModalVisible(true);
        return;
      }
      
      const response = await exchangeRateHistoryApi.getMyHistory(token);

      if (response.data.success) {
        console.log('불러온 기록 데이터:', response.data.data);
        setHistories(response.data.data || []);
      } else {
        showToast(response.data.message || '기록을 불러오는데 실패했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('환율 기록 로드 실패:', error);
      if (error?.request) {
        showToast('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.', 'error');
      } else {
        showToast('기록을 불러오는 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatHistoryNumber = (value: number) => {
    return value.toLocaleString();
  };

  const getCurrencyIcon = (currencyCode: string) => {
    switch(currencyCode) {
      case 'USD': return 'currency-usd';
      case 'JPY': return 'currency-jpy';
      case 'EUR': return 'currency-eur';
      case 'CNY': return 'cash';
      default: return 'cash';
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    switch(currencyCode) {
      case 'USD': return '$';
      case 'JPY': return '¥';
      case 'EUR': return '€';
      case 'CNY': return '¥';
      default: return currencyCode;
    }
  };

  const handleEditMemo = (history: any) => {
    setEditingId(history.id);
    setEditingMemo(history.memo || '');
    setIsMemoEditModalVisible(true);
  };

  const updateMemo = async () => {
    if (!editingId) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoginModalVisible(true);
        return;
      }

      const response = await exchangeRateHistoryApi.updateMemo(editingId, editingMemo, token);

      if (response.data.success) {
        showToast('메모가 업데이트되었습니다.', 'success');
        setIsMemoEditModalVisible(false);
        setEditingId(null);
        setEditingMemo('');
        loadExchangeRateHistory(); // 목록 새로고침
      } else {
        showToast(response.data.message || '메모 업데이트에 실패했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('메모 업데이트 실패:', error);
      if (error?.request) {
        showToast('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.', 'error');
      } else {
        showToast('메모 업데이트 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const handleEditExchangeRate = (history: any) => {
    setEditingExchangeRate({
      ...history,
      exchangeRate: history.exchangeRate.toString(),
      krwAmount: formatHistoryNumber(history.krwAmount),
      foreignAmount: formatHistoryNumber(history.foreignAmount)
    });
    setIsExchangeRateModalVisible(true);
  };

  const updateExchangeRate = async () => {
    if (!editingExchangeRate) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoginModalVisible(true);
        return;
      }

      const updateData = {
        exchangeRate: parseFloat(editingExchangeRate.exchangeRate),
        krwAmount: parseFloat(editingExchangeRate.krwAmount.replace(/,/g, '')),
        foreignAmount: parseFloat(editingExchangeRate.foreignAmount.replace(/,/g, '')),
        memo: editingExchangeRate.memo,
      };

      // 유효성 검사
      if (isNaN(updateData.exchangeRate) || updateData.exchangeRate <= 0) {
        showToast('유효한 환율을 입력해주세요.', 'error');
        return;
      }
      if (isNaN(updateData.krwAmount) || updateData.krwAmount <= 0) {
        showToast('유효한 원화 금액을 입력해주세요.', 'error');
        return;
      }
      if (isNaN(updateData.foreignAmount) || updateData.foreignAmount <= 0) {
        showToast('유효한 외화 금액을 입력해주세요.', 'error');
        return;
      }

      const response = await exchangeRateHistoryApi.updateExchangeRate(
        editingExchangeRate.id, 
        updateData, 
        token
      );

      if (response.data.success) {
        showToast('환율 정보가 업데이트되었습니다.', 'success');
        setIsExchangeRateModalVisible(false);
        setEditingExchangeRate(null);
        loadExchangeRateHistory(); // 목록 새로고침
      } else {
        showToast(response.data.message || '환율 정보 업데이트에 실패했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('환율 정보 업데이트 실패:', error);
      if (error?.request) {
        showToast('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.', 'error');
      } else {
        showToast('환율 정보 업데이트 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const deleteHistory = async (historyId: number) => {
    setDeleteTargetId(historyId);
    setDeleteConfirmModalVisible(true);
  };

  const confirmDeleteHistory = async () => {
    if (!deleteTargetId) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setModalTitle('오류');
        setModalMessage('로그인이 필요합니다.');
        setErrorModalVisible(true);
        return;
      }
      
      const response = await exchangeRateHistoryApi.deleteHistory(deleteTargetId, token);
      
      if (response.data.success) {
        loadExchangeRateHistory(); // 목록 새로고침
        setModalTitle('성공');
        setModalMessage('환율 기록이 삭제되었습니다.');
        setSuccessModalVisible(true);
      } else {
        setModalTitle('오류');
        setModalMessage(response.data.message || '환율 기록 삭제에 실패했습니다.');
        setErrorModalVisible(true);
      }
    } catch (error: any) {
      console.error('환율 기록 삭제 실패:', error);
      setModalTitle('오류');
      if (error?.request) {
        setModalMessage('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      } else {
        setModalMessage('환율 기록 삭제 중 오류가 발생했습니다.');
      }
      setErrorModalVisible(true);
    }
    
    setDeleteConfirmModalVisible(false);
    setDeleteTargetId(null);
  };

  const confirmDeleteAllHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setModalTitle('오류');
        setModalMessage('로그인이 필요합니다.');
        setErrorModalVisible(true);
        return;
      }
      
      const response = await exchangeRateHistoryApi.deleteAllHistory(token);
      
      if (response.data && response.data.success) {
        setHistories([]);
        setModalTitle('성공');
        setModalMessage('모든 환율 기록이 삭제되었습니다.');
        setSuccessModalVisible(true);
      } else {
        setModalTitle('오류');
        setModalMessage('모든 기록 삭제에 실패했습니다.');
        setErrorModalVisible(true);
      }
    } catch (error) {
      console.error('모든 기록 삭제 오류:', error);
      setModalTitle('오류');
      setModalMessage('삭제 중 오류가 발생했습니다.');
      setErrorModalVisible(true);
    }
    
    setDeleteAllConfirmModalVisible(false);
  };

  const toolItems: ToolItem[] = [
    {
      id: 'calculator',
      title: '환율 계산기',
      description: '실시간 환율로 금액 변환',
      icon: 'calculator',
      color: '#FF6B6B',
      onPress: () => setActiveTab('calculator')
    },
    {
      id: 'exchange-history',
      title: '환율 기록',
      description: '저장된 환율 기록 관리',
      icon: 'history',
      color: '#9C27B0',
      onPress: () => setActiveTab('exchange-history')
    },
    {
      id: 'recommendations',
      title: '투자 추천',
      description: '현재 경제 상황 기반 투자 조언',
      icon: 'trending-up',
      color: '#4ECDC4',
      onPress: () => setActiveTab('recommendations')
    },
    {
      id: 'news',
      title: '경제 뉴스',
      description: '최신 경제 뉴스 및 분석 (출시 예정)',
      icon: 'newspaper',
      color: '#45B7D1',
      onPress: () => setActiveTab('news')
    },
    {
      id: 'notifications',
      title: '알림 설정',
      description: '환율 변동 알림 관리',
      icon: 'bell',
      color: '#96CEB4',
      onPress: () => setActiveTab('notifications')
    },
    {
      id: 'glossary',
      title: '경제 용어',
      description: '경제 용어 사전',
      icon: 'book-open',
      color: '#FFEAA7',
      onPress: () => setActiveTab('glossary')
    },
    {
      id: 'settings',
      title: '설정',
      description: '앱 설정 및 개인화',
      icon: 'cog',
      color: '#DDA0DD',
      onPress: () => setActiveTab('settings')
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'calculator':
        return (
          <View style={styles.tabContent}>
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>환율 계산기</ThemedText>
              
              {loading ? (
                <View style={styles.calculatorPlaceholder}>
                  <ThemedText style={styles.calculatorPlaceholderText}>환율 정보를 불러오는 중...</ThemedText>
                </View>
              ) : (
                <>
                  {/* 국가 선택 */}
                  <View style={styles.countrySelector}>
                    <TouchableOpacity 
                      style={[styles.countryButton, selectedCountry === 'usa' && styles.activeCountryButton]}
                      onPress={() => setSelectedCountry('usa')}
                    >
                      <ThemedText style={[styles.countryText, selectedCountry === 'usa' && styles.activeCountryText]}>미국</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.countryButton, selectedCountry === 'japan' && styles.activeCountryButton]}
                      onPress={() => setSelectedCountry('japan')}
                    >
                      <ThemedText style={[styles.countryText, selectedCountry === 'japan' && styles.activeCountryText]}>일본</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.countryButton, selectedCountry === 'china' && styles.activeCountryButton]}
                      onPress={() => setSelectedCountry('china')}
                    >
                      <ThemedText style={[styles.countryText, selectedCountry === 'china' && styles.activeCountryText]}>중국</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.countryButton, selectedCountry === 'europe' && styles.activeCountryButton]}
                      onPress={() => setSelectedCountry('europe')}
                    >
                      <ThemedText style={[styles.countryText, selectedCountry === 'europe' && styles.activeCountryText]}>유럽</ThemedText>
                    </TouchableOpacity>
                  </View>

                  {/* 현재 환율 표시 */}
                  <View style={styles.rateDisplay}>
                    <TouchableOpacity onPress={toggleCustomRate} style={styles.rateTextContainer}>
                      <ThemedText style={styles.rateText}>
                        현재 환율: 1 {currencyInfo.symbol} = {getEffectiveRate()?.toLocaleString()}원
                      </ThemedText>
                      <MaterialCommunityIcons 
                        name={isCustomRate ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color="#666" 
                        style={styles.chevronIcon}
                      />
                    </TouchableOpacity>
                    
                    {isCustomRate && (
                      <View style={styles.customRateContainer}>
                        <TextInput
                          style={styles.customRateInput}
                          value={customRate}
                          onChangeText={handleCustomRateChange}
                          placeholder="환율 입력"
                          keyboardType="numeric"
                          placeholderTextColor="#999"
                        />
                        <TouchableOpacity style={styles.resetButton} onPress={resetToCurrentRate}>
                          <MaterialCommunityIcons name="refresh" size={16} color="#2196F3" />
                          <ThemedText style={styles.resetButtonText}>초기화</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* 첫 번째 통화 입력 */}
                  <View style={styles.inputContainer}>
                    <View style={styles.inputHeader}>
                      <MaterialCommunityIcons 
                        name={isKRWFirst ? "currency-krw" : (
                          selectedCountry === 'usa' ? 'currency-usd' : 
                          selectedCountry === 'europe' ? 'currency-eur' : 
                          selectedCountry === 'japan' ? 'currency-jpy' : 'cash'
                        )}
                        size={20} 
                        color={isKRWFirst ? "#4CAF50" : "#FF9800"}
                      />
                      <ThemedText style={styles.currencyLabel}>
                        {getFirstCurrencyInfo().name} ({getFirstCurrencyInfo().symbol})
                      </ThemedText>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={(isKRWFirst ? krwAmount : foreignAmount) ? `${isKRWFirst ? krwAmount : foreignAmount} ${getFirstCurrencyInfo().unit}` : ''}
                      onChangeText={isKRWFirst ? handleKRWChange : handleForeignChange}
                      placeholder="금액을 입력하세요"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* 교환 버튼 */}
                  <View style={styles.swapContainer}>
                    <TouchableOpacity style={styles.swapButton} onPress={swapCurrencies}>
                      <MaterialCommunityIcons name="swap-vertical" size={24} color="#2196F3" />
                    </TouchableOpacity>
                  </View>

                  {/* 두 번째 통화 입력 */}
                  <View style={styles.inputContainer}>
                    <View style={styles.inputHeader}>
                      <MaterialCommunityIcons 
                        name={!isKRWFirst ? "currency-krw" : (
                          selectedCountry === 'usa' ? 'currency-usd' : 
                          selectedCountry === 'europe' ? 'currency-eur' : 
                          selectedCountry === 'japan' ? 'currency-jpy' : 'cash'
                        )}
                        size={20} 
                        color={!isKRWFirst ? "#4CAF50" : "#FF9800"}
                      />
                      <ThemedText style={styles.currencyLabel}>
                        {getSecondCurrencyInfo().name} ({getSecondCurrencyInfo().symbol})
                      </ThemedText>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={(isKRWFirst ? foreignAmount : krwAmount) ? `${isKRWFirst ? foreignAmount : krwAmount} ${getSecondCurrencyInfo().unit}` : ''}
                      onChangeText={isKRWFirst ? handleForeignChange : handleKRWChange}
                      placeholder="금액을 입력하세요"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* 액션 버튼들 */}
                  <View style={styles.actionContainer}>
                    <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
                      <MaterialCommunityIcons name="refresh" size={16} color="#666" />
                      <ThemedText style={styles.clearButtonText}>초기화</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={saveExchangeRateHistory} disabled={isSaving}>
                      <MaterialCommunityIcons name="content-save-edit-outline" size={22} color="#fff" />
                      <ThemedText style={styles.saveButtonText}>
                        {isSaving ? '저장 중...' : '환율 저장'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {/* 안내 메시지 */}
                  <View style={styles.infoContainer}>
                    <ThemedText style={styles.infoText}>
                      💡 실시간 환율을 기반으로 계산됩니다. 커스텀 환율을 설정할 수도 있습니다.
                    </ThemedText>
                  </View>
                </>
              )}
            </ThemedView>
          </View>
        );
      
      case 'exchange-history':
        return (
          <View style={styles.tabContent}>
            {historyLoading && !refreshing ? (
              <View style={styles.calculatorPlaceholder}>
                <ThemedText style={styles.calculatorPlaceholderText}>기록을 불러오는 중...</ThemedText>
              </View>
            ) : (
              <ScrollView 
                style={styles.historyContainer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={loadExchangeRateHistory}
                    colors={['#2196F3']}
                    tintColor="#2196F3"
                  />
                }
                showsVerticalScrollIndicator={false}
              >
                {histories.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="database-off" size={48} color="#ccc" />
                    <ThemedText style={styles.emptyText}>저장된 환율 기록이 없습니다.</ThemedText>
                    <ThemedText style={styles.emptySubtext}>
                      환율 계산기에서 결과를 저장해보세요!
                    </ThemedText>
                  </View>
                                  ) : (
                    <>
                      {histories.length > 0 && (
                        <View style={styles.deleteAllContainer}>
                          <TouchableOpacity 
                            style={styles.deleteAllButton}
                            onPress={() => {
                              setDeleteAllConfirmModalVisible(true);
                            }}
                          >
                            <MaterialCommunityIcons name="delete-sweep" size={16} color="#fff" />
                            <ThemedText style={styles.deleteAllText}>모두 삭제</ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}
                      {histories.map((history) => (
                      <View key={history.id} style={styles.historyCard}>
                        {/* 상단 헤더 - 통화, 환율, 날짜, 버튼 */}
                        <View style={styles.compactHeader}>
                          {/* 왼쪽: 통화 정보 + 환율 */}
                          <View style={styles.leftSection}>
                            <View style={styles.currencyRow}>
                              <MaterialCommunityIcons 
                                name={getCurrencyIcon(history.currencyCode)} 
                                size={18} 
                                color="#4CAF50" 
                              />
                              <ThemedText style={styles.currencyText}>
                                {history.currencyName} ({history.currencyCode})
                              </ThemedText>
                            </View>
                            <ThemedText style={styles.rateText}>
                              1 {history.currencyCode} = {formatHistoryNumber(history.exchangeRate)}원
                            </ThemedText>
                          </View>

                          {/* 오른쪽: 날짜 + 버튼 */}
                          <View style={styles.rightSection}>
                            <ThemedText style={styles.dateText} numberOfLines={1} ellipsizeMode="tail">
                              {formatDate(history.createdAt)}
                            </ThemedText>
                            <View style={styles.topRightButtons}>
                              <TouchableOpacity 
                                style={styles.editButtonTop}
                                onPress={() => handleEditExchangeRate(history)}
                              >
                                <MaterialCommunityIcons name="pencil" size={18} color="#FF9800" />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={styles.deleteButtonTop}
                                onPress={() => deleteHistory(history.id)}
                              >
                                <MaterialCommunityIcons name="delete-outline" size={18} color="#ff5252" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>

                        {/* 금액 정보 */}
                        <View style={styles.amountSection}>
                          {/* 첫 번째 통화 */}
                          <View style={styles.amountItem}>
                            <ThemedText style={styles.amountLabel}>
                              {(history.isKrwFirst !== false) ? '원화' : history.currencyName}
                            </ThemedText>
                            <ThemedText style={styles.amountValue}>
                              {(history.isKrwFirst !== false) 
                                ? `₩ ${formatHistoryNumber(history.krwAmount)}`
                                : `${getCurrencySymbol(history.currencyCode)} ${formatHistoryNumber(history.foreignAmount)}`
                              }
                            </ThemedText>
                          </View>
                          <View style={styles.exchangeIcon}>
                            <MaterialCommunityIcons name="arrow-right" size={24} color="#4CAF50" />
                          </View>
                          {/* 두 번째 통화 */}
                          <View style={styles.amountItem}>
                            <ThemedText style={styles.amountLabel}>
                              {(history.isKrwFirst !== false) ? history.currencyName : '원화'}
                            </ThemedText>
                            <ThemedText style={styles.amountValue}>
                              {(history.isKrwFirst !== false) 
                                ? `${getCurrencySymbol(history.currencyCode)} ${formatHistoryNumber(history.foreignAmount)}`
                                : `₩ ${formatHistoryNumber(history.krwAmount)}`
                              }
                            </ThemedText>
                          </View>
                        </View>

                        {/* 메모 섹션 (인라인) */}
                        {history.memo && (
                          <View style={styles.memoRow}>
                            <MaterialCommunityIcons name="note-text-outline" size={14} color="#999" />
                            <ThemedText style={styles.memoText} numberOfLines={2} ellipsizeMode="tail">
                              {history.memo}
                            </ThemedText>
                          </View>
                        )}
                                              </View>
                      ))}
                    </>
                  )}
              </ScrollView>
            )}
          </View>
        );
      
      case 'recommendations':
        return (
          <View style={styles.tabContent}>
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>투자 추천 (출시 예정)</ThemedText>
              <View style={styles.comingSoonContainer}>
                <MaterialCommunityIcons name="trending-up" size={64} color="#4CAF50" style={styles.comingSoonIcon} />
                <ThemedText style={styles.comingSoonTitle}>투자 추천 서비스</ThemedText>
                <ThemedText style={styles.comingSoonDescription}>
                  경제 지표를 기반으로 한 투자 추천 서비스가 출시 예정입니다.
                </ThemedText>
                <ThemedText style={styles.comingSoonSubDescription}>
                  환율, 물가, 경제 심리 지수 등을 분석하여 투자 방향을 제시합니다.
                </ThemedText>
              </View>
            </ThemedView>
          </View>
        );
      
      case 'news':
        return (
          <View style={styles.tabContent}>
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>경제 뉴스 (출시 예정)</ThemedText>
              <View style={styles.comingSoonContainer}>
                <MaterialCommunityIcons name="newspaper" size={64} color="#45B7D1" style={styles.comingSoonIcon} />
                <ThemedText style={styles.comingSoonTitle}>경제 뉴스 서비스</ThemedText>
                <ThemedText style={styles.comingSoonDescription}>
                  경제 뉴스와 분석을 제공하는 서비스가 출시 예정입니다.
                </ThemedText>
                <ThemedText style={styles.comingSoonSubDescription}>
                  경제 뉴스, 분석, 투자 정보를 한 곳에서 확인하실 수 있습니다.
                </ThemedText>
              </View>
            </ThemedView>
          </View>
        );
      
      case 'notifications':
        return (
          <View style={styles.tabContent}>
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>알림 설정</ThemedText>
              <View style={styles.settingContainer}>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <ThemedText style={styles.settingTitle}>환율 변동 알림</ThemedText>
                    <ThemedText style={styles.settingDescription}>
                      환율이 설정한 범위를 벗어날 때 알림
                    </ThemedText>
                  </View>
                  <TouchableOpacity style={styles.toggleButton}>
                    <MaterialCommunityIcons name="toggle-switch" size={24} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <ThemedText style={styles.settingTitle}>금리 변동 알림</ThemedText>
                    <ThemedText style={styles.settingDescription}>
                      기준금리 변경 시 알림
                    </ThemedText>
                  </View>
                  <TouchableOpacity style={styles.toggleButton}>
                    <MaterialCommunityIcons name="toggle-switch-off" size={24} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <ThemedText style={styles.settingTitle}>경제 뉴스 알림</ThemedText>
                    <ThemedText style={styles.settingDescription}>
                      주요 경제 뉴스 업데이트 알림
                    </ThemedText>
                  </View>
                  <TouchableOpacity style={styles.toggleButton}>
                    <MaterialCommunityIcons name="toggle-switch" size={24} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </ThemedView>
          </View>
        );
      
      case 'glossary':
        return (
          <View style={styles.tabContent}>
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>경제 용어 사전</ThemedText>
              <View style={styles.glossaryContainer}>
                <View style={styles.glossaryItem}>
                  <ThemedText style={styles.glossaryTerm}>기준금리</ThemedText>
                  <ThemedText style={styles.glossaryDefinition}>
                    한국은행이 금융기관에 자금을 대출할 때 적용하는 금리로, 시중 금리의 기준이 된다.
                  </ThemedText>
                </View>
                <View style={styles.glossaryItem}>
                  <ThemedText style={styles.glossaryTerm}>소비자물가지수(CPI)</ThemedText>
                  <ThemedText style={styles.glossaryDefinition}>
                    소비자가 일상생활에서 구매하는 상품과 서비스의 가격 변동을 측정하는 지표다.
                  </ThemedText>
                </View>
                <View style={styles.glossaryItem}>
                  <ThemedText style={styles.glossaryTerm}>환율</ThemedText>
                  <ThemedText style={styles.glossaryDefinition}>
                    한 나라의 통화를 다른 나라의 통화로 교환할 때의 비율을 말한다.
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
          </View>
        );
      
      case 'settings':
        return (
          <View style={styles.tabContent}>
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>설정</ThemedText>
              <View style={styles.settingContainer}>
                <TouchableOpacity style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <ThemedText style={styles.settingTitle}>개인정보 관리</ThemedText>
                    <ThemedText style={styles.settingDescription}>
                      계정 정보 및 개인정보 설정
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <ThemedText style={styles.settingTitle}>테마 설정</ThemedText>
                    <ThemedText style={styles.settingDescription}>
                      다크모드 및 테마 변경
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <ThemedText style={styles.settingTitle}>언어 설정</ThemedText>
                    <ThemedText style={styles.settingDescription}>
                      앱 언어 변경
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        );
      
      default:
        return null;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'calculator': return '계산기';
      case 'exchange-history': return '환율 기록';
      case 'recommendations': return '투자 추천';
      case 'news': return '경제 뉴스';
      case 'notifications': return '알림 설정';
      case 'glossary': return '경제 용어';
      case 'settings': return '설정';
      default: return '도구';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>{getTabTitle()}</ThemedText>
        <ThemedText style={styles.headerSubtitle}>유용한 경제 도구들</ThemedText>
      </View>

      {/* 도구 메뉴 */}
      <View style={styles.toolsMenu}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {toolItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.toolMenuItem,
                activeTab === item.id && styles.activeToolMenuItem
              ]}
              onPress={item.onPress}
            >
              <View style={[styles.toolMenuIcon, { backgroundColor: item.color }]}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color="#FFFFFF" />
              </View>
              <ThemedText style={[
                styles.toolMenuTitle,
                activeTab === item.id && styles.activeToolMenuTitle
              ]}>
                {item.title}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 컨텐츠 */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* 로그인 모달 */}
      <ConfirmationModal
        visible={isLoginModalVisible}
        title="로그인 필요"
        message="환율 기록 기능을 사용하려면 로그인이 필요합니다."
        confirmText="로그인하기"
        cancelText="취소"
        onConfirm={() => {
          setIsLoginModalVisible(false);
          router.push('/login');
        }}
        onCancel={() => setIsLoginModalVisible(false)}
      />

      {/* 메모 입력 모달 */}
      <Modal
        visible={isMemoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMemoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ThemedText style={styles.modalTitle}>메모 추가 (선택사항)</ThemedText>
            <TextInput
              style={styles.modalInput}
              value={memo}
              onChangeText={setMemo}
              placeholder="메모를 입력하세요"
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setIsMemoModalVisible(false)}
              >
                <ThemedText style={styles.modalCancelText}>취소</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton} 
                onPress={confirmSaveWithMemo}
              >
                <ThemedText style={styles.modalConfirmText}>저장</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 메모 편집 모달 */}
      <Modal
        visible={isMemoEditModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMemoEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ThemedText style={styles.modalTitle}>메모 편집</ThemedText>
            <TextInput
              style={styles.modalInput}
              value={editingMemo}
              onChangeText={setEditingMemo}
              placeholder="메모를 입력하세요"
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setIsMemoEditModalVisible(false)}
              >
                <ThemedText style={styles.modalCancelText}>취소</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton} 
                onPress={updateMemo}
              >
                <ThemedText style={styles.modalConfirmText}>수정</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 통일된 모달들 */}
      <ConfirmationModal
        visible={deleteConfirmModalVisible}
        title="기록 삭제"
        message="이 환율 기록을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        onConfirm={confirmDeleteHistory}
        onCancel={() => setDeleteConfirmModalVisible(false)}
      />

      <ConfirmationModal
        visible={deleteAllConfirmModalVisible}
        title="모든 기록 삭제"
        message="저장된 모든 환율 기록을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        onConfirm={confirmDeleteAllHistory}
        onCancel={() => setDeleteAllConfirmModalVisible(false)}
      />

      <ConfirmationModal
        visible={errorModalVisible}
        title={modalTitle}
        message={modalMessage}
        confirmText="확인"
        onConfirm={() => setErrorModalVisible(false)}
        onCancel={() => setErrorModalVisible(false)}
      />

      <ConfirmationModal
        visible={successModalVisible}
        title={modalTitle}
        message={modalMessage}
        confirmText="확인"
        onConfirm={() => setSuccessModalVisible(false)}
        onCancel={() => setSuccessModalVisible(false)}
      />

      {/* 환율 정보 편집 모달 */}
      <Modal
        visible={isExchangeRateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsExchangeRateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ThemedText style={styles.modalTitle}>환율 정보 편집</ThemedText>
            
            <View style={styles.editInputContainer}>
              <ThemedText style={styles.editInputLabel}>환율</ThemedText>
              <TextInput
                style={styles.editInput}
                value={editingExchangeRate?.exchangeRate || ''}
                onChangeText={(text) => setEditingExchangeRate((prev: any) => prev ? {...prev, exchangeRate: text} : null)}
                placeholder="환율 입력"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.editInputContainer}>
              <ThemedText style={styles.editInputLabel}>원화 금액</ThemedText>
              <TextInput
                style={styles.editInput}
                value={editingExchangeRate?.krwAmount || ''}
                onChangeText={(text) => setEditingExchangeRate((prev: any) => prev ? {...prev, krwAmount: text} : null)}
                placeholder="원화 금액 입력"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.editInputContainer}>
              <ThemedText style={styles.editInputLabel}>외화 금액</ThemedText>
              <TextInput
                style={styles.editInput}
                value={editingExchangeRate?.foreignAmount || ''}
                onChangeText={(text) => setEditingExchangeRate((prev: any) => prev ? {...prev, foreignAmount: text} : null)}
                placeholder="외화 금액 입력"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.editInputContainer}>
              <ThemedText style={styles.editInputLabel}>메모</ThemedText>
              <TextInput
                style={styles.modalInput}
                value={editingExchangeRate?.memo || ''}
                onChangeText={(text) => setEditingExchangeRate((prev: any) => prev ? {...prev, memo: text} : null)}
                placeholder="메모를 입력하세요"
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setIsExchangeRateModalVisible(false)}
              >
                <ThemedText style={styles.modalCancelText}>취소</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton} 
                onPress={updateExchangeRate}
              >
                <ThemedText style={styles.modalConfirmText}>수정</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 36,
    paddingVertical: 0,
    marginVertical: 0,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 20,
    paddingVertical: 0,
    marginVertical: 0,
  },
  toolsMenu: {
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
  },
  toolMenuItem: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    minWidth: 80,
  },
  activeToolMenuItem: {
    backgroundColor: '#F0F8FF',
  },
  toolMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toolMenuTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    textAlign: 'center',
  },
  activeToolMenuTitle: {
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  section: {
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
  recommendationContainer: {
    gap: 16,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  recommendationContent: {
    flex: 1,
    marginLeft: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
  },
  recommendationMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  newsContainer: {
    gap: 16,
  },
  newsItem: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  newsDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  newsSummary: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
  },
  settingContainer: {
    gap: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  settingInfo: {
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
  toggleButton: {
    padding: 4,
  },
  glossaryContainer: {
    gap: 16,
  },
  glossaryItem: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  glossaryTerm: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#007AFF',
  },
  glossaryDefinition: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
  },
  calculatorPlaceholder: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  calculatorPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  // 환율 계산기 스타일
  countrySelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  countryButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  activeCountryButton: {
    backgroundColor: '#E3F2FD',
  },
  countryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeCountryText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  rateDisplay: {
    marginBottom: 16,
  },
  rateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  rateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chevronIcon: {
    marginLeft: 8,
  },
  customRateContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customRateInput: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 6,
    gap: 4,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'right',
  },
  unitText: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  swapContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  swapButton: {
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E3F2FD',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    gap: 8,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  infoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // 환율 저장 기록 스타일
  historyContainer: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  // 중복 정의 제거: 기존 historyCard 사용
  /* historyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  }, */
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  historyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  historyDetails: {
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  historyValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  memoContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  memoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },

  // 새로운 환율 저장 기록 스타일
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftSection: {
    flex: 1,
    marginRight: 12,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  // 중복 정의 제거: 기존 rateText 사용
  /* rateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
  }, */
  rightSection: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: 4,
  },
  topRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  editButtonTop: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ffcc02',
  },
  deleteButtonTop: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  exchangeIcon: {
    marginHorizontal: 16,
  },
  memoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  deleteAllContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff5252',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  deleteAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  memoText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 22,
    marginLeft: 6,
    flex: 1,
  },

  // 편집 모달 스타일
  editInputContainer: {
    marginBottom: 16,
  },
  editInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  editInput: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
  },
  
  // 출시 예정 스타일
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  comingSoonIcon: {
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  comingSoonSubDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 