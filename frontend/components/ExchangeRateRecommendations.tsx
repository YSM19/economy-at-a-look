import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { economicIndexApi } from '../services/api';

type ExchangeRateRecommendationsProps = {
  country: string;
};

interface RecommendationItem {
  category: string;
  status: 'recommended' | 'not-recommended' | 'neutral';
  description: string;
  icon: string;
}

const ExchangeRateRecommendations: React.FC<ExchangeRateRecommendationsProps> = ({ country }) => {
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExchangeRateAndGenerateRecommendations();
  }, [country]);

  const fetchExchangeRateAndGenerateRecommendations = async () => {
    setLoading(true);
    
    try {
      const response = await economicIndexApi.getExchangeRate();
      
      if (response.data && response.data.success && response.data.data) {
        const exchangeData = response.data.data;
        let rate = null;
        
        // 선택된 국가에 따라 환율 데이터 가져오기
        switch(country) {
          case 'usa':
            rate = exchangeData.usdRate || getDefaultRate(country);
            break;
          case 'japan':
            rate = exchangeData.jpyRate || getDefaultRate(country);
            break;
          case 'china':
            rate = exchangeData.cnyRate || getDefaultRate(country);
            break;
          case 'europe':
            rate = exchangeData.eurRate || getDefaultRate(country);
            break;
          default:
            rate = exchangeData.usdRate || getDefaultRate(country);
        }
        
        setCurrentRate(rate);
        setRecommendations(generateRecommendations(country, rate));
      }
    } catch (error) {
      console.error('환율 데이터 가져오기 실패:', error);
      // 오류 시 기본값 사용
      const defaultRate = getDefaultRate(country);
      setCurrentRate(defaultRate);
      setRecommendations(generateRecommendations(country, defaultRate));
    } finally {
      setLoading(false);
    }
  };

  const getDefaultRate = (country: string): number => {
    switch(country) {
      case 'usa': return 1350;
      case 'japan': return 950;
      case 'china': return 190;
      case 'europe': return 1400;
      default: return 1350;
    }
  };

  const generateRecommendations = (country: string, rate: number): RecommendationItem[] => {
    switch(country) {
      case 'usa':
        return generateUSDRecommendations(rate);
      case 'japan':
        return generateJPYRecommendations(rate);
      case 'china':
        return generateCNYRecommendations(rate);
      case 'europe':
        return generateEURRecommendations(rate);
      default:
        return generateUSDRecommendations(rate);
    }
  };

  const generateUSDRecommendations = (rate: number): RecommendationItem[] => {
    if (rate <= 1100) { // 매우 약세
      return [
        { category: '여행', status: 'recommended', description: '미국 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '미국 직구 추천', icon: 'package-variant' },
        { category: '미국 투자', status: 'recommended', description: '달러 투자 추천', icon: 'chart-line' },
        { category: '금 매매', status: 'recommended', description: '금 구매 추천', icon: 'gold' },
        { category: '달러 수익 실현', status: 'not-recommended', description: '수익 실현 비추천', icon: 'cash-multiple' },
        { category: '해외송금 (원화→달러)', status: 'recommended', description: '달러 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (달러→원화)', status: 'not-recommended', description: '달러 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1220) { // 약세
      return [
        { category: '여행', status: 'recommended', description: '미국 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '미국 직구 추천', icon: 'package-variant' },
        { category: '미국 투자', status: 'recommended', description: '달러 투자 추천', icon: 'chart-line' },
        { category: '금 매매', status: 'recommended', description: '금 구매 추천', icon: 'gold' },
        { category: '달러 수익 실현', status: 'not-recommended', description: '수익 실현 비추천', icon: 'cash-multiple' },
        { category: '해외송금 (원화→달러)', status: 'recommended', description: '달러 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (달러→원화)', status: 'not-recommended', description: '달러 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1340) { // 보통
      return [
        { category: '여행', status: 'neutral', description: '미국 여행 관망', icon: 'airplane' },
        { category: '해외직구', status: 'neutral', description: '미국 직구 대기', icon: 'package-variant' },
        { category: '미국 투자', status: 'neutral', description: '달러 투자 관망', icon: 'chart-line' },
        { category: '금 매매', status: 'neutral', description: '금 매매 보유', icon: 'gold' },
        { category: '달러 수익 실현', status: 'neutral', description: '수익 실현 보유', icon: 'cash-multiple' },
        { category: '해외송금 (원화→달러)', status: 'neutral', description: '달러 매수 대기', icon: 'bank-transfer-out' },
        { category: '해외송금 (달러→원화)', status: 'neutral', description: '달러 매도 대기', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1460) { // 강세
      return [
        { category: '여행', status: 'not-recommended', description: '미국 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '미국 직구 비추천', icon: 'package-variant' },
        { category: '미국 투자', status: 'not-recommended', description: '달러 투자 비추천', icon: 'chart-line' },
        { category: '금 매매', status: 'recommended', description: '금 판매 추천', icon: 'gold' },
        { category: '달러 수익 실현', status: 'recommended', description: '수익 실현 추천', icon: 'cash-multiple' },
        { category: '해외송금 (원화→달러)', status: 'not-recommended', description: '달러 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (달러→원화)', status: 'recommended', description: '달러 매도 추천', icon: 'bank-transfer-in' }
      ];
    } else { // 매우 강세
      return [
        { category: '여행', status: 'not-recommended', description: '미국 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '미국 직구 비추천', icon: 'package-variant' },
        { category: '미국 투자', status: 'not-recommended', description: '달러 투자 비추천', icon: 'chart-line' },
        { category: '금 매매', status: 'recommended', description: '금 판매 추천', icon: 'gold' },
        { category: '달러 수익 실현', status: 'recommended', description: '수익 실현 추천', icon: 'cash-multiple' },
        { category: '해외송금 (원화→달러)', status: 'not-recommended', description: '달러 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (달러→원화)', status: 'recommended', description: '달러 매도 추천', icon: 'bank-transfer-in' }
      ];
    }
  };

  const generateJPYRecommendations = (rate: number): RecommendationItem[] => {
    if (rate <= 890) { // 매우 약세
      return [
        { category: '여행', status: 'recommended', description: '일본 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '일본 직구 추천', icon: 'package-variant' },
        { category: '일본 투자', status: 'recommended', description: '엔화 투자 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→엔화)', status: 'recommended', description: '엔화 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (엔화→원화)', status: 'not-recommended', description: '엔화 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 970) { // 약세
      return [
        { category: '여행', status: 'recommended', description: '일본 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '일본 직구 추천', icon: 'package-variant' },
        { category: '일본 투자', status: 'recommended', description: '엔화 투자 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→엔화)', status: 'recommended', description: '엔화 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (엔화→원화)', status: 'not-recommended', description: '엔화 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1050) { // 보통
      return [
        { category: '여행', status: 'neutral', description: '일본 여행 관망', icon: 'airplane' },
        { category: '해외직구', status: 'neutral', description: '일본 직구 대기', icon: 'package-variant' },
        { category: '일본 투자', status: 'neutral', description: '엔화 투자 관망', icon: 'chart-line' },
        { category: '해외송금 (원화→엔화)', status: 'neutral', description: '엔화 매수 대기', icon: 'bank-transfer-out' },
        { category: '해외송금 (엔화→원화)', status: 'neutral', description: '엔화 매도 대기', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1130) { // 강세
      return [
        { category: '여행', status: 'not-recommended', description: '일본 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '일본 직구 비추천', icon: 'package-variant' },
        { category: '일본 투자', status: 'not-recommended', description: '엔화 투자 비추천', icon: 'chart-line' },
        { category: '해외송금 (원화→엔화)', status: 'not-recommended', description: '엔화 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (엔화→원화)', status: 'recommended', description: '엔화 매도 추천', icon: 'bank-transfer-in' }
      ];
    } else { // 매우 강세
      return [
        { category: '여행', status: 'not-recommended', description: '일본 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '일본 직구 비추천', icon: 'package-variant' },
        { category: '일본 투자', status: 'not-recommended', description: '엔화 투자 비추천', icon: 'chart-line' },
        { category: '해외송금 (원화→엔화)', status: 'not-recommended', description: '엔화 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (엔화→원화)', status: 'recommended', description: '엔화 매도 추천', icon: 'bank-transfer-in' }
      ];
    }
  };

  const generateCNYRecommendations = (rate: number): RecommendationItem[] => {
    if (rate <= 166) { // 매우 약세
      return [
        { category: '여행', status: 'recommended', description: '중국 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '중국 직구 추천', icon: 'package-variant' },
        { category: '중국 투자', status: 'recommended', description: '위안 투자 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→위안)', status: 'recommended', description: '위안 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (위안→원화)', status: 'not-recommended', description: '위안 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 178) { // 약세
      return [
        { category: '여행', status: 'recommended', description: '중국 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '중국 직구 추천', icon: 'package-variant' },
        { category: '중국 투자', status: 'recommended', description: '위안 투자 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→위안)', status: 'recommended', description: '위안 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (위안→원화)', status: 'not-recommended', description: '위안 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 190) { // 보통
      return [
        { category: '여행', status: 'neutral', description: '중국 여행 관망', icon: 'airplane' },
        { category: '해외직구', status: 'neutral', description: '중국 직구 대기', icon: 'package-variant' },
        { category: '중국 투자', status: 'neutral', description: '위안 투자 관망', icon: 'chart-line' },
        { category: '해외송금 (원화→위안)', status: 'neutral', description: '위안 매수 대기', icon: 'bank-transfer-out' },
        { category: '해외송금 (위안→원화)', status: 'neutral', description: '위안 매도 대기', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 202) { // 강세
      return [
        { category: '여행', status: 'not-recommended', description: '중국 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '중국 직구 비추천', icon: 'package-variant' },
        { category: '중국 투자', status: 'not-recommended', description: '위안 투자 비추천', icon: 'chart-line' },
        { category: '해외송금 (원화→위안)', status: 'not-recommended', description: '위안 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (위안→원화)', status: 'recommended', description: '위안 매도 추천', icon: 'bank-transfer-in' }
      ];
    } else { // 매우 강세
      return [
        { category: '여행', status: 'not-recommended', description: '중국 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '중국 직구 비추천', icon: 'package-variant' },
        { category: '중국 투자', status: 'not-recommended', description: '위안 투자 비추천', icon: 'chart-line' },
        { category: '해외송금 (원화→위안)', status: 'not-recommended', description: '위안 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (위안→원화)', status: 'recommended', description: '위안 매도 추천', icon: 'bank-transfer-in' }
      ];
    }
  };

  const generateEURRecommendations = (rate: number): RecommendationItem[] => {
    if (rate <= 1240) { // 매우 약세
      return [
        { category: '여행', status: 'recommended', description: '유럽 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '유럽 직구 추천', icon: 'package-variant' },
        { category: '유럽 투자', status: 'recommended', description: '유로 투자 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→유로)', status: 'recommended', description: '유로 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (유로→원화)', status: 'not-recommended', description: '유로 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1360) { // 약세
      return [
        { category: '여행', status: 'recommended', description: '유럽 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '유럽 직구 추천', icon: 'package-variant' },
        { category: '유럽 투자', status: 'recommended', description: '유로 투자 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→유로)', status: 'recommended', description: '유로 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (유로→원화)', status: 'not-recommended', description: '유로 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1480) { // 보통
      return [
        { category: '여행', status: 'neutral', description: '유럽 여행 관망', icon: 'airplane' },
        { category: '해외직구', status: 'neutral', description: '유럽 직구 대기', icon: 'package-variant' },
        { category: '유럽 투자', status: 'neutral', description: '유로 투자 관망', icon: 'chart-line' },
        { category: '해외송금 (원화→유로)', status: 'neutral', description: '유로 매수 대기', icon: 'bank-transfer-out' },
        { category: '해외송금 (유로→원화)', status: 'neutral', description: '유로 매도 대기', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1600) { // 강세
      return [
        { category: '여행', status: 'not-recommended', description: '유럽 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '유럽 직구 비추천', icon: 'package-variant' },
        { category: '유럽 투자', status: 'not-recommended', description: '유로 투자 비추천', icon: 'chart-line' },
        { category: '해외송금 (원화→유로)', status: 'not-recommended', description: '유로 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (유로→원화)', status: 'recommended', description: '유로 매도 추천', icon: 'bank-transfer-in' }
      ];
    } else { // 매우 강세
      return [
        { category: '여행', status: 'not-recommended', description: '유럽 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '유럽 직구 비추천', icon: 'package-variant' },
        { category: '유럽 투자', status: 'not-recommended', description: '유로 투자 비추천', icon: 'chart-line' },
        { category: '해외송금 (원화→유로)', status: 'not-recommended', description: '유로 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (유로→원화)', status: 'recommended', description: '유로 매도 추천', icon: 'bank-transfer-in' }
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
      case 'neutral': 
        if (category === '여행') return '관망';
        if (category === '해외직구') return '대기';
        if (category.includes('투자')) return '관망';
        if (category === '금 매매') return '보유';
        if (category === '달러 수익 실현') return '보유';
        if (category.includes('해외송금')) return '대기';
        return '보류';
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

  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <ThemedText style={styles.title}>환율 기반 추천</ThemedText>
        <View style={styles.container}>
          <ThemedText style={styles.loadingText}>추천 정보를 불러오는 중...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <ThemedText style={styles.title}>환율 기반 추천</ThemedText>
      <View style={styles.container}>
        <View style={styles.recommendationsGrid}>
          {recommendations.map((item, index) => (
            <View key={index} style={styles.recommendationCard}>
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
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 5,
    textAlign: 'left',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  recommendationsGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  recommendationCard: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
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
  },
  categoryText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
});

export default ExchangeRateRecommendations; 