import React from 'react';
import { View, ScrollView, SafeAreaView, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../components/ThemedText';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import EconomicGaugeIndex from '../components/EconomicGaugeIndex';
import EconomicIndicatorCard from '../components/EconomicIndicatorCard';

export default function HomeScreen() {
  const router = useRouter();

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
        
        <EconomicGaugeIndex />
        
        <View style={styles.cardsContainer}>
          <EconomicIndicatorCard 
            title="금리"
            route="/interest-rate"
            iconName="trending-up"
          />
          <EconomicIndicatorCard 
            title="환율"
            route="/exchange-rate"
            iconName="currency-usd"
          />
          <EconomicIndicatorCard 
            title="물가지수"
            route="/consumer-price-index"
            iconName="shopping"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  scrollViewContent: {
    paddingTop: 0,
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
  cardsContainer: {
    marginTop: 12,
    gap: 12,
  },
}); 