import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
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
    <ThemedView style={{ flex: 1 }}>
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
                <ThemedText style={styles.rateValue}>{interestRateData.korea.rate}%</ThemedText>
                <ThemedText style={styles.rateDate}>
                  업데이트: {new Date(interestRateData.korea.lastUpdated).toLocaleDateString('ko-KR').replace(/\//g, '.')}
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
    fontSize: 11,
    opacity: 0.6,
    marginTop: 4,
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
    marginBottom: 16,
    color: '#333',
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
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
}); 