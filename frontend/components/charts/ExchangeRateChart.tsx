import React from 'react';
import { View, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-chart-kit';
import { useState, useRef, useCallback } from 'react';

interface ExchangeRateDataPoint {
  date: string;
  usdRate?: number;
  eurRate?: number;
  jpyRate?: number;
  cnyRate?: number;
}

interface ExchangeRateChartProps {
  data: ExchangeRateDataPoint[];
  country?: string;
  height?: number;
  showOnlyDay?: boolean;
}

export const ExchangeRateChart: React.FC<ExchangeRateChartProps> = ({ 
  data, 
  country = 'usa',
  height = 220,
  showOnlyDay
}) => {
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

  // 국가별 데이터 선택
  const getDataByCountry = () => {
    switch (country) {
      case 'usa':
        return {
          values: data.map(item => item.usdRate || 0).filter(val => val > 0),
          label: '원/달러 환율',
          color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`
        };
      case 'japan':
        return {
          values: data.map(item => item.jpyRate || 0).filter(val => val > 0),
          label: '원/100엔 환율',
          color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`
        };
      case 'china':
        return {
          values: data.map(item => item.cnyRate || 0).filter(val => val > 0),
          label: '원/위안 환율',
          color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`
        };
      case 'europe':
        return {
          values: data.map(item => item.eurRate || 0).filter(val => val > 0),
          label: '원/유로 환율',
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`
        };
      default:
        return {
          values: data.map(item => item.usdRate || 0).filter(val => val > 0),
          label: '원/달러 환율',
          color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`
        };
    }
  };

  const currencyData = getDataByCountry();
  
  // 유효한 데이터가 있는지 확인
  if (currencyData.values.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <ThemedText style={styles.noDataText}>표시할 데이터가 없습니다.</ThemedText>
      </View>
    );
  }

  // 데이터가 있는 날짜만 라벨로 사용
  const validData = data.filter(item => {
    switch (country) {
      case 'usa': return item.usdRate && item.usdRate > 0;
      case 'japan': return item.jpyRate && item.jpyRate > 0;
      case 'china': return item.cnyRate && item.cnyRate > 0;
      case 'europe': return item.eurRate && item.eurRate > 0;
      default: return item.usdRate && item.usdRate > 0;
    }
  });

  const chartData = {
    labels: validData.map((item, index) => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      // showOnlyDay가 true면 첫 번째는 월.일, 달이 바뀔 때도 월.일, 나머지는 일자만 표시
      if (showOnlyDay) {
        if (index === 0) {
          return `${month}.${day}`;
        } else {
          // 이전 날짜와 월이 다르면 월.일 표시
          const prevDate = new Date(validData[index - 1].date);
          const prevMonth = prevDate.getMonth() + 1;
          
          if (month !== prevMonth) {
            return `${month}.${day}`;
          } else {
            return `${day}`;
          }
        }
      } else {
        // 첫 번째 날짜이거나 연도가 바뀔 때 연도 포함
        if (index === 0) {
          return `${year}.${month}.${day}`;
        }
        
        const prevDate = new Date(validData[index - 1].date);
        const prevYear = prevDate.getFullYear();
        
        if (year !== prevYear) {
          return `${year}.${month}.${day}`;
        }
        
        // 같은 연도 내에서는 월.일 형식
        return `${month}.${day}`;
      }
    }),
    datasets: [
      {
        data: currencyData.values,
        color: currencyData.color,
        strokeWidth: 2,
      }
    ],
    legend: [currencyData.label],
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
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
            height={height}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero={false}
            yAxisSuffix="원"
            yAxisInterval={1}
            verticalLabelRotation={0}
            horizontalLabelRotation={0}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            segments={4}
            onDataPointClick={handleDataPointClick}
          />
        </View>
        
        {/* 터치 시 표시되는 툴팁 */}
        {tooltipPos.visible && (
          <View
            style={[
              styles.tooltip,
              {
                left: tooltipPos.x - 40,
                top: tooltipPos.y - 15,
              },
            ]}
          >
            <ThemedText style={styles.tooltipText}>
              {Math.round(tooltipPos.value).toLocaleString()}원
            </ThemedText>
          </View>
        )}
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
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 8,
    zIndex: 1000,
  },
  tooltipText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
}); 