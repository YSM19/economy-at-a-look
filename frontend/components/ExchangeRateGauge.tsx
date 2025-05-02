import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import Svg, { Path, Circle, G, Line, Text as SvgText, Rect } from 'react-native-svg';

type ExchangeRateGaugeProps = {
  value?: number;
};

const ExchangeRateGauge: React.FC<ExchangeRateGaugeProps> = ({ value = 1350 }) => {
  const [rate, setRate] = useState(value);
  const [rateText, setRateText] = useState('');
  const [rateColor, setRateColor] = useState('#FFC107');
  const [activeSection, setActiveSection] = useState(1);
  
  useEffect(() => {
    if (rate <= 1200) {
      setRateText('원화 강세');
      setRateColor('#4CAF50');
      setActiveSection(0);
    } else if (rate <= 1400) {
      setRateText('보통');
      setRateColor('#FFC107');
      setActiveSection(1);
    } else {
      setRateText('원화 약세');
      setRateColor('#F44336');
      setActiveSection(2);
    }
  }, [rate]);

  const screenWidth = Dimensions.get('window').width;
  const size = screenWidth - 64;
  const center = size / 2;
  const radius = size * 0.4;
  
  // 각도 계산 (1000~1600원 → -40~220도, 총 260도 범위)
  const startAngle = -40;
  const endAngle = 220;
  const totalAngle = endAngle - startAngle;
  
  // 환율 범위는 1000원~1600원으로 가정
  const minRate = 1000;
  const maxRate = 1600;
  const rateRange = maxRate - minRate;
  
  const needleAngle = startAngle + ((rate - minRate) / rateRange) * totalAngle;
  const needleRad = needleAngle * Math.PI / 180;
  
  // 바늘 끝점 계산
  const needleLength = radius * 0.85;
  const needleX = center + needleLength * Math.cos(needleRad);
  const needleY = center + needleLength * Math.sin(needleRad);
  
  // 섹션 색상 및 범위
  const sections = [
    { name: '원화 강세', color: '#C8E6C9', textColor: '#4CAF50', start: 1000, end: 1200 },
    { name: '보통', color: '#FFF9C4', textColor: '#FFC107', start: 1200, end: 1400 },
    { name: '원화 약세', color: '#FFCDD2', textColor: '#F44336', start: 1400, end: 1600 }
  ];
  
  // 섹션별 경로 생성
  const createSectionPath = (startValue: number, endValue: number, sectionRadius: number) => {
    const scaledStart = ((startValue - minRate) / rateRange) * 100;
    const scaledEnd = ((endValue - minRate) / rateRange) * 100;
    
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

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>환율 (USD/KRW)</ThemedText>
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
          {[1000, 1100, 1200, 1300, 1400, 1500, 1600].map((tick, idx) => {
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
                  fontSize="11"
                  fill="#666"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {tick}
                </SvgText>
              </G>
            );
          })}
          
          {/* 눈금 그리기 - 작은 눈금 */}
          {Array.from({ length: 12 }, (_, i) => 1000 + i * 50).filter(tick => tick % 100 !== 0).map((tick, idx) => {
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
            const label = createLabel(midPoint, radius * 0.7, 0);
            
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
          
          {/* 현재 환율 값을 상단 여유 공간에 크게 표시 */}
          <SvgText 
            x={center} 
            y={center - radius * 0.4}
            fontSize="26" 
            fontWeight="bold" 
            fill={rateColor} 
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {rate}원
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
          현재 달러/원 환율은 {rate}원입니다.
          환율이 낮을수록 원화가 강세이고, 높을수록 원화가 약세입니다.
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

export default ExchangeRateGauge; 