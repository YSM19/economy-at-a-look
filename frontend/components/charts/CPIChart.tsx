import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Text, LayoutChangeEvent } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-gifted-charts';

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
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      if (width > 0 && Math.abs(width - containerWidth) > 0.5) {
        setContainerWidth(width);
      }
    },
    [containerWidth]
  );

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

  // 선택된 차트 모드에 따라 데이터 생성
  const getChartData = () => {
    // 데이터를 날짜 순으로 정렬 (오래된 것부터)하여 최신이 오른쪽에 오도록
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    
    switch (chartMode) {
      case 'cpi':
        return {
          data: sortedData.map((item, index) => ({
            value: item.cpi,
            label: (() => {
              const fullYear = item.date.slice(0, 4);
              const month = item.date.slice(4, 6);
              
              if (index === 0) {
                return `${fullYear.slice(-2)}.${month}`;
              }
              
              const prevFullYear = sortedData[index - 1].date.slice(0, 4);
              if (fullYear !== prevFullYear) {
                return `${fullYear.slice(-2)}.${month}`;
              }
              
              return month;
            })(),
            dataPointText: item.cpi.toFixed(1),
          })),
          title: '소비자물가지수',
          yAxisSuffix: '',
          formatYLabel: (value: number) => value.toFixed(1),
        };
      case 'monthly':
        return {
          data: sortedData.map((item, index) => ({
            value: item.monthlyChange,
            label: (() => {
              const fullYear = item.date.slice(0, 4);
              const month = item.date.slice(4, 6);
              
              if (index === 0) {
                return `${fullYear.slice(-2)}.${month}`;
              }
              
              const prevFullYear = sortedData[index - 1].date.slice(0, 4);
              if (fullYear !== prevFullYear) {
                return `${fullYear.slice(-2)}.${month}`;
              }
              
              return month;
            })(),
            dataPointText: item.monthlyChange.toFixed(2) + '%',
          })),
          title: '전월대비 변화율(%)',
          yAxisSuffix: '%',
          formatYLabel: (value: number) => value.toFixed(1) + '%',
        };
      case 'annual':
        return {
          data: sortedData.map((item, index) => ({
            value: item.annualChange,
            label: (() => {
              const fullYear = item.date.slice(0, 4);
              const month = item.date.slice(4, 6);
              
              if (index === 0) {
                return `${fullYear.slice(-2)}.${month}`;
              }
              
              const prevFullYear = sortedData[index - 1].date.slice(0, 4);
              if (fullYear !== prevFullYear) {
                return `${fullYear.slice(-2)}.${month}`;
              }
              
              return month;
            })(),
            dataPointText: item.annualChange.toFixed(2) + '%',
          })),
          title: '전년동월대비 변화율(%)',
          yAxisSuffix: '%',
          formatYLabel: (value: number) => value.toFixed(1) + '%',
        };
    }
  };

  const chartData = getChartData();
  
  // Y축을 동적으로 조정하기 위한 계산
  const values = chartData.data.map(item => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // 변동을 더 잘 보이게 하기 위해 범위 조정
  const range = maxValue - minValue;
  // 차트 모드에 따라 패딩을 다르게 설정
  let padding;
  if (chartMode === 'cpi') {
    padding = range > 0 ? range * 0.1 : 1; // CPI 지수는 값의 범위가 크므로 10% 패딩
  } else {
    padding = range > 0 ? range * 0.2 : 0.5; // 변화율은 작은 값이므로 20% 패딩, 최소 0.5
  }
  
  const yAxisMin = minValue - padding;
  const yAxisMax = maxValue + padding;
  // y축을 5개의 섹션으로 나눔
  const yAxisStep = (yAxisMax - yAxisMin) / 5;

  return (
    <View style={styles.container}>
      {/* 차트 제목 */}
      <ThemedText style={styles.chartTitle}>{chartData.title}</ThemedText>

      {/* 차트 */}
      <View style={styles.chartContainer} onLayout={handleLayout}>
        {containerWidth > 0 ? (
          <LineChart
            {...{
            data: chartData.data,
            width: containerWidth,
            parentWidth: containerWidth,
            height: 220,
            color: "#3b82f6",
            thickness: 3,
            dataPointsColor: "#3b82f6",
            dataPointsRadius: 4,
            focusEnabled: true,
            onFocus: handleFocus,
            dataPointLabelComponent: (item: any, index: number) => {
              if (focusedIndex === index) {
                return (
                  <View style={styles.tooltipContainer}>
                    <Text style={styles.tooltipText}>{item.dataPointText}</Text>
                  </View>
                );
              }
              return null;
            },
            dataPointLabelShiftY: -20,
            showVerticalLines: true,
            verticalLinesColor: "#e2e8f0",
            rulesColor: "#e2e8f0",
            rulesType: "solid",
            spacing: Math.max(
              12,
              (containerWidth - 70) / (chartData.data.length > 1 ? chartData.data.length -1 : 1)
            ),
            disableScroll: true,
            initialSpacing: 20,
            endSpacing: 20,
            animateOnDataChange: true,
            animationDuration: 1000,
            yAxisColor: "#64748b",
            xAxisColor: "#64748b",
            yAxisThickness: 1,
            xAxisThickness: 1,
            yAxisTextStyle: {
              color: '#1f2937',
              fontSize: 11,
              fontWeight: '600',
            },
            xAxisLabelTextStyle: {
              color: '#1f2937',
              fontSize: 14,
              fontWeight: '600',
              textAlign: 'center',
            },
            yAxisOffset: yAxisMin,
            stepValue: yAxisStep,
            noOfSections: 5,
            }}
          />
        ) : (
          <View style={styles.chartPlaceholder} />
        )}
      </View>
      
      {/* 차트 모드 선택 버튼 */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, chartMode === 'cpi' && styles.activeModeButton]}
          onPress={() => setChartMode('cpi')}
        >
          <ThemedText style={[styles.modeButtonText, chartMode === 'cpi' && styles.activeModeButtonText]}>
            지수
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, chartMode === 'monthly' && styles.activeModeButton]}
          onPress={() => setChartMode('monthly')}
        >
          <ThemedText style={[styles.modeButtonText, chartMode === 'monthly' && styles.activeModeButtonText]}>
            월별변화
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, chartMode === 'annual' && styles.activeModeButton]}
          onPress={() => setChartMode('annual')}
        >
          <ThemedText style={[styles.modeButtonText, chartMode === 'annual' && styles.activeModeButtonText]}>
            연간변화
          </ThemedText>
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
    fontSize: 12,
    color: 'black',
    fontWeight: 'bold'
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
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeModeButton: {
    backgroundColor: '#1976D2',
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
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 24,
  },
  chartContainer: {
    width: '100%',
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
  tabText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  activeTabText: {
    color: '#fff',
  },
  inactiveTabText: {
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  chartPlaceholder: {
    height: 220,
    width: '100%',
  },
});
