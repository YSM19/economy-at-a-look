import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Text, ScrollView } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-gifted-charts';

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
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const handleFocus = useCallback((item: any, index: number) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setFocusedIndex(index);
    const newTimeoutId = setTimeout(() => {
      setFocusedIndex(null);
    }, 3000);
    setTimeoutId(newTimeoutId);
  }, [timeoutId]);

  // 국가별 데이터 선택
  const getDataByCountry = () => {
    switch (country) {
      case 'usa':
        return {
          values: data.map(item => item.usdRate || 0).filter(val => val > 0),
          label: '원/달러 환율',
          color: '#3b82f6'
        };
      case 'japan':
        return {
          values: data.map(item => item.jpyRate || 0).filter(val => val > 0),
          label: '원/100엔 환율',
          color: '#3b82f6'
        };
      case 'china':
        return {
          values: data.map(item => item.cnyRate || 0).filter(val => val > 0),
          label: '원/위안 환율',
          color: '#3b82f6'
        };
      case 'europe':
        return {
          values: data.map(item => item.eurRate || 0).filter(val => val > 0),
          label: '원/유로 환율',
          color: '#3b82f6'
        };
      default:
        return {
          values: data.map(item => item.usdRate || 0).filter(val => val > 0),
          label: '원/달러 환율',
          color: '#3b82f6'
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

  const chartData = validData.map((item, index) => {
    const date = new Date(item.date);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    let label = '';

    if (showOnlyDay) {
      // 30일 차트: 첫째 날과 월이 바뀔 때 '월.일', 나머지는 '일'
      if (index === 0) {
        label = `${month}.${day}`;
      } else {
        const prevDate = new Date(validData[index - 1].date);
        if (date.getMonth() !== prevDate.getMonth()) {
          label = `${month}.${day}`;
        } else {
          label = `${day}`;
        }
      }
    } else {
      // 7일 차트: 첫째 날은 '연.월.일', 월 바뀌면 '월.일', 나머지는 '일'
      const year = date.getFullYear().toString().slice(-2);
      if (index === 0) {
        label = `${year}.${month}.${day}`;
      } else {
        const prevDate = new Date(validData[index - 1].date);
        if (date.getMonth() !== prevDate.getMonth()) {
          label = `${month}.${day}`;
        } else {
          label = `${day}`;
        }
      }
    }

    const value = currencyData.values[index];
    
    return {
      value: value,
      label: label,
      dataPointText: value.toLocaleString('ko-KR'),
    };
  });

  // Y축을 동적으로 조정하기 위한 계산
  const values = chartData.map(item => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // 변동을 더 잘 보이게 하기 위해 범위 조정
  const range = maxValue - minValue;
  const padding = Math.max(range * 0.15, 2); // 15% 여백, 최소 2원
  
  const yAxisMin = Math.floor(minValue - padding);
  const yAxisMax = Math.ceil(maxValue + padding);
  const yAxisStep = Math.ceil((yAxisMax - yAxisMin) / 6);

  // 데이터 개수에 따른 차트 설정 계산
  const getChartConfig = () => {
    if (validData.length <= 7) {
      return {
        spacing: undefined,
        initialSpacing: 10,
        endSpacing: 10,
        fontSize: 9
      };
    } else if (validData.length <= 15) {
      return {
        spacing: undefined,
        initialSpacing: 8,
        endSpacing: 8,
        fontSize: 8
      };
    } else {
      // 30일 데이터: 스크롤이 가능하도록 고정된 간격 설정
      return {
        spacing: 40,
        initialSpacing: 5,
        endSpacing: 40,
        fontSize: 9
      };
    }
  };

  const chartConfig = getChartConfig();

  const lineChartComponent = (
    <LineChart
      data={chartData}
      width={showOnlyDay ? (validData.length * (chartConfig.spacing || 0)) : screenWidth}
      height={height}
      color={currencyData.color}
      thickness={3}
      dataPointsColor={currencyData.color}
      dataPointsRadius={validData.length > 15 ? 3 : 4}
      focusEnabled
      onFocus={handleFocus}
      dataPointLabelComponent={(item: any, index: number) => {
        if (focusedIndex === index) {
          return (
            <View style={styles.tooltipContainer}>
              <Text style={styles.tooltipText}>{item.dataPointText}</Text>
            </View>
          );
        }
        return null;
      }}
      dataPointLabelShiftY={-20}
      showVerticalLines
      verticalLinesColor="#e2e8f0"
      rulesColor="#e2e8f0"
      rulesType="solid"
      spacing={chartConfig.spacing}
      initialSpacing={chartConfig.initialSpacing}
      endSpacing={chartConfig.endSpacing}
      disableScroll={!showOnlyDay}
      animateOnDataChange={validData.length <= 15}
      animationDuration={1000}
      yAxisColor="#64748b"
      xAxisColor="#64748b"
      yAxisThickness={1}
      xAxisThickness={1}
      yAxisOffset={yAxisMin}
      stepValue={yAxisStep}
      noOfSections={6}
      formatYLabel={(value: string) => parseFloat(value).toLocaleString('ko-KR')}
      yAxisTextStyle={{
        color: '#1f2937',
        fontSize: 12,
        fontWeight: '600',
      }}
      xAxisLabelTextStyle={{
        color: '#1f2937',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
      }}
    />
  );

  return (
    <View style={styles.container}>
      <ThemedText style={styles.chartTitle}>{currencyData.label}</ThemedText>
      
      <View style={styles.chartContainer}>
        {showOnlyDay ? (
          <ScrollView horizontal showsHorizontalScrollIndicator persistentScrollbar={true}>
            {lineChartComponent}
          </ScrollView>
        ) : (
          lineChartComponent
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chartContainer: {
    width: '100%',
    borderRadius: 16,
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
  tooltipContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    position: 'absolute',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tooltipText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 