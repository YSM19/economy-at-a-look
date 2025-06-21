import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);

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
        { category: '미국 투자', status: 'recommended', description: '원화 → 달러 환전 추천', icon: 'chart-line' },
        { category: '금 구매', status: 'recommended', description: '금 구매 추천', icon: 'gold' },
        { category: '달러 수익 실현', status: 'not-recommended', description: '수익 실현 비추천', icon: 'cash-multiple' },
        { category: '해외송금 (원화→달러)', status: 'recommended', description: '달러 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (달러→원화)', status: 'not-recommended', description: '달러 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1220) { // 약세
      return [
        { category: '여행', status: 'recommended', description: '미국 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '미국 직구 추천', icon: 'package-variant' },
        { category: '미국 투자', status: 'recommended', description: '원화 → 달러 환전 추천', icon: 'chart-line' },
        { category: '금 구매', status: 'recommended', description: '금 구매 추천', icon: 'gold' },
        { category: '달러 수익 실현', status: 'not-recommended', description: '수익 실현 비추천', icon: 'cash-multiple' },
        { category: '해외송금 (원화→달러)', status: 'recommended', description: '달러 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (달러→원화)', status: 'not-recommended', description: '달러 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1340) { // 보통
      return [
        { category: '여행', status: 'neutral', description: '미국 여행 관망', icon: 'airplane' },
        { category: '해외직구', status: 'neutral', description: '미국 직구 대기', icon: 'package-variant' },
        { category: '미국 투자', status: 'neutral', description: '원화 → 달러 환전 관망', icon: 'chart-line' },
        { category: '금 매매', status: 'neutral', description: '금 매매 보유', icon: 'gold' },
        { category: '달러 수익 실현', status: 'neutral', description: '수익 실현 보유', icon: 'cash-multiple' },
        { category: '해외송금 (원화→달러)', status: 'neutral', description: '달러 매수 대기', icon: 'bank-transfer-out' },
        { category: '해외송금 (달러→원화)', status: 'neutral', description: '달러 매도 대기', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1460) { // 강세
      return [
        { category: '여행', status: 'not-recommended', description: '미국 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '미국 직구 비추천', icon: 'package-variant' },
        { category: '미국 투자', status: 'not-recommended', description: '원화 → 달러 환전 비추천', icon: 'chart-line' },
        { category: '금 판매', status: 'recommended', description: '금 판매 추천', icon: 'gold' },
        { category: '달러 수익 실현', status: 'recommended', description: '수익 실현 추천', icon: 'cash-multiple' },
        { category: '해외송금 (원화→달러)', status: 'not-recommended', description: '달러 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (달러→원화)', status: 'recommended', description: '달러 매도 추천', icon: 'bank-transfer-in' }
      ];
    } else { // 매우 강세
      return [
        { category: '여행', status: 'not-recommended', description: '미국 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '미국 직구 비추천', icon: 'package-variant' },
        { category: '미국 투자', status: 'not-recommended', description: '원화 → 달러 환전 비추천', icon: 'chart-line' },
        { category: '금 판매', status: 'recommended', description: '금 판매 추천', icon: 'gold' },
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
        { category: '일본 투자', status: 'recommended', description: '원화 → 엔화 환전 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→엔화)', status: 'recommended', description: '엔화 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (엔화→원화)', status: 'not-recommended', description: '엔화 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 970) { // 약세
      return [
        { category: '여행', status: 'recommended', description: '일본 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '일본 직구 추천', icon: 'package-variant' },
        { category: '일본 투자', status: 'recommended', description: '원화 → 엔화 환전 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→엔화)', status: 'recommended', description: '엔화 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (엔화→원화)', status: 'not-recommended', description: '엔화 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1050) { // 보통
      return [
        { category: '여행', status: 'neutral', description: '일본 여행 관망', icon: 'airplane' },
        { category: '해외직구', status: 'neutral', description: '일본 직구 대기', icon: 'package-variant' },
        { category: '일본 투자', status: 'neutral', description: '원화 → 엔화 환전 관망', icon: 'chart-line' },
        { category: '해외송금 (원화→엔화)', status: 'neutral', description: '엔화 매수 대기', icon: 'bank-transfer-out' },
        { category: '해외송금 (엔화→원화)', status: 'neutral', description: '엔화 매도 대기', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1130) { // 강세
      return [
        { category: '여행', status: 'not-recommended', description: '일본 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '일본 직구 비추천', icon: 'package-variant' },
        { category: '일본 투자', status: 'not-recommended', description: '원화 → 엔화 환전 비추천', icon: 'chart-line' },
        { category: '해외송금 (원화→엔화)', status: 'not-recommended', description: '엔화 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (엔화→원화)', status: 'recommended', description: '엔화 매도 추천', icon: 'bank-transfer-in' }
      ];
    } else { // 매우 강세
      return [
        { category: '여행', status: 'not-recommended', description: '일본 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '일본 직구 비추천', icon: 'package-variant' },
        { category: '일본 투자', status: 'not-recommended', description: '원화 → 엔화 환전 비추천', icon: 'chart-line' },
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
        { category: '중국 투자', status: 'recommended', description: '원화 → 위안 환전 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→위안)', status: 'recommended', description: '위안 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (위안→원화)', status: 'not-recommended', description: '위안 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 178) { // 약세
      return [
        { category: '여행', status: 'recommended', description: '중국 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '중국 직구 추천', icon: 'package-variant' },
        { category: '중국 투자', status: 'recommended', description: '원화 → 위안 환전 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→위안)', status: 'recommended', description: '위안 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (위안→원화)', status: 'not-recommended', description: '위안 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 190) { // 보통
      return [
        { category: '여행', status: 'neutral', description: '중국 여행 관망', icon: 'airplane' },
        { category: '해외직구', status: 'neutral', description: '중국 직구 대기', icon: 'package-variant' },
        { category: '중국 투자', status: 'neutral', description: '원화 → 위안 환전 관망', icon: 'chart-line' },
        { category: '해외송금 (원화→위안)', status: 'neutral', description: '위안 매수 대기', icon: 'bank-transfer-out' },
        { category: '해외송금 (위안→원화)', status: 'neutral', description: '위안 매도 대기', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 202) { // 강세
      return [
        { category: '여행', status: 'not-recommended', description: '중국 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '중국 직구 비추천', icon: 'package-variant' },
        { category: '중국 투자', status: 'not-recommended', description: '원화 → 위안 환전 비추천', icon: 'chart-line' },
        { category: '해외송금 (원화→위안)', status: 'not-recommended', description: '위안 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (위안→원화)', status: 'recommended', description: '위안 매도 추천', icon: 'bank-transfer-in' }
      ];
    } else { // 매우 강세
      return [
        { category: '여행', status: 'not-recommended', description: '중국 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '중국 직구 비추천', icon: 'package-variant' },
        { category: '중국 투자', status: 'not-recommended', description: '원화 → 위안 환전 비추천', icon: 'chart-line' },
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
        { category: '유럽 투자', status: 'recommended', description: '원화 → 유로 환전 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→유로)', status: 'recommended', description: '유로 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (유로→원화)', status: 'not-recommended', description: '유로 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1360) { // 약세
      return [
        { category: '여행', status: 'recommended', description: '유럽 여행 추천', icon: 'airplane' },
        { category: '해외직구', status: 'recommended', description: '유럽 직구 추천', icon: 'package-variant' },
        { category: '유럽 투자', status: 'recommended', description: '원화 → 유로 환전 추천', icon: 'chart-line' },
        { category: '해외송금 (원화→유로)', status: 'recommended', description: '유로 매수 추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (유로→원화)', status: 'not-recommended', description: '유로 매도 비추천', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1480) { // 보통
      return [
        { category: '여행', status: 'neutral', description: '유럽 여행 관망', icon: 'airplane' },
        { category: '해외직구', status: 'neutral', description: '유럽 직구 대기', icon: 'package-variant' },
        { category: '유럽 투자', status: 'neutral', description: '원화 → 유로 환전 관망', icon: 'chart-line' },
        { category: '해외송금 (원화→유로)', status: 'neutral', description: '유로 매수 대기', icon: 'bank-transfer-out' },
        { category: '해외송금 (유로→원화)', status: 'neutral', description: '유로 매도 대기', icon: 'bank-transfer-in' }
      ];
    } else if (rate <= 1600) { // 강세
      return [
        { category: '여행', status: 'not-recommended', description: '유럽 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '유럽 직구 비추천', icon: 'package-variant' },
        { category: '유럽 투자', status: 'not-recommended', description: '원화 → 유로 환전 비추천', icon: 'chart-line' },
        { category: '해외송금 (원화→유로)', status: 'not-recommended', description: '유로 매수 비추천', icon: 'bank-transfer-out' },
        { category: '해외송금 (유로→원화)', status: 'recommended', description: '유로 매도 추천', icon: 'bank-transfer-in' }
      ];
    } else { // 매우 강세
      return [
        { category: '여행', status: 'not-recommended', description: '유럽 여행 비추천', icon: 'airplane' },
        { category: '해외직구', status: 'not-recommended', description: '유럽 직구 비추천', icon: 'package-variant' },
        { category: '유럽 투자', status: 'not-recommended', description: '원화 → 유로 환전 비추천', icon: 'chart-line' },
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

  const getDetailedExplanation = (item: RecommendationItem, country: string, rate: number): string => {
    const category = item.category;
    const status = item.status;
    
    // 환율 수준 판단 (USD 기준으로 예시)
    let rateLevel = '';
    if (country === 'usa') {
      if (rate <= 1100) rateLevel = 'very_weak';
      else if (rate <= 1300) rateLevel = 'weak';
      else if (rate <= 1450) rateLevel = 'normal';
      else if (rate <= 1600) rateLevel = 'strong';
      else rateLevel = 'very_strong';
    } else {
      // 다른 통화는 보통 수준으로 처리
      rateLevel = 'normal';
    }

    const explanations: { [key: string]: { [key: string]: { [key: string]: string } } } = {
      '여행': {
        very_weak: {
          'recommended': '환율이 매우 낮은 시기로 해외여행의 최적 타이밍입니다. 같은 원화로 더 많은 현지 화폐를 바꿀 수 있어 숙박, 식사, 쇼핑 등 모든 비용이 절약됩니다.'
        },
        weak: {
          'recommended': '환율이 낮아 해외여행에 유리한 시기입니다. 평소보다 저렴한 비용으로 여행을 즐길 수 있어 해외여행을 계획하기 좋습니다.'
        },
        normal: {
          'neutral': '환율이 보통 수준으로 해외여행 비용이 평상시와 비슷합니다. 여행 목적지의 물가와 개인 예산을 고려하여 결정하세요.'
        },
        strong: {
          'not-recommended': '환율이 높아 해외여행 비용이 증가합니다. 불필요한 지출을 줄이고 여행 시기를 조정하는 것이 좋습니다.'
        },
        very_strong: {
          'not-recommended': '환율이 매우 높아 해외여행 비용이 크게 증가합니다. 여행을 연기하거나 국내 여행을 고려하는 것이 현명합니다.'
        }
      },
      '해외직구': {
        very_weak: {
          'recommended': '환율이 매우 낮아 해외직구의 최적 타이밍입니다. 제품 가격뿐만 아니라 배송비도 절약할 수 있어 상당한 비용 절감 효과를 기대할 수 있습니다.'
        },
        weak: {
          'recommended': '환율이 낮아 해외직구에 유리합니다. 평소 관심 있던 해외 브랜드 제품들을 저렴하게 구매할 수 있는 기회입니다.'
        },
        normal: {
          'neutral': '환율이 보통 수준으로 해외직구 비용이 평상시와 비슷합니다. 제품 가격과 배송비, 관세 등을 종합적으로 고려하세요.'
        },
        strong: {
          'not-recommended': '환율이 높아 해외직구 비용이 증가합니다. 급하지 않은 구매는 연기하고 국내 대안을 찾아보세요.'
        },
        very_strong: {
          'not-recommended': '환율이 매우 높아 해외직구가 매우 비경제적입니다. 필수적이지 않은 구매는 피하고 환율이 안정될 때까지 기다리세요.'
        }
      },
      '투자': {
        very_weak: {
          'recommended': '환율이 매우 낮을 때는 해외 투자의 절호의 기회입니다. 원화로 더 많은 해외 자산을 매수할 수 있어 장기적으로 환차익과 투자 수익을 모두 기대할 수 있습니다.'
        },
        weak: {
          'recommended': '환율이 낮아 해외 투자에 유리한 시기입니다. 해외 주식, ETF, 부동산 등에 투자하여 분산 효과와 환차익을 노려볼 수 있습니다.'
        },
        normal: {
          'neutral': '환율이 보통 수준에서는 해외 투자 시 환율 변동 리스크를 신중히 고려해야 합니다. 장기 투자 관점에서 접근하세요.'
        },
        strong: {
          'not-recommended': '환율이 높을 때는 해외 투자 진입 비용이 증가합니다. 기존 해외 투자 자산의 일부 매도를 고려하거나 신규 투자는 신중하게 결정하세요.'
        },
        very_strong: {
          'not-recommended': '환율이 매우 높을 때는 해외 투자를 피하는 것이 좋습니다. 기존 해외 투자 자산을 정리하여 환차익을 실현하는 것을 고려하세요.'
        }
      },
      '해외송금 (원화→달러)': {
        very_weak: {
          'recommended': '환율이 매우 낮을 때는 달러 매수의 최적 타이밍입니다. 같은 원화로 더 많은 달러를 확보할 수 있어 향후 환차익을 기대할 수 있습니다.'
        },
        weak: {
          'recommended': '환율이 낮아 달러 매수에 유리합니다. 해외 자금 필요시나 달러 자산 보유 목적으로 환전하기 좋은 시기입니다.'
        },
        normal: {
          'neutral': '환율이 보통 수준에서는 달러 매수 시기를 신중히 판단해야 합니다. 급하지 않다면 환율 동향을 지켜보는 것이 좋습니다.'
        },
        strong: {
          'not-recommended': '환율이 높을 때는 달러 매수 비용이 증가합니다. 필수적인 경우가 아니라면 환율이 하락할 때까지 기다리세요.'
        },
        very_strong: {
          'not-recommended': '환율이 매우 높을 때는 달러 매수를 피해야 합니다. 불필요한 환전은 자제하고 꼭 필요한 경우만 최소한으로 하세요.'
        }
      },
      '해외송금 (달러→원화)': {
        very_weak: {
          'not-recommended': '환율이 매우 낮을 때는 달러 매도가 불리합니다. 환율이 상승할 때까지 기다리거나, 꼭 필요한 경우만 최소한으로 환전하세요.'
        },
        weak: {
          'not-recommended': '환율이 낮아 달러 매도 시 손실이 발생할 수 있습니다. 급하지 않다면 환율 상승을 기다리는 것이 유리합니다.'
        },
        normal: {
          'neutral': '환율이 보통 수준에서는 달러 매도 시기를 신중히 결정하세요. 개인의 자금 필요성과 환율 전망을 종합적으로 고려하세요.'
        },
        strong: {
          'recommended': '환율이 높을 때는 달러 매도의 좋은 기회입니다. 보유 중인 달러 자산을 원화로 환전하여 환차익을 실현할 수 있습니다.'
        },
        very_strong: {
          'recommended': '환율이 매우 높을 때는 달러 매도의 최적 타이밍입니다. 상당한 환차익을 실현할 수 있어 보유 달러의 일부 또는 전부 매도를 고려하세요.'
        }
      },
      '금 구매': {
        very_weak: {
          'recommended': '환율이 낮을 때는 달러 기준 금 가격의 부담이 줄어들어 금 구매에 유리합니다. 또한 향후 환율 상승 시 이중 수익을 기대할 수 있습니다.'
        },
        strong: {
          'recommended': '환율이 높을 때는 금 매도의 좋은 기회입니다. 국제 금 가격이 원화 기준으로 높아져 상당한 수익을 실현할 수 있습니다.'
        }
      }
    };

    return explanations[category]?.[rateLevel]?.[status] || 
           `현재 ${country === 'usa' ? '달러' : country === 'japan' ? '엔' : country === 'china' ? '위안' : '유로'} 환율이 ${rate}원일 때 ${category}에 대한 ${status === 'recommended' ? '추천' : status === 'not-recommended' ? '비추천' : '중립'} 분석입니다. 환율 변동성과 개인의 필요에 따라 신중히 결정하시기 바랍니다.`;
  };

  const handleItemPress = (item: RecommendationItem) => {
    setSelectedItem(item);
    setModalVisible(true);
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
                {selectedItem && currentRate !== null 
                  ? getDetailedExplanation(selectedItem, country, currentRate)
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

export default ExchangeRateRecommendations; 