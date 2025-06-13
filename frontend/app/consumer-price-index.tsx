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
          const cpiData = response.data.data;
          setCpiData({
            cpi: cpiData.currentCPI || cpiData.cpi || 108.5,
            monthlyChange: cpiData.changeRate || cpiData.monthlyChange || 0.3,
            annualChange: cpiData.annualRate || cpiData.annualChange || 1.8,
            lastUpdated: cpiData.lastUpdated || new Date().toISOString()
          });
          
                     // 히스토리 데이터 처리
           if (cpiData.history && Array.isArray(cpiData.history)) {
             const formattedHistory = cpiData.history.map((item: any) => ({
               date: item.date,
               cpi: item.cpiValue || item.cpi || 0,
               monthlyChange: item.monthlyChange || 0,
               annualChange: item.annualChange || 0
             }));
             setHistoricalData(formattedHistory);
          }
        }
      } catch (err) {
        console.error('CPI 데이터 로딩 실패:', err);
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
            
            {/* 물가 수준별 분석 */}
            <View style={styles.analysisContainer}>
              <ThemedText style={styles.analysisTitle}>물가 상황 분석</ThemedText>
              {cpiData && (
                <View style={styles.analysisContent}>
                  <View style={styles.analysisItem}>
                    <ThemedText style={styles.analysisLabel}>전월대비</ThemedText>
                    <ThemedText style={[
                      styles.analysisValue,
                      cpiData.monthlyChange > 0 ? styles.positiveValue : styles.negativeValue
                    ]}>
                      {cpiData.monthlyChange > 0 ? '+' : ''}{cpiData.monthlyChange.toFixed(1)}%
                    </ThemedText>
                  </View>
                  <View style={styles.analysisItem}>
                    <ThemedText style={styles.analysisLabel}>전년동월대비</ThemedText>
                    <ThemedText style={[
                      styles.analysisValue,
                      cpiData.annualChange > 0 ? styles.positiveValue : styles.negativeValue
                    ]}>
                      {cpiData.annualChange > 0 ? '+' : ''}{cpiData.annualChange.toFixed(1)}%
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>

            {/* 물가 수준별 기준 및 특징 */}
            <View style={styles.levelsContainer}>
              <ThemedText style={styles.levelsTitle}>물가 수준별 기준 및 특징</ThemedText>
              
              <View style={styles.levelItem}>
                <View style={[styles.levelIndicator, { backgroundColor: '#F44336' }]} />
                <View style={styles.levelContent}>
                  <ThemedText style={styles.levelName}>디플레이션 : -1%~0% 미만</ThemedText>
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
                  <ThemedText style={styles.levelName}>저물가 (디스인플레이션) : 0%~2% 미만</ThemedText>
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
                  <ThemedText style={styles.levelName}>안정적인 물가 (물가안정목표) : 2%~3% 미만</ThemedText>
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
  analysisContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  analysisContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  analysisItem: {
    alignItems: 'center',
  },
  analysisLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  analysisValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positiveValue: {
    color: '#F44336',
  },
  negativeValue: {
    color: '#4CAF50',
  },
  levelsContainer: {
    backgroundColor: '#fff',
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
}); 