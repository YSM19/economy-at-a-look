import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { useState, useEffect } from 'react';
import { ExchangeRateChart } from '../components/charts/ExchangeRateChart';

interface ExchangeRateData {
  usdRate: number;
  eurRate: number;
  jpyRate: number;
  history: {
    date: string;
    usdRate: number;
    eurRate: number;
    jpyRate: number;
  }[];
}

export default function ExchangeRateScreen() {
  const [exchangeRateData, setExchangeRateData] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 실제 API 연결 시 여기에 구현
    // 임시 데이터로 대체
    const mockData: ExchangeRateData = {
      usdRate: 1350.50,
      eurRate: 1450.75,
      jpyRate: 9.25,
      history: [
        { date: '2023-01', usdRate: 1300.25, eurRate: 1400.50, jpyRate: 8.75 },
        { date: '2023-02', usdRate: 1310.75, eurRate: 1405.25, jpyRate: 8.85 },
        { date: '2023-03', usdRate: 1320.50, eurRate: 1415.75, jpyRate: 8.95 },
        { date: '2023-04', usdRate: 1330.25, eurRate: 1425.50, jpyRate: 9.05 },
        { date: '2023-05', usdRate: 1340.75, eurRate: 1440.25, jpyRate: 9.15 },
        { date: '2023-06', usdRate: 1350.50, eurRate: 1450.75, jpyRate: 9.25 },
      ]
    };
    
    setExchangeRateData(mockData);
    setLoading(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: "환율 정보",
        }} 
      />
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>환율 동향</ThemedText>
          <ThemedText style={styles.subtitle}>원/달러, 원/유로, 원/엔 환율</ThemedText>
        </View>
        
        {loading ? (
          <ThemedText>로딩 중...</ThemedText>
        ) : error ? (
          <ThemedText>데이터를 불러오는 중 오류가 발생했습니다.</ThemedText>
        ) : exchangeRateData && (
          <>
            <View style={styles.currentRates}>
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateLabel}>원/달러 환율</ThemedText>
                <ThemedText style={styles.rateValue}>{exchangeRateData.usdRate.toFixed(2)}</ThemedText>
              </View>
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateLabel}>원/유로 환율</ThemedText>
                <ThemedText style={styles.rateValue}>{exchangeRateData.eurRate.toFixed(2)}</ThemedText>
              </View>
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateLabel}>원/100엔 환율</ThemedText>
                <ThemedText style={styles.rateValue}>{exchangeRateData.jpyRate.toFixed(2)}</ThemedText>
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <ThemedText style={styles.chartTitle}>환율 변동 추이</ThemedText>
              <ExchangeRateChart data={exchangeRateData.history} />
            </View>
            
            <View style={styles.infoContainer}>
              <ThemedText style={styles.infoTitle}>환율의 의미</ThemedText>
              <ThemedText style={styles.infoContent}>
                환율은 두 나라 화폐 간의 교환 비율을 나타냅니다. 
                원/달러 환율이 상승하면 수입품 가격이 오르고 수출 경쟁력이 강화됩니다.
                콜금리 인상은 원/달러 환율 상승, 연방자금금리 인상은 원/달러 환율 하락 경향을 보입니다.
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
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
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