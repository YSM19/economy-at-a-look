import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { useState, useEffect } from 'react';
import { economicIndexApi } from '../services/api';
import { CPIChart } from '../components/charts/CPIChart';

interface CPIData {
  cpi: number;
  monthlyChange: number;
  annualChange: number;
  lastUpdated: string;
}

interface CPIPeriodData {
  date: string;
  cpi: number;
  monthlyChange: number;
  annualChange: number;
}

export default function ConsumerPriceIndexScreen() {
  const [cpiData, setCpiData] = useState<CPIData | null>(null);
  const [historicalData, setHistoricalData] = useState<CPIPeriodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // CPI 데이터 가져오기
        const response = await economicIndexApi.getConsumerPriceIndex();
        
        if (response.data && response.data.success && response.data.data) {
          setCpiData(response.data.data);
          setHistoricalData(response.data.data.historicalData || []);
        } else {
          setError('CPI 데이터를 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('CPI 데이터 로딩 실패:', err);
        setError('CPI 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
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
          <ThemedText style={styles.subtitle}>CPI 상세 정보</ThemedText>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>로딩 중...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>데이터를 불러오는 중 오류가 발생했습니다.</ThemedText>
          </View>
        ) : cpiData && (
          <>
            <View style={styles.currentRates}>
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateLabel}>소비자물가지수</ThemedText>
                <ThemedText style={styles.rateValue}>{cpiData.cpi.toFixed(1)}</ThemedText>
                <ThemedText style={styles.rateDate}>
                  업데이트: {new Date(cpiData.lastUpdated).toLocaleDateString()}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <ThemedText style={styles.chartTitle}>소비자물가지수 추이</ThemedText>
              {historicalData.length > 0 ? (
                <CPIChart data={historicalData} />
              ) : (
                <View style={styles.noDataContainer}>
                  <ThemedText style={styles.noDataText}>CPI 히스토리 데이터를 준비 중입니다.</ThemedText>
                </View>
              )}
            </View>
            
            <View style={styles.infoContainer}>
              <ThemedText style={styles.infoTitle}>소비자물가지수의 의미</ThemedText>
              <ThemedText style={styles.infoContent}>
                소비자물가지수(CPI)는 소비자가 구입하는 상품과 서비스의 가격 변동을 측정하는 지표입니다.
                CPI 상승은 인플레이션을 의미하며, 물가 안정이 중요한 경제 정책 목표 중 하나입니다.
                한국은행은 물가 안정을 위해 통화정책을 운용합니다.
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
    marginBottom: 16,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    paddingTop: 0,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  currentRates: {
    marginBottom: 16,
  },
  rateItem: {
    backgroundColor: '#fff',
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
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
    color: '#666',
  },
  rateValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  rateDate: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#fff',
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
    marginBottom: 16,
    color: '#333',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    lineHeight: 24,
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
    backgroundColor: '#f8f9fa',
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
}); 