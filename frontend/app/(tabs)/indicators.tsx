import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExchangeRateGauge from '../../components/ExchangeRateGauge';
import InterestRateGauge from '../../components/InterestRateGauge';
import CPIGauge from '../../components/CPIGauge';
import { ExchangeRateChart } from '../../components/charts/ExchangeRateChart';
import { InterestRateChart } from '../../components/charts/InterestRateChart';
import { CPIChart } from '../../components/charts/CPIChart';
import ExchangeRateRecommendations from '../../components/ExchangeRateRecommendations';
import InterestRateRecommendations from '../../components/InterestRateRecommendations';
import CPIRecommendations from '../../components/CPIRecommendations';
import NotificationSettingsModal from '../../components/NotificationSettingsModal';
import { economicIndexApi } from '../../services/api';
import { 
  initializeNotifications, 
  checkExchangeRateNotification, 
  checkInterestRateNotification, 
  checkCPINotification 
} from '../../utils/notificationUtils';

interface ExchangeRateData {
  currentRate: number;
  prevRate: number;
  changeRate: number;
  trend: string;
}

interface InterestRateData {
  currentRate: number;
  prevRate: number;
  changeRate: number;
  trend: string;
}

interface CPIData {
  currentCPI: number;
  prevMonthCPI: number;
  changeRate: number;
  annualRate: number;
  date?: string;
}

interface PeriodData {
  date: string;
  usdRate: number;
  eurRate: number;
  jpyRate: number;
  cnyRate?: number;
}

interface InterestRatePeriodData {
  date: string;
  rate: number;
  announcementDate: string;
}

export default function IndicatorsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [activeTab, setActiveTab] = useState(
    typeof params.tab === 'string' ? params.tab : 'exchange'
  );
  const [activeCountry, setActiveCountry] = useState('usa');
  
  const [exchangeRateData, setExchangeRateData] = useState<ExchangeRateData | null>(null);
  const [interestRateData, setInterestRateData] = useState<InterestRateData | null>(null);
  const [cpiData, setCpiData] = useState<CPIData | null>(null);
  const [weeklyData, setWeeklyData] = useState<PeriodData[]>([]);
  const [monthlyData, setMonthlyData] = useState<PeriodData[]>([]);
  const [interestRateHistoryData, setInterestRateHistoryData] = useState<InterestRatePeriodData[]>([]);
  const [cpiHistoryData, setCpiHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  // 알림 초기화 (Expo Go 환경에서는 제한적)
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await initializeNotifications();
      } catch (error) {
        console.log('알림 초기화 실패 (Expo Go 환경일 수 있음):', error);
      }
    };
    
    initNotifications();
  }, []);

  // params.tab이 변경되면 activeTab도 업데이트
  useEffect(() => {
    if (params.tab && typeof params.tab === 'string') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  // 달력 기준으로 n일 전 날짜 계산
  const getDaysAgo = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const getToday = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // 환율 차트 데이터 가져오기
  const fetchExchangeRateChartData = async () => {
    try {
      setChartLoading(true);
      
      // 현재 환율 데이터 가져오기
      const currentResponse = await economicIndexApi.getExchangeRate();
      if (currentResponse.data && currentResponse.data.success && currentResponse.data.data) {
        const apiData = currentResponse.data.data;
        let currentRate = 0;
        
        // 국가별 기본값 설정
        const getDefaultRate = (country: string) => {
          switch(country) {
            case 'usa': return 1300;
            case 'japan': return 1000;
            case 'china': return 180;
            case 'europe': return 1400;
            default: return 1300;
          }
        };
        
        // 선택된 국가에 따라 환율 설정
        switch(activeCountry) {
          case 'usa':
            currentRate = apiData.usdRate || getDefaultRate('usa');
            break;
          case 'japan':
            currentRate = apiData.jpyRate || getDefaultRate('japan');
            break;
          case 'china':
            currentRate = apiData.cnyRate || getDefaultRate('china');
            break;
          case 'europe':
            currentRate = apiData.eurRate || getDefaultRate('europe');
            break;
          default:
            currentRate = apiData.usdRate || getDefaultRate('usa');
        }
        
        setExchangeRateData({
          currentRate: currentRate,
          prevRate: currentRate,
          changeRate: 0,
          trend: '보합'
        });

        // 환율 알림 체크
        await checkExchangeRateNotification(apiData);
      }
      
      // 7일 데이터 가져오기
      const weekStartDate = getDaysAgo(14);
      const weekEndDate = getToday();
      const weeklyResponse = await economicIndexApi.getExchangeRateByPeriod(weekStartDate, weekEndDate);
      
      if (weeklyResponse.data && weeklyResponse.data.success && weeklyResponse.data.data) {
        const allWeeklyData = weeklyResponse.data.data;
        const filteredData = allWeeklyData.filter((item: PeriodData) => {
          const date = new Date(item.date);
          const dayOfWeek = date.getDay();
          return dayOfWeek !== 0 && dayOfWeek !== 6; // 주말 제외
        });
        const recentSevenDays = filteredData.length >= 7 ? filteredData.slice(-7) : filteredData;
        setWeeklyData(recentSevenDays);
      }

      // 30일 데이터 가져오기
      const monthStartDate = getDaysAgo(45);
      const monthEndDate = getToday();
      const monthlyResponse = await economicIndexApi.getExchangeRateByPeriod(monthStartDate, monthEndDate);
      
      if (monthlyResponse.data && monthlyResponse.data.success && monthlyResponse.data.data) {
        const allMonthlyData = monthlyResponse.data.data;
        const filteredData = allMonthlyData.filter((item: PeriodData) => {
          const date = new Date(item.date);
          const dayOfWeek = date.getDay();
          return dayOfWeek !== 0 && dayOfWeek !== 6; // 주말 제외
        });
        const recentThirtyDays = filteredData.length >= 30 ? filteredData.slice(-30) : filteredData;
        setMonthlyData(recentThirtyDays);
      }
    } catch (err) {
      console.error('환율 차트 데이터 로딩 실패:', err);
    } finally {
      setChartLoading(false);
    }
  };

  // 금리 차트 데이터 가져오기
  const fetchInterestRateChartData = async () => {
    try {
      setChartLoading(true);
      
      // 현재 금리 정보와 발표일 데이터를 병렬로 가져오기
      const [currentRateResponse, announcementsResponse] = await Promise.all([
        economicIndexApi.getInterestRate(),
        economicIndexApi.getInterestRateAnnouncements('KR')
      ]);
      
      if (currentRateResponse.data && currentRateResponse.data.success && currentRateResponse.data.data &&
          announcementsResponse.data && announcementsResponse.data.success) {
        
        // 현재 금리 데이터 설정
        const koreaData = currentRateResponse.data.data.korea;
        setInterestRateData({
          currentRate: koreaData.rate,
          prevRate: koreaData.rate,
          changeRate: 0,
          trend: '보합'
        });
        
        // 발표일 데이터를 차트용으로 변환
        const announcements = announcementsResponse.data.data || [];
        const historyData: InterestRatePeriodData[] = announcements.map((item: any) => ({
          date: item.date,
          rate: item.interestRate,
          announcementDate: item.date
        }));
        
        setInterestRateHistoryData(historyData);

        // 금리 알림 체크
        await checkInterestRateNotification(currentRateResponse.data.data);
      }
    } catch (err) {
      console.error('금리 차트 데이터 로딩 실패:', err);
      // 오류 시 기본 데이터 생성
      const defaultData: InterestRatePeriodData[] = [];
      const currentDate = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        
        defaultData.push({
          date: date.toISOString().split('T')[0],
          rate: 3.50,
          announcementDate: date.toISOString().split('T')[0]
        });
      }
      
      setInterestRateHistoryData(defaultData);
    } finally {
      setChartLoading(false);
    }
  };

  // 물가(CPI) 데이터 가져오기
  const fetchCPIData = async () => {
    try {
      setChartLoading(true);
      
      const response = await economicIndexApi.getConsumerPriceIndex();
      
      if (response.data && response.data.success && response.data.data) {
        const cpiData = response.data.data;
        
        console.log('🔍 [indicators] CPI API 응답 데이터:', cpiData);
        console.log('🔍 [indicators] CPI date 필드:', cpiData.date);
        console.log('🔍 [indicators] CPI 사용 가능한 필드:', Object.keys(cpiData));
        
        // 전년동월대비 변화율 사용 (annualRate가 주 필드)
        const currentCPI = cpiData.annualRate || cpiData.yearlyChange || 0;
        
        console.log('📅 [indicators] CPI date 저장:', cpiData.date);
        
        setCpiData({
          currentCPI: currentCPI,
          prevMonthCPI: currentCPI,
          changeRate: 0,
          annualRate: currentCPI,
          date: cpiData.date
        });
        
        console.log('✅ [indicators] CPI 데이터 설정 완료, date:', cpiData.date);
        
        // 히스토리 데이터 처리
        if (cpiData.history && Array.isArray(cpiData.history)) {
          const formattedHistory = cpiData.history.map((item: any) => ({
            date: item.date,
            cpi: item.cpiValue || item.cpi || 0,
            monthlyChange: item.monthlyChange || 0,
            annualChange: item.annualChange || 0
          }));
          // 데이터를 날짜 내림차순으로 정렬하여 최신 데이터가 앞에 오도록 함
          const sortedHistory = formattedHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          // 최근 6개월 데이터만 선택
          const recentHistory = sortedHistory.slice(0, 6);
          // 차트에서는 시간 순서대로 보여줘야 하므로 다시 오름차순으로 정렬
          const finalHistory = recentHistory.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          setCpiHistoryData(finalHistory);
        }

        // 물가 알림 체크
        await checkCPINotification(cpiData);
      }
    } catch (err) {
      console.error('물가 데이터 로딩 실패:', err);
    } finally {
      setChartLoading(false);
    }
  };

  // 데이터 로딩
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'exchange') {
          // 환율 차트 데이터 가져오기
          await fetchExchangeRateChartData();
        } else if (activeTab === 'interest') {
          // 금리 차트 데이터 가져오기
          await fetchInterestRateChartData();
        } else if (activeTab === 'cpi') {
          // 물가 데이터 가져오기
          await fetchCPIData();
        }
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  // 국가 변경 시 차트 데이터 다시 가져오기
  useEffect(() => {
    if (activeTab === 'exchange') {
      fetchExchangeRateChartData();
    }
  }, [activeCountry]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'exchange':
        return (
          <View style={styles.tabContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ThemedText>로딩 중...</ThemedText>
              </View>
            ) : (exchangeRateData && !loading) ? (
              <>
                <ExchangeRateGauge 
                  value={exchangeRateData.currentRate}
                  country={activeCountry}
                />
                
                <ExchangeRateRecommendations country={activeCountry} />
                
                {/* 7일 환율 변동 추이 */}
                <View style={styles.chartContainer}>
                  <ThemedText style={styles.chartTitle}>최근 7일 환율 변동 추이</ThemedText>
                  <ThemedText style={styles.chartSubtitle}>주말 및 공휴일 제외</ThemedText>
                  {chartLoading ? (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>차트 데이터 로딩 중...</ThemedText>
                    </View>
                  ) : weeklyData.length > 0 ? (
                    <ExchangeRateChart 
                      data={weeklyData} 
                      country={activeCountry}
                      height={180}
                    />
                  ) : (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>7일 데이터가 없습니다.</ThemedText>
                    </View>
                  )}
                </View>
                
                {/* 30일 환율 변동 추이 */}
                <View style={styles.chartContainer}>
                  <ThemedText style={styles.chartTitle}>최근 30일 환율 변동 추이</ThemedText>
                  <ThemedText style={styles.chartSubtitle}>주말 및 공휴일 제외</ThemedText>
                  {chartLoading ? (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>차트 데이터 로딩 중...</ThemedText>
                    </View>
                  ) : monthlyData.length > 0 ? (
                    <ExchangeRateChart 
                      data={monthlyData} 
                      country={activeCountry}
                      height={180}
                      showOnlyDay={true}
                    />
                  ) : (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>30일 데이터가 없습니다.</ThemedText>
                    </View>
                  )}
                </View>

                {/* 환율 수준별 기준 및 특징 */}
                <View style={styles.levelsContainer}>
                  <ThemedText style={styles.levelsTitle}>환율 수준별 기준 및 특징</ThemedText>
                  
                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#4CAF50' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>원화 강세 : 1,200원 이하</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 원화 가치가 상대적으로 높은 상태입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 수입품 가격 하락: 해외 상품을 더 싸게 구매할 수 있습니다.{'\n'}
                        • 해외 여행 유리: 해외 여행 시 더 많은 구매력을 가집니다.{'\n'}
                        • 수출 경쟁력 약화: 한국 제품의 해외 가격이 상대적으로 비싸집니다.{'\n'}
                        • 해외 투자 유리: 해외 자산 투자 시 더 많은 구매력을 가집니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#FF9800' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>적정 환율 : 1,200원~1,350원</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 수출입 균형이 맞는 적정 수준의 환율입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 수출입 균형: 수출과 수입이 균형을 이루는 수준입니다.{'\n'}
                        • 경제 안정: 환율 변동성이 낮아 경제 예측이 용이합니다.{'\n'}
                        • 투자 환경 안정: 기업들의 해외 투자 계획 수립이 안정적입니다.{'\n'}
                        • 소비자 혜택: 적절한 수준의 수입품 가격으로 소비자 선택권이 확보됩니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#F44336' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>원화 약세 : 1,350원 이상</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 원화 가치가 상대적으로 낮은 상태입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 수출 경쟁력 강화: 한국 제품의 해외 가격이 상대적으로 저렴해집니다.{'\n'}
                        • 수입품 가격 상승: 해외 상품을 구매할 때 더 많은 비용이 발생합니다.{'\n'}
                        • 해외 여행 부담: 해외 여행 시 구매력이 감소합니다.{'\n'}
                        • 물가 상승 압력: 수입 원재료 가격 상승으로 국내 물가에 영향을 미칩니다.
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* 환율의 의미 설명 */}
                <View style={styles.infoContainer}>
                  <ThemedText style={styles.infoTitle}>환율의 의미</ThemedText>
                  <ThemedText style={styles.infoContent}>
                    환율은 두 나라 화폐 간의 교환 비율을 나타냅니다. 원/달러 환율이 상승하면 수입품 가격이 오르고 수출 경쟁력이 강화됩니다.
                    한국은행의 콜금리 인상은 원/달러 환율 상승, 미국 연준의 연방자금금리 인상은 원/달러 환율 하락 경향을 보입니다.
                    환율은 무역, 투자, 소비 등 경제 전반에 영향을 미치는 중요한 경제 지표입니다.
                  </ThemedText>
                </View>

                {/* 환율 범위 기준 안내 */}
                <View style={styles.noticeContainer}>
                  <ThemedText style={styles.noticeTitle}>📋 환율 범위 기준 안내</ThemedText>
                  <ThemedText style={styles.noticeText}>
                    • 환율 구간은 한국 경제의 수출입 균형을 고려하여 설정되었습니다.{'\n'}
                    • 적정 환율 범위(1,200원~1,350원)는 한국 경제의 안정적 성장을 위한 수준입니다.{'\n'}
                    • 원화 강세(1,200원 이하)와 원화 약세(1,350원 이상) 구간도 이에 맞춰 조정되었습니다.{'\n'}
                    • 실제 투자 결정 시에는 다양한 경제 지표를 종합적으로 고려하시기 바랍니다.
                  </ThemedText>
                </View>
              </>
            ) : (
              <ThemedText>환율 데이터를 불러올 수 없습니다.</ThemedText>
            )}
          </View>
        );
      
      case 'interest':
        return (
          <View style={styles.tabContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ThemedText>로딩 중...</ThemedText>
              </View>
            ) : (
              <>
                <InterestRateGauge 
                  value={interestRateData?.currentRate || 3.50}
                />
                
                <InterestRateRecommendations />
                
                {/* 금리 변동 추이 */}
                <View style={styles.chartContainer}>
                  <ThemedText style={styles.chartTitle}>정책금리 동향</ThemedText>
                  {chartLoading ? (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>차트 데이터 로딩 중...</ThemedText>
                    </View>
                  ) : interestRateHistoryData.length > 0 ? (
                    <InterestRateChart 
                      data={interestRateHistoryData}
                    />
                  ) : (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>정책금리 히스토리 데이터를 준비 중입니다.</ThemedText>
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
          </View>
        );
      
      case 'cpi':
        return (
          <View style={styles.tabContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ThemedText>로딩 중...</ThemedText>
              </View>
            ) : cpiData ? (
              <>
                <CPIGauge value={cpiData.currentCPI} dataDate={cpiData.date} />
                
                <CPIRecommendations />
                
                {/* CPI 차트 */}
                <View style={styles.chartContainer}>
                  {chartLoading ? (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>차트 데이터 로딩 중...</ThemedText>
                    </View>
                  ) : cpiHistoryData.length > 0 ? (
                    <CPIChart data={cpiHistoryData} />
                  ) : (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>CPI 히스토리 데이터를 준비 중입니다.</ThemedText>
                    </View>
                  )}
                </View>

                {/* 물가 수준별 기준 및 특징 */}
                <View style={styles.levelsContainer}>
                  <ThemedText style={styles.levelsTitle}>물가 수준별 기준 및 특징</ThemedText>
                  
                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#F44336' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>디플레이션 : -1%~0%</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 물가가 지속적으로 하락하는 현상으로, 경제에 가장 위험한 신호 중 하나입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 소비 절벽: 사람들이 물가가 계속 떨어질 것으로 기대해 아예 소비를 멈춥니다.{'\n'}
                        • 기업 실적 악화 및 도산: 물건값이 떨어지고 안 팔리니 기업의 매출과 이익이 급감합니다.{'\n'}
                        • 실질 부채 부담 증가: 빚의 가치는 그대로인데 돈의 가치가 오르면서 빚을 갚기가 더 어려워집니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#FF9800' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>저물가 (디스인플레이션) : 0%~1%</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 물가가 오르긴 하지만, 그 상승률이 목표치(2%)에 크게 못 미치는 낮은 수준을 보이는 상태입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 소비 지연: "나중에 사면 더 싸지 않을까?"라는 심리 때문에 소비를 미루게 됩니다.{'\n'}
                        • 기업 투자 위축: 물건이 안 팔리니 기업들이 생산과 투자를 줄입니다.{'\n'}
                        • 경기 침체 우려: 저물가가 길어지면 '디플레이션'으로 빠질 위험이 커집니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#4CAF50' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>안정적인 물가 (물가안정목표) : 1%~3%</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 경제가 건강하게 성장하고 있다는 신호입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 소비자들은 물가가 완만하게 오를 것을 예상하므로 소비를 미루지 않습니다.{'\n'}
                        • 기업들은 적절한 투자를 통해 생산을 늘립니다.{'\n'}
                        • 경제가 선순환하며 성장하기에 가장 이상적인 상태입니다.{'\n'}
                        • 한국은행, 미국 연준(Fed) 등 세계 중앙은행의 공식적인 목표치입니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#FF9800' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>고물가 (인플레이션) : 3%~5%</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 물가상승률이 목표치(2%)를 지속적으로, 그리고 큰 폭으로 웃도는 상태입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 3~5%: '우려' 또는 '경계' 수준으로 진입했다고 봅니다.{'\n'}
                        • 화폐 가치 하락: 똑같은 돈으로 살 수 있는 물건이 줄어듭니다.{'\n'}
                        • 실질 소득 감소: 월급은 그대로인데 물건값이 올라 생활이 팍팍해집니다.{'\n'}
                        • 중앙은행이 금리 인상 등 통화정책 대응을 고려하는 단계입니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#F44336' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>초고물가 : 5% 이상</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 확실한 '고물가' 국면으로 판단하며, 중앙은행이 금리 인상 등 적극적인 대응에 나섭니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 화폐 가치 급락: 돈의 구매력이 빠르게 감소합니다.{'\n'}
                        • 경제 불확실성 증가: 미래를 예측하기 어려워 기업들이 투자를 꺼리게 됩니다.{'\n'}
                        • 긴급한 정책 대응 필요: 중앙은행의 적극적인 금리 인상 정책이 시행됩니다.{'\n'}
                        • 생활비 부담 급증: 필수재 가격 상승으로 서민 생활이 어려워집니다.
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* 소비자물가지수 설명 */}
                <View style={styles.infoContainer}>
                  <ThemedText style={styles.infoTitle}>소비자물가지수의 의미</ThemedText>
                  <ThemedText style={styles.infoContent}>
                    소비자물가지수(CPI)는 소비자가 구입하는 상품과 서비스의 가격 변동을 측정하는 지표입니다.
                    CPI 상승은 인플레이션을 의미하며, 물가 안정이 중요한 경제 정책 목표 중 하나입니다.
                    한국은행은 물가 안정을 위해 통화정책을 운용합니다.
                  </ThemedText>
                </View>

                {/* 물가 범위 기준 안내 */}
                <View style={styles.noticeContainer}>
                  <ThemedText style={styles.noticeTitle}>📋 물가 범위 기준 안내</ThemedText>
                  <ThemedText style={styles.noticeText}>
                    • 물가 구간은 한국은행 2% 물가안정목표 정책을 바탕으로 재구성되었습니다.{'\n'}
                    • 안정물가 범위(1%~3%)는 한국은행의 물가안정목표 ±1%p 기준입니다.{'\n'}
                    • 디플레이션(-1%~0%), 저물가(0%~1%) 구간도 이에 맞춰 조정되었습니다.{'\n'}
                    • 실제 투자 결정 시에는 다양한 경제 지표를 종합적으로 고려하시기 바랍니다.
                  </ThemedText>
                </View>
              </>
            ) : (
              <ThemedText>물가 데이터를 불러올 수 없습니다.</ThemedText>
            )}
          </View>
        );
      
      default:
        return null;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'exchange': return '환율';
      case 'interest': return '금리';
      case 'cpi': return '물가';
      default: return '지표';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'exchange': return '실시간 환율 정보';
      case 'interest': return '기준금리 및 금리 동향';
      case 'cpi': return '소비자물가지수 현황';
      default: return '경제 지표 현황';
    }
  };



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.headerTitle}>{getTabTitle()}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{getTabSubtitle()}</ThemedText>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => setNotificationModalVisible(true)}
        >
          <MaterialCommunityIcons name="bell" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* 탭 버튼 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'exchange' && styles.activeTabButton]}
          onPress={() => setActiveTab('exchange')}
        >
          <MaterialCommunityIcons 
            name="currency-usd" 
            size={20} 
            color={activeTab === 'exchange' ? '#007AFF' : '#8E8E93'} 
          />
          <ThemedText style={[
            styles.tabButtonText, 
            activeTab === 'exchange' && styles.activeTabButtonText
          ]}>
            환율
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'interest' && styles.activeTabButton]}
          onPress={() => setActiveTab('interest')}
        >
          <MaterialCommunityIcons 
            name="percent" 
            size={20} 
            color={activeTab === 'interest' ? '#007AFF' : '#8E8E93'} 
          />
          <ThemedText style={[
            styles.tabButtonText, 
            activeTab === 'interest' && styles.activeTabButtonText
          ]}>
            금리
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'cpi' && styles.activeTabButton]}
          onPress={() => setActiveTab('cpi')}
        >
          <MaterialCommunityIcons 
            name="chart-line" 
            size={20} 
            color={activeTab === 'cpi' ? '#007AFF' : '#8E8E93'} 
          />
          <ThemedText style={[
            styles.tabButtonText, 
            activeTab === 'cpi' && styles.activeTabButtonText
          ]}>
            물가
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* 국가 선택 (환율 탭에서만) */}
      {activeTab === 'exchange' && (
        <View style={styles.countryContainer}>
          <TouchableOpacity
            style={[styles.countryButton, activeCountry === 'usa' && styles.activeCountryButton]}
            onPress={() => setActiveCountry('usa')}
          >
            <ThemedText style={[
              styles.countryButtonText, 
              activeCountry === 'usa' && styles.activeCountryButtonText
            ]}>
              USD
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.countryButton, activeCountry === 'japan' && styles.activeCountryButton]}
            onPress={() => setActiveCountry('japan')}
          >
            <ThemedText style={[
              styles.countryButtonText, 
              activeCountry === 'japan' && styles.activeCountryButtonText
            ]}>
              JPY
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.countryButton, activeCountry === 'europe' && styles.activeCountryButton]}
            onPress={() => setActiveCountry('europe')}
          >
            <ThemedText style={[
              styles.countryButtonText, 
              activeCountry === 'europe' && styles.activeCountryButtonText
            ]}>
              EUR
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.countryButton, activeCountry === 'china' && styles.activeCountryButton]}
            onPress={() => setActiveCountry('china')}
          >
            <ThemedText style={[
              styles.countryButtonText, 
              activeCountry === 'china' && styles.activeCountryButtonText
            ]}>
              CNY
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* 컨텐츠 */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* 알림 설정 모달 */}
      <NotificationSettingsModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  notificationButton: {
    padding: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#F0F8FF',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 6,
  },
  activeTabButtonText: {
    color: '#007AFF',
  },
  countryContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  countryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeCountryButton: {
    backgroundColor: '#F0F8FF',
  },
  countryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeCountryButtonText: {
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  chartPlaceholder: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginVertical: 16,
  },
  chartPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  infoContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  levelsContainer: {
    backgroundColor: '#FBFCFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  levelsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  levelItem: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  levelIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  levelContent: {
    flex: 1,
  },
  levelName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  levelStatus: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  levelDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#555',
  },
  noticeContainer: {
    backgroundColor: '#FBFCFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
}); 