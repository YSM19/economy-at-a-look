import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useState, useEffect } from 'react';
import { ExchangeRateChart } from '../components/charts/ExchangeRateChart';
import { economicIndexApi } from '../services/api';

interface ExchangeRateData {
  usdRate: number;
  eurRate: number;
  jpyRate: number;
  cnyRate?: number;
}

interface PeriodData {
  date: string;
  usdRate: number;
  eurRate: number;
  jpyRate: number;
  cnyRate?: number;
}

export default function ExchangeRateScreen() {
  const params = useLocalSearchParams();
  const country = typeof params.country === 'string' ? params.country : 'usa';
  
  const [exchangeRateData, setExchangeRateData] = useState<ExchangeRateData | null>(null);
  const [weeklyData, setWeeklyData] = useState<PeriodData[]>([]);
  const [monthlyData, setMonthlyData] = useState<PeriodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 국가별 제목과 설명 정보
  const getCountryInfo = () => {
    switch (country) {
      case 'usa':
        return {
          title: '미국 달러 환율 정보',
          subtitle: '달러 환율 동향',
          rateLabel: '1달러',
          rateProp: 'usdRate',
          description: '원/달러 환율이 상승하면 수입품 가격이 오르고 수출 경쟁력이 강화됩니다. 콜금리 인상은 원/달러 환율 상승, 연방자금금리 인상은 원/달러 환율 하락 경향을 보입니다.'
        };
      case 'japan':
        return {
          title: '일본 엔화 환율 정보',
          subtitle: '엔화 환율 동향',
          rateLabel: '1엔',
          rateProp: 'jpyRate',
          description: '원/엔 환율은 일본과의 무역 및 투자에 직접적인 영향을 미칩니다. 일본 중앙은행의 통화정책과 한국의 금리 정책에 따라 변동됩니다.'
        };
      case 'china':
        return {
          title: '중국 위안화 환율 정보',
          subtitle: '위안화 환율 동향',
          rateLabel: '1위안',
          rateProp: 'cnyRate',
          description: '원/위안 환율은 중국과의 무역 관계에 중요한 영향을 미칩니다. 중국의 경제성장률과 통화정책에 따라 변동됩니다.'
        };
      case 'europe':
        return {
          title: '유럽 유로 환율 정보',
          subtitle: '유로 환율 동향',
          rateLabel: '1유로',
          rateProp: 'eurRate',
          description: '원/유로 환율은 유럽연합과의 무역 및 투자에 영향을 미칩니다. 유럽중앙은행의 통화정책과 유럽 경제 상황에 따라 변동됩니다.'
        };
      default:
        return {
          title: '환율 정보',
          subtitle: '주요국 환율 동향',
          rateLabel: '환율',
          rateProp: 'usdRate',
          description: '환율은 두 나라 화폐 간의 교환 비율을 나타냅니다.'
        };
    }
  };

  const countryInfo = getCountryInfo();

  // 주말 제외 날짜 계산 함수
  const getBusinessDaysAgo = (days: number): string => {
    const today = new Date();
    let count = 0;
    let current = new Date(today);

    while (count < days) {
      current.setDate(current.getDate() - 1);
      // 주말(토요일=6, 일요일=0) 제외
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        count++;
      }
    }

    return current.toISOString().split('T')[0];
  };

  const getToday = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 현재 환율 데이터 가져오기
        const currentResponse = await economicIndexApi.getExchangeRate();
        if (currentResponse.data && currentResponse.data.success && currentResponse.data.data) {
          const apiData = currentResponse.data.data;
          const transformedData: ExchangeRateData = {
            usdRate: apiData.usdRate || 0,
            eurRate: apiData.eurRate || 0,
            jpyRate: apiData.jpyRate || 0,
            cnyRate: apiData.cnyRate || 0,
          };
          setExchangeRateData(transformedData);
        }

        // 7일 데이터 가져오기 (주말 제외)
        const weekStartDate = getBusinessDaysAgo(7);
        const weekEndDate = getToday();
        const weeklyResponse = await economicIndexApi.getExchangeRateByPeriod(weekStartDate, weekEndDate);
        
        if (weeklyResponse.data && weeklyResponse.data.success && weeklyResponse.data.data) {
          setWeeklyData(weeklyResponse.data.data);
        }

        // 30일 데이터 가져오기 (주말 제외)
        const monthStartDate = getBusinessDaysAgo(30);
        const monthEndDate = getToday();
        const monthlyResponse = await economicIndexApi.getExchangeRateByPeriod(monthStartDate, monthEndDate);
        
        if (monthlyResponse.data && monthlyResponse.data.success && monthlyResponse.data.data) {
          setMonthlyData(monthlyResponse.data.data);
        }

      } catch (err) {
        console.error('환율 데이터 로딩 실패:', err);
        setError('환율 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [country]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: countryInfo.title,
        }} 
      />
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>{countryInfo.subtitle}</ThemedText>
          <ThemedText style={styles.subtitle}>{countryInfo.rateLabel} 상세 정보</ThemedText>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>로딩 중...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>데이터를 불러오는 중 오류가 발생했습니다.</ThemedText>
          </View>
        ) : exchangeRateData && (
          <>
            <View style={styles.currentRates}>
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateLabel}>{countryInfo.rateLabel}</ThemedText>
                <View style={styles.rateValueContainer}>
                  <ThemedText style={styles.rateValue}>
                    {(() => {
                      const value = ((exchangeRateData as any)[countryInfo.rateProp] as number);
                      if (!value) return 'N/A';
                      const fixed = value.toFixed(1);
                      return fixed.endsWith('.0') ? value.toFixed(0) : fixed;
                    })()}
                  </ThemedText>
                  <ThemedText style={styles.rateCurrency}>원</ThemedText>
                </View>
              </View>
            </View>
            
            {/* 7일 환율 변동 추이 */}
            <View style={styles.chartContainer}>
              <ThemedText style={styles.chartTitle}>최근 7일 환율 변동 추이</ThemedText>
              <ThemedText style={styles.chartSubtitle}>주말 및 공휴일 제외</ThemedText>
              {weeklyData.length > 0 ? (
                <ExchangeRateChart 
                  data={weeklyData} 
                  country={country}
                  height={200}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <ThemedText style={styles.noDataText}>7일 데이터가 없습니다.</ThemedText>
                </View>
              )}
            </View>
            
            {/* 30일 환율 변동 추이 */}
            <View style={styles.chartContainer}>
              <ThemedText style={styles.chartTitle}>최근 30일 환율 변동 추이</ThemedText>
              <ThemedText style={styles.chartSubtitle}>주말 및 공휴일 제외</ThemedText>
              {monthlyData.length > 0 ? (
                <ExchangeRateChart 
                  data={monthlyData} 
                  country={country}
                  height={200}
                  showOnlyDay={true}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <ThemedText style={styles.noDataText}>30일 데이터가 없습니다.</ThemedText>
                </View>
              )}
            </View>
            
            <View style={styles.infoContainer}>
              <ThemedText style={styles.infoTitle}>환율의 의미</ThemedText>
              <ThemedText style={styles.infoContent}>
                {countryInfo.description}
              </ThemedText>
            </View>
          </>
        )}
      </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
    padding: 16,
    paddingTop: 30,
  },
  header: {
    marginBottom: 16,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  currentRates: {
    marginBottom: 16,
  },
  rateItem: {
    backgroundColor: '#FBFCFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rateLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  rateValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  rateCurrency: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  chartContainer: {
    backgroundColor: '#FBFCFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F6F8FE',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  tabText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  activeTabText: {
    color: '#fff',
  },
  inactiveTabText: {
    color: '#666',
  },
  countryTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 26,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 16,
    marginLeft: 5,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 24,
  },
}); 