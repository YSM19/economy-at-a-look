import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
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
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    let label = '';
    
    // 데이터 개수에 따라 라벨 표시 간격 조정
    const dataLength = validData.length;
    let showLabel = false;
    
    if (dataLength <= 7) {
      // 7일 이하: 모든 날짜 표시
      showLabel = true;
    } else if (dataLength <= 15) {
      // 15일 이하: 2일마다 표시
      showLabel = index % 2 === 0 || index === dataLength - 1;
    } else if (dataLength <= 21) {
      // 21일 이하: 3일마다 표시
      showLabel = index % 3 === 0 || index === dataLength - 1;
    } else if (dataLength <= 30) {
      // 30일 이하: 6일마다 표시 + 처음과 마지막
      showLabel = index % 6 === 0 || index === dataLength - 1;
    } else {
      // 30일 초과: 7일마다 표시 + 처음과 마지막
      showLabel = index % 7 === 0 || index === dataLength - 1;
    }
    
    if (showLabel) {
      if (showOnlyDay) {
        if (index === 0) {
          label = `${month}.${day}`;
        } else {
          const prevDate = new Date(validData[index - 1].date);
          const prevMonth = prevDate.getMonth() + 1;
          
          if (month !== prevMonth) {
            label = `${month}.${day}`;
          } else {
            label = `${day}`;
          }
        }
      } else {
        if (index === 0) {
          label = `${month}.${day}`;
        } else {
          label = `${month}.${day}`;
        }
      }
    }

    const value = currencyData.values[index];
    
    return {
      value: value,
      label: label,
      dataPointText: value.toFixed(0),
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
      // 30일 데이터도 화면에 맞춤
      const availableWidth = screenWidth - 80; // Y축 공간 제외
      const spacingPerItem = availableWidth / validData.length;
      return {
        spacing: Math.max(spacingPerItem, 8), // 최소 8px 간격 보장
        initialSpacing: 5,
        endSpacing: 5,
        fontSize: 7
      };
    }
  };

  const chartConfig = getChartConfig();

  return (
    <View style={styles.container}>
      <ThemedText style={styles.chartTitle}>{currencyData.label}</ThemedText>
      
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={screenWidth}
          height={height}
          color={currencyData.color}
          thickness={3}
          dataPointsColor={currencyData.color}
          dataPointsRadius={validData.length > 15 ? 3 : 4}
          showDataPointOnFocus
          showStripOnFocus
          showTextOnFocus
          textShiftY={-10}
          textShiftX={-5}
          textColor="#333"
          textFontSize={12}
          showVerticalLines
          verticalLinesColor="#e2e8f0"
          rulesColor="#e2e8f0"
          rulesType="solid"
          spacing={chartConfig.spacing}
          initialSpacing={chartConfig.initialSpacing}
          endSpacing={chartConfig.endSpacing}
          animateOnDataChange={validData.length <= 15}
          animationDuration={1000}
          yAxisColor="#64748b"
          xAxisColor="#64748b"
          yAxisThickness={1}
          xAxisThickness={1}
          yAxisOffset={yAxisMin}
          stepValue={yAxisStep}
          noOfSections={6}
          yAxisTextStyle={{
            color: '#64748b',
            fontSize: 10,
          }}
          xAxisLabelTextStyle={{
            color: '#64748b',
            fontSize: chartConfig.fontSize,
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
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
     chartContainer: {
     width: '100%',
     borderRadius: 16,
     overflow: 'hidden',
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
}); 