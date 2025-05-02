import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-chart-kit';

interface ExchangeRateDataPoint {
  date: string;
  usdRate: number;
  eurRate: number;
  jpyRate: number;
}

interface ExchangeRateChartProps {
  data: ExchangeRateDataPoint[];
}

export const ExchangeRateChart: React.FC<ExchangeRateChartProps> = ({ data }) => {
  const screenWidth = Dimensions.get('window').width - 32;

  const chartData = {
    labels: data.map(item => item.date.slice(-2)),
    datasets: [
      {
        data: data.map(item => item.usdRate),
        color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
        strokeWidth: 2,
      }
    ],
    legend: ['원/달러 환율'],
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
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        fromZero={false}
        yAxisSuffix=""
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
      />
      <View style={styles.chartSelector}>
        <View style={[styles.selectorItem, styles.activeSelector]}>
          <ThemedText style={styles.activeSelectorText}>원/달러</ThemedText>
        </View>
        <View style={styles.selectorItem}>
          <ThemedText style={styles.selectorText}>원/유로</ThemedText>
        </View>
        <View style={styles.selectorItem}>
          <ThemedText style={styles.selectorText}>원/100엔</ThemedText>
        </View>
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
}); 