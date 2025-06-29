import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { ThemedText } from './ThemedText';
import Svg, { Path, Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { economicIndexApi } from '../services/api';

type InterestRateGaugeProps = {
  value?: number;
};

// 숫자와 단위를 붙여서 표시하는 함수
const formatNumberWithUnit = (value: number | string, unit: string): string => {
  return `${value}${unit}`;
};

const InterestRateGauge: React.FC<InterestRateGaugeProps> = ({ value }) => {
  const [rate, setRate] = useState(value || 0);
  const [rateText, setRateText] = useState('');
  const [rateColor, setRateColor] = useState('#4CAF50');
  const [activeSection, setActiveSection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankName, setBankName] = useState('한국은행 기준금리');
  const [lastUpdated, setLastUpdated] = useState('');
  
  // API에서 금리 데이터 가져오기
  useEffect(() => {
    const fetchInterestRate = async () => {
      if (value !== undefined) {
        setRate(value);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await economicIndexApi.getInterestRate();
        
        console.log('🔍 [InterestRateGauge] API 응답:', response.data);
        
        if (response.data?.success && response.data.data) {
          const interestData = response.data.data;
          
          console.log('🔍 [InterestRateGauge] 금리 데이터:', interestData);
          
          // 한국 기준금리만 사용
          if (interestData.korea && interestData.korea.rate !== undefined) {
            const koreaRate = parseFloat(interestData.korea.rate.toString());
            console.log('✅ [InterestRateGauge] 한국 금리 설정:', koreaRate);
            setRate(koreaRate);
            setBankName('한국은행 기준금리');
          } else {
            console.warn('⚠️ [InterestRateGauge] 한국 금리 데이터가 없습니다');
            setError('한국 금리 데이터가 없습니다');
          }
          
          // 마지막 업데이트 시간 설정 (발표일 기준)
          if (interestData.korea && interestData.korea.lastUpdated) {
            // 백엔드에서 받은 발표일 데이터 사용
            const announcementDate = new Date(interestData.korea.lastUpdated);
            setLastUpdated(announcementDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
          } else if (interestData.lastUpdated) {
            // fallback: 전체 lastUpdated 사용
            const fallbackDate = new Date(interestData.lastUpdated);
            setLastUpdated(fallbackDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
          }
        }
      } catch (err) {
        console.error('금리 데이터 가져오기 실패:', err);
        setError('금리 데이터를 가져올 수 없습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchInterestRate();
  }, [value]);

  useEffect(() => {
    if (rate < 2.0) {
      setRateText('저금리');
      setRateColor('#4CAF50');
      setActiveSection(0);
    } else if (rate <= 3.0) {
      setRateText('보통');
      setRateColor('#FFC107');
      setActiveSection(1);
    } else {
      setRateText('고금리');
      setRateColor('#F44336');
      setActiveSection(2);
    }
  }, [rate]);

  const screenWidth = Dimensions.get('window').width;
  const size = screenWidth - 32;
  const center = size / 2;
  const radius = size * 0.45;
  
  // 각도 계산 - SVG 좌표계 기준으로 8시(약 150도)에서 4시(약 30도)까지
  const startAngle = 150; // 8시 방향
  const endAngle = 30;   // 4시 방향
  const totalAngle = 240; // 시계 방향으로 이동하는 각도
  
  // 금리 범위는 0%~6%로 가정
  const maxRate = 6;
  
  // 시계 방향으로 움직이도록 각도 계산
  const angle = startAngle + (rate / maxRate) * totalAngle;
  const needleRad = angle * Math.PI / 180;
  
  // 바늘 끝점 계산
  const needleLength = radius * 0.85;
  const needleX = center + needleLength * Math.cos(needleRad);
  const needleY = center + needleLength * Math.sin(needleRad);
  
  // 섹션 색상 및 범위
  const sections = [
    { name: '저금리', color: '#C8E6C9', textColor: '#4CAF50', start: 0, end: 2 },
    { name: '보통', color: '#FFF9C4', textColor: '#FFC107', start: 2, end: 3 },
    { name: '고금리', color: '#FFCDD2', textColor: '#F44336', start: 3, end: 6 }
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

  if (loading) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>금리</ThemedText>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>금리 정보를 가져오는 중...</ThemedText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>금리</ThemedText>
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
      <ThemedText style={styles.title}>{bankName}</ThemedText>
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
          {[0, 1, 2, 3, 4, 5, 6].map((tick, idx) => {
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
          {Array.from({ length: 12 }, (_, i) => i * 0.5).filter(tick => tick % 1 !== 0 && tick <= 6).map((tick, idx) => {
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
                fontSize="16"
                fontWeight="bold"
                fill={section.textColor}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {section.name}
              </SvgText>
            );
          })}
          
          {/* 현재 금리 값을 하단 여유 공간에 크게 표시 */}
          <SvgText 
            x={center} 
            y={center + radius * 0.35}
            fontSize="32" 
            fontWeight="bold" 
            fill={rateColor} 
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {formatNumberWithUnit(rate, '%')}
          </SvgText>
          

          
          {/* 바늘 */}
          <Line
            x1={center}
            y1={center}
            x2={needleX}
            y2={needleY}
            stroke={sections[activeSection]?.textColor || "#333"}
            strokeWidth={3}
            strokeLinecap="round"
          />
          
          {/* 바늘 중심점 */}
          <Circle cx={center} cy={center} r={6} fill={sections[activeSection]?.textColor || "#666"} />
        </Svg>
      </View>
      <View style={styles.infoContainer}>
        <ThemedText style={[styles.infoText, { color: rateColor }]}>{rateText}</ThemedText>
        <ThemedText style={styles.description}>
          현재 정책금리는 {formatNumberWithUnit(rate, '%')}입니다.
          금리가 낮을수록 대출 비용이 낮아지고, 높을수록 물가 상승을 억제합니다.
        </ThemedText>
        {lastUpdated && (
          <ThemedText style={styles.lastUpdated}>
            변경 발표일: {lastUpdated}
          </ThemedText>
        )}
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 24,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 16,
    height: 320,
    width: '100%',
    paddingHorizontal: 10,
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: -70,
  },
  infoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 26,
  },
  description: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  rateValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 28,
  },
  rateUnit: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
  labelText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  updateText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 14,
  },
});

export default InterestRateGauge; 