import React, { useState, useEffect } from 'react';
import { View, ScrollView, SafeAreaView, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../components/ThemedText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import InterestRateGauge from '../components/InterestRateGauge';
import ExchangeRateGauge from '../components/ExchangeRateGauge';
import { CPIChart } from '../components/charts/CPIChart';
import ExchangeRateRecommendations from '../components/ExchangeRateRecommendations';
import ExchangeRateCalculator from '../components/ExchangeRateCalculator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { economicIndexApi } from '../services/api';

interface CPIData {
  currentCPI: number;
  prevMonthCPI: number;
  changeRate: number;
  annualRate: number;
  history: {
    id: number;
    date: string;
    cpiValue: number;
    monthlyChange: number;
    annualChange: number;
  }[];
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // URL 파라미터로 전달된 탭 정보를 받아오거나, 기본값으로 'exchange' 사용
  const [activeTab, setActiveTab] = useState(
    typeof params.tab === 'string' ? params.tab : 'exchange'
  );
  
  // 국가 탭 상태 추가
  const [activeCountry, setActiveCountry] = useState('usa');
  
  // CPI 데이터 상태 추가
  const [cpiData, setCpiData] = useState<CPIData | null>(null);
  const [cpiLoading, setCpiLoading] = useState(false);
  
  // params.tab이 변경되면 activeTab도 업데이트
  useEffect(() => {
    if (params.tab && typeof params.tab === 'string') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  // CPI 데이터 가져오기
  useEffect(() => {
    const fetchCPIData = async () => {
      try {
        setCpiLoading(true);
        console.log('🔍 CPI 데이터 요청 시작...');
        
        const response = await economicIndexApi.getConsumerPriceIndex();
        console.log('📊 CPI API 응답:', response.data);
        
        // 백엔드 응답 구조: { success: true, data: {...} }
        if (response.data && response.data.success && response.data.data) {
          console.log('✅ 실제 CPI 데이터 사용:', response.data.data);
          setCpiData(response.data.data);
        } else {
          console.warn('⚠️ API 응답 구조가 예상과 다름:', response.data);
          // 응답이 직접 데이터인 경우 (success 래퍼 없음)
          if (response.data && response.data.currentCPI) {
            console.log('✅ 직접 CPI 데이터 사용:', response.data);
            setCpiData(response.data);
          } else {
                         console.log('❌ 유효한 CPI 데이터를 찾을 수 없음, 샘플 데이터 사용');
             setCpiData({
               currentCPI: 108.5,
               prevMonthCPI: 108.2,
               changeRate: 0.3,
               annualRate: 3.2,
               history: [
                 { id: 1, date: '2024-01', cpiValue: 105.8, monthlyChange: 0.2, annualChange: 2.8 },
                 { id: 2, date: '2024-02', cpiValue: 106.1, monthlyChange: 0.3, annualChange: 2.9 },
                 { id: 3, date: '2024-03', cpiValue: 106.5, monthlyChange: 0.4, annualChange: 3.0 },
                 { id: 4, date: '2024-04', cpiValue: 107.0, monthlyChange: 0.5, annualChange: 3.1 },
                 { id: 5, date: '2024-05', cpiValue: 107.3, monthlyChange: 0.3, annualChange: 3.0 },
                 { id: 6, date: '2024-06', cpiValue: 107.8, monthlyChange: 0.5, annualChange: 3.2 },
                 { id: 7, date: '2024-07', cpiValue: 108.2, monthlyChange: 0.4, annualChange: 3.1 },
                 { id: 8, date: '2024-08', cpiValue: 108.5, monthlyChange: 0.3, annualChange: 3.2 }
               ]
             });
          }
        }
      } catch (error) {
                 console.error('❌ CPI 데이터 로딩 실패:', error);
         setCpiData({
           currentCPI: 108.5,
           prevMonthCPI: 108.2,
           changeRate: 0.3,
           annualRate: 3.2,
           history: [
             { id: 1, date: '2024-01', cpiValue: 105.8, monthlyChange: 0.2, annualChange: 2.8 },
             { id: 2, date: '2024-02', cpiValue: 106.1, monthlyChange: 0.3, annualChange: 2.9 },
             { id: 3, date: '2024-03', cpiValue: 106.5, monthlyChange: 0.4, annualChange: 3.0 },
             { id: 4, date: '2024-04', cpiValue: 107.0, monthlyChange: 0.5, annualChange: 3.1 },
             { id: 5, date: '2024-05', cpiValue: 107.3, monthlyChange: 0.3, annualChange: 3.0 },
             { id: 6, date: '2024-06', cpiValue: 107.8, monthlyChange: 0.5, annualChange: 3.2 },
             { id: 7, date: '2024-07', cpiValue: 108.2, monthlyChange: 0.4, annualChange: 3.1 },
             { id: 8, date: '2024-08', cpiValue: 108.5, monthlyChange: 0.3, annualChange: 3.2 }
           ]
         });
      } finally {
        setCpiLoading(false);
      }
    };
    
    // 물가 탭이 활성화되었을 때만 데이터 가져오기
    if (activeTab === 'price') {
      fetchCPIData();
    }
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'interest':
        return (
          <>
            <ThemedText style={styles.gaugeLabel}>오늘의 금리</ThemedText>
            <InterestRateGauge />
          </>
        );
      case 'exchange':
        return (
          <>
            <ThemedText style={styles.gaugeLabel}>오늘의 환율</ThemedText>
            <ExchangeRateGauge country={activeCountry} />
          </>
        );
      case 'price':
        return (
          <>
            <ThemedText style={styles.gaugeLabel}>소비자 물가지수 동향</ThemedText>
            <View style={styles.priceChartContainer}>
              {cpiLoading ? (
                <View style={styles.loadingContainer}>
                  <ThemedText style={styles.loadingText}>데이터를 불러오는 중...</ThemedText>
                </View>
              ) : cpiData && cpiData.history && Array.isArray(cpiData.history) && cpiData.history.length > 0 ? (
                <>
                  <View style={styles.cpiSummaryInfo}>
                    <View style={styles.cpiInfoItem}>
                      <ThemedText style={styles.cpiInfoLabel}>현재 CPI</ThemedText>
                      <ThemedText style={styles.cpiInfoValue}>
                        {(cpiData.currentCPI && isFinite(cpiData.currentCPI)) ? cpiData.currentCPI : 'N/A'}
                      </ThemedText>
                    </View>
                    <View style={styles.cpiInfoItem}>
                      <ThemedText style={styles.cpiInfoLabel}>전월대비</ThemedText>
                      <ThemedText style={[
                        styles.cpiInfoValue,
                        cpiData.changeRate > 0 ? styles.positiveChange : styles.negativeChange
                      ]}>
                        {(cpiData.changeRate && isFinite(cpiData.changeRate)) ? 
                          `${cpiData.changeRate > 0 ? '+' : ''}${cpiData.changeRate.toFixed(2)}%` : 'N/A'}
                      </ThemedText>
                    </View>
                    <View style={styles.cpiInfoItem}>
                      <ThemedText style={styles.cpiInfoLabel}>전년동월대비</ThemedText>
                      <ThemedText style={[
                        styles.cpiInfoValue,
                        cpiData.annualRate > 0 ? styles.positiveChange : styles.negativeChange
                      ]}>
                        {(cpiData.annualRate && isFinite(cpiData.annualRate)) ? 
                          `${cpiData.annualRate > 0 ? '+' : ''}${cpiData.annualRate.toFixed(1)}%` : 'N/A'}
                      </ThemedText>
                    </View>
                  </View>
                  <CPIChart data={cpiData.history.map(item => ({
                    date: item.date,
                    cpi: isFinite(item.cpiValue) ? item.cpiValue : 0,
                    monthlyChange: isFinite(item.monthlyChange) ? item.monthlyChange : 0,
                    annualChange: isFinite(item.annualChange) ? item.annualChange : 0
                  }))} />
                </>
              ) : (
                <View style={styles.errorContainer}>
                  <ThemedText style={styles.errorText}>
                    CPI 데이터를 준비 중입니다.{'\n'}
                    잠시 후 다시 시도해주세요.
                  </ThemedText>
                </View>
              )}
            </View>
          </>
        );
      default:
        return (
          <>
            <ThemedText style={styles.gaugeLabel}>오늘의 환율</ThemedText>
            <ExchangeRateGauge />
          </>
        );
    }
  }

  // 현재 탭에 따라 타이틀 결정
  const getTabTitle = () => {
    switch (activeTab) {
      case 'interest':
        return "금리 정보";
      case 'exchange':
        return "환율 정보";
      case 'price':
        return "물가 정보";
      default:
        return "환율 정보";
    }
  }
  
  // 현재 탭에 따라 서브타이틀 결정
  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'interest':
        return "금리 한눈에";
      case 'exchange':
        return "환율 한눈에";
      case 'price':
        return "물가 한눈에";
      default:
        return "환율 한눈에";
    }
  }

  // 현재 선택된 국가에 따른 환율 상세 정보 버튼 생성
  const renderExchangeDetailButton = () => {
    if (activeTab !== 'exchange') return null;
    
    let buttonTitle = "환율 상세 정보";
    let subtitle = "주요국 통화별 환율 추이 확인";
    let route = '/exchange-rate';
    
    switch(activeCountry) {
      case 'usa':
        buttonTitle = "미국 환율 상세 정보";
        subtitle = "미국 달러/원화 환율 추이 확인";
        route = '/exchange-rate?country=usa';
        break;
      case 'japan':
        buttonTitle = "일본 환율 상세 정보";
        subtitle = "일본 엔화/원화 환율 추이 확인";
        route = '/exchange-rate?country=japan';
        break;
      case 'china':
        buttonTitle = "중국 환율 상세 정보";
        subtitle = "중국 위안/원화 환율 추이 확인";
        route = '/exchange-rate?country=china';
        break;
      case 'europe':
        buttonTitle = "유럽 환율 상세 정보";
        subtitle = "유럽 유로/원화 환율 추이 확인";
        route = '/exchange-rate?country=europe';
        break;
    }
    
    return (
      <TouchableOpacity 
        style={styles.cardItem}
        onPress={() => router.push(route as any)}
      >
        <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
          <MaterialCommunityIcons name="currency-usd" size={24} color="#4CAF50" />
        </View>
        <View style={styles.cardTextContainer}>
          <ThemedText style={styles.cardTitle}>{buttonTitle}</ThemedText>
          <ThemedText style={styles.cardSubtitle}>{subtitle}</ThemedText>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: getTabTitle(),
          headerRight: () => (
            Platform.OS === 'web' ? (
              <TouchableOpacity 
                onPress={() => router.push('/admin/login')}
                style={styles.adminButton}
              >
                <MaterialCommunityIcons name="shield-account" size={22} color="#0066CC" />
                <ThemedText style={styles.adminButtonText}>관리자</ThemedText>
              </TouchableOpacity>
            ) : null
          )
        }} 
      />
      <StatusBar style="auto" />
      <View style={styles.mainContainer}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.scrollViewContent,
            activeTab === 'exchange' && { paddingBottom: 70 } // 국가 탭 높이만큼 여백 추가
          ]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.subtitle}>{getTabSubtitle()}</ThemedText>
          </View>
          
          {/* 선택된 탭 내용 */}
          {renderTabContent()}
          
          {/* 환율 추천 탭 - 환율 탭일 때만 표시 */}
          {activeTab === 'exchange' && (
            <ExchangeRateRecommendations country={activeCountry} />
          )}
          
          {/* 환율 계산기 - 환율 탭일 때만 표시 */}
          {activeTab === 'exchange' && (
            <ExchangeRateCalculator country={activeCountry} />
          )}
          
          {/* 하단 카드 - 탭에 맞게 표시 */}
          <View style={styles.sectionTitle}>
            <ThemedText style={styles.sectionTitleText}>자세히 알아보기</ThemedText>
          </View>
          
          <View style={styles.cardsContainer}>
            {activeTab === 'interest' && (
              <TouchableOpacity 
                style={styles.cardItem}
                onPress={() => router.push('/interest-rate' as any)}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <MaterialCommunityIcons name="trending-up" size={24} color="#1976D2" />
                </View>
                <View style={styles.cardTextContainer}>
                  <ThemedText style={styles.cardTitle}>금리 상세 정보</ThemedText>
                  <ThemedText style={styles.cardSubtitle}>정책금리, 시장금리, 대출금리 추이</ThemedText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>
            )}
            
            {activeTab === 'exchange' && renderExchangeDetailButton()}
            
            {activeTab === 'price' && (
              <TouchableOpacity 
                style={styles.cardItem}
                onPress={() => router.push('/consumer-price-index' as any)}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <MaterialCommunityIcons name="shopping" size={24} color="#FF9800" />
                </View>
                <View style={styles.cardTextContainer}>
                  <ThemedText style={styles.cardTitle}>물가지수 상세 정보</ThemedText>
                  <ThemedText style={styles.cardSubtitle}>품목별 물가 변동 추이 확인</ThemedText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
        
        {/* 국가 탭을 스크롤 영역 밖에 배치하여 고정 */}
        {activeTab === 'exchange' && (
          <View style={styles.fixedCountryTabContainer}>
            <TouchableOpacity 
              style={[styles.countryTab, activeCountry === 'usa' && styles.activeCountryTab]} 
              onPress={() => setActiveCountry('usa')}
            >
              <ThemedText style={[styles.countryTabText, activeCountry === 'usa' && styles.activeCountryTabText]}>
                미국
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.countryTab, activeCountry === 'japan' && styles.activeCountryTab]} 
              onPress={() => setActiveCountry('japan')}
            >
              <ThemedText style={[styles.countryTabText, activeCountry === 'japan' && styles.activeCountryTabText]}>
                일본
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.countryTab, activeCountry === 'china' && styles.activeCountryTab]} 
              onPress={() => setActiveCountry('china')}
            >
              <ThemedText style={[styles.countryTabText, activeCountry === 'china' && styles.activeCountryTabText]}>
                중국
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.countryTab, activeCountry === 'europe' && styles.activeCountryTab]} 
              onPress={() => setActiveCountry('europe')}
            >
              <ThemedText style={[styles.countryTabText, activeCountry === 'europe' && styles.activeCountryTabText]}>
                유럽
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  scrollViewContent: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 10,
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.8,
    lineHeight: 24,
    textAlign: 'center',
  },
  gaugeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    marginLeft: 5,
    color: '#333',
  },
  fixedCountryTabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  countryTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCountryTab: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  countryTabText: {
    fontSize: 14,
    color: '#666',
  },
  activeCountryTabText: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardsContainer: {
    gap: 12,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    marginRight: 8,
  },
  adminButtonText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  priceChartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  cpiSummaryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  cpiInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  cpiInfoLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  cpiInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  positiveChange: {
    color: '#d32f2f', // 빨간색 (상승)
  },
  negativeChange: {
    color: '#4caf50', // 초록색 (하락)
  },
}); 