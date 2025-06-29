import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-gifted-charts';

interface CPIDataPoint {
  date: string;
  cpi: number;
  monthlyChange: number;
  annualChange: number;
}

interface CPIChartProps {
  data: CPIDataPoint[];
}

export const CPIChart: React.FC<CPIChartProps> = ({ data }) => {
  const [chartMode, setChartMode] = useState<'cpi' | 'monthly' | 'annual'>('cpi');
  const screenWidth = Dimensions.get('window').width - 32;
  const [tooltipPos, setTooltipPos] = useState<{
    x: number;
    y: number;
    value: number;
    visible: boolean;
    index: number;
  }>({
    x: 0,
    y: 0,
    value: 0,
    visible: false,
    index: -1,
  });
  
  const autoHideTimeout = useRef<NodeJS.Timeout | null>(null);
  const isUserInteracting = useRef(false);

  // 선택된 차트 모드에 따라 데이터 생성
  const getChartData = () => {
    // 데이터를 날짜 순으로 정렬 (오래된 것부터)하여 최신이 오른쪽에 오도록
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    
    switch (chartMode) {
      case 'cpi':
        return {
          data: sortedData.map((item, index) => ({
            value: item.cpi,
            label: (() => {
              const fullYear = item.date.slice(0, 4);
              const month = item.date.slice(4, 6);
              
              if (index === 0) {
                return `${fullYear}.${month}`;
              }
              
              const prevFullYear = sortedData[index - 1].date.slice(0, 4);
              if (fullYear !== prevFullYear) {
                return `${fullYear}.${month}`;
              }
              
              return month;
            })(),
            dataPointText: item.cpi.toFixed(1),
          })),
          title: '소비자물가지수',
          yAxisSuffix: '',
          formatYLabel: (value: number) => value.toFixed(1),
        };
      case 'monthly':
        return {
          data: sortedData.map((item, index) => ({
            value: item.monthlyChange,
            label: (() => {
              const fullYear = item.date.slice(0, 4);
              const month = item.date.slice(4, 6);
              
              if (index === 0) {
                return `${fullYear}.${month}`;
              }
              
              const prevFullYear = sortedData[index - 1].date.slice(0, 4);
              if (fullYear !== prevFullYear) {
                return `${fullYear}.${month}`;
              }
              
              return month;
            })(),
            dataPointText: item.monthlyChange.toFixed(2) + '%',
          })),
          title: '전월대비 변화율(%)',
          yAxisSuffix: '%',
          formatYLabel: (value: number) => value.toFixed(1) + '%',
        };
      case 'annual':
        return {
          data: sortedData.map((item, index) => ({
            value: item.annualChange,
            label: (() => {
              const fullYear = item.date.slice(0, 4);
              const month = item.date.slice(4, 6);
              
              if (index === 0) {
                return `${fullYear}.${month}`;
              }
              
              const prevFullYear = sortedData[index - 1].date.slice(0, 4);
              if (fullYear !== prevFullYear) {
                return `${fullYear}.${month}`;
              }
              
              return month;
            })(),
            dataPointText: item.annualChange.toFixed(2) + '%',
          })),
          title: '전년동월대비 변화율(%)',
          yAxisSuffix: '%',
          formatYLabel: (value: number) => value.toFixed(1) + '%',
        };
    }
  };

  const chartData = getChartData();
  
  // 모든 차트 모드에서 데이터 범위에 맞게 Y축 동적 조정
  // fromZero=false로 설정하여 항상 데이터 범위에 최적화

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: '#f0f9ff',
    backgroundGradientToOpacity: 0.6,
    decimalPlaces: chartMode === 'cpi' ? 1 : 2,
    color: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 65, 85, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    propsForLabels: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    propsForBackgroundLines: {
      strokeDasharray: "3,3",
      stroke: "#e2e8f0",
      strokeWidth: 1,
    },
    fillShadowGradientOpacity: 0.1,
    formatYLabel: (yValue: string) => {
      const value = parseFloat(yValue);
      if (chartMode === 'cpi') {
        return value.toFixed(1);
      } else {
        return value.toFixed(1) + '%';
      }
    },
  };

  // 점 클릭 이벤트 핸들러
  const handleDataPointClick = useCallback((data: any) => {
    const { x, y, value, index } = data;
    
    // 기존 타이머 클리어
    if (autoHideTimeout.current) {
      clearTimeout(autoHideTimeout.current);
      autoHideTimeout.current = null;
    }
    
    // 같은 점을 다시 클릭한 경우 툴팁 숨김
    if (tooltipPos.visible && tooltipPos.index === index) {
      setTooltipPos(prev => ({ ...prev, visible: false, index: -1 }));
      return;
    }
    
    // 새로운 툴팁 표시
    setTooltipPos({
      x: x,
      y: y,
      value: value,
      visible: true,
      index: index,
    });
    
    // 3초 후 자동 숨김 (사용자가 상호작용 중이 아닐 때만)
    autoHideTimeout.current = setTimeout(() => {
      if (!isUserInteracting.current) {
        setTooltipPos(prev => ({ ...prev, visible: false, index: -1 }));
      }
    }, 3000);
  }, [tooltipPos.visible, tooltipPos.index]);
  
  // 차트 외부 터치 시 툴팁 숨김
  const handleChartAreaTouch = useCallback(() => {
    if (tooltipPos.visible) {
      if (autoHideTimeout.current) {
        clearTimeout(autoHideTimeout.current);
        autoHideTimeout.current = null;
      }
      setTooltipPos(prev => ({ ...prev, visible: false, index: -1 }));
    }
  }, [tooltipPos.visible]);
  
  // 터치 시작 시 사용자 상호작용 상태 설정
  const handleTouchStart = useCallback(() => {
    // react-native-gifted-charts에서는 내장 터치 핸들링 사용
  }, []);
  
  // 터치 종료 시 사용자 상호작용 상태 해제
  const handleTouchEnd = useCallback(() => {
    // react-native-gifted-charts에서는 내장 터치 핸들링 사용
  }, []);

  // 차트 모드에 따른 툴팁 텍스트 생성
  const getTooltipText = (value: number) => {
    switch (chartMode) {
      case 'cpi':
        return value.toFixed(1);
      case 'monthly':
      case 'annual':
        return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  return (
    <View style={styles.container}>
      {/* 차트 모드 선택 버튼 */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, chartMode === 'cpi' && styles.activeModeButton]}
          onPress={() => setChartMode('cpi')}
        >
          <ThemedText style={[styles.modeButtonText, chartMode === 'cpi' && styles.activeModeButtonText]}>
            지수
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, chartMode === 'monthly' && styles.activeModeButton]}
          onPress={() => setChartMode('monthly')}
        >
          <ThemedText style={[styles.modeButtonText, chartMode === 'monthly' && styles.activeModeButtonText]}>
            월별변화
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, chartMode === 'annual' && styles.activeModeButton]}
          onPress={() => setChartMode('annual')}
        >
          <ThemedText style={[styles.modeButtonText, chartMode === 'annual' && styles.activeModeButtonText]}>
            연간변화
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* 차트 제목 */}
      <ThemedText style={styles.chartTitle}>{chartData.title}</ThemedText>

      {/* 차트 */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData.data}
          width={screenWidth}
          height={220}
          color="#3b82f6"
          thickness={3}
          dataPointsColor="#3b82f6"
          dataPointsRadius={4}
          showDataPointOnPress
          showStripOnPress
          showTextOnPress
          textShiftY={-10}
          textShiftX={-5}
          textColor="#333"
          textFontSize={12}
          showVerticalLines
          verticalLinesColor="#e2e8f0"
          rulesColor="#e2e8f0"
          rulesType="solid"
          initialSpacing={10}
          endSpacing={10}
          animateOnDataChange
          animationDuration={1000}
          onFocus={(item: any, index: number) => {
            // 포커스 시 처리 (선택사항)
          }}
          yAxisColor="#64748b"
          xAxisColor="#64748b"
          yAxisThickness={1}
          xAxisThickness={1}
          yAxisTextStyle={{
            color: '#64748b',
            fontSize: 10,
          }}
          xAxisLabelTextStyle={{
            color: '#64748b',
            fontSize: 9,
            textAlign: 'center',
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartSelector: {
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  selectorItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeSelector: {
    backgroundColor: '#1976D2',
  },
  selectorText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    paddingVertical: 2,
  },
  activeSelectorText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 16,
    paddingVertical: 2,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 8,
  },
  tooltipText: {
    fontSize: 12,
    color: '#fff',
  },
  modeSelector: {
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeModeButton: {
    backgroundColor: '#1976D2',
  },
  modeButtonText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    paddingVertical: 2,
  },
  activeModeButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 16,
    paddingVertical: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 24,
  },
  chartContainer: {
    marginVertical: 8,
    borderRadius: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
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
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
}); 