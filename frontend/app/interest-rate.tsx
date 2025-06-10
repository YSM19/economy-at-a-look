import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { useState, useEffect } from 'react';
import { economicIndexApi } from '../services/api';
import { InterestRateChart } from '../components/charts/InterestRateChart';

interface InterestRateData {
  korea: {
    rate: number;
    bankName: string;
    countryCode: string;
    lastUpdated: string;
  };
  announcements: {
    date: string;
    interestRate: number;
    countryCode: string;
    countryName: string;
    bankName: string;
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
        
        // 현재 금리 정보와 발표일 데이터를 병렬로 가져오기
        const [currentRateResponse, announcementsResponse] = await Promise.all([
          economicIndexApi.getInterestRate(),
          economicIndexApi.getInterestRateAnnouncements('KR')
        ]);
        
        if (currentRateResponse.data && currentRateResponse.data.success && currentRateResponse.data.data &&
            announcementsResponse.data && announcementsResponse.data.success) {
          setInterestRateData({
            korea: currentRateResponse.data.data.korea,
            announcements: announcementsResponse.data.data || []
          });
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
          <ThemedText style={styles.subtitle}>한국은행 기준금리</ThemedText>
        </View>
        
        {loading ? (
          <ThemedText>로딩 중...</ThemedText>
        ) : error ? (
          <ThemedText>데이터를 불러오는 중 오류가 발생했습니다.</ThemedText>
        ) : interestRateData && (
          <>
            <View style={styles.currentRates}>
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateLabel}>{interestRateData.korea.bankName}</ThemedText>
                <ThemedText style={styles.rateValue}>{interestRateData.korea.rate}%</ThemedText>
                <ThemedText style={styles.rateDate}>
                  업데이트: {new Date(interestRateData.korea.lastUpdated).toLocaleDateString()}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <ThemedText style={styles.chartTitle}>정책금리 동향</ThemedText>
              {interestRateData.announcements && interestRateData.announcements.length > 0 ? (
                <InterestRateChart data={interestRateData.announcements.map(item => ({
                  date: item.date,
                  rate: item.interestRate,
                  announcementDate: item.date
                }))} />
              ) : (
                <View style={styles.noDataContainer}>
                  <ThemedText style={styles.noDataText}>정책금리 히스토리 데이터를 준비 중입니다.</ThemedText>
                </View>
              )}
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
    marginBottom: 24,
  },
  rateItem: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 20,
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
  rateDate: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 4,
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
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
}); 