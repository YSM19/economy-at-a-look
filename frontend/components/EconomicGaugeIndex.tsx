import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import Svg, { Path, Circle, G, Line, Text as SvgText, Rect } from 'react-native-svg';

type EconomicGaugeIndexProps = {
  value?: number;
};

const EconomicGaugeIndex: React.FC<EconomicGaugeIndexProps> = ({ value = 65 }) => {
  const [index, setIndex] = useState(value);
  const [indexText, setIndexText] = useState('');
  const [indexColor, setIndexColor] = useState('#4CAF50');
  const [activeSection, setActiveSection] = useState(3);
  
  useEffect(() => {
    if (index <= 25) {
      setIndexText('극심한 경기침체');
      setIndexColor('#D32F2F');
      setActiveSection(0);
    } else if (index <= 45) {
      setIndexText('경기침체');
      setIndexColor('#F57C00');
      setActiveSection(1);
    } else if (index <= 55) {
      setIndexText('중립');
      setIndexColor('#FFC107');
      setActiveSection(2);
    } else if (index <= 75) {
      setIndexText('경기확장');
      setIndexColor('#4CAF50');
      setActiveSection(3);
    } else {
      setIndexText('경기과열');
      setIndexColor('#1976D2');
      setActiveSection(4);
    }
  }, [index]);

  const screenWidth = Dimensions.get('window').width;
  const size = screenWidth - 32;
  const center = size / 2;
  const radius = size * 0.45;
  const strokeWidth = 8;
  
  // 각도 계산 (0~100% → -40~220도, 총 260도 범위)
  const startAngle = -40;
  const endAngle = 220;
  const totalAngle = endAngle - startAngle;
  const needleAngle = startAngle + (index / 100) * totalAngle;
  const needleRad = needleAngle * Math.PI / 180;
  
  // 바늘 끝점 계산 - 적절한 길이로 조정
  const needleLength = radius * 0.6;
  const needleX = center + needleLength * Math.cos(needleRad);
  const needleY = center + needleLength * Math.sin(needleRad);
  
  // 섹션 색상 및 범위
  const sections = [
    { name: '극심한 경기침체', color: '#FFCDD2', textColor: '#D32F2F', start: 0, end: 25 },
    { name: '경기침체', color: '#FFE0B2', textColor: '#F57C00', start: 25, end: 45 },
    { name: '중립', color: '#FFF9C4', textColor: '#FFC107', start: 45, end: 55 },
    { name: '경기확장', color: '#C8E6C9', textColor: '#4CAF50', start: 55, end: 75 },
    { name: '경기과열', color: '#BBDEFB', textColor: '#1976D2', start: 75, end: 100 }
  ];
  
  // 섹션별 경로 생성
  const createSectionPath = (startPercent: number, endPercent: number, sectionRadius: number) => {
    const sectionStartAngle = startAngle + (startPercent / 100) * totalAngle;
    const sectionEndAngle = startAngle + (endPercent / 100) * totalAngle;
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
  const createTick = (percent: number, tickRadius: number, length: number) => {
    const tickAngle = startAngle + (percent / 100) * totalAngle;
    const tickRad = tickAngle * Math.PI / 180;
    
    const innerX = center + (tickRadius - length) * Math.cos(tickRad);
    const innerY = center + (tickRadius - length) * Math.sin(tickRad);
    const outerX = center + tickRadius * Math.cos(tickRad);
    const outerY = center + tickRadius * Math.sin(tickRad);
    
    return { innerX, innerY, outerX, outerY };
  };
  
  // 라벨 위치 생성
  const createLabel = (percent: number, labelRadius: number, offset: number) => {
    const labelAngle = startAngle + (percent / 100) * totalAngle;
    const labelRad = labelAngle * Math.PI / 180;
    
    const x = center + (labelRadius + offset) * Math.cos(labelRad);
    const y = center + (labelRadius + offset) * Math.sin(labelRad);
    
    return { x, y };
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>경제 심리 지수</ThemedText>
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* 섹션 그리기 */}
          {sections.map((section, idx) => {
            const isActive = idx === activeSection;
            return (
              <Path
                key={`section-${idx}`}
                d={createSectionPath(section.start, section.end, radius)}
                fill={isActive ? section.color : "#FAFAFA"}
                stroke="#E0E0E0"
                strokeWidth={1}
              />
            );
          })}
          
          {/* 눈금 그리기 - 주요 눈금 */}
          {[0, 25, 50, 75, 100].map((tick, idx) => {
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
                  {tick}
                </SvgText>
              </G>
            );
          })}
          
          {/* 눈금 그리기 - 작은 눈금 */}
          {Array.from({ length: 20 }, (_, i) => i * 5).filter(tick => tick % 25 !== 0).map((tick, idx) => {
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
          
          {/* 섹션 이름 표시 - 적절한 위치로 조정 */}
          {sections.map((section, idx) => {
            const midPoint = (section.start + section.end) / 2;
            // 적절한 위치로 조정하여 균형 맞춤
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
          
          {/* 중앙 수치 표시 */}
          <Circle cx={center} cy={center} r={30} fill="#FFF" stroke="#DDD" strokeWidth={1} />
          <SvgText 
            x={center} 
            y={center}
            fontSize="24" 
            fontWeight="bold" 
            fill="#333" 
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {index}
          </SvgText>
          
          {/* 바늘 */}
          <Line
            x1={center}
            y1={center}
            x2={needleX}
            y2={needleY}
            stroke={sections[activeSection]?.textColor || "#333"}
            strokeWidth={6}
            strokeLinecap="round"
          />
          
          {/* 바늘 중심점 */}
          <Circle cx={center} cy={center} r={6} fill={sections[activeSection]?.textColor || "#666"} />
        </Svg>
      </View>
      <View style={styles.indexTextContainer}>
        <ThemedText style={[styles.indexText, { color: indexColor }]}>{indexText}</ThemedText>
      </View>
      <ThemedText style={styles.description}>
        금리, 환율, 물가지수를 종합적으로 고려한 경제 심리 지수입니다.
        25 이하(극심한 경기침체), 25-45(경기침체), 45-55(중립), 55-75(경기확장), 75 이상(경기과열)
      </ThemedText>
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
  },
  indexTextContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  indexText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});

export default EconomicGaugeIndex; 