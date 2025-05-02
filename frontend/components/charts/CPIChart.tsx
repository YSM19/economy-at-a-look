import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
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

  // 선택된 차트 모드에 따라 데이터 생성
  const getChartData = () => {
    const labels = data.map(item => item.date.slice(-2));
    
    switch (chartMode) {
      case 'cpi':
        return {
          labels,
          datasets: [
            {
              data: data.map(item => item.cpi),
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
              data: data.map(item => item.monthlyChange),
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
              data: data.map(item => item.annualChange),
              color: (opacity = 1) => `rgba(211, 47, 47, ${opacity})`,
              strokeWidth: 2,
            }
          ],
          legend: ['전년동월대비 변화율(%)'],
        };
    }
  };

  const chartData = getChartData();

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
        fromZero={chartMode !== 'cpi'}
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
      />
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