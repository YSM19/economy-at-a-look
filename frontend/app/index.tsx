import React, { useState } from 'react';
import { View, ScrollView, SafeAreaView, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../components/ThemedText';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import InterestRateGauge from '../components/InterestRateGauge';
import ExchangeRateGauge from '../components/ExchangeRateGauge';
import PriceIndexGauge from '../components/PriceIndexGauge';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('interest');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'interest':
        return <InterestRateGauge />;
      case 'exchange':
        return <ExchangeRateGauge />;
      case 'price':
        return <PriceIndexGauge />;
      default:
        return <InterestRateGauge />;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: "경제 한눈에 보기",
        }} 
      />
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <ThemedText style={styles.subtitle}>오늘의 경제 지표</ThemedText>
        </View>
        
        {/* 탭 내비게이션 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'interest' && styles.activeTabButton]} 
            onPress={() => setActiveTab('interest')}
          >
            <MaterialCommunityIcons 
              name="trending-up" 
              size={22} 
              color={activeTab === 'interest' ? '#1976D2' : '#666'} 
            />
            <ThemedText style={[styles.tabText, activeTab === 'interest' && styles.activeTabText]}>
              금리
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'exchange' && styles.activeTabButton]} 
            onPress={() => setActiveTab('exchange')}
          >
            <MaterialCommunityIcons 
              name="currency-usd" 
              size={22} 
              color={activeTab === 'exchange' ? '#1976D2' : '#666'} 
            />
            <ThemedText style={[styles.tabText, activeTab === 'exchange' && styles.activeTabText]}>
              환율
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'price' && styles.activeTabButton]} 
            onPress={() => setActiveTab('price')}
          >
            <MaterialCommunityIcons 
              name="shopping" 
              size={22} 
              color={activeTab === 'price' ? '#1976D2' : '#666'} 
            />
            <ThemedText style={[styles.tabText, activeTab === 'price' && styles.activeTabText]}>
              물가
            </ThemedText>
          </TouchableOpacity>
        </View>
        
        {/* 선택된 탭 내용 */}
        {renderTabContent()}
        
        {/* 하단 카드 - 탭에 맞게 표시 */}
        <View style={styles.sectionTitle}>
          <ThemedText style={styles.sectionTitleText}>자세히 알아보기</ThemedText>
        </View>
        
        <View style={styles.cardsContainer}>
          {activeTab === 'interest' && (
            <TouchableOpacity 
              style={styles.cardItem}
              onPress={() => router.push('/interest-rate' as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                <MaterialCommunityIcons name="trending-up" size={24} color="#1976D2" />
              </View>
              <View style={styles.cardTextContainer}>
                <ThemedText style={styles.cardTitle}>금리 상세 정보</ThemedText>
                <ThemedText style={styles.cardSubtitle}>정책금리, 시장금리, 대출금리 추이</ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          )}
          
          {activeTab === 'exchange' && (
            <TouchableOpacity 
              style={styles.cardItem}
              onPress={() => router.push('/exchange-rate' as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="currency-usd" size={24} color="#4CAF50" />
              </View>
              <View style={styles.cardTextContainer}>
                <ThemedText style={styles.cardTitle}>환율 상세 정보</ThemedText>
                <ThemedText style={styles.cardSubtitle}>주요국 통화별 환율 추이 확인</ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          )}
          
          {activeTab === 'price' && (
            <TouchableOpacity 
              style={styles.cardItem}
              onPress={() => router.push('/consumer-price-index' as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                <MaterialCommunityIcons name="shopping" size={24} color="#FF9800" />
              </View>
              <View style={styles.cardTextContainer}>
                <ThemedText style={styles.cardTitle}>물가지수 상세 정보</ThemedText>
                <ThemedText style={styles.cardSubtitle}>품목별 물가 변동 추이 확인</ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  scrollViewContent: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 10,
    marginTop: 0,
    paddingTop: 0,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    lineHeight: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeTabText: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardsContainer: {
    gap: 12,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
}); 