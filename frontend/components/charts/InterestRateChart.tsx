import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-chart-kit';

interface InterestRateDataPoint {
  date: string;
  rate: number;
  announcementDate: string;
}

interface InterestRateChartProps {
  data: InterestRateDataPoint[];
}

export const InterestRateChart: React.FC<InterestRateChartProps> = ({ data }) => {
  const [chartMode, setChartMode] = useState<'rate' | 'change'>('rate');
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
    // 데이터를 발표일 순으로 정렬 (오래된 것부터)하여 최신이 오른쪽에 오도록
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    
    // 발표일 날짜를 명확하게 표시하는 레이블 생성
    const labels = sortedData.map((item, index) => {
      // YYYY-MM-DD 형식의 날짜를 처리
      const dateStr = item.date;
      let year, month, day;
      
      if (dateStr.includes('-')) {
        // YYYY-MM-DD 형식인 경우
        const [fullYear, monthStr, dayStr] = dateStr.split('-');
        year = fullYear;
        month = monthStr;
        day = dayStr;
      } else if (dateStr.length === 8) {
        // YYYYMMDD 형식인 경우
        year = dateStr.slice(0, 4);
        month = dateStr.slice(4, 6);
        day = dateStr.slice(6, 8);
      } else {
        // YYYYMM 형식인 경우 (기존 로직)
        year = dateStr.slice(0, 4);
        month = dateStr.slice(4, 6);
        day = null;
      }
      
      // 첫 번째 날짜이거나 연도가 바뀔 때 연도 포함
      if (index === 0) {
        return day ? `${year}.${month}.${day}` : `${year}.${month}`;
      }
      
      const prevDateStr = sortedData[index - 1].date;
      let prevYear;
      
      if (prevDateStr.includes('-')) {
        prevYear = prevDateStr.split('-')[0];
      } else if (prevDateStr.length === 8) {
        prevYear = prevDateStr.slice(0, 4);
      } else {
        prevYear = prevDateStr.slice(0, 4);
      }
      
      if (year !== prevYear) {
        // 연도가 바뀔 때 연도 포함
        return day ? `${year}.${month}.${day}` : `${year}.${month}`;
      }
      
      // 같은 연도 내에서는 월.일 또는 월만 표시
      return day ? `${month}.${day}` : month;
    });
    
    switch (chartMode) {
      case 'rate':
        return {
          labels,
          datasets: [
            {
              data: sortedData.map(item => item.rate),
              color: (opacity = 1) => `rgba(255, 140, 66, ${opacity})`, // 활기찬 오렌지
              strokeWidth: 3,
            }
          ],
          legend: ['정책금리(%)'],
        };
      case 'change':
        // 금리 변화량 계산 (전회 대비)
        const changes = sortedData.map((item, index) => {
          if (index === 0) return 0;
          return item.rate - sortedData[index - 1].rate;
        });
        
        return {
          labels,
          datasets: [
            {
              data: changes,
              color: (opacity = 1) => `rgba(255, 140, 66, ${opacity})`, // 활기찬 오렌지
              strokeWidth: 3,
            }
          ],
          legend: ['금리 변화(%p)'],
        };
    }
  };

  const chartData = getChartData();

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: chartMode === 'rate' ? 2 : 2,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#FF8C42',
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: 'bold',
    },
    formatYLabel: (yValue: string) => {
      const value = parseFloat(yValue);
      if (chartMode === 'rate') {
        return value.toFixed(2) + '%';
      } else {
        return (value >= 0 ? '+' : '') + value.toFixed(2) + '%p';
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
      case 'rate':
        return `${value.toFixed(2)}%`;
      case 'change':
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%p`;
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
            fromZero={true}
            yAxisSuffix={chartMode === 'rate' ? '%' : '%p'}
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
            style={[styles.selectorItem, chartMode === 'rate' && styles.activeSelector]}
            onPress={() => setChartMode('rate')}
          >
            <ThemedText style={chartMode === 'rate' ? styles.activeSelectorText : styles.selectorText}>금리 수준</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.selectorItem, chartMode === 'change' && styles.activeSelector]}
            onPress={() => setChartMode('change')}
          >
            <ThemedText style={chartMode === 'change' ? styles.activeSelectorText : styles.selectorText}>변화량</ThemedText>
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
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  activeSelector: {
    backgroundColor: '#FF8C42',
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
    zIndex: 1000,
  },
  tooltipText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
}); 