import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { economicIndexApi } from '../services/api';

interface RecommendationItem {
  category: string;
  status: 'recommended' | 'not-recommended' | 'neutral';
  description: string;
  icon: string;
  trendNote?: string;
}

type RateLevel = 'low' | 'normal' | 'high';
type RateTrend = 'rising' | 'falling' | 'stable';

interface RateContext {
  level: RateLevel;
  trend: RateTrend;
}

type RecommendationTemplate = Omit<RecommendationItem, 'trendNote'>;

const BASE_RECOMMENDATIONS: Record<RateLevel, RecommendationTemplate[]> = {
  low: [
    { category: '대출', status: 'recommended', description: '고정금리 대출 추천', icon: 'bank' },
    { category: '투자', status: 'recommended', description: '주식/부동산 투자 추천', icon: 'chart-line' },
    { category: '예적금', status: 'not-recommended', description: '예적금 비추천', icon: 'piggy-bank' },
    { category: '원화 채권', status: 'not-recommended', description: '원화 채권 비추천', icon: 'file-chart' },
    { category: '외화 예금', status: 'recommended', description: '외화 예금 추천', icon: 'currency-usd' },
    { category: '리츠(REITs)', status: 'recommended', description: '부동산 리츠 추천', icon: 'home-city' },
    { category: '배당주', status: 'recommended', description: '배당주 투자 추천', icon: 'trending-up' }
  ],
  normal: [
    { category: '대출', status: 'neutral', description: '대출 신중 검토', icon: 'bank' },
    { category: '투자', status: 'neutral', description: '분산 투자 고려', icon: 'chart-line' },
    { category: '예적금', status: 'neutral', description: '예적금 부분 고려', icon: 'piggy-bank' },
    { category: '원화 채권', status: 'neutral', description: '원화 채권 관망', icon: 'file-chart' },
    { category: '외화 예금', status: 'neutral', description: '외화 예금 신중 검토', icon: 'currency-usd' },
    { category: '리츠(REITs)', status: 'neutral', description: '부동산 리츠 관망', icon: 'home-city' },
    { category: '배당주', status: 'neutral', description: '배당 수익률 검토', icon: 'trending-up' }
  ],
  high: [
    { category: '대출', status: 'not-recommended', description: '대출 비추천', icon: 'bank' },
    { category: '투자', status: 'not-recommended', description: '투자 비중 축소', icon: 'chart-line' },
    { category: '예적금', status: 'recommended', description: '예적금 추천', icon: 'piggy-bank' },
    { category: '원화 채권', status: 'recommended', description: '원화 채권 추천', icon: 'file-chart' },
    { category: '외화 예금', status: 'not-recommended', description: '외화 예금 비추천', icon: 'currency-usd' },
    { category: '리츠(REITs)', status: 'not-recommended', description: '부동산 리츠 비추천', icon: 'home-city' },
    { category: '현금 보유', status: 'recommended', description: '현금 비중 확대', icon: 'cash-multiple' },
    { category: '배당주', status: 'not-recommended', description: '배당주 투자 비추천', icon: 'trending-up' }
  ]
};

type RecommendationOverrides = {
  [trend in RateTrend]?: {
    [level in RateLevel]?: {
      [category: string]: Partial<RecommendationItem>;
    };
  };
};

const TREND_ADJUSTMENTS: RecommendationOverrides = {
  rising: {
    low: {
      '대출': {
        description: '저금리지만 금리가 오르는 추세이므로 향후 상환 부담을 고려하세요.',
        trendNote: '금리 상승세에는 변동금리보다 고정금리 위주로 대응하는 편이 안전합니다.'
      },
      '투자': {
        description: '저금리 환경이 유지되더라도 금리 상승 신호가 있어 리스크 관리가 필요합니다.',
        trendNote: '금리가 오르면 성장주 변동성이 커질 수 있으니 손절 라인을 점검하세요.'
      }
    },
    normal: {
      '대출': {
        status: 'not-recommended',
        description: '금리가 상승 중이라 변동금리 대출이 빠르게 비싸질 수 있습니다.',
        trendNote: '대출을 유지해야 한다면 고정금리 전환이나 조기 상환을 검토하세요.'
      },
      '투자': {
        status: 'not-recommended',
        description: '금리 상승기에 주식·부동산은 압력을 받을 수 있으니 방어적 포트폴리오가 유리합니다.',
        trendNote: '성장주 대신 배당·가치주 중심으로 전환하면 충격을 완화할 수 있습니다.'
      },
      '예적금': {
        status: 'recommended',
        description: '금리 상승분을 반영한 예·적금 상품으로 안전한 수익을 확보할 수 있습니다.',
        trendNote: '추가 인상 가능성을 고려해 단기·중기 상품을 혼합하는 전략이 유리합니다.'
      },
      '원화 채권': {
        status: 'recommended',
        description: '채권 금리가 올라가는 국면이므로 만기를 분산해 점진적으로 편입하세요.',
        trendNote: '만기가 짧은 채권부터 교체하면 금리 상승 위험을 줄일 수 있습니다.'
      },
      '외화 예금': {
        status: 'not-recommended',
        description: '원화 금리 상승은 환차손을 유발할 수 있어 외화 예금 비중을 줄이는 편이 안전합니다.',
        trendNote: '환율 변동성이 커질 수 있으니 외화 자산 비중을 점검하세요.'
      },
      '리츠(REITs)': {
        status: 'not-recommended',
        description: '금리 상승은 리츠 배당 매력을 약화시키므로 신규 진입을 미루는 편이 좋습니다.',
        trendNote: '배당 수익률이 금리보다 충분히 높은지 확인한 뒤 투자하세요.'
      },
      '배당주': {
        status: 'not-recommended',
        description: '채권·예금 수익률이 올라 배당주의 상대 매력이 감소하니 비중을 줄이세요.',
        trendNote: '배당 성장률이 높은 기업만 선별적으로 유지하는 것이 좋습니다.'
      }
    }
  },
  falling: {
    high: {
      '대출': {
        status: 'neutral',
        description: '금리는 높지만 하락 추세라 대출 상환 부담이 점차 완화될 가능성이 있습니다.',
        trendNote: '대출 금리 인하가 반영되는지 주기적으로 확인해 갈아타기를 준비하세요.'
      },
      '투자': {
        status: 'neutral',
        description: '고금리 구간이지만 인하 흐름이 나타나 위험자산으로 천천히 재진입을 검토할 만합니다.',
        trendNote: '금리 인하 전환 국면에서는 성장주·리츠 비중을 조금씩 늘릴 타이밍입니다.'
      },
      '외화 예금': {
        status: 'neutral',
        description: '고금리 속에서도 환율 변동을 활용할 수 있으나 금리 하락 시점에 주의하세요.',
        trendNote: '환차익보다 금리 하락 폭이 커지면 수익이 축소될 수 있습니다.'
      },
      '리츠(REITs)': {
        status: 'neutral',
        description: '금리 인하 기대가 커져 자산가치 회복 여지가 있으니 분할 매수를 고려할 수 있습니다.',
        trendNote: '분할 매수로 평균 매입가를 낮추되 공실률 등 펀더멘털을 꼭 확인하세요.'
      },
      '배당주': {
        status: 'neutral',
        description: '금리 하락은 배당 매력을 다시 높일 수 있어 우량 종목 중심의 관망이 필요합니다.',
        trendNote: '금리 하락기에는 배당 성장주에 대한 프리미엄이 다시 붙을 수 있습니다.'
      }
    }
  }
};

const TREND_DEFAULT_NOTES: Record<RateTrend, string> = {
  rising: '금리 상승 추세에 맞춰 현금흐름과 금리 민감 자산을 다시 점검해보세요.',
  falling: '금리 하락 흐름을 기회로 활용할 자산 재배치를 고민해보세요.',
  stable: ''
};

const parseRate = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const determineRateContext = (rate: number, previousRate: number | null): RateContext => {
  let level: RateLevel = 'high';
  if (rate < 2.0) {
    level = 'low';
  } else if (rate <= 3.25) {
    level = 'normal';
  }

  let trend: RateTrend = 'stable';
  if (previousRate !== null) {
    const delta = rate - previousRate;
    const threshold = 0.25;
    if (delta >= threshold) {
      trend = 'rising';
    } else if (delta <= -threshold) {
      trend = 'falling';
    }
  }

  return { level, trend };
};

const InterestRateRecommendations: React.FC = () => {
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [previousRate, setPreviousRate] = useState<number | null>(null);
  const [rateContext, setRateContext] = useState<RateContext | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);

  useEffect(() => {
    fetchInterestRateAndGenerateRecommendations();
  }, []);

  const fetchInterestRateAndGenerateRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await economicIndexApi.getInterestRate();
      
      if (response.data) {
        const payload = response.data.data ?? response.data;
        const koreaData = payload?.korea ?? {};

        const parsedRate =
          parseRate(koreaData.rate) ??
          parseRate(payload?.currentRate) ??
          getDefaultRate();

        const parsedPrevious =
          parseRate(koreaData.previousRate) ??
          parseRate(payload?.previousRate) ??
          null;

        const context = determineRateContext(parsedRate, parsedPrevious);

        setCurrentRate(parsedRate);
        setPreviousRate(parsedPrevious);
        setRateContext(context);
        setRecommendations(generateRecommendations(parsedRate, context));
      }
    } catch (error) {
      console.error('금리 데이터 가져오기 실패:', error);
      setError('금리 정보를 불러오지 못했습니다. 기본 시나리오를 기준으로 안내합니다.');
      const defaultRate = getDefaultRate();
      const fallbackContext = determineRateContext(defaultRate, null);
      setCurrentRate(defaultRate);
      setPreviousRate(null);
      setRateContext(fallbackContext);
      setRecommendations(generateRecommendations(defaultRate, fallbackContext));
    } finally {
      setLoading(false);
    }
  };

  const getDefaultRate = (): number => {
    return 3.25; // 현재 한국은행 기준금리 기본값
  };

  const generateRecommendations = (rate: number, context: RateContext): RecommendationItem[] => {
    const baseItems = BASE_RECOMMENDATIONS[context.level] ?? [];
    const adjustmentsForTrend = TREND_ADJUSTMENTS[context.trend]?.[context.level] ?? {};

    return baseItems.map((template) => {
      const override = adjustmentsForTrend[template.category] ?? {};
      const hasOverride = Object.keys(override).length > 0;
      const status = override.status ?? template.status;
      const description = override.description ?? template.description;
      const trendNote =
        override.trendNote ??
        (hasOverride && context.trend !== 'stable'
          ? TREND_DEFAULT_NOTES[context.trend]
          : undefined);

      return {
        ...template,
        status,
        description,
        trendNote,
      };
    });
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

  const getDetailedExplanation = (
    item: RecommendationItem,
    rate: number,
    context: RateContext | null
  ): string => {
    const category = item.category;
    const status = item.status;

    const derivedContext = context ?? determineRateContext(rate, null);
    const rateLevel = derivedContext.level;
    const trendNarrative =
      derivedContext.trend !== 'stable' ? TREND_DEFAULT_NOTES[derivedContext.trend] : '';

    const explanations: { [key: string]: { [key: string]: { [key: string]: string } } } = {
      '대출': {
        low: {
          'recommended': '저금리 시기에는 대출 비용이 낮아 부동산이나 사업 투자를 위한 대출이 유리합니다. 특히 고정금리 대출을 통해 장기간 낮은 이자를 확보할 수 있습니다.'
      },
      normal: {
        'neutral': '보통 금리에서는 대출 목적과 개인의 상환 능력을 신중히 검토해야 합니다. 투자 수익률과 대출 이자율을 비교하여 결정하세요.',
        'not-recommended': '보통 금리라도 상승 압력이 강하면 대출 이자 부담이 빠르게 늘어날 수 있습니다. 상환 계획을 재점검하고 대출 규모를 보수적으로 유지하세요.'
      },
      high: {
        'not-recommended': '고금리 시기에는 대출 비용이 높아져 상환 부담이 큽니다. 긴급한 경우가 아니라면 대출을 연기하거나 기존 대출의 조기 상환을 고려하세요.',
        'neutral': '금리가 여전히 높지만 인하 국면에서는 상환 부담이 점차 줄어들 수 있습니다. 필요 자금만 유지하며 금리 인하 속도를 관찰하세요.'
      }
    },
      '투자': {
        low: {
          'recommended': '저금리 환경에서는 예금 금리가 낮아 상대적으로 주식이나 부동산 등 위험 자산의 매력이 높아집니다. 장기 투자 관점에서 접근하세요.'
        },
        normal: {
          'neutral': '보통 금리에서는 안전 자산과 위험 자산 간의 균형을 맞추는 분산 투자가 중요합니다. 개인의 위험 성향에 맞게 포트폴리오를 구성하세요.'
        },
        high: {
          'not-recommended': '고금리 시기에는 안전한 예금이나 채권의 수익률이 높아져 굳이 위험한 투자를 할 필요가 줄어듭니다. 투자 비중을 줄이고 안전 자산 비중을 늘리세요.'
        }
      },
      '예적금': {
        low: {
          'not-recommended': '저금리 시기에는 예적금 금리가 낮아 인플레이션을 고려하면 실질 수익률이 마이너스가 될 수 있습니다. 다른 투자처를 고려해보세요.'
        },
        normal: {
          'neutral': '보통 금리에서는 예적금이 안정적인 수익을 제공합니다. 긴급자금이나 단기 자금 운용에 적합하며, 전체 자산의 일정 비율을 유지하세요.'
        },
        high: {
          'recommended': '고금리 시기에는 예적금이 매우 매력적인 투자처가 됩니다. 위험 없이 높은 수익을 얻을 수 있어 자금의 상당 부분을 예적금에 배치하는 것이 유리합니다.'
        }
      },
      '원화 채권': {
        low: {
          'not-recommended': '저금리 시기에는 기존 채권 가격이 높아져 추가 구매 시 수익률이 낮습니다. 또한 향후 금리 상승 시 채권 가격 하락 위험이 있습니다.'
        },
        normal: {
          'neutral': '보통 금리에서는 채권이 포트폴리오의 안정성을 제공합니다. 주식과의 적절한 배분을 통해 리스크를 관리하는 용도로 활용하세요.'
        },
        high: {
          'recommended': '고금리 시기에는 새로 발행되는 채권의 수익률이 높아 매력적입니다. 안전하면서도 상당한 수익을 기대할 수 있어 적극 투자를 고려하세요.'
        }
      },
      '외화 예금': {
        low: {
          'recommended': '저금리 시기에는 국내보다 해외 금리가 높을 가능성이 있어 외화 예금이 매력적일 수 있습니다. 환율 변동 리스크를 고려하여 투자하세요.'
        },
        normal: {
          'neutral': '보통 금리에서는 외화 예금을 통한 분산 투자 효과를 고려할 수 있습니다. 환율 전망과 해외 금리를 종합적으로 검토하세요.'
        },
        high: {
          'not-recommended': '고금리 시기에는 국내 금리가 충분히 높아 굳이 환율 리스크를 감수하며 외화 예금을 할 필요가 줄어듭니다.'
        }
      },
      '리츠(REITs)': {
        low: {
          'recommended': '저금리 환경에서는 REITs의 배당 수익률이 상대적으로 매력적입니다. 또한 부동산 가격 상승 가능성도 높아 투자 매력도가 큽니다.'
        },
        normal: {
          'neutral': '보통 금리에서는 REITs의 수익률과 리스크를 신중히 검토해야 합니다. 부동산 시장 전망과 개별 REITs의 운용 성과를 확인하세요.'
        },
        high: {
          'not-recommended': '고금리 시기에는 REITs보다 안전한 채권이나 예금의 매력이 높아집니다. 또한 금리 상승이 부동산 가격에 부정적 영향을 미칠 수 있습니다.'
        }
      },
      '배당주': {
        low: {
          'recommended': '저금리 환경에서는 배당주의 배당 수익률이 상대적으로 매력적입니다. 안정적인 배당을 지급하는 우량 기업에 투자하세요.'
        },
        normal: {
          'neutral': '보통 금리에서는 배당 수익률과 주가 변동 가능성을 종합적으로 고려해야 합니다. 배당 성장이 지속 가능한 기업을 선별하세요.'
        },
        high: {
          'not-recommended': '고금리 시기에는 채권이나 예금의 수익률이 높아져 배당주의 상대적 매력이 떨어집니다. 주가 하락 리스크도 고려해야 합니다.'
        }
      },
      '현금 보유': {
        high: {
          'recommended': '고금리 시기에는 현금 보유가 매력적입니다. 높은 금리로 인해 현금성 자산의 수익률이 높아지고, 투자 기회를 기다리는 동안 안전하게 자금을 보관할 수 있습니다.'
        }
      }
    };

    const baseExplanation =
      explanations[category]?.[rateLevel]?.[status] ||
      '해당 항목에 대한 상세 설명을 준비 중입니다.';

    return trendNarrative ? `${baseExplanation} ${trendNarrative}`.trim() : baseExplanation;
  };

  const handleItemPress = (item: RecommendationItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <ThemedText style={styles.title}>금리 기반 추천</ThemedText>
        <ThemedText style={styles.loadingText}>추천 정보를 불러오는 중...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <ThemedText style={styles.title}>금리 기반 추천</ThemedText>

      {error ? (
        <ThemedText style={styles.errorMessage}>{error}</ThemedText>
      ) : null}

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
                  {item.trendNote ? (
                    <ThemedText style={styles.trendNoteText}>{item.trendNote}</ThemedText>
                  ) : null}
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

            {selectedItem?.trendNote ? (
              <View style={styles.modalTrendNote}>
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={18}
                  color="#558b2f"
                  style={styles.modalTrendIcon}
                />
                <ThemedText style={styles.modalTrendNoteText}>
                  {selectedItem.trendNote}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.modalExplanationSection}>
              <ThemedText style={styles.modalExplanationTitle}>상세 분석</ThemedText>
              <ThemedText style={styles.modalExplanationText}>
                {selectedItem && currentRate !== null 
                  ? getDetailedExplanation(selectedItem, currentRate, rateContext)
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
  errorMessage: {
    fontSize: 13,
    color: '#d84315',
    marginBottom: 10,
    marginLeft: 2,
  },

  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  recommendationsGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  recommendationCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
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
    marginLeft: 16,
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
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 16,
  },
  trendNoteText: {
    fontSize: 12,
    color: '#00796b',
    marginTop: 6,
    lineHeight: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 75,
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
  modalTrendNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f1f8e9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  modalTrendIcon: {
    marginTop: 2,
  },
  modalTrendNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#4a6572',
    lineHeight: 20,
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

export default InterestRateRecommendations; 
