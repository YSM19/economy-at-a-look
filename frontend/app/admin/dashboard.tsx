import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert, Platform, useColorScheme } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
// 사이드바 기능 비활성화
// import { Sidebar } from '../../components/Sidebar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminDashboardScreen() {
  const colorScheme = useColorScheme();
  // 사이드바 기능 비활성화
  // const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }
      setIsAuthenticated(true);
    } catch (error) {
      console.error('인증 확인 에러:', error);
      router.replace('/login');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('adminToken');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      router.replace('/login');
    } catch (error) {
      console.error('로그아웃 에러:', error);
      Alert.alert('오류', '로그아웃 처리 중 오류가 발생했습니다.');
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ThemedText>인증 확인 중...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: '관리자 대시보드',
        headerShown: false
      }} />
      
      {/* 사이드바 기능 비활성화
      <Sidebar 
        isVisible={isSidebarVisible} 
        onClose={() => setIsSidebarVisible(false)} 
      />
      */}
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* 사이드바 기능 비활성화
            <TouchableOpacity onPress={() => setIsSidebarVisible(true)} style={styles.hamburgerButton}>
              <MaterialCommunityIcons 
                name="menu" 
                size={24} 
                color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>
            */}
            <TouchableOpacity 
              style={styles.logoutButtonMain}
              onPress={handleLogout}
            >
              <ThemedText style={styles.logoutButtonMainText}>로그아웃</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerInfo}>
            <ThemedText style={styles.headerTitle}>이코노뷰 - 관리자 페이지</ThemedText>
            <ThemedText style={styles.headerSubtitle}>데이터 관리 및 API 요청</ThemedText>
          </View>
        </View>
        
        {/* 메인 관리 버튼들 */}
        <View style={styles.mainButtonsContainer}>
          <TouchableOpacity 
            style={styles.mainButton}
            onPress={() => router.push('/admin/community')}
          >
            <View style={styles.mainButtonContent}>
              <MaterialCommunityIcons 
                name="account-group" 
                size={48} 
                color="#ffffff" 
              />
              <ThemedText style={styles.mainButtonTitle}>커뮤니티 & 신고 관리</ThemedText>
              <ThemedText style={styles.mainButtonDescription}>
                게시글, 댓글, 신고 관리 및 통계 확인
              </ThemedText>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mainButton}
            onPress={() => router.push('/admin/api-requests')}
          >
            <View style={styles.mainButtonContent}>
              <MaterialCommunityIcons 
                name="api" 
                size={48} 
                color="#ffffff" 
              />
              <ThemedText style={styles.mainButtonTitle}>API 데이터 요청</ThemedText>
              <ThemedText style={styles.mainButtonDescription}>
                환율, 금리, 물가 데이터 수집 및 관리
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    paddingTop: 40, // 상단 여백 추가
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    marginTop: 20, // 상단 여백 추가
  },
  hamburgerButton: {
    padding: 8,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0066CC',
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 30,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  logoutButtonMain: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 20,
  },
  logoutButtonMainText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  mainButtonsContainer: {
    gap: 20,
  },
  mainButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 24,
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainButtonContent: {
    alignItems: 'center',
    gap: 12,
  },
  mainButtonTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  mainButtonDescription: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 20,
  },
}); 