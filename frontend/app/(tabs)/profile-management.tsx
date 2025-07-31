import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../components/ToastProvider';
import { authApi } from '../../services/api';
import Config from '../../constants/Config';
import { ConfirmationModal } from '../../components/ConfirmationModal';

interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

export default function ProfileManagementScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 편집 모드 상태
  const [editUsername, setEditUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const user = JSON.parse(userInfoString);
        setUserInfo({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          isActive: user.isActive
        });
        setEditUsername(user.username);
      }
    } catch (error) {
      console.error('사용자 정보 로드 오류:', error);
      showToast('사용자 정보를 불러올 수 없습니다.', 'error');
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditUsername(userInfo?.username || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

    const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      showToast('닉네임을 입력해주세요.', 'error');
      return;
    }

    // 닉네임 길이 검증
    if (editUsername.trim().length < 2) {
      showToast('닉네임은 2자 이상 입력해주세요.', 'error');
      return;
    }

    if (editUsername.trim().length > 50) {
      showToast('닉네임은 50자 이하여야 합니다.', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('로그인이 필요합니다.', 'error');
        return;
      }

              // 백엔드 API 호출 - 닉네임 변경
        const response = await fetch(`${Config.apiUrl}/api/auth/change-username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newUsername: editUsername.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // 업데이트된 사용자 정보 저장
        const updatedUserInfo: UserInfo = {
          id: userInfo?.id || 0,
          username: editUsername.trim(),
          email: userInfo?.email || '',
          role: userInfo?.role || 'USER',
          createdAt: userInfo?.createdAt || '',
          isActive: userInfo?.isActive || true
        };
        
        await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        setUserInfo(updatedUserInfo);
        setIsEditing(false);
        showToast('닉네임이 성공적으로 변경되었습니다.', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.message || '닉네임 변경에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('닉네임 변경 오류:', error);
      showToast('닉네임 변경에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showToast('모든 필드를 입력해주세요.', 'error');
      return;
    }

    if (newPassword.trim().length < 6) {
      showToast('새 비밀번호는 6자 이상 입력해주세요.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('로그인이 필요합니다.', 'error');
        return;
      }

      // 백엔드 API 호출 - 비밀번호 변경
      const response = await fetch(`${Config.apiUrl}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim()
        })
      });

      if (response.ok) {
        showToast('비밀번호가 성공적으로 변경되었습니다.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errorData = await response.json();
        showToast(errorData.message || '비밀번호 변경에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      showToast('비밀번호 변경에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      setLoading(true);
      setShowDeleteModal(false);
      
      // 현재 토큰 가져오기
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('로그인 정보를 찾을 수 없습니다.', 'error');
        return;
      }

      // API 호출로 계정 삭제
      await authApi.deleteAccount(token);

      // 로컬 스토리지 정리
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      
      showToast('계정이 성공적으로 삭제되었습니다.', 'success');
      router.replace('/(tabs)/login');
    } catch (error: any) {
      console.error('계정 삭제 오류:', error);
      
      let errorMessage = '계정 삭제에 실패했습니다.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = '로그인 세션이 만료되었습니다. 다시 로그인해주세요.';
      } else if (error.response?.status === 403) {
        errorMessage = '관리자 계정은 삭제할 수 없습니다.';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>개인정보 관리</ThemedText>
        <View style={styles.headerRight}>
          {isEditing ? (
            <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
              <ThemedText style={styles.cancelButtonText}>취소</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleEditProfile} style={styles.editButton}>
              <ThemedText style={styles.editButtonText}>편집</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 프로필 정보 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>기본 정보</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>닉네임</ThemedText>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="닉네임을 입력하세요"
                maxLength={20}
              />
            ) : (
              <ThemedText style={styles.infoValue}>{userInfo?.username}</ThemedText>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>이메일</ThemedText>
            <ThemedText style={styles.infoValue}>{userInfo?.email}</ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>가입일</ThemedText>
            <ThemedText style={styles.infoValue}>
              {userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleDateString('ko-KR') : '정보 없음'}
            </ThemedText>
          </View>



          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.disabledButton]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              <ThemedText style={styles.saveButtonText}>
                {loading ? '저장 중...' : '저장'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* 비밀번호 변경 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>비밀번호 변경</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>현재 비밀번호</ThemedText>
            <TextInput
              style={styles.textInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="현재 비밀번호를 입력하세요"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>새 비밀번호</ThemedText>
            <TextInput
              style={styles.textInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="새 비밀번호를 입력하세요 (6자 이상)"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>새 비밀번호 확인</ThemedText>
            <TextInput
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="새 비밀번호를 다시 입력하세요"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.changePasswordButton, loading && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            <ThemedText style={styles.changePasswordButtonText}>
              {loading ? '변경 중...' : '비밀번호 변경'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* 계정 관리 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>계정 관리</ThemedText>
          
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
            <MaterialCommunityIcons name="delete" size={20} color="#FF3B30" />
            <ThemedText style={styles.dangerButtonText}>계정 삭제</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
      
      <ConfirmationModal
        visible={showDeleteModal}
        title="계정 삭제"
        message="정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
        iconName="delete"
        iconColor="#FF3B30"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
    paddingVertical: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  changePasswordButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  changePasswordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
  },
  dangerButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 