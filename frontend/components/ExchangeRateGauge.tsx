import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { ThemedText } from './ThemedText';
import Svg, { Path, Circle, G, Line, Text as SvgText, Rect } from 'react-native-svg';
import { economicIndexApi } from '../services/api';

type ExchangeRateGaugeProps = {
  value?: number;
  country?: string;
};

// 천 단위 콤마와 단위를 붙여서 표시하는 함수
const formatNumberWithUnit = (value: number | string, unit: string): string => {
  // 숫자로 변환하고 소수점 둘째자리에서 반올림하여 첫째자리까지 표시
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const formattedNumber = numValue.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${formattedNumber}${unit}`;
};

const ExchangeRateGauge: React.FC<ExchangeRateGaugeProps> = ({ value, country = 'usa' }) => {
  const [rate, setRate] = useState(value || 1350);
  const [rateText, setRateText] = useState('');
  const [rateColor, setRateColor] = useState('#FFC107');
  const [activeSection, setActiveSection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencyTitle, setCurrencyTitle] = useState('환율 (USD/KRW)');
  // 국가별 환율 범위 설정을 위한 상태 추가
  const [minRate, setMinRate] = useState(1000);
  const [maxRate, setMaxRate] = useState(1600);
  const [sections, setSections] = useState([
    { name: '달러 약세', color: '#C8E6C9', textColor: '#4CAF50', start: 1000, end: 1200 },
    { name: '보통', color: '#FFF9C4', textColor: '#FFC107', start: 1200, end: 1400 },
    { name: '달러 강세', color: '#FFCDD2', textColor: '#F44336', start: 1400, end: 1600 }
  ]);
  
  useEffect(() => {
    // 국가에 따라 제목, 기본 환율, 그리고 범위 설정
    switch(country) {
      case 'usa':
        setCurrencyTitle('환율 (USD/KRW)');
        if (!value) setRate(1350);
        setMinRate(980);
        setMaxRate(1580);
        setSections([
          { name: '매우 약세', color: '#A5D6A7', textColor: '#2E7D32', start: 980, end: 1100 },
          { name: '약세', color: '#C8E6C9', textColor: '#4CAF50', start: 1100, end: 1220 },
          { name: '보통', color: '#FFF9C4', textColor: '#FFC107', start: 1220, end: 1340 },
          { name: '강세', color: '#FFCDD2', textColor: '#F44336', start: 1340, end: 1460 },
          { name: '매우 강세', color: '#FFAB91', textColor: '#D84315', start: 1460, end: 1580 }
        ]);
        break;
      case 'japan':
        setCurrencyTitle('환율 (JPY/KRW)');
        if (!value) setRate(950);
        setMinRate(810);
        setMaxRate(1210);
        setSections([
          { name: '매우 약세', color: '#A5D6A7', textColor: '#2E7D32', start: 810, end: 890 },
          { name: '약세', color: '#C8E6C9', textColor: '#4CAF50', start: 890, end: 970 },
          { name: '보통', color: '#FFF9C4', textColor: '#FFC107', start: 970, end: 1050 },
          { name: '강세', color: '#FFCDD2', textColor: '#F44336', start: 1050, end: 1130 },
          { name: '매우 강세', color: '#FFAB91', textColor: '#D84315', start: 1130, end: 1210 }
        ]);
        break;
      case 'china':
        setCurrencyTitle('환율 (CNY/KRW)');
        if (!value) setRate(190);
        setMinRate(154);
        setMaxRate(214);
        setSections([
          { name: '매우 약세', color: '#A5D6A7', textColor: '#2E7D32', start: 154, end: 166 },
          { name: '약세', color: '#C8E6C9', textColor: '#4CAF50', start: 166, end: 178 },
          { name: '보통', color: '#FFF9C4', textColor: '#FFC107', start: 178, end: 190 },
          { name: '강세', color: '#FFCDD2', textColor: '#F44336', start: 190, end: 202 },
          { name: '매우 강세', color: '#FFAB91', textColor: '#D84315', start: 202, end: 214 }
        ]);
        break;
      case 'europe':
        setCurrencyTitle('환율 (EUR/KRW)');
        if (!value) setRate(1350);
        setMinRate(1120);
        setMaxRate(1720);
        setSections([
          { name: '매우 약세', color: '#A5D6A7', textColor: '#2E7D32', start: 1120, end: 1240 },
          { name: '약세', color: '#C8E6C9', textColor: '#4CAF50', start: 1240, end: 1360 },
          { name: '보통', color: '#FFF9C4', textColor: '#FFC107', start: 1360, end: 1480 },
          { name: '강세', color: '#FFCDD2', textColor: '#F44336', start: 1480, end: 1600 },
          { name: '매우 강세', color: '#FFAB91', textColor: '#D84315', start: 1600, end: 1720 }
        ]);
        break;
      default:
        setCurrencyTitle('환율 (USD/KRW)');
        if (!value) setRate(1350);
        setMinRate(980);
        setMaxRate(1580);
        setSections([
          { name: '매우 약세', color: '#A5D6A7', textColor: '#2E7D32', start: 980, end: 1100 },
          { name: '약세', color: '#C8E6C9', textColor: '#4CAF50', start: 1100, end: 1220 },
          { name: '보통', color: '#FFF9C4', textColor: '#FFC107', start: 1220, end: 1340 },
          { name: '강세', color: '#FFCDD2', textColor: '#F44336', start: 1340, end: 1460 },
          { name: '매우 강세', color: '#FFAB91', textColor: '#D84315', start: 1460, end: 1580 }
        ]);
    }
    
    fetchExchangeRateData();
  }, [country]);
  
  // 백엔드에서 환율 데이터 가져오기
  const fetchExchangeRateData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 경제 지표 API에서 최신 환율 정보 가져오기
      const response = await economicIndexApi.getExchangeRate();
      
      // ApiResponse 형식으로 래핑된 데이터에서 usdRate 필드 가져오기
      if (response.data && response.data.success && response.data.data) {
        const exchangeData = response.data.data;
        
        // 선택된 국가에 따라 환율 데이터 설정
        switch(country) {
          case 'usa':
            if (exchangeData.usdRate) {
              setRate(exchangeData.usdRate);
            } else {
              const usdHistory = exchangeData.history?.find((item: any) => item.curUnit === 'USD');
              if (usdHistory) {
                setRate(parseFloat(usdHistory.dealBasRate) || 1350);
              }
            }
            break;
          case 'japan':
            if (exchangeData.jpyRate) {
              setRate(exchangeData.jpyRate);
            } else {
              const jpyHistory = exchangeData.history?.find((item: any) => item.curUnit === 'JPY(100)');
              if (jpyHistory) {
                setRate(parseFloat(jpyHistory.dealBasRate) || 950);
              }
            }
            break;
          case 'china':
            if (exchangeData.cnyRate) {
              setRate(exchangeData.cnyRate);
            } else {
              const cnyHistory = exchangeData.history?.find((item: any) => item.curUnit === 'CNH');
              if (cnyHistory) {
                setRate(parseFloat(cnyHistory.dealBasRate) || 190);
              }
            }
            break;
          case 'europe':
            if (exchangeData.eurRate) {
              setRate(exchangeData.eurRate);
            } else {
              const eurHistory = exchangeData.history?.find((item: any) => item.curUnit === 'EUR');
              if (eurHistory) {
                setRate(parseFloat(eurHistory.dealBasRate) || 1350);
              }
            }
            break;
          default:
            if (exchangeData.usdRate) {
              setRate(exchangeData.usdRate);
            } else {
              const usdHistory = exchangeData.history?.find((item: any) => item.curUnit === 'USD');
              if (usdHistory) {
                setRate(parseFloat(usdHistory.dealBasRate) || 1350);
              }
            }
        }
      } else {
        throw new Error('API 응답 형식이 예상과 다릅니다.');
      }
    } catch (err) {
      console.error('환율 데이터를 가져오는 중 오류 발생:', err);
      setError('환율 데이터를 가져오는데 실패했습니다. 마지막으로 저장된 환율 데이터를 표시합니다.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // 국가별 환율 범위에 따라 섹션 활성화 설정
    if (country === 'usa' || !country) {
      // 5개 구간 설정 (980-1100-1220-1340-1460-1580)
      if (rate <= 1100) {
        setRateText('매우 약세');
        setRateColor('#2E7D32');
        setActiveSection(0);
      } else if (rate <= 1220) {
        setRateText('약세');
        setRateColor('#4CAF50');
        setActiveSection(1);
      } else if (rate <= 1340) {
        setRateText('보통');
        setRateColor('#FFC107');
        setActiveSection(2);
      } else if (rate <= 1460) {
        setRateText('강세');
        setRateColor('#F44336');
        setActiveSection(3);
      } else {
        setRateText('매우 강세');
        setRateColor('#D84315');
        setActiveSection(4);
      }
    } else if (country === 'japan') {
      // 5개 구간 설정 (810-890-970-1050-1130-1210)
      if (rate <= 890) {
        setRateText('매우 약세');
        setRateColor('#2E7D32');
        setActiveSection(0);
      } else if (rate <= 970) {
        setRateText('약세');
        setRateColor('#4CAF50');
        setActiveSection(1);
      } else if (rate <= 1050) {
        setRateText('보통');
        setRateColor('#FFC107');
        setActiveSection(2);
      } else if (rate <= 1130) {
        setRateText('강세');
        setRateColor('#F44336');
        setActiveSection(3);
      } else {
        setRateText('매우 강세');
        setRateColor('#D84315');
        setActiveSection(4);
      }
    } else if (country === 'china') {
      // 5개 구간 설정 (154-166-178-190-202-214)
      if (rate <= 166) {
        setRateText('매우 약세');
        setRateColor('#2E7D32');
        setActiveSection(0);
      } else if (rate <= 178) {
        setRateText('약세');
        setRateColor('#4CAF50');
        setActiveSection(1);
      } else if (rate <= 190) {
        setRateText('보통');
        setRateColor('#FFC107');
        setActiveSection(2);
      } else if (rate <= 202) {
        setRateText('강세');
        setRateColor('#F44336');
        setActiveSection(3);
      } else {
        setRateText('매우 강세');
        setRateColor('#D84315');
        setActiveSection(4);
      }
    } else if (country === 'europe') {
      // 5개 구간 설정 (1120-1240-1360-1480-1600-1720)
      if (rate <= 1240) {
        setRateText('매우 약세');
        setRateColor('#2E7D32');
        setActiveSection(0);
      } else if (rate <= 1360) {
        setRateText('약세');
        setRateColor('#4CAF50');
        setActiveSection(1);
      } else if (rate <= 1480) {
        setRateText('보통');
        setRateColor('#FFC107');
        setActiveSection(2);
      } else if (rate <= 1600) {
        setRateText('강세');
        setRateColor('#F44336');
        setActiveSection(3);
      } else {
        setRateText('매우 강세');
        setRateColor('#D84315');
        setActiveSection(4);
      }
    }
  }, [rate, sections, country]);

  const screenWidth = Dimensions.get('window').width;
  const size = screenWidth - 64;
  const center = size / 2;
  const radius = size * 0.4;
  
  // 각도 계산 (8시~4시 방향, 총 240도 범위)
  const startAngle = 150; // 8시 방향(150도)
  const endAngle = 30;   // 4시 방향(30도)
  const totalAngle = 240; // 시계 방향으로 이동하는 각도
  
  const rateRange = maxRate - minRate;
  
  // 각도 계산 - 시계 방향으로 움직이도록
  const needleAngle = startAngle + ((rate - minRate) / rateRange) * totalAngle;
  const needleRad = needleAngle * Math.PI / 180;
  
  // 바늘 끝점 계산
  const needleLength = radius * 0.85;
  const needleX = center + needleLength * Math.cos(needleRad);
  const needleY = center + needleLength * Math.sin(needleRad);
  
  // 눈금 간격 계산
  const calculateTickValues = () => {
    // 달러 계기판의 경우 고정된 구간 경계값 사용
    if (country === 'usa' || !country) {
      return [980, 1100, 1220, 1340, 1460, 1580];
    }
    
    // 일본 계기판의 경우 고정된 구간 경계값 사용
    if (country === 'japan') {
      return [810, 890, 970, 1050, 1130, 1210];
    }
    
    // 중국 계기판의 경우 고정된 구간 경계값 사용
    if (country === 'china') {
      return [154, 166, 178, 190, 202, 214];
    }
    
    // 유럽 계기판의 경우 고정된 구간 경계값 사용
    if (country === 'europe') {
      return [1120, 1240, 1360, 1480, 1600, 1720];
    }
    
    // 다른 국가들은 기존 로직 사용 (사용되지 않음)
    const range = maxRate - minRate;
    const step = Math.ceil(range / 6); // 약 6개의 주요 눈금
    
    const result = [];
    for (let i = 0; i <= 6; i++) {
      result.push(minRate + i * step);
    }
    return result;
  };
  
  const majorTicks = calculateTickValues();
  
  // 눈금 사이의 작은 눈금 계산
  const calculateMinorTicks = () => {
    if (majorTicks.length < 2) return [];
    
    const step = (majorTicks[1] - majorTicks[0]) / 2;
    const result = [];
    
    for (let i = 0; i < majorTicks.length - 1; i++) {
      const minorTick = majorTicks[i] + step;
      result.push(minorTick);
    }
    
    return result;
  };
  
  const minorTicks = calculateMinorTicks();
  
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
      <ThemedText style={styles.title}>{currencyTitle}</ThemedText>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <ThemedText style={styles.loadingText}>환율 데이터를 불러오는 중...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : (
        <>
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
              {majorTicks.map((tick, idx) => {
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
                      {tick.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    </SvgText>
                  </G>
                );
              })}
              
              {/* 눈금 그리기 - 작은 눈금 */}
              {minorTicks.map((tick, idx) => {
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
              
              {/* 현재 환율 값을 하단 여유 공간에 크게 표시 */}
              <SvgText 
                x={center} 
                y={center + radius * 0.6}
                fontSize="26" 
                fontWeight="bold" 
                fill={rateColor} 
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {formatNumberWithUnit(rate, '원')}
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
              현재 {getCountryCurrencyName(country)}/원 환율은 {formatNumberWithUnit(rate, '원')}입니다.
              환율이 낮을수록 원화가 강세이고, 높을수록 원화가 약세입니다.
            </ThemedText>
          </View>
        </>
      )}
    </View>
  );
};

// 국가별 통화 이름 반환 함수
const getCountryCurrencyName = (country: string) => {
  switch(country) {
    case 'usa':
      return '달러';
    case 'japan':
      return '엔화';
    case 'china':
      return '위안';
    case 'europe':
      return '유로';
    default:
      return '달러';
  }
};

// 통화 강세/약세 텍스트 반환 함수
const getCurrencyStrengthText = (country: string, strength: 'weak' | 'strong') => {
  const currency = getCountryCurrencyName(country);
  
  if (strength === 'weak') {
    return `${currency} 약세`;
  } else {
    return `${currency} 강세`;
  }
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
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 16,
    height: 270,
    width: '100%',
    paddingHorizontal: 10,
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
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
    height: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  },
});

export default ExchangeRateGauge; 