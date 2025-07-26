import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert, Platform, TextInput, Modal, useColorScheme } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../constants/Config';
import { useToast } from '../components/ToastProvider';


interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function MyPageScreen() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const colorScheme = useColorScheme();
  const { showToast } = useToast();
  
  // 닉네임 변경 모달 상태
  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  
  // 비밀번호 변경 모달 상태
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  


  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      const token = await AsyncStorage.getItem('userToken');
      
      if (!userInfoStr || !token) {
        // 로그인 정보가 없으면 로그인 페이지로 이동
        showToast('로그인이 필요합니다.', 'info');
        router.replace('/login');
        return;
      }
      
      const parsedUserInfo = JSON.parse(userInfoStr);
      setUserInfo(parsedUserInfo);
    } catch (error) {
      console.error('사용자 정보 로딩 실패:', error);
      showToast('사용자 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
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
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userInfo');
              await AsyncStorage.removeItem('adminToken');
              
              showToast('로그아웃되었습니다.', 'info', 2000);
              
              // 바로 홈으로 이동
              router.replace('/');
            } catch (error) {
              console.error('로그아웃 오류:', error);
              showToast('로그아웃 처리 중 오류가 발생했습니다.', 'error');
            }
          },
        },
      ]
    );
  };

  const handleChangeUsername = () => {
    setNewUsername(userInfo?.username || '');
    setUsernameModalVisible(true);
  };



  const submitUsernameChange = async () => {
    if (!newUsername || newUsername.trim().length < 2) {
      showToast('닉네임은 2자 이상이어야 합니다.', 'error');
      return;
    }

    setUsernameLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setUsernameModalVisible(false);
        showToast('로그인이 필요합니다.', 'error');
        return;
      }

      const response = await axios.put(
        `${Config.apiUrl}/api/auth/change-username`,
        { newUsername: newUsername.trim() },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        // 로컬 스토리지 업데이트
        if (userInfo) {
          const updatedUserInfo = { ...userInfo, username: newUsername.trim() };
          setUserInfo(updatedUserInfo);
          await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        }
        
        setUsernameModalVisible(false);
        setNewUsername('');
        showToast('닉네임이 성공적으로 변경되었습니다.', 'success');
      } else {
        // 실패 시 모달 닫고 Toast 표시
        setUsernameModalVisible(false);
        setNewUsername('');
        showToast(response.data.message || '닉네임 변경에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('닉네임 변경 오류:', error);
      let errorMessage = '닉네임 변경 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      // 오류 시 모달 닫고 Toast 표시
      setUsernameModalVisible(false);
      setNewUsername('');
      showToast(errorMessage, 'error');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalVisible(true);
  };

  const submitPasswordChange = async () => {
    if (!currentPassword || currentPassword.length < 6) {
      showToast('현재 비밀번호를 정확히 입력해주세요.', 'error');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      showToast('새 비밀번호는 6자 이상이어야 합니다.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('로그인이 필요합니다.', 'error');
        return;
      }

      const response = await axios.put(
        `${Config.apiUrl}/api/auth/change-password`,
        { 
          currentPassword: currentPassword,
          newPassword: newPassword 
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        setPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('비밀번호가 성공적으로 변경되었습니다.', 'success');
      } else {
        // 실패 시 모달 닫고 Toast 표시
        setPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast(response.data.message || '비밀번호 변경에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      let errorMessage = '비밀번호 변경 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      // 오류 시 모달 닫고 Toast 표시
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(errorMessage, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };



  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: '마이페이지' }} />
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>로딩 중...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!userInfo) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: '마이페이지' }} />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons 
            name="account-alert" 
            size={64} 
            color={colorScheme === 'dark' ? '#ffffff' : '#666666'} 
          />
          <ThemedText style={styles.errorText}>사용자 정보를 찾을 수 없습니다.</ThemedText>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.replace('/login')}
          >
            <ThemedText style={styles.loginButtonText}>로그인하기</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: '마이페이지' }} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 프로필 헤더 */}
        <View style={styles.profileHeader}>
          <View style={styles.pageTitle}>
            <MaterialCommunityIcons 
              name="account-circle-outline" 
              size={28} 
              color={colorScheme === 'dark' ? '#ffffff' : '#0066CC'} 
            />
            <ThemedText style={styles.pageTitleText}>마이페이지</ThemedText>
          </View>
          {userInfo.role === 'ADMIN' && (
            <View style={styles.adminBadge}>
              <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
              <ThemedText style={styles.adminText}>관리자</ThemedText>
            </View>
          )}
        </View>



        {/* 계정 정보 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>계정 정보</ThemedText>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons 
                name="email" 
                size={20} 
                color={colorScheme === 'dark' ? '#ffffff' : '#666666'} 
              />
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel}>이메일</ThemedText>
                <ThemedText style={styles.infoValue}>{userInfo.email}</ThemedText>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={handleChangeUsername}
            >
              <MaterialCommunityIcons 
                name="account" 
                size={20} 
                color={colorScheme === 'dark' ? '#ffffff' : '#666666'} 
              />
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel}>닉네임 (월 1회 변경 가능)</ThemedText>
                <ThemedText style={styles.infoValue}>{userInfo.username}</ThemedText>
              </View>
              <MaterialCommunityIcons 
                name="pencil" 
                size={16} 
                color={colorScheme === 'dark' ? '#ffffff' : '#999999'} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 설정 메뉴 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>설정</ThemedText>
          
          <View style={styles.menuCard}>
            {userInfo.role === 'ADMIN' && (
              <>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => router.push('/admin/dashboard')}
                >
                  <MaterialCommunityIcons 
                    name="cog" 
                    size={24} 
                    color={colorScheme === 'dark' ? '#ffffff' : '#666666'} 
                  />
                  <ThemedText style={styles.menuText}>관리자 페이지</ThemedText>
                  <MaterialCommunityIcons 
                    name="chevron-right" 
                    size={24} 
                    color={colorScheme === 'dark' ? '#ffffff' : '#999999'} 
                  />
                </TouchableOpacity>
                <View style={styles.divider} />
              </>
            )}
            
                         <TouchableOpacity 
               style={styles.menuItem}
               onPress={handleChangePassword}
             >
               <MaterialCommunityIcons 
                 name="lock-reset" 
                 size={24} 
                 color={colorScheme === 'dark' ? '#ffffff' : '#666666'} 
               />
               <ThemedText style={styles.menuText}>비밀번호 변경</ThemedText>
               <MaterialCommunityIcons 
                 name="chevron-right" 
                 size={24} 
                 color={colorScheme === 'dark' ? '#ffffff' : '#999999'} 
               />
             </TouchableOpacity>
          </View>
        </View>

        {/* 로그아웃 버튼 */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={24} color="#ffffff" />
            <ThemedText style={styles.logoutButtonText}>로그아웃</ThemedText>
          </TouchableOpacity>
        </View>

        {/* 홈으로 돌아가기 버튼 */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={() => router.replace('/')}
          >
            <MaterialCommunityIcons 
              name="home" 
              size={24} 
              color={colorScheme === 'dark' ? '#ffffff' : '#0066CC'} 
            />
            <ThemedText style={styles.homeButtonText}>홈으로 돌아가기</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 닉네임 변경 모달 */}
      <Modal
        visible={usernameModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUsernameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff' }]}>
            <ThemedText style={styles.modalTitle}>닉네임 변경</ThemedText>
            <ThemedText style={styles.modalSubtitle}>새로운 닉네임을 입력해주세요{'\n'}(월 1회만 변경 가능)</ThemedText>
            
            <TextInput
              style={[
                styles.modalInput,
                { 
                  borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }
              ]}
              placeholder="새 닉네임"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
              value={newUsername}
              onChangeText={setNewUsername}
              autoFocus={true}
              maxLength={50}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setUsernameModalVisible(false)}
                disabled={usernameLoading}
              >
                <ThemedText style={styles.cancelButtonText}>취소</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, usernameLoading && styles.disabledButton]}
                onPress={submitUsernameChange}
                disabled={usernameLoading}
              >
                <ThemedText style={styles.confirmButtonText}>
                  {usernameLoading ? '변경 중...' : '변경'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 비밀번호 변경 모달 */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff' }]}>
            <ThemedText style={styles.modalTitle}>비밀번호 변경</ThemedText>
            <ThemedText style={styles.modalSubtitle}>보안을 위해 현재 비밀번호를 확인합니다</ThemedText>
            
            <TextInput
              style={[
                styles.modalInput,
                { 
                  borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }
              ]}
              placeholder="현재 비밀번호"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={true}
              autoFocus={true}
            />
            
            <TextInput
              style={[
                styles.modalInput,
                { 
                  borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }
              ]}
              placeholder="새 비밀번호 (6자 이상)"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={true}
            />
            
            <TextInput
              style={[
                styles.modalInput,
                { 
                  borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }
              ]}
              placeholder="새 비밀번호 확인"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPasswordModalVisible(false)}
                disabled={passwordLoading}
              >
                <ThemedText style={styles.cancelButtonText}>취소</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, passwordLoading && styles.disabledButton]}
                onPress={submitPasswordChange}
                disabled={passwordLoading}
              >
                <ThemedText style={styles.confirmButtonText}>
                  {passwordLoading ? '변경 중...' : '변경'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: 24,
  },
  pageTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    opacity: 0.9,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 12,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  adminText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  menuCard: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
    marginBottom: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginHorizontal: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
    paddingVertical: 16,
    borderRadius: 12,
  },
  homeButtonText: {
    fontSize: 16,
    marginLeft: 8,
    opacity: 0.8,
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
    width: Platform.OS === 'web' ? 400 : '100%',
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
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  confirmButton: {
    backgroundColor: '#0066CC',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 34,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  successText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  // 프로필 이미지 관련 스타일
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: 20,
    position: 'relative',
  },
  profileImageInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  profileImageTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  profileImageDescription: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
}); 