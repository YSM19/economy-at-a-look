import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, Modal, useColorScheme } from 'react-native';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { economicIndexApi, exchangeRateHistoryApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from './ToastProvider';
import { ConfirmationModal } from './ConfirmationModal';
import { useRouter } from 'expo-router';

type ExchangeRateCalculatorProps = {
  country: string;
};

const ExchangeRateCalculator: React.FC<ExchangeRateCalculatorProps> = ({ country }) => {
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
  
  const { showToast } = useToast();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    fetchExchangeRate();
    checkLoginStatus();
    // 국가 탭 변경 시 입력된 금액들 초기화
    setKrwAmount('');
    setForeignAmount('');
  }, [country]);

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
        
        switch(country) {
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
      setCurrentRate(defaultRates[country as keyof typeof defaultRates] || 1350);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencyInfo = () => {
    switch(country) {
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
    if (country === 'japan') {
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
    if (country === 'japan') {
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
        showToast('로그인 토큰이 없습니다.', 'error');
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

  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <ThemedText style={styles.title}>환율 계산기, 저장</ThemedText>
        <View style={styles.container}>
          <ThemedText style={styles.loadingText}>환율 정보를 불러오는 중...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <ThemedText style={styles.title}>환율 계산기, 저장</ThemedText>
      <View style={styles.container}>
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
                country === 'usa' ? 'currency-usd' : 
                country === 'europe' ? 'currency-eur' : 
                country === 'japan' ? 'currency-jpy' : 'cash'
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
            value={isKRWFirst ? krwAmount : foreignAmount}
            onChangeText={isKRWFirst ? handleKRWChange : handleForeignChange}
            placeholder="금액을 입력하세요"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
          {(isKRWFirst ? krwAmount : foreignAmount) ? (
            <ThemedText style={styles.unitText}>{getFirstCurrencyInfo().unit}</ThemedText>
          ) : null}
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
                country === 'usa' ? 'currency-usd' : 
                country === 'europe' ? 'currency-eur' : 
                country === 'japan' ? 'currency-jpy' : 'cash'
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
            value={isKRWFirst ? foreignAmount : krwAmount}
            onChangeText={isKRWFirst ? handleForeignChange : handleKRWChange}
            placeholder="금액을 입력하세요"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
          {(isKRWFirst ? foreignAmount : krwAmount) ? (
            <ThemedText style={styles.unitText}>{getSecondCurrencyInfo().unit}</ThemedText>
          ) : null}
        </View>

        {/* 액션 버튼들 */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={saveExchangeRateHistory} disabled={isSaving}>
            <MaterialCommunityIcons name="content-save-edit-outline" size={22} color="#fff" />
            <ThemedText style={styles.saveButtonText}>
              {isSaving ? '저장 중...' : '현재 환율 저장'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
            <MaterialCommunityIcons name="refresh" size={16} color="#666" />
            <ThemedText style={styles.clearButtonText}>초기화</ThemedText>
          </TouchableOpacity>
        </View>

        {/* 안내 메시지 */}
        <View style={styles.infoContainer}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#666" />
          <ThemedText style={styles.infoText}>
            실제 환전 시에는 은행 수수료가 추가로 발생할 수 있습니다.
          </ThemedText>
        </View>
      </View>

      {/* 메모 입력 모달 */}
      <Modal
        visible={isMemoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsMemoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff' }]}>
            <ThemedText style={styles.modalTitle}>메모 추가</ThemedText>
            <ThemedText style={styles.modalSubtitle}>환율 저장과 함께 메모를 남겨보세요 (선택사항)</ThemedText>
            
            <TextInput
              style={[
                styles.memoInput,
                { 
                  borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }
              ]}
              placeholder="메모를 입력하세요 (최대 200자)"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
              value={memo}
              onChangeText={setMemo}
              autoFocus={true}
              maxLength={200}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsMemoModalVisible(false);
                  setMemo('');
                }}
              >
                <ThemedText style={styles.cancelButtonText}>취소</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, isSaving && styles.disabledModalButton]}
                onPress={confirmSaveWithMemo}
                disabled={isSaving}
              >
                <ThemedText style={styles.confirmButtonText}>
                  {isSaving ? '저장 중...' : '저장'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={isLoginModalVisible}
        title="로그인 필요"
        message="환율 기록을 저장하려면 로그인이 필요합니다. 지금 로그인하시겠습니까?"
        confirmText="로그인"
        cancelText="나중에"
        onConfirm={() => {
          setIsLoginModalVisible(false);
          router.push('/login');
        }}
        onCancel={() => setIsLoginModalVisible(false)}
        iconName="login"
        iconColor="#34C759"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginTop: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 5,
    textAlign: 'left',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 24,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  rateDisplay: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  rateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingRight: 50,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
    backgroundColor: '#fafafa',
  },
  unitText: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    minWidth: 30,
  },
  swapContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -10,
    marginBottom: -5,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 6,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  infoText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  customRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  customRateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#fff',
    flex: 1,
    marginRight: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#e3f2fd',
  },
  resetButtonText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  // 메모 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: Platform.OS === 'web' ? 400 : '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
  memoInput: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledModalButton: {
    opacity: 0.6,
  },
});

export default ExchangeRateCalculator; 