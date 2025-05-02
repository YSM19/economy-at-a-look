import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { useState, useEffect } from 'react';
import { CPIChart } from '../components/charts/CPIChart';

interface CPIData {
  currentCPI: number;
  prevMonthCPI: number;
  changeRate: number;
  annualRate: number;
  history: {
    date: string;
    cpi: number;
    monthlyChange: number;
    annualChange: number;
  }[];
}

export default function ConsumerPriceIndexScreen() {
  const [cpiData, setCpiData] = useState<CPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 실제 API 연결 시 여기에 구현
    // 임시 데이터로 대체
    const mockData: CPIData = {
      currentCPI: 110.5,
      prevMonthCPI: 109.8,
      changeRate: 0.64,
      annualRate: 3.8,
      history: [
        { date: '2023-01', cpi: 106.2, monthlyChange: 0.8, annualChange: 5.2 },
        { date: '2023-02', cpi: 106.9, monthlyChange: 0.7, annualChange: 4.8 },
        { date: '2023-03', cpi: 107.5, monthlyChange: 0.6, annualChange: 4.2 },
        { date: '2023-04', cpi: 108.2, monthlyChange: 0.6, annualChange: 3.9 },
        { date: '2023-05', cpi: 109.0, monthlyChange: 0.7, annualChange: 3.7 },
        { date: '2023-06', cpi: 109.8, monthlyChange: 0.7, annualChange: 3.6 },
        { date: '2023-07', cpi: 110.5, monthlyChange: 0.6, annualChange: 3.8 },
      ]
    };
    
    setCpiData(mockData);
    setLoading(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: "소비자물가지수",
        }} 
      />
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>소비자물가지수 동향</ThemedText>
          <ThemedText style={styles.subtitle}>전체 CPI 및 변화율</ThemedText>
        </View>
        
        {loading ? (
          <ThemedText>로딩 중...</ThemedText>
        ) : error ? (
          <ThemedText>데이터를 불러오는 중 오류가 발생했습니다.</ThemedText>
        ) : cpiData && (
          <>
            <View style={styles.cpiSummary}>
              <View style={styles.cpiItem}>
                <ThemedText style={styles.cpiLabel}>현재 CPI</ThemedText>
                <ThemedText style={styles.cpiValue}>{cpiData.currentCPI.toFixed(1)}</ThemedText>
              </View>
              <View style={styles.cpiItem}>
                <ThemedText style={styles.cpiLabel}>전월대비</ThemedText>
                <ThemedText style={[styles.cpiChange, cpiData.changeRate > 0 ? styles.increase : styles.decrease]}>
                  {cpiData.changeRate > 0 ? '+' : ''}{cpiData.changeRate.toFixed(2)}%
                </ThemedText>
              </View>
              <View style={styles.cpiItem}>
                <ThemedText style={styles.cpiLabel}>전년동월대비</ThemedText>
                <ThemedText style={[styles.cpiChange, cpiData.annualRate > 0 ? styles.increase : styles.decrease]}>
                  {cpiData.annualRate > 0 ? '+' : ''}{cpiData.annualRate.toFixed(1)}%
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <ThemedText style={styles.chartTitle}>물가지수 변동 추이</ThemedText>
              <CPIChart data={cpiData.history} />
            </View>
            
            <View style={styles.infoContainer}>
              <ThemedText style={styles.infoTitle}>소비자물가지수의 의미</ThemedText>
              <ThemedText style={styles.infoContent}>
                소비자물가지수(CPI)는 일반 소비자가 구입하는 상품과 서비스의 가격 변동을 나타내는 지표입니다.
                환율 상승과 미국 소비자물가 상승은 국내 소비자물가 상승으로 이어지는 경향이 있습니다.
                CPI 상승률이 높으면 실질 구매력이 감소하고, 저축의 실질 가치가 하락합니다.
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
  cpiSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  cpiItem: {
    width: '30%',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cpiLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  cpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cpiChange: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  increase: {
    color: '#d32f2f',
  },
  decrease: {
    color: '#2e7d32',
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