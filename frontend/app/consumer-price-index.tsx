import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { useState, useEffect } from 'react';
import { CPIChart } from '../components/charts/CPIChart';
import { economicIndexApi } from '../services/api';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 실제 API 연결로 소비자물가지수 데이터 가져오기
    const fetchCPIData = async () => {
      try {
        setLoading(true);
        const response = await economicIndexApi.getConsumerPriceIndex();
        
        if (response.data && response.data.success && response.data.data) {
          setCpiData(response.data.data);
        } else {
          setError('소비자물가지수 데이터를 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('소비자물가지수 데이터 로딩 실패:', err);
        setError('소비자물가지수 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCPIData();
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