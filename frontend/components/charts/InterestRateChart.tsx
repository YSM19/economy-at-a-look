import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-gifted-charts';

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
    
    switch (chartMode) {
      case 'rate':
        return {
          data: sortedData.map((item, index) => ({
            value: item.rate,
            label: (() => {
              const dateStr = item.date;
              let year, month, day;
              
              if (dateStr.includes('-')) {
                const [fullYear, monthStr, dayStr] = dateStr.split('-');
                year = fullYear;
                month = monthStr;
                day = dayStr;
              } else if (dateStr.length === 8) {
                year = dateStr.slice(0, 4);
                month = dateStr.slice(4, 6);
                day = dateStr.slice(6, 8);
              } else {
                year = dateStr.slice(0, 4);
                month = dateStr.slice(4, 6);
                day = null;
              }
              
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
                return day ? `${year}.${month}.${day}` : `${year}.${month}`;
              }
              
              return day ? `${month}.${day}` : month;
            })(),
            dataPointText: item.rate.toFixed(2) + '%',
          })),
          title: '정책금리(%)',
        };
      case 'change':
        const changes = sortedData.map((item, index) => {
          if (index === 0) return 0;
          return item.rate - sortedData[index - 1].rate;
        });
        
        return {
          data: sortedData.map((item, index) => ({
            value: changes[index],
            label: (() => {
              const dateStr = item.date;
              let year, month, day;
              
              if (dateStr.includes('-')) {
                const [fullYear, monthStr, dayStr] = dateStr.split('-');
                year = fullYear;
                month = monthStr;
                day = dayStr;
              } else if (dateStr.length === 8) {
                year = dateStr.slice(0, 4);
                month = dateStr.slice(4, 6);
                day = dateStr.slice(6, 8);
              } else {
                year = dateStr.slice(0, 4);
                month = dateStr.slice(4, 6);
                day = null;
              }
              
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
                return day ? `${year}.${month}.${day}` : `${year}.${month}`;
              }
              
              return day ? `${month}.${day}` : month;
            })(),
            dataPointText: (changes[index] >= 0 ? '+' : '') + changes[index].toFixed(2) + '%p',
          })),
          title: '금리 변화(%p)',
        };
    }
  };

  const chartData = getChartData();

  return (
    <View style={styles.container}>
      {/* 차트 모드 선택 버튼 */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, chartMode === 'rate' && styles.activeModeButton]}
          onPress={() => setChartMode('rate')}
        >
          <ThemedText style={[styles.modeButtonText, chartMode === 'rate' && styles.activeModeButtonText]}>
            금리
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, chartMode === 'change' && styles.activeModeButton]}
          onPress={() => setChartMode('change')}
        >
          <ThemedText style={[styles.modeButtonText, chartMode === 'change' && styles.activeModeButtonText]}>
            변화율
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* 차트 제목 */}
      <ThemedText style={styles.chartTitle}>{chartData.title}</ThemedText>

      {/* 차트 */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData.data}
          width={screenWidth}
          height={220}
          color="#3b82f6"
          thickness={3}
          dataPointsColor="#3b82f6"
          dataPointsRadius={5}
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
            fontSize: 11,
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
  modeSelector: {
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  activeModeButton: {
    backgroundColor: '#3b82f6',
  },
  modeButtonText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    paddingVertical: 2,
  },
  activeModeButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 16,
    paddingVertical: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chartContainer: {
    marginVertical: 8,
    borderRadius: 16,
  },
}); 