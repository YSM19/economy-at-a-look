import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { ThemedText } from './ThemedText';
import Svg, { Path, Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { economicIndexApi } from '../services/api';

type CPIGaugeProps = {
  value?: number;
};

const formatNumberWithUnit = (value: number | string, unit: string): string => {
  return `${value}${unit}`;
};

const CPIGauge: React.FC<CPIGaugeProps> = ({ value }) => {
  const [cpiRate, setCpiRate] = useState(value || 0);
  const [rateText, setRateText] = useState('');
  const [rateColor, setRateColor] = useState('#4CAF50');
  const [activeSection, setActiveSection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  
  // API에서 CPI 데이터 가져오기
  useEffect(() => {
    const fetchCPIRate = async () => {
      if (value !== undefined) {
        setCpiRate(value);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await economicIndexApi.getConsumerPriceIndex();
        
        console.log('🔍 [CPIGauge] API 응답:', response.data);
        
        if (response.data?.success && response.data.data) {
          const cpiData = response.data.data;
          
          console.log('🔍 [CPIGauge] CPI 데이터:', cpiData);
          
          // 전년동월대비 변화율 사용
          if (cpiData.yearlyChange !== undefined) {
            const yearlyRate = parseFloat(cpiData.yearlyChange.toString());
            console.log('✅ [CPIGauge] 전년동월대비 변화율 설정:', yearlyRate);
            setCpiRate(yearlyRate);
          } else if (cpiData.annualRate !== undefined) {
            const annualRate = parseFloat(cpiData.annualRate.toString());
            console.log('✅ [CPIGauge] 연간 변화율 설정:', annualRate);
            setCpiRate(annualRate);
          } else {
            console.warn('⚠️ [CPIGauge] CPI 변화율 데이터가 없습니다');
            setError('CPI 변화율 데이터가 없습니다');
          }
          
          // 마지막 업데이트 시간 설정
          if (cpiData.lastUpdated) {
            setLastUpdated(cpiData.lastUpdated);
          }
        }
      } catch (err) {
        console.error('CPI 데이터 가져오기 실패:', err);
        setError('CPI 데이터를 가져올 수 없습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchCPIRate();
  }, [value]);

  useEffect(() => {
    if (cpiRate >= -1 && cpiRate < 0) {
      setRateText('디플레이션');
      setRateColor('#F44336'); // 빨간색 (매우 위험)
      setActiveSection(0);
    } else if (cpiRate >= 0 && cpiRate < 2.0) {
      setRateText('저물가');
      setRateColor('#FF9800'); // 주황색 (위험 신호)
      setActiveSection(1);
    } else if (cpiRate >= 2.0 && cpiRate < 3.0) {
      setRateText('안정물가');
      setRateColor('#4CAF50'); // 초록색 (이상적)
      setActiveSection(2);
    } else if (cpiRate >= 3.0 && cpiRate < 5.0) {
      setRateText('고물가');
      setRateColor('#FF9800'); // 주황색 (우려/경계)
      setActiveSection(3);
    } else if (cpiRate >= 5.0) {
      setRateText('초고물가');
      setRateColor('#F44336'); // 빨간색 (위험)
      setActiveSection(4);
    } else if (cpiRate < -1) {
      // -1% 미만인 경우도 디플레이션으로 처리하되 더 심각한 상황
      setRateText('디플레이션');
      setRateColor('#F44336');
      setActiveSection(0);
    }
  }, [cpiRate]);

  const screenWidth = Dimensions.get('window').width;
  const size = screenWidth - 64;
  const center = size / 2;
  const radius = size * 0.4;
  
  // 각도 계산 - SVG 좌표계 기준으로 8시(약 150도)에서 4시(약 30도)까지
  const startAngle = 150; // 8시 방향
  const endAngle = 30;   // 4시 방향
  const totalAngle = 240; // 시계 방향으로 이동하는 각도
  
  // 물가 범위는 기본적으로 -1%~6%로 설정하되, 실제 값이 범위를 벗어나면 동적으로 확장
  let minRate = -1;
  let maxRate = 6;
  
  // 실제 값이 범위를 벗어나는 경우 동적으로 확장
  if (cpiRate < minRate) {
    minRate = Math.floor(cpiRate) - 1;
  }
  if (cpiRate > maxRate) {
    maxRate = Math.ceil(cpiRate) + 1;
  }
  
  const rateRange = maxRate - minRate;
  
  // 시계 방향으로 움직이도록 각도 계산
  const normalizedRate = Math.max(minRate, Math.min(maxRate, cpiRate));
  const angle = startAngle + ((normalizedRate - minRate) / rateRange) * totalAngle;
  const needleRad = angle * Math.PI / 180;
  
  // 바늘 끝점 계산
  const needleLength = radius * 0.85;
  const needleX = center + needleLength * Math.cos(needleRad);
  const needleY = center + needleLength * Math.sin(needleRad);
  
  // 섹션 색상 및 범위 (동적으로 확장 가능)
  const createSections = () => {
    const baseSections = [
      { name: '디플레이션', color: '#FFCDD2', textColor: '#F44336', start: Math.max(minRate, -1), end: 0 },
      { name: '저물가', color: '#FFE0B2', textColor: '#FF9800', start: 0, end: 2 },
      { name: '안정물가', color: '#C8E6C9', textColor: '#4CAF50', start: 2, end: 3 },
      { name: '고물가', color: '#FFE0B2', textColor: '#FF9800', start: 3, end: 5 },
      { name: '초고물가', color: '#FFCDD2', textColor: '#F44336', start: 5, end: Math.min(maxRate, 6) }
    ];
    
    // 범위가 확장된 경우 마지막 섹션을 확장
    if (maxRate > 6) {
      baseSections[baseSections.length - 1].end = maxRate;
    }
    
    // 범위가 축소된 경우 첫 번째 섹션을 확장  
    if (minRate < -1) {
      baseSections[0].start = minRate;
    }
    
    return baseSections;
  };
  
  const sections = createSections();
  
  // 섹션별 경로 생성
  const createSectionPath = (startPercent: number, endPercent: number, sectionRadius: number) => {
    const scaledStart = ((startPercent - minRate) / rateRange) * 100;
    const scaledEnd = ((endPercent - minRate) / rateRange) * 100;
    
    const sectionStartAngle = startAngle + (scaledStart / 100) * totalAngle;
    const sectionEndAngle = startAngle + (scaledEnd / 100) * totalAngle;
    const startRad = sectionStartAngle * Math.PI / 180;
    const endRad = sectionEndAngle * Math.PI / 180;
    
    const startX = center + sectionRadius * Math.cos(startRad);
    const startY = center + sectionRadius * Math.sin(startRad);
    const endX = center + sectionRadius * Math.cos(endRad);
    const endY = center + sectionRadius * Math.sin(endRad);
    
    const largeArcFlag = (sectionEndAngle - sectionStartAngle) > 180 ? 1 : 0;
    
    return `M ${center} ${center} L ${startX} ${startY} A ${sectionRadius} ${sectionRadius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };
  
  // 눈금 위치 생성
  const createTick = (rateValue: number, tickRadius: number, length: number) => {
    const percent = ((rateValue - minRate) / rateRange) * 100;
    const tickAngle = startAngle + (percent / 100) * totalAngle;
    const tickRad = tickAngle * Math.PI / 180;
    
    const innerX = center + (tickRadius - length) * Math.cos(tickRad);
    const innerY = center + (tickRadius - length) * Math.sin(tickRad);
    const outerX = center + tickRadius * Math.cos(tickRad);
    const outerY = center + tickRadius * Math.sin(tickRad);
    
    return { innerX, innerY, outerX, outerY };
  };
  
  // 라벨 위치 생성
  const createLabel = (rateValue: number, labelRadius: number, offset: number) => {
    const percent = ((rateValue - minRate) / rateRange) * 100;
    const labelAngle = startAngle + (percent / 100) * totalAngle;
    const labelRad = labelAngle * Math.PI / 180;
    
    const x = center + (labelRadius + offset) * Math.cos(labelRad);
    const y = center + (labelRadius + offset) * Math.sin(labelRad);
    
    return { x, y };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>소비자물가지수</ThemedText>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>물가 정보를 가져오는 중...</ThemedText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>소비자물가지수</ThemedText>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <ThemedText style={styles.description}>
            네트워크 연결을 확인하고 다시 시도해주세요.
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>소비자물가지수</ThemedText>
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* 배경 원 */}
          <Circle 
            cx={center} 
            cy={center} 
            r={radius + 20} 
            fill="#F5F5F5" 
          />
          
          {/* 섹션 그리기 */}
          {sections.map((section, idx) => {
            const isActive = idx === activeSection;
            return (
              <Path
                key={`section-${idx}`}
                d={createSectionPath(section.start, section.end, radius)}
                fill={isActive ? section.color : '#F9F9F9'}
                stroke="#E0E0E0"
                strokeWidth={1}
              />
            );
          })}
          
          {/* 눈금 그리기 - 주요 눈금 */}
          {[-1, 0, 1, 2, 3, 4, 5, 6].map((tick, idx) => {
            const { innerX, innerY, outerX, outerY } = createTick(tick, radius, 10);
            const label = createLabel(tick, radius, -25);
            
            return (
              <G key={`major-tick-${idx}`}>
                <Line
                  x1={innerX}
                  y1={innerY}
                  x2={outerX}
                  y2={outerY}
                  stroke="#666"
                  strokeWidth={2}
                />
                <SvgText
                  x={label.x}
                  y={label.y}
                  fontSize="13"
                  fill="#666"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {formatNumberWithUnit(tick, '%')}
                </SvgText>
              </G>
            );
          })}
          
          {/* 눈금 그리기 - 작은 눈금 */}
          {Array.from({ length: 14 }, (_, i) => (i * 0.5) - 1).filter(tick => tick % 1 !== 0 && tick >= -1 && tick <= 6).map((tick, idx) => {
            const { innerX, innerY, outerX, outerY } = createTick(tick, radius, 5);
            return (
              <Line
                key={`minor-tick-${idx}`}
                x1={innerX}
                y1={innerY}
                x2={outerX}
                y2={outerY}
                stroke="#AAA"
                strokeWidth={1}
              />
            );
          })}
          
          {/* 섹션 이름 표시 */}
          {sections.map((section, idx) => {
            const midPoint = (section.start + section.end) / 2;
            const label = createLabel(midPoint, radius * 0.5, 0);
            
            return (
              <SvgText
                key={`section-label-${idx}`}
                x={label.x}
                y={label.y}
                fontSize="15"
                fill={section.textColor}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontWeight="bold"
              >
                {section.name}
              </SvgText>
            );
          })}
          
          {/* 바늘 */}
          <Line
            x1={center}
            y1={center}
            x2={needleX}
            y2={needleY}
            stroke={rateColor}
            strokeWidth={3}
            strokeLinecap="round"
          />
          
          {/* 중심점 */}
          <Circle 
            cx={center} 
            cy={center} 
            r={8} 
            fill={rateColor} 
          />
        </Svg>
        
        {/* 현재 값 표시 */}
        <View style={styles.valueContainer}>
          <ThemedText style={[styles.valueText, { color: rateColor }]}>
            {cpiRate < 0 ? '-' : ''}{Math.abs(cpiRate).toFixed(1)}%
          </ThemedText>
          <ThemedText style={[styles.labelText, { color: rateColor }]}>
            {rateText}
          </ThemedText>
          <ThemedText style={styles.dateText}>
            {new Date().toLocaleDateString('ko-KR').replace(/\//g, '.')}
          </ThemedText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '65%',
    width: '100%',
    paddingHorizontal: 20,
  },
  valueText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
    marginVertical: 0,
    paddingVertical: 0,
  },
  labelText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CPIGauge; 