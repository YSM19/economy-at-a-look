import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { economicIndexApi } from '../../services/api';






interface QuickAccessItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  color: string;
}

interface SummaryData {
  exchangeRate: number;
  interestRate: number;
  cpi: number;
}

export default function HomeScreen() {
  const router = useRouter();
  
  const [summaryData, setSummaryData] = useState<SummaryData>({
    exchangeRate: 0,
    interestRate: 0,
    cpi: 0
  });
  const [loading, setLoading] = useState(false);

  // 빠른 액세스 메뉴 아이템들
  const quickAccessItems: QuickAccessItem[] = [
    { id: '1', title: '환율', icon: 'currency-usd', route: '/(tabs)/indicators?tab=exchange', color: '#FF6B6B' },
    { id: '2', title: '금리', icon: 'percent', route: '/(tabs)/indicators?tab=interest', color: '#4ECDC4' },
    { id: '3', title: '물가', icon: 'chart-line', route: '/(tabs)/indicators?tab=cpi', color: '#45B7D1' },
    { id: '4', title: '계산기', icon: 'calculator', route: '/(tabs)/tools', color: '#96CEB4' },
    { id: '5', title: '커뮤니티', icon: 'forum', route: '/(tabs)/community', color: '#FFEAA7' },
    { id: '6', title: '마이페이지', icon: 'account', route: '/(tabs)/profile', color: '#DDA0DD' },
  ];



  // 경제 심리 지수 및 주요 지표 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 병렬로 모든 데이터 가져오기
        const [exchangeResponse, interestResponse, cpiResponse] = await Promise.all([
          economicIndexApi.getExchangeRate(),
          economicIndexApi.getInterestRate(),
          economicIndexApi.getConsumerPriceIndex()
        ]);
        
        // 환율 데이터 처리
        let exchangeRate = 0;
        if (exchangeResponse.data?.success && exchangeResponse.data.data) {
          exchangeRate = exchangeResponse.data.data.usdRate || 0;
        }
        
        // 금리 데이터 처리
        let interestRate = 0;
        if (interestResponse.data?.success && interestResponse.data.data) {
          interestRate = interestResponse.data.data.korea?.rate || 0;
        }
        
        // CPI 데이터 처리
        let cpi = 0;
        if (cpiResponse.data?.success && cpiResponse.data.data) {
          cpi = cpiResponse.data.data.yearlyChange || cpiResponse.data.data.annualRate || 0;
        }
        
        setSummaryData({
          exchangeRate: exchangeRate,
          interestRate: interestRate,
          cpi: cpi
        });
        
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        
        // 오류 시 기본 데이터 설정
        setSummaryData({
          exchangeRate: 1350,
          interestRate: 3.50,
          cpi: 110.2
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleQuickAccess = (item: QuickAccessItem) => {
    try {
      if (item.route.includes('?tab=')) {
        const [path, tab] = item.route.split('?tab=');
        router.push({
          pathname: path as any,
          params: { tab: tab }
        });
      } else {
        router.push(item.route as any);
      }
    } catch (error) {
      console.error('네비게이션 오류:', error);
    }
  };



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>이코노뷰</ThemedText>
          <ThemedText style={styles.headerSubtitle}>오늘의 경제 현황을 한눈에</ThemedText>
        </View>



        {/* 주요 지표 요약 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>주요 지표 요약</ThemedText>
          <View style={styles.summaryGrid}>
            <TouchableOpacity 
              style={styles.summaryItem}
              onPress={() => handleQuickAccess({ id: '1', title: '환율', icon: 'currency-usd', route: '/(tabs)/indicators?tab=exchange', color: '#FF6B6B' })}
            >
              <MaterialCommunityIcons name="currency-usd" size={24} color="#FF6B6B" />
              <ThemedText style={styles.summaryLabel}>환율</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {summaryData.exchangeRate > 0 ? `${summaryData.exchangeRate.toLocaleString()}원` : '로딩 중...'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.summaryItem}
              onPress={() => handleQuickAccess({ id: '2', title: '금리', icon: 'percent', route: '/(tabs)/indicators?tab=interest', color: '#4ECDC4' })}
            >
              <MaterialCommunityIcons name="percent" size={24} color="#4ECDC4" />
              <ThemedText style={styles.summaryLabel}>기준금리</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {summaryData.interestRate > 0 ? `${summaryData.interestRate}%` : '로딩 중...'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.summaryItem}
              onPress={() => handleQuickAccess({ id: '3', title: '물가', icon: 'chart-line', route: '/(tabs)/indicators?tab=cpi', color: '#45B7D1' })}
            >
              <MaterialCommunityIcons name="chart-line" size={24} color="#45B7D1" />
              <ThemedText style={styles.summaryLabel}>소비자물가지수</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {summaryData.cpi > 0 ? `${summaryData.cpi}%` : '로딩 중...'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* 빠른 액세스 메뉴 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>빠른 액세스</ThemedText>
          <View style={styles.quickAccessGrid}>
            {quickAccessItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.quickAccessItem}
                onPress={() => handleQuickAccess(item)}
              >
                <View style={[styles.quickAccessIcon, { backgroundColor: item.color }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={24} color="#FFFFFF" />
                </View>
                <ThemedText style={styles.quickAccessTitle}>{item.title}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* 경제 뉴스 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>경제 뉴스</ThemedText>
          <View style={styles.newsContainer}>
            <View style={styles.comingSoonContainer}>
              <MaterialCommunityIcons name="newspaper-variant" size={48} color="#8E8E93" />
              <ThemedText style={styles.comingSoonTitle}>경제 뉴스</ThemedText>
              <ThemedText style={styles.comingSoonText}>추가 예정입니다</ThemedText>
              <ThemedText style={styles.comingSoonSubtext}>
                실시간 경제 뉴스와 시장 동향을 제공할 예정입니다
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 36,
    paddingVertical: 0,
    marginVertical: 0,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 20,
    paddingVertical: 0,
    marginVertical: 0,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAccessItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  quickAccessIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickAccessTitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  newsContainer: {
    gap: 12,
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  newsText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 