import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';

type EconomicGaugeIndexProps = {
  value?: number;
};

const EconomicGaugeIndex: React.FC<EconomicGaugeIndexProps> = ({ value = 65 }) => {
  const [index, setIndex] = useState(value);
  const [indexText, setIndexText] = useState('');
  const [indexColor, setIndexColor] = useState('#FFA500');
  
  useEffect(() => {
    if (index <= 25) {
      setIndexText('극심한 경기침체');
      setIndexColor('#D32F2F');
    } else if (index <= 45) {
      setIndexText('경기침체');
      setIndexColor('#F57C00');
    } else if (index <= 55) {
      setIndexText('중립');
      setIndexColor('#FFC107');
    } else if (index <= 75) {
      setIndexText('경기확장');
      setIndexColor('#4CAF50');
    } else {
      setIndexText('경기과열');
      setIndexColor('#1976D2');
    }
  }, [index]);

  const screenWidth = Dimensions.get('window').width;
  const size = screenWidth - 64;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const center = size / 2;
  
  // 게이지 위치 계산 (180도 반원)
  const angle = ((index / 100) * 180) - 90;
  const x = center + radius * Math.cos(angle * Math.PI / 180);
  const y = center + radius * Math.sin(angle * Math.PI / 180);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>경제 심리 지수</ThemedText>
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size / 2 + 40}>
          {/* 게이지 배경 */}
          <Path
            d={`M ${strokeWidth / 2}, ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* 게이지 표시 */}
          <Path
            d={`M ${strokeWidth / 2}, ${center} A ${radius} ${radius} 0 0 1 ${x} ${y}`}
            stroke={indexColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          
          {/* 게이지 포인터 */}
          <Circle cx={x} cy={y} r={strokeWidth / 1.5} fill="#FFFFFF" stroke={indexColor} strokeWidth={2} />
          
          {/* 게이지 라벨 */}
          <G>
            <SvgText x="10%" y={center + 45} fontSize="10" fill="#D32F2F" textAnchor="middle">극심한 경기침체</SvgText>
            <SvgText x="30%" y={center + 45} fontSize="10" fill="#F57C00" textAnchor="middle">경기침체</SvgText>
            <SvgText x="50%" y={center + 45} fontSize="10" fill="#FFC107" textAnchor="middle">중립</SvgText>
            <SvgText x="70%" y={center + 45} fontSize="10" fill="#4CAF50" textAnchor="middle">경기확장</SvgText>
            <SvgText x="90%" y={center + 45} fontSize="10" fill="#1976D2" textAnchor="middle">경기과열</SvgText>
          </G>
          
          <SvgText x={center} y={center - 15} fontSize="24" fontWeight="bold" fill={indexColor} textAnchor="middle">{index}</SvgText>
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