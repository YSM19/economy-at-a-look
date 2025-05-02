import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-chart-kit';

interface InterestRateDataPoint {
  date: string;
  kbRate: number;
  fedRate: number;
  marketRate: number;
}

interface InterestRateChartProps {
  data: InterestRateDataPoint[];
}

const InterestRateChart: React.FC<InterestRateChartProps> = ({ data }) => {
  const screenWidth = Dimensions.get('window').width - 32;

  const chartData = {
    labels: data.map(item => item.date.slice(-2)),
    datasets: [
      {
        data: data.map(item => item.kbRate),
        color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: data.map(item => item.fedRate),
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: data.map(item => item.marketRate),
        color: (opacity = 1) => `rgba(245, 124, 0, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['한국은행 기준금리', '미 연준 기준금리', '시장금리'],
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 1,
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
        fromZero
        yAxisSuffix="%"
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
      <View style={styles.legendContainer}>
        {chartData.legend.map((label, index) => (
          <View key={index} style={styles.legendItem}>
            <View 
              style={[
                styles.legendColor, 
                { 
                  backgroundColor: 
                    index === 0 ? 'rgba(25, 118, 210, 1)' : 
                    index === 1 ? 'rgba(76, 175, 80, 1)' : 
                    'rgba(245, 124, 0, 1)'
                }
              ]}
            />
            <View style={styles.legendTextContainer}>
              <ThemedText style={styles.legendLabel}>{label}</ThemedText>
            </View>
          </View>
        ))}
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
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  legendLabel: {
    fontSize: 10,
    color: '#666',
    lineHeight: 16,
    paddingVertical: 2,
  },
});

export default InterestRateChart; 