import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { economicIndexApi } from '../services/api';

interface RecommendationItem {
  category: string;
  status: 'recommended' | 'not-recommended' | 'neutral';
  description: string;
  icon: string;
}

const CPIRecommendations: React.FC = () => {
  const [currentCPI, setCurrentCPI] = useState<number | null>(null);
  const [monthlyChange, setMonthlyChange] = useState<number | null>(null);
  const [yearlyChange, setYearlyChange] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);

  useEffect(() => {
    fetchCPIAndGenerateRecommendations();
  }, []);

  const fetchCPIAndGenerateRecommendations = async () => {
    setLoading(true);
    
    try {
      const response = await economicIndexApi.getConsumerPriceIndex();
      
      if (response.data && response.data.success && response.data.data) {
        const cpiData = response.data.data;
        console.log('🔍 [CPIRecommendations] 받은 CPI 데이터:', cpiData);
        
        const current = cpiData.currentCPI;
        const monthly = cpiData.changeRate || cpiData.monthlyChange;
        const yearly = cpiData.annualRate || cpiData.yearlyChange;
        
        console.log('📊 [CPIRecommendations] 파싱된 데이터:', {
          current,
          monthly,
          yearly,
          originalData: cpiData
        });
        
        setCurrentCPI(current);
        setMonthlyChange(monthly);
        setYearlyChange(yearly);
        
        if (yearly !== null && yearly !== undefined) {
          const recommendations = generateRecommendations(yearly, monthly || 0);
          console.log('💡 [CPIRecommendations] 생성된 추천:', recommendations);
          setRecommendations(recommendations);
        } else {
          console.warn('⚠️ [CPIRecommendations] yearly 데이터가 없습니다');
        }
      }
    } catch (error) {
      console.error('물가 데이터 가져오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = (yearlyChange: number, monthlyChange: number): RecommendationItem[] => {
    if (yearlyChange >= -1 && yearlyChange < 0) { // 디플레이션 (-1%~0%)
      return [
        { category: '부동산', status: 'not-recommended', description: '부동산 투자 비추천', icon: 'home' },
        { category: '실물자산', status: 'not-recommended', description: '금/실물자산 비추천', icon: 'gold' },
        { category: '현금 보유', status: 'recommended', description: '현금 보유 추천', icon: 'cash-multiple' },
        { category: '채권', status: 'recommended', description: '장기 채권 추천', icon: 'file-chart' },
        { category: '소비 지출', status: 'not-recommended', description: '불필요한 소비 자제', icon: 'cart' },
        { category: '내구재 구매', status: 'not-recommended', description: '내구재 구매 연기', icon: 'car' },
        { category: '주식 투자', status: 'not-recommended', description: '주식 투자 비추천', icon: 'chart-line' }
      ];
    } else if (yearlyChange >= 0 && yearlyChange < 1.0) { // 저물가 (0%~1%)
      return [
        { category: '부동산', status: 'neutral', description: '부동산 투자 관망', icon: 'home' },
        { category: '실물자산', status: 'neutral', description: '금/실물자산 관망', icon: 'gold' },
        { category: '현금 보유', status: 'neutral', description: '현금 비중 조절', icon: 'cash-multiple' },
        { category: '채권', status: 'recommended', description: '장기 채권 추천', icon: 'file-chart' },
        { category: '소비 지출', status: 'recommended', description: '소비 지출 적기', icon: 'cart' },
        { category: '내구재 구매', status: 'recommended', description: '내구재 구매 추천', icon: 'car' },
        { category: '주식 투자', status: 'neutral', description: '성장주 투자 관망', icon: 'chart-line' }
      ];
    } else if (yearlyChange >= 1.0 && yearlyChange < 3.0) { // 안정물가 (1%~3%)
      return [
        { category: '부동산', status: 'neutral', description: '부동산 투자 균형', icon: 'home' },
        { category: '실물자산', status: 'neutral', description: '금/실물자산 균형', icon: 'gold' },
        { category: '현금 보유', status: 'neutral', description: '현금 비중 조절', icon: 'cash-multiple' },
        { category: '채권', status: 'neutral', description: '채권 투자 균형', icon: 'file-chart' },
        { category: '소비 지출', status: 'neutral', description: '계획적 소비', icon: 'cart' },
        { category: '내구재 구매', status: 'neutral', description: '필요시 구매', icon: 'car' },
        { category: '주식 투자', status: 'neutral', description: '분산 투자 균형', icon: 'chart-line' }
      ];
    } else if (yearlyChange >= 3.0 && yearlyChange < 5.0) { // 고물가 (3%~5%)
      return [
        { category: '부동산', status: 'recommended', description: '부동산 투자 추천', icon: 'home' },
        { category: '실물자산', status: 'recommended', description: '금/실물자산 추천', icon: 'gold' },
        { category: '현금 보유', status: 'not-recommended', description: '현금 보유 비추천', icon: 'cash-multiple' },
        { category: '채권', status: 'not-recommended', description: '채권 투자 비추천', icon: 'file-chart' },
        { category: '소비 지출', status: 'neutral', description: '필수재 위주 소비', icon: 'cart' },
        { category: '내구재 구매', status: 'recommended', description: '내구재 조기 구매', icon: 'car' },
        { category: '주식 투자', status: 'recommended', description: '인플레이션 수혜주', icon: 'chart-line' }
      ];
    } else if (yearlyChange >= 5.0) { // 초고물가 (5%~)
      return [
        { category: '부동산', status: 'recommended', description: '부동산 강력 추천', icon: 'home' },
        { category: '실물자산', status: 'recommended', description: '금/실물자산 강력 추천', icon: 'gold' },
        { category: '현금 보유', status: 'not-recommended', description: '현금 보유 비추천', icon: 'cash-multiple' },
        { category: '채권', status: 'not-recommended', description: '채권 투자 비추천', icon: 'file-chart' },
        { category: '소비 지출', status: 'not-recommended', description: '불필요한 소비 자제', icon: 'cart' },
        { category: '내구재 구매', status: 'recommended', description: '필수 내구재 조기 구매', icon: 'car' },
        { category: '주식 투자', status: 'recommended', description: '원자재/에너지주', icon: 'chart-line' }
      ];
    } else { // -1% 미만인 경우 (극심한 디플레이션)
      return [
        { category: '부동산', status: 'not-recommended', description: '부동산 투자 비추천', icon: 'home' },
        { category: '실물자산', status: 'not-recommended', description: '금/실물자산 비추천', icon: 'gold' },
        { category: '현금 보유', status: 'recommended', description: '현금 보유 강력 추천', icon: 'cash-multiple' },
        { category: '채권', status: 'recommended', description: '국채 강력 추천', icon: 'file-chart' },
        { category: '소비 지출', status: 'not-recommended', description: '소비 지출 최소화', icon: 'cart' },
        { category: '내구재 구매', status: 'not-recommended', description: '구매 최대한 연기', icon: 'car' },
        { category: '주식 투자', status: 'not-recommended', description: '주식 투자 비추천', icon: 'chart-line' }
      ];
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'recommended': return '#4CAF50';
      case 'not-recommended': return '#F44336';
      case 'neutral': return '#FF9800';
      default: return '#666';
    }
  };

  const getStatusText = (status: string, category: string) => {
    switch(status) {
      case 'recommended': return '추천';
      case 'not-recommended': return '비추천';
      case 'neutral': return '관망';
      default: return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'recommended': return 'thumb-up';
      case 'not-recommended': return 'thumb-down';
      case 'neutral': return 'minus';
      default: return 'help';
    }
  };

  const getDetailedExplanation = (item: RecommendationItem, yearlyChange: number): string => {
    const category = item.category;
    const status = item.status;
    
    // 물가 상황 판단
    let inflationLevel = '';
    if (yearlyChange >= -1 && yearlyChange < 0) inflationLevel = 'deflation';
    else if (yearlyChange >= 0 && yearlyChange < 1.0) inflationLevel = 'low';
    else if (yearlyChange >= 1.0 && yearlyChange < 3.0) inflationLevel = 'stable';
    else if (yearlyChange >= 3.0 && yearlyChange < 5.0) inflationLevel = 'high';
    else if (yearlyChange >= 5.0) inflationLevel = 'very_high';
    else inflationLevel = 'severe_deflation';

    const explanations: { [key: string]: { [key: string]: { [key: string]: string } } } = {
      '부동산': {
        deflation: {
          'not-recommended': '디플레이션 시기에는 부동산 가격이 하락할 가능성이 높습니다. 또한 경기 침체로 인해 임대 수요도 감소하여 임대 수익률이 낮아질 수 있습니다.'
        },
        low: {
          'neutral': '저물가 상황에서는 부동산 시장이 안정적이지만, 급격한 상승은 기대하기 어렵습니다. 신중한 검토 후 투자를 고려해보세요.'
        },
        stable: {
          'neutral': '안정적인 물가 상황에서는 부동산 투자의 리스크와 수익이 균형을 이룹니다. 개별 물건의 가치를 면밀히 검토하세요.'
        },
        high: {
          'recommended': '고물가 시기에는 부동산이 인플레이션 헤지 수단으로 작용합니다. 실물 자산의 가치가 상승하여 투자 매력도가 높아집니다.'
        },
        very_high: {
          'recommended': '초고물가 상황에서 부동산은 화폐 가치 하락에 대한 강력한 보호막 역할을 합니다. 실물 자산으로서의 가치가 급상승할 가능성이 높습니다.'
        },
        severe_deflation: {
          'not-recommended': '극심한 디플레이션에서는 부동산 가격 급락 위험이 매우 높습니다. 경기 침체가 심화되어 부동산 시장이 크게 위축될 수 있습니다.'
        }
      },
      '실물자산': {
        deflation: {
          'not-recommended': '디플레이션 시기에는 금, 은 등 실물자산의 가격도 하락 압력을 받습니다. 현금의 구매력이 상승하므로 실물자산 보유의 매력이 떨어집니다.'
        },
        low: {
          'neutral': '저물가 환경에서는 실물자산의 수익률이 제한적입니다. 포트폴리오 다양화 차원에서 소량 보유를 고려할 수 있습니다.'
        },
        stable: {
          'neutral': '안정적인 물가에서는 실물자산이 포트폴리오의 안정성을 제공합니다. 전체 자산의 5-10% 정도 보유를 권장합니다.'
        },
        high: {
          'recommended': '고물가 시기에는 금, 은 등 실물자산이 인플레이션으로부터 자산을 보호하는 효과적인 수단입니다. 화폐 가치 하락에 대비할 수 있습니다.'
        },
        very_high: {
          'recommended': '초고물가 상황에서는 실물자산이 필수적입니다. 금, 은, 원자재 등은 화폐 가치 급락 상황에서 가치를 유지하거나 상승시킵니다.'
        },
        severe_deflation: {
          'not-recommended': '극심한 디플레이션에서는 현금의 가치가 급상승하므로 실물자산 보유보다는 현금 보유가 유리합니다.'
        }
      },
      '현금 보유': {
        deflation: {
          'recommended': '디플레이션 시기에는 현금의 구매력이 지속적으로 상승합니다. 물가 하락으로 같은 돈으로 더 많은 것을 살 수 있게 됩니다.'
        },
        low: {
          'neutral': '저물가 환경에서는 현금의 실질 가치가 안정적입니다. 적절한 현금 비중을 유지하면서 기회를 노려보세요.'
        },
        stable: {
          'neutral': '안정적인 물가에서는 현금 보유와 투자의 균형을 맞추는 것이 중요합니다. 긴급자금과 투자자금을 적절히 배분하세요.'
        },
        high: {
          'not-recommended': '고물가 시기에는 현금의 구매력이 빠르게 감소합니다. 인플레이션이 현금 가치를 지속적으로 떨어뜨립니다.'
        },
        very_high: {
          'not-recommended': '초고물가 상황에서는 현금 보유가 큰 손실을 초래합니다. 화폐 가치가 급격히 하락하여 구매력이 크게 떨어집니다.'
        },
        severe_deflation: {
          'recommended': '극심한 디플레이션에서는 현금이 최고의 자산입니다. 물가 급락으로 현금의 구매력이 극대화됩니다.'
        }
      },
      '채권': {
        deflation: {
          'recommended': '디플레이션 시기에는 금리가 하락하여 기존 채권의 가격이 상승합니다. 특히 장기 국채의 수익률이 높아집니다.'
        },
        low: {
          'recommended': '저물가 환경에서는 채권이 안정적인 수익을 제공합니다. 금리 상승 리스크가 낮아 채권 투자에 유리합니다.'
        },
        stable: {
          'neutral': '안정적인 물가에서는 채권이 포트폴리오의 안정성을 제공합니다. 주식과의 적절한 배분을 통해 리스크를 관리하세요.'
        },
        high: {
          'not-recommended': '고물가 시기에는 중앙은행이 금리를 인상할 가능성이 높아 기존 채권 가격이 하락할 위험이 있습니다.'
        },
        very_high: {
          'not-recommended': '초고물가 상황에서는 급격한 금리 인상으로 채권 가격이 큰 폭으로 하락할 수 있습니다. 인플레이션이 채권의 실질 수익률을 크게 떨어뜨립니다.'
        },
        severe_deflation: {
          'recommended': '극심한 디플레이션에서는 국채가 가장 안전한 투자처입니다. 정부의 신용도가 높고 디플레이션으로 실질 수익률이 상승합니다.'
        }
      },
      '소비 지출': {
        deflation: {
          'not-recommended': '디플레이션 시기에는 물가가 지속적으로 하락하므로 구매를 늦출수록 유리합니다. 불필요한 소비는 자제하는 것이 좋습니다.'
        },
        low: {
          'recommended': '저물가 시기는 소비하기 좋은 타이밍입니다. 물가 상승 전에 필요한 물건들을 구매하면 비용을 절약할 수 있습니다.'
        },
        stable: {
          'neutral': '안정적인 물가에서는 계획적인 소비가 중요합니다. 급하지 않은 구매는 신중히 검토하고, 필요한 것은 적절한 시기에 구매하세요.'
        },
        high: {
          'neutral': '고물가 시기에는 필수재 위주로 소비를 제한하는 것이 좋습니다. 사치품이나 선택적 소비는 줄이고 꼭 필요한 것만 구매하세요.'
        },
        very_high: {
          'not-recommended': '초고물가 상황에서는 불필요한 소비를 최대한 자제해야 합니다. 생활비 부담이 급증하므로 절약이 필수입니다.'
        },
        severe_deflation: {
          'not-recommended': '극심한 디플레이션에서는 소비를 최소화해야 합니다. 물가가 급격히 하락하므로 구매를 늦출수록 더 저렴하게 살 수 있습니다.'
        }
      },
      '내구재 구매': {
        deflation: {
          'recommended': '디플레이션 시기에는 내구재 구매를 연기하는 것이 유리합니다. 시간이 지날수록 더 저렴하게 구매할 수 있습니다.'
        },
        low: {
          'recommended': '저물가 시기는 내구재 구매의 좋은 기회입니다. 가격이 상승하기 전에 필요한 내구재를 구매하면 장기적으로 비용을 절약할 수 있습니다.'
        },
        stable: {
          'neutral': '안정적인 물가에서는 필요에 따라 내구재를 구매하면 됩니다. 급하지 않다면 세일 시기를 기다리는 것도 좋습니다.'
        },
        high: {
          'recommended': '고물가 시기에는 내구재를 조기에 구매하는 것이 유리합니다. 앞으로 가격이 더 오를 가능성이 높습니다.'
        },
        very_high: {
          'recommended': '초고물가 상황에서는 필수적인 내구재를 최대한 빨리 구매해야 합니다. 물가 상승 속도가 빨라 늦으면 부담이 더 커집니다.'
        },
        severe_deflation: {
          'not-recommended': '극심한 디플레이션에서는 내구재 구매를 최대한 연기해야 합니다. 가격이 급격히 하락하므로 기다릴수록 유리합니다.'
        }
      },
      '주식 투자': {
        deflation: {
          'not-recommended': '디플레이션 시기에는 기업 실적이 악화되고 주가가 하락할 가능성이 높습니다. 경기 침체로 인해 주식 시장이 전반적으로 부진합니다.'
        },
        low: {
          'neutral': '저물가 환경에서는 성장주에 관심을 가져볼 수 있습니다. 저금리 환경이 지속되면서 주식의 상대적 매력도가 높아질 수 있습니다.'
        },
        stable: {
          'neutral': '안정적인 물가에서는 분산 투자를 통해 주식 투자를 고려할 수 있습니다. 경제가 안정적이므로 장기 투자 관점에서 접근하세요.'
        },
        high: {
          'recommended': '고물가 시기에는 인플레이션 수혜를 받는 업종의 주식이 좋은 투자처가 될 수 있습니다. 원자재, 에너지, 부동산 관련 주식을 고려해보세요.'
        },
        very_high: {
          'recommended': '초고물가 상황에서는 원자재, 에너지 관련 주식이 강세를 보일 가능성이 높습니다. 인플레이션 수혜 업종에 집중 투자를 고려하세요.'
        },
        severe_deflation: {
          'not-recommended': '극심한 디플레이션에서는 주식 투자를 피하는 것이 좋습니다. 기업들의 수익성이 크게 악화되어 주가 하락이 불가피합니다.'
        }
      }
    };

    return explanations[category]?.[inflationLevel]?.[status] || '해당 항목에 대한 상세 설명을 준비 중입니다.';
  };

  const handleItemPress = (item: RecommendationItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <ThemedText style={styles.title}>물가 기반 추천</ThemedText>
        <View style={styles.container}>
          <ThemedText style={styles.loadingText}>추천 정보를 불러오는 중...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <ThemedText style={styles.title}>물가 기반 추천</ThemedText>
      <View style={styles.container}>
        <View style={styles.recommendationsGrid}>
          {recommendations.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.recommendationCard}
              onPress={() => handleItemPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={styles.leftSection}>
                  <MaterialCommunityIcons 
                    name={item.icon as any} 
                    size={24} 
                    color={getStatusColor(item.status)} 
                  />
                  <View style={styles.textSection}>
                    <ThemedText style={styles.categoryText}>{item.category}</ThemedText>
                    <ThemedText style={styles.descriptionText}>{item.description}</ThemedText>
                  </View>
                </View>
                <View style={styles.rightSection}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <MaterialCommunityIcons 
                      name={getStatusIcon(item.status) as any} 
                      size={14} 
                      color="#fff" 
                    />
                    <ThemedText style={styles.statusBadgeText}>
                      {getStatusText(item.status, item.category)}
                    </ThemedText>
                  </View>
                  <MaterialCommunityIcons 
                    name="information-outline" 
                    size={16} 
                    color="#999" 
                    style={styles.infoIcon}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 상세 설명 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons 
                  name={selectedItem?.icon as any} 
                  size={28} 
                  color={getStatusColor(selectedItem?.status || 'neutral')} 
                />
                <ThemedText style={styles.modalTitle}>{selectedItem?.category}</ThemedText>
              </View>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedItem?.status || 'neutral') }]}>
              <MaterialCommunityIcons 
                name={getStatusIcon(selectedItem?.status || 'neutral') as any} 
                size={16} 
                color="#fff" 
              />
              <ThemedText style={styles.modalStatusText}>
                {getStatusText(selectedItem?.status || 'neutral', selectedItem?.category || '')}
              </ThemedText>
            </View>

            <ThemedText style={styles.modalDescription}>
              {selectedItem?.description}
            </ThemedText>

            <View style={styles.modalExplanationSection}>
              <ThemedText style={styles.modalExplanationTitle}>상세 분석</ThemedText>
              <ThemedText style={styles.modalExplanationText}>
                {selectedItem && yearlyChange !== null 
                  ? getDetailedExplanation(selectedItem, yearlyChange)
                  : '상세 설명을 불러오는 중입니다.'
                }
              </ThemedText>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 2,
    textAlign: 'left',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 4,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  recommendationsGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  recommendationCard: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textSection: {
    marginLeft: 12,
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    color: '#212529',
  },
  descriptionText: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    minWidth: 68,
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 3,
  },
  infoIcon: {
    marginLeft: 2,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 6,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalExplanationSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  modalExplanationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalExplanationText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});

export default CPIRecommendations; 