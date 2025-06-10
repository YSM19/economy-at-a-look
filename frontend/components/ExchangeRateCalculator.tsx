import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { economicIndexApi } from '../services/api';

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

  useEffect(() => {
    fetchExchangeRate();
  }, [country]);

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
    
    // 통화 순서만 바꾸기
    setIsKRWFirst(!isKRWFirst);
    
    if (currentFirstValue) {
      setTimeout(() => {
        if (isKRWFirst) {
          // 현재 원화가 첫 번째 → 외화가 첫 번째로 바뀜
          // 원화 값을 첫 번째 칸에 유지하고, 외화로 환전 결과 계산
          setForeignAmount(currentFirstValue);
          calculateFromForeign(currentFirstValue);
        } else {
          // 현재 외화가 첫 번째 → 원화가 첫 번째로 바뀜  
          // 외화 값을 첫 번째 칸에 유지하고, 원화로 환전 결과 계산
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

  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <ThemedText style={styles.title}>환율 계산기</ThemedText>
        <View style={styles.container}>
          <ThemedText style={styles.loadingText}>환율 정보를 불러오는 중...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <ThemedText style={styles.title}>환율 계산기</ThemedText>
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
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 5,
    textAlign: 'left',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
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
  },
  rateDisplay: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
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
    marginTop: 12,
    padding: 8,
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
});

export default ExchangeRateCalculator; 