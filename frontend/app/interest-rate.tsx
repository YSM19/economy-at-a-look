import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import InterestRateChart from '../components/charts/InterestRateChart';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { economicIndexApi } from '../services/api';

interface InterestRateData {
  kbRate: number;
  fedRate: number;
  marketRate: number;
  history: {
    date: string;
    kbRate: number;
    fedRate: number;
    marketRate: number;
  }[];
}

export default function InterestRateScreen() {
  const [interestRateData, setInterestRateData] = useState<InterestRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 실제 API 연결로 금리 데이터 가져오기
    const fetchInterestRateData = async () => {
      try {
        setLoading(true);
        const response = await economicIndexApi.getInterestRate();
        
        if (response.data && response.data.success && response.data.data) {
          setInterestRateData(response.data.data);
        } else {
          setError('금리 데이터를 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('금리 데이터 로딩 실패:', err);
        setError('금리 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInterestRateData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: "금리 정보",
        }} 
      />
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>금리 동향</ThemedText>
          <ThemedText style={styles.subtitle}>한국은행 기준금리, 미 연방준비제도 기준금리, 시장금리</ThemedText>
        </View>
        
        {loading ? (
          <ThemedText>로딩 중...</ThemedText>
        ) : error ? (
          <ThemedText>데이터를 불러오는 중 오류가 발생했습니다.</ThemedText>
        ) : interestRateData && (
          <>
            <View style={styles.currentRates}>
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateLabel}>한국은행 기준금리</ThemedText>
                <ThemedText style={styles.rateValue}>{interestRateData.kbRate}%</ThemedText>
              </View>
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateLabel}>미 연준 기준금리</ThemedText>
                <ThemedText style={styles.rateValue}>{interestRateData.fedRate}%</ThemedText>
              </View>
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateLabel}>시장금리</ThemedText>
                <ThemedText style={styles.rateValue}>{interestRateData.marketRate}%</ThemedText>
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <ThemedText style={styles.chartTitle}>금리 변동 추이</ThemedText>
              <InterestRateChart data={interestRateData.history} />
            </View>
            
            <View style={styles.infoContainer}>
              <ThemedText style={styles.infoTitle}>금리의 의미</ThemedText>
              <ThemedText style={styles.infoContent}>
                금리는 물가 조절의 스위치 역할을 합니다. 금리 상승은 예금 이자 상승과 대출 금리 상승으로 이어집니다.
                한국은행이 기준금리를 올리면 전반적인 시장금리도 상승하는 경향이 있으며, 이는 소비 진작보다는 저축을 
                유도하는 효과가 있습니다.
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