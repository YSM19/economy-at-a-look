import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Text, LayoutChangeEvent } from 'react-native';
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

interface ChartDataType {
  data: {
    value: number;
    label: string;
    dataPointText: string;
  }[];
  title: string;
}

export const InterestRateChart: React.FC<InterestRateChartProps> = ({ data }) => {
  const defaultWidth = Dimensions.get('window').width - 64; // 양쪽 패딩(16*2) + 컨테이너 패딩(16*2)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      if (width > 0 && Math.abs(width - (measuredWidth ?? 0)) > 0.5) {
        setMeasuredWidth(width);
      }
    },
    [measuredWidth]
  );

  const chartWidth = Math.max(measuredWidth ?? defaultWidth, 160);

  const handleFocus = useCallback((item: ChartDataType['data'][0], index: number) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setFocusedIndex(index);
    const newTimeoutId = setTimeout(() => {
      setFocusedIndex(null);
    }, 3000);
    setTimeoutId(newTimeoutId);
  }, [timeoutId]);

  // 금리 차트 데이터 생성
  const getChartData = (): ChartDataType => {
    // 데이터를 발표일 순으로 정렬 (오래된 것부터)하여 최신이 오른쪽에 오도록
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      data: sortedData.map((item, index) => ({
        value: item.rate,
        label: (() => {
          const dateStr = item.date;
          let year, month, day;
          
          if (dateStr.includes('-')) {
            const [fullYear, monthStr, dayStr] = dateStr.split('-');
            year = fullYear.slice(-2);
            month = monthStr;
            day = dayStr;
          } else if (dateStr.length === 8) {
            year = dateStr.slice(2, 4);
            month = dateStr.slice(4, 6);
            day = dateStr.slice(6, 8);
          } else {
            year = dateStr.slice(2, 4);
            month = dateStr.slice(4, 6);
            day = null;
          }
          
          if (index === 0) {
            return day ? `${year}.${month}.${day}` : `${year}.${month}`;
          }
          
          const prevDateStr = sortedData[index - 1].date;
          let prevYear;
          
          if (prevDateStr.includes('-')) {
            prevYear = prevDateStr.split('-')[0].slice(-2);
          } else if (prevDateStr.length === 8) {
            prevYear = prevDateStr.slice(2, 4);
          } else {
            prevYear = prevDateStr.slice(2, 4);
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
  };

  const chartData = getChartData();

  const initialSpacing = 26;
  const endSpacing = 44;
  const pointCount = chartData.data.length;
  const spacing = pointCount > 1
    ? Math.max(
        6,
        (chartWidth - initialSpacing - endSpacing - 6) / (pointCount - 1)
      )
    : 0;

  return (
    <View style={styles.container}>
      {/* 차트 제목 */}
      <ThemedText style={styles.chartTitle}>{chartData.title}</ThemedText>

      {/* 차트 */}
      {chartData.data.length === 0 ? (
        <View style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>
            표시할 데이터가 없습니다.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.chartWrapper} onLayout={handleLayout}>
          <LineChart
            data={chartData.data}
            width={chartWidth}
            parentWidth={chartWidth}
            height={220}
            color="#3b82f6"
            thickness={3}
            dataPointsColor="#3b82f6"
            dataPointsRadius={4}
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
            verticalLinesColor="#d1d5db"
            rulesColor="#d1d5db"
            rulesType="solid"
            initialSpacing={initialSpacing}
            endSpacing={endSpacing}
            spacing={spacing}
            disableScroll
            yAxisLabelWidth={25}
            animateOnDataChange
            animationDuration={1000}
            yAxisColor="#374151"
            xAxisColor="#374151"
            yAxisThickness={1.5}
            xAxisThickness={1.5}
            yAxisTextStyle={{
              color: '#1f2937',
              fontSize: 14,
              fontWeight: '600',
            }}
            xAxisLabelTextStyle={{
              color: '#1f2937',
              fontSize: 14,
              fontWeight: '600',
              textAlign: 'center',
            }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
    color: '#1f2937',
    textAlign: 'center',
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
  chartWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
});
