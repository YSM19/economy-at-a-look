import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-chart-kit';

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
    
    // 효율적인 레이블 생성: 첫 번째는 YYYY.MM, 이후 월만, 연도 바뀔 때 YYYY.MM
    const labels = sortedData.map((item, index) => {
      const fullYear = item.date.slice(0, 4); // 2024
      const month = item.date.slice(4, 6); // 06
      
      if (index === 0) {
        // 첫 번째는 항상 전체 연도.월 표시
        return `${fullYear}.${month}`;
      }
      
      const prevFullYear = sortedData[index - 1].date.slice(0, 4);
      if (fullYear !== prevFullYear) {
        // 연도가 바뀔 때는 전체 연도.월 표시
        return `${fullYear}.${month}`;
      }
      
      // 같은 연도 내에서는 월만 표시
      return month;
    });
    
    switch (chartMode) {
      case 'cpi':
        return {
          labels,
          datasets: [
            {
              data: sortedData.map(item => item.cpi),
              color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
              strokeWidth: 2,
            }
          ],
          legend: ['소비자물가지수'],
        };
      case 'monthly':
        return {
          labels,
          datasets: [
            {
              data: sortedData.map(item => item.monthlyChange),
              color: (opacity = 1) => `rgba(245, 124, 0, ${opacity})`,
              strokeWidth: 2,
            }
          ],
          legend: ['전월대비 변화율(%)'],
        };
      case 'annual':
        return {
          labels,
          datasets: [
            {
              data: sortedData.map(item => item.annualChange),
              color: (opacity = 1) => `rgba(211, 47, 47, ${opacity})`,
              strokeWidth: 2,
            }
          ],
          legend: ['전년동월대비 변화율(%)'],
        };
    }
  };

  const chartData = getChartData();
  
  // 모든 차트 모드에서 데이터 범위에 맞게 Y축 동적 조정
  // fromZero=false로 설정하여 항상 데이터 범위에 최적화

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: chartMode === 'cpi' ? 1 : 2,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '1',
    },
    propsForLabels: {
      fontSize: 10,
      fontWeight: 'bold',
    },
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
    isUserInteracting.current = true;
  }, []);
  
  // 터치 종료 시 사용자 상호작용 상태 해제
  const handleTouchEnd = useCallback(() => {
    isUserInteracting.current = false;
    
    // 터치가 끝난 후 3초 뒤 자동 숨김
    if (tooltipPos.visible && autoHideTimeout.current) {
      clearTimeout(autoHideTimeout.current);
    }
    
    if (tooltipPos.visible) {
      autoHideTimeout.current = setTimeout(() => {
        if (!isUserInteracting.current) {
          setTooltipPos(prev => ({ ...prev, visible: false, index: -1 }));
        }
      }, 3000);
    }
  }, [tooltipPos.visible]);

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
    <TouchableWithoutFeedback onPress={handleChartAreaTouch}>
      <View style={styles.container}>
        <View
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <LineChart
            data={chartData}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero={false}
            yAxisSuffix={chartMode === 'cpi' ? '' : '%'}
            yAxisInterval={1}
            verticalLabelRotation={0}
            horizontalLabelRotation={0}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            segments={5}
            onDataPointClick={handleDataPointClick}
          />
        </View>
        
        {/* 터치 시 표시되는 툴팁 */}
        {tooltipPos.visible && (
          <View
            style={[
              styles.tooltip,
              {
                left: tooltipPos.x - 30,
                top: tooltipPos.y - 15,
              },
            ]}
          >
            <ThemedText style={styles.tooltipText}>
              {getTooltipText(tooltipPos.value)}
            </ThemedText>
          </View>
        )}
        
        <View style={styles.chartSelector}>
          <TouchableOpacity 
            style={[styles.selectorItem, chartMode === 'cpi' && styles.activeSelector]}
            onPress={() => setChartMode('cpi')}
          >
            <ThemedText style={chartMode === 'cpi' ? styles.activeSelectorText : styles.selectorText}>CPI 지수</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.selectorItem, chartMode === 'monthly' && styles.activeSelector]}
            onPress={() => setChartMode('monthly')}
          >
            <ThemedText style={chartMode === 'monthly' ? styles.activeSelectorText : styles.selectorText}>전월대비</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.selectorItem, chartMode === 'annual' && styles.activeSelector]}
            onPress={() => setChartMode('annual')}
          >
            <ThemedText style={chartMode === 'annual' ? styles.activeSelectorText : styles.selectorText}>전년동월대비</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
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
}); 