import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-chart-kit';

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
    labels: validData.map(item => {
      const date = new Date(item.date);
      // showOnlyDay가 true면 일짜만 표시
      if (showOnlyDay) {
        return `${date.getDate()}`;
      } else {
        // 기본적으로는 월/일 형식
        return `${date.getMonth() + 1}/${date.getDate()}`;
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
    },
  };

  return (
    <View style={styles.container}>
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
      />
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