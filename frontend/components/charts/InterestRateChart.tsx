import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
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

  // 선택된 차트 모드에 따라 데이터 생성
  const getChartData = () => {
    // 데이터를 발표일 순으로 정렬 (오래된 것부터)하여 최신이 오른쪽에 오도록
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    
    // 발표일 날짜를 명확하게 표시하는 레이블 생성
    const labels = sortedData.map((item, index) => {
      // YYYY-MM-DD 형식의 날짜를 YY.MM.DD 형식으로 변환
      const dateStr = item.date;
      if (dateStr.includes('-')) {
        // YYYY-MM-DD 형식인 경우
        const [year, month, day] = dateStr.split('-');
        return `${year.slice(2)}.${month}.${day}`;
      } else if (dateStr.length === 8) {
        // YYYYMMDD 형식인 경우
        const year = dateStr.slice(2, 4);
        const month = dateStr.slice(4, 6);
        const day = dateStr.slice(6, 8);
        return `${year}.${month}.${day}`;
      } else {
        // 기존 로직 유지 (YYYYMM 형식)
        const year = dateStr.slice(2, 4);
        const month = dateStr.slice(4, 6);
        
        if (index === 0) {
          return `${year}.${month}`;
        }
        
        const prevYear = sortedData[index - 1].date.slice(2, 4);
        if (year !== prevYear) {
          return `${year}.${month}`;
        }
        
        return month;
      }
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

  return (
    <View style={styles.container}>
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
      />
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
}); 