import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { useState, useEffect } from 'react';
import { ExchangeRateChart } from '../components/charts/ExchangeRateChart';
import { economicIndexApi } from '../services/api';

interface ExchangeRateData {
  usdRate: number;
  eurRate: number;
  jpyRate: number;
  cnyRate?: number;
  history: {
    date: string;
    usdRate: number;
    eurRate: number;
    jpyRate: number;
    cnyRate?: number;
  }[];
}

export default function ExchangeRateScreen() {
  const params = useLocalSearchParams();
  const country = typeof params.country === 'string' ? params.country : 'usa';
  
  const [exchangeRateData, setExchangeRateData] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 국가별 제목과 설명 정보
  const getCountryInfo = () => {
    switch (country) {
      case 'usa':
        return {
          title: '미국 달러 환율 정보',
          subtitle: '원/달러 환율 동향',
          rateLabel: '원/달러 환율',
          rateProp: 'usdRate',
          description: '원/달러 환율이 상승하면 수입품 가격이 오르고 수출 경쟁력이 강화됩니다. 콜금리 인상은 원/달러 환율 상승, 연방자금금리 인상은 원/달러 환율 하락 경향을 보입니다.'
        };
      case 'japan':
        return {
          title: '일본 엔화 환율 정보',
          subtitle: '원/100엔 환율 동향',
          rateLabel: '원/100엔 환율',
          rateProp: 'jpyRate',
          description: '원/엔 환율은 일본과의 무역 및 투자에 직접적인 영향을 미칩니다. 일본 중앙은행의 통화정책과 한국의 금리 정책에 따라 변동됩니다.'
        };
      case 'china':
        return {
          title: '중국 위안화 환율 정보',
          subtitle: '원/위안 환율 동향',
          rateLabel: '원/위안 환율',
          rateProp: 'cnyRate',
          description: '원/위안 환율은 중국과의 무역 관계에 중요한 영향을 미칩니다. 중국의 경제성장률과 통화정책에 따라 변동됩니다.'
        };
      case 'europe':
        return {
          title: '유럽 유로 환율 정보',
          subtitle: '원/유로 환율 동향',
          rateLabel: '원/유로 환율',
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

  useEffect(() => {
    // 실제 API 연결로 환율 데이터 가져오기
    const fetchExchangeRateData = async () => {
      try {
        setLoading(true);
        const response = await economicIndexApi.getExchangeRate();
        
        if (response.data && response.data.success && response.data.data) {
          const apiData = response.data.data;
          const transformedData: ExchangeRateData = {
            usdRate: apiData.usdRate || 0,
            eurRate: apiData.eurRate || 0,
            jpyRate: apiData.jpyRate || 0,
            cnyRate: apiData.cnyRate || 0,
            history: apiData.history?.map((item: any) => ({
              date: item.date,
              usdRate: item.curUnit === 'USD' ? parseFloat(item.dealBasRate) : 0,
              eurRate: item.curUnit === 'EUR' ? parseFloat(item.dealBasRate) : 0,
              jpyRate: item.curUnit === 'JPY(100)' ? parseFloat(item.dealBasRate) : 0,
              cnyRate: item.curUnit === 'CNH' ? parseFloat(item.dealBasRate) : 0,
            })) || []
          };
          setExchangeRateData(transformedData);
        } else {
          setError('환율 데이터를 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('환율 데이터 로딩 실패:', err);
        setError('환율 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExchangeRateData();
  }, []);

  return (
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
          <ThemedText>로딩 중...</ThemedText>
        ) : error ? (
          <ThemedText>데이터를 불러오는 중 오류가 발생했습니다.</ThemedText>
        ) : exchangeRateData && (
          <>
            <View style={styles.currentRates}>
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateLabel}>{countryInfo.rateLabel}</ThemedText>
                <ThemedText style={styles.rateValue}>
                  {(() => {
                    const value = ((exchangeRateData as any)[countryInfo.rateProp] as number);
                    if (!value) return 'N/A';
                    const fixed = value.toFixed(1);
                    return fixed.endsWith('.0') ? value.toFixed(0) + '원' : fixed + '원';
                  })()}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <ThemedText style={styles.chartTitle}>환율 변동 추이</ThemedText>
              <ExchangeRateChart data={exchangeRateData.history} />
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
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingTop: 0,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  currentRates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  rateItem: {
    width: '30%',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  rateValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chartContainer: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoContent: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 