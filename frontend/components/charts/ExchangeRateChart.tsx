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
        label = `${year}.${month}.${day}`;
      } else {
        const prevDate = new Date(validData[index - 1].date);
        const prevYear = prevDate.getFullYear();
        
        if (year !== prevYear) {
          label = `${year}.${month}.${day}`;
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
          dataPointsRadius={4}
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
          initialSpacing={10}
          endSpacing={10}
          animateOnDataChange
          animationDuration={1000}
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