import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import Svg, { Path, Circle, G, Line, Text as SvgText } from 'react-native-svg';

type PriceIndexGaugeProps = {
  value?: number;
};

// 숫자와 단위를 붙여서 표시하는 함수
const formatNumberWithUnit = (value: number | string, unit: string): string => {
  return `${value}${unit}`;
};

const PriceIndexGauge: React.FC<PriceIndexGaugeProps> = ({ value = 3.2 }) => {
  const [rate, setRate] = useState(value);
  const [rateText, setRateText] = useState('');
  const [rateColor, setRateColor] = useState('#FFC107');
  const [activeSection, setActiveSection] = useState(1);
  
  useEffect(() => {
    if (rate <= 2) {
      setRateText('안정적');
      setRateColor('#4CAF50');
      setActiveSection(0);
    } else if (rate <= 4) {
      setRateText('주의');
      setRateColor('#FFC107');
      setActiveSection(1);
    } else {
      setRateText('높음');
      setRateColor('#F44336');
      setActiveSection(2);
    }
  }, [rate]);

  const screenWidth = Dimensions.get('window').width;
  const size = screenWidth - 64;
  const center = size / 2;
  const radius = size * 0.4;
  
  // 각도 계산 (0~8% → 8시~4시 방향, 총 180도 범위)
  const startAngle = 150; // 8시 방향(150도)
  const endAngle = 30;   // 4시 방향(30도)
  const totalAngle = 240; // 시계 방향으로 이동하는 각도
  
  // 물가상승률 범위는 0%~8%로 가정
  const maxRate = 8;
  // 각도 계산 - 시계 방향으로 움직이도록
  const needleAngle = startAngle + (rate / maxRate) * totalAngle;
  const needleRad = needleAngle * Math.PI / 180;
  
  // 바늘 끝점 계산
  const needleLength = radius * 0.85;
  const needleX = center + needleLength * Math.cos(needleRad);
  const needleY = center + needleLength * Math.sin(needleRad);
  
  // 섹션 색상 및 범위
  const sections = [
    { name: '안정적', color: '#C8E6C9', textColor: '#4CAF50', start: 0, end: 2 },
    { name: '주의', color: '#FFF9C4', textColor: '#FFC107', start: 2, end: 4 },
    { name: '높음', color: '#FFCDD2', textColor: '#F44336', start: 4, end: 8 }
  ];
  
  // 섹션별 경로 생성
  const createSectionPath = (startPercent: number, endPercent: number, sectionRadius: number) => {
    const scaledStart = (startPercent / maxRate) * 100;
    const scaledEnd = (endPercent / maxRate) * 100;
    
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
    const percent = (rateValue / maxRate) * 100;
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
    const percent = (rateValue / maxRate) * 100;
    const labelAngle = startAngle + (percent / 100) * totalAngle;
    const labelRad = labelAngle * Math.PI / 180;
    
    const x = center + (labelRadius + offset) * Math.cos(labelRad);
    const y = center + (labelRadius + offset) * Math.sin(labelRad);
    
    return { x, y };
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>소비자 물가 상승률</ThemedText>
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
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((tick, idx) => {
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
                  fontSize="12"
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
          {Array.from({ length: 8 }, (_, i) => (i + 1) * 0.5).filter(tick => Number.isInteger(tick) === false && tick <= 8).map((tick, idx) => {
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
          
          {/* 섹션 이름 표시 - 각 칸 안쪽에 배치 */}
          {sections.map((section, idx) => {
            const midPoint = (section.start + section.end) / 2;
            const label = createLabel(midPoint, radius * 0.5, 0);
            
            return (
              <SvgText
                key={`label-${idx}`}
                x={label.x}
                y={label.y}
                fontSize="12"
                fontWeight="bold"
                fill={section.textColor}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {section.name}
              </SvgText>
            );
          })}
          
          {/* 현재 물가 상승률을 하단 여유 공간에 크게 표시 */}
          <SvgText 
            x={center} 
            y={center + radius * 0.6}
            fontSize="26" 
            fontWeight="bold" 
            fill={rateColor} 
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {formatNumberWithUnit(rate, '%')}
          </SvgText>
          
          {/* 중앙 원은 유지하되 숫자 제거 */}
          <Circle cx={center} cy={center} r={30} fill="#FFF" stroke="#DDD" strokeWidth={1} />
          
          {/* 바늘 */}
          <Line
            x1={center}
            y1={center}
            x2={needleX}
            y2={needleY}
            stroke="#333"
            strokeWidth={3}
            strokeLinecap="round"
          />
          
          {/* 바늘 중심점 */}
          <Circle cx={center} cy={center} r={6} fill="#666" />
        </Svg>
      </View>
      <View style={styles.infoContainer}>
        <ThemedText style={[styles.infoText, { color: rateColor }]}>{rateText}</ThemedText>
        <ThemedText style={styles.description}>
          현재 물가 상승률은 {formatNumberWithUnit(rate, '%')}입니다.
          물가 상승률이 높을수록 화폐 가치가 떨어지고 소비자의 구매력이 감소합니다.
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    height: 200,
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PriceIndexGauge; 