import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, useColorScheme, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { useToast } from '../../components/ToastProvider';

interface UserInfo {
  username: string;
  email: string;
  joinDate: string;
  lastLogin: string;
}

interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const colorScheme = useColorScheme();
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  

  
  // 앱 정보 모달 상태
  const [appInfoModalVisible, setAppInfoModalVisible] = useState(false);

  // 링크 클릭 핸들러 함수
  const handleLinkPress = async (urlType: 'TERMS_URL' | 'PRIVACY_URL') => {
    const urls = {
      TERMS_URL: 'https://valley-iguanodon-08c.notion.site/221c5888e155804797f6e327a83880c5?source=copy_link',
      PRIVACY_URL: 'https://valley-iguanodon-08c.notion.site/221c5888e155805d9920e0d761ec757a?source=copy_link'
    };
    
    const url = urls[urlType];
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('오류', '링크를 열 수 없습니다.');
      }
    } catch (error) {
      console.error('링크 열기 오류:', error);
      Alert.alert('오류', '링크를 여는 중 오류가 발생했습니다.');
    }
  };

  // 로그인 상태 확인 (페이지 포커스될 때마다)
  useFocusEffect(
    useCallback(() => {
      checkLoginStatus();
    }, [])
  );

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userInfoString = await AsyncStorage.getItem('userInfo');
      
      console.log('로그인 상태 확인:', { token: !!token, userInfo: !!userInfoString });
      
      if (token && userInfoString) {
        const user = JSON.parse(userInfoString);
        console.log('사용자 정보:', user);
        
        setUserInfo({
          username: user.username,
          email: user.email,
          joinDate: user.joinDate || '2024.01.01',
          lastLogin: user.lastLogin || '2024.01.15'
        });
        setUserRole(user.role || 'USER');
        setIsLoggedIn(true);
        console.log('로그인 상태 설정 완료:', { isLoggedIn: true, role: user.role });
      } else {
        console.log('토큰 또는 사용자 정보 없음');
        setIsLoggedIn(false);
        setUserInfo(null);
        setUserRole('');
      }
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
      setIsLoggedIn(false);
      setUserInfo(null);
      setUserRole('');
    }
  };



  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              // 토큰 제거
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userInfo');
              
              // 상태 업데이트
              setIsLoggedIn(false);
              setUserInfo(null);
              showToast('로그아웃되었습니다.', 'success');
            } catch (error) {
              console.error('로그아웃 오류:', error);
              showToast('로그아웃 중 오류가 발생했습니다.', 'error');
            }
          },
        },
      ]
    );
  };

  const menuItems: MenuItem[] = [
    {
      id: 'profile',
      title: '개인정보 관리',
      description: '계정 정보 및 프로필 설정',
      icon: 'account-edit',
      color: '#FF6B6B',
      onPress: () => {
        router.push('/(tabs)/profile-management');
      }
    },
    {
      id: 'notifications',
      title: '알림 설정',
      description: '알림 및 푸시 설정',
      icon: 'bell',
      color: '#FFEAA7',
      onPress: () => {
        showToast('알림 설정 기능은 준비 중입니다.', 'info');
      }
    },
    {
      id: 'settings',
      title: '앱 설정',
      description: '테마, 언어, 기타 설정',
      icon: 'cog',
      color: '#DDA0DD',
      onPress: () => {
        showToast('앱 설정 기능은 준비 중입니다.', 'info');
      }
    },
    {
      id: 'help',
      title: '도움말',
      description: '앱 사용법 및 FAQ',
      icon: 'help-circle',
      color: '#FFB74D',
      onPress: () => {
        showToast('도움말 기능은 준비 중입니다.', 'info');
      }
    },
    {
      id: 'suggestion',
      title: '건의 및 문의',
      description: '앱 개선사항이나 문의사항을 남겨주세요',
      icon: 'comment-question-outline',
      color: '#AF52DE',
      onPress: () => {
        showToast('건의 및 문의 기능은 준비 중입니다.', 'info');
      }
    },
    {
      id: 'about',
      title: '앱 정보',
      description: '버전 정보 및 라이선스',
      icon: 'information',
      color: '#81C784',
      onPress: () => {
        setAppInfoModalVisible(true);
      }
    }
  ];

  // 관리자 전용 메뉴 아이템
  const adminMenuItems: MenuItem[] = [
    {
      id: 'admin-community',
      title: '커뮤니티 관리',
      description: '게시글, 댓글, 신고 관리',
      icon: 'account-group',
      color: '#2ED573',
      onPress: () => {
        router.push('/admin/community');
      }
    },
    {
      id: 'admin-api',
      title: 'API 데이터 관리',
      description: '환율, 금리, 물가 데이터 관리',
      icon: 'api',
      color: '#3742FA',
      onPress: () => {
        router.push('/admin/api-requests');
      }
    }
  ];

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="auto" />
        <View style={styles.loginContainer}>
          <MaterialCommunityIcons name="account-circle" size={80} color="#8E8E93" />
          <ThemedText style={styles.loginTitle}>로그인이 필요합니다</ThemedText>
          <ThemedText style={styles.loginSubtitle}>
            개인화된 서비스를 이용하려면 로그인해주세요
          </ThemedText>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(tabs)/login')}
          >
            <ThemedText style={styles.loginButtonText}>로그인</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push('/(tabs)/signup')}
          >
            <ThemedText style={styles.signupButtonText}>회원가입</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* 헤더 */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>마이페이지</ThemedText>
          <ThemedText style={styles.headerSubtitle}>개인화된 서비스</ThemedText>
        </View>

        {/* 사용자 정보 */}
        <ThemedView style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={40} color="#FFFFFF" />
            </View>
            <View style={styles.userDetails}>
              <ThemedText style={styles.username}>{userInfo?.username}</ThemedText>
              <ThemedText style={styles.userEmail}>{userInfo?.email}</ThemedText>
              <ThemedText style={styles.userDate}>
                가입일: {userInfo?.joinDate}
              </ThemedText>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#FF3B30" />
            <ThemedText style={styles.logoutButtonText}>로그아웃</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* 통계 */}
        <ThemedView style={styles.statsSection}>
          <ThemedText style={styles.sectionTitle}>활동 통계</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>12</ThemedText>
              <ThemedText style={styles.statLabel}>저장한 환율</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>5</ThemedText>
              <ThemedText style={styles.statLabel}>작성한 글</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>8</ThemedText>
              <ThemedText style={styles.statLabel}>북마크</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>15</ThemedText>
              <ThemedText style={styles.statLabel}>댓글</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* 메뉴 */}
        <ThemedView style={styles.menuSection}>
          <ThemedText style={styles.sectionTitle}>메뉴</ThemedText>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.menuInfo}>
                  <ThemedText style={styles.menuTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.menuDescription}>{item.description}</ThemedText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* 관리자 메뉴 */}
        {userRole === 'ADMIN' && (
          <ThemedView style={styles.menuSection}>
            <ThemedText style={styles.sectionTitle}>관리자 메뉴</ThemedText>
            <View style={styles.menuGrid}>
              {adminMenuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.menuInfo}>
                    <ThemedText style={styles.menuTitle}>{item.title}</ThemedText>
                    <ThemedText style={styles.menuDescription}>{item.description}</ThemedText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
                </TouchableOpacity>
              ))}
            </View>
          </ThemedView>
        )}

      </ScrollView>

      {/* 앱 정보 모달 */}
      <Modal
        visible={appInfoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAppInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff' }]}>
            <ThemedText style={styles.modalTitle}>앱 정보</ThemedText>
            
            <View style={styles.appInfoContent}>
              <View style={styles.appInfoItem}>
                <ThemedText style={styles.appInfoLabel}>앱 이름</ThemedText>
                <ThemedText style={styles.appInfoValue}>이코노뷰</ThemedText>
              </View>
              
              <View style={styles.appInfoItem}>
                <ThemedText style={styles.appInfoLabel}>버전</ThemedText>
                <ThemedText style={styles.appInfoValue}>v1.0.0</ThemedText>
              </View>
              
              <View style={styles.appInfoItem}>
                <ThemedText style={styles.appInfoLabel}>개발자</ThemedText>
                <ThemedText style={styles.appInfoValue}>Economy at a Look Team</ThemedText>
              </View>
              
              <View style={styles.appInfoItem}>
                <ThemedText style={styles.appInfoLabel}>저작권</ThemedText>
                <ThemedText style={styles.appInfoValue}>© 2024 Economy at a Look. All rights reserved.</ThemedText>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.linkSection}>
              <TouchableOpacity
                style={styles.linkItem}
                onPress={() => handleLinkPress('TERMS_URL')}
              >
                <MaterialCommunityIcons 
                  name="file-document-outline" 
                  size={20} 
                  color={colorScheme === 'dark' ? '#888' : '#666'} 
                />
                <ThemedText style={styles.linkText}>이용약관</ThemedText>
                <MaterialCommunityIcons 
                  name="open-in-new" 
                  size={16} 
                  color={colorScheme === 'dark' ? '#888' : '#666'} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.linkItem}
                onPress={() => handleLinkPress('PRIVACY_URL')}
              >
                <MaterialCommunityIcons 
                  name="shield-account-outline" 
                  size={20} 
                  color={colorScheme === 'dark' ? '#888' : '#666'} 
                />
                <ThemedText style={styles.linkText}>개인정보처리방침</ThemedText>
                <MaterialCommunityIcons 
                  name="open-in-new" 
                  size={16} 
                  color={colorScheme === 'dark' ? '#888' : '#666'} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setAppInfoModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>닫기</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 40,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
  },
  signupButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  statsSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  menuSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuGrid: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  appInfoContent: {
    marginBottom: 24,
  },
  appInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  appInfoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  appInfoValue: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginVertical: 16,
  },
  linkSection: {
    marginBottom: 24,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 12,
    flex: 1,
  },


}); 