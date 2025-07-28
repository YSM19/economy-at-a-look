import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../services/api';
import Config from '../../constants/Config';
import { useToast } from '../../components/ToastProvider';
import axios from 'axios';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const validateForm = () => {
    // 이메일 검증
    if (!email.trim()) {
      showToast('이메일을 입력해주세요.', 'error');
      return false;
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast('올바른 이메일 형식을 입력해주세요.', 'error');
      return false;
    }
    
    // 비밀번호 검증
    if (!password.trim()) {
      showToast('비밀번호를 입력해주세요.', 'error');
      return false;
    }
    
    if (password.length < 6) {
      showToast('비밀번호는 6자 이상이어야 합니다.', 'error');
      return false;
    }
    
    if (password.length > 20) {
      showToast('비밀번호는 20자 이하여야 합니다.', 'error');
      return false;
    }
    
    // 비밀번호 확인 검증
    if (!confirmPassword.trim()) {
      showToast('비밀번호 확인을 입력해주세요.', 'error');
      return false;
    }
    
    if (password !== confirmPassword) {
      showToast('비밀번호가 일치하지 않습니다.', 'error');
      return false;
    }
    
    // 닉네임 검증
    if (!username.trim()) {
      showToast('닉네임을 입력해주세요.', 'error');
      return false;
    }
    
    if (username.length < 2) {
      showToast('닉네임은 2자 이상이어야 합니다.', 'error');
      return false;
    }
    
    if (username.length > 20) {
      showToast('닉네임은 20자 이하여야 합니다.', 'error');
      return false;
    }
    
    // 닉네임 특수문자 제한
    const usernameRegex = /^[a-zA-Z0-9가-힣_]+$/;
    if (!usernameRegex.test(username.trim())) {
      showToast('닉네임은 영문, 숫자, 한글, 언더스코어(_)만 사용 가능합니다.', 'error');
      return false;
    }
    
    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await authApi.signup({
        email: email.trim(),
        password: password.trim(),
        username: username.trim()
      });

      if (response.data.success) {
        showToast('회원가입이 완료되었습니다!', 'success', 2500);
        
        // 바로 로그인 페이지로 이동
        router.replace('/(tabs)/login');
      } else {
        showToast(response.data.message || '회원가입에 실패했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('회원가입 에러:', error);
      let errorMessage = '회원가입 처리 중 오류가 발생했습니다.';
      
      if (error.response) {
        // 서버에서 응답을 받았지만 오류 상태 코드
        console.error('서버 응답 오류:', error.response.status, error.response.data);
        
        // HTTP 상태 코드별 상세 메시지
        switch (error.response.status) {
          case 400:
            errorMessage = '잘못된 요청입니다. 입력 정보를 확인해주세요.';
            break;
          case 409:
            errorMessage = '이미 사용 중인 이메일입니다.';
            break;
          case 422:
            errorMessage = '입력 정보가 올바르지 않습니다. 다시 확인해주세요.';
            break;
          case 429:
            errorMessage = '너무 많은 회원가입 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
            break;
          case 500:
            errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = '서버가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
            break;
          default:
            errorMessage = error.response.data?.message || `서버 오류 (${error.response.status})`;
        }
      } else if (error.request) {
        // 요청은 보냈지만 응답을 받지 못함
        console.error('네트워크 오류:', error.request);
        errorMessage = '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.';
      } else {
        // 요청 설정 중 오류 발생
        console.error('요청 설정 오류:', error.message);
        errorMessage = '요청 처리 중 오류가 발생했습니다.';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ 
        title: '회원가입',
        headerShown: false
      }} />
      
      <View style={styles.formContainer}>
        <ThemedText style={styles.title}>이코노뷰</ThemedText>
        <ThemedText style={styles.subtitle}>회원가입</ThemedText>
        
        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        
        <TextInput
          style={styles.input}
          placeholder="닉네임 (2자 이상)"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TouchableOpacity 
          style={[styles.signupButton, isLoading && styles.disabledButton]}
          onPress={handleSignup}
          disabled={isLoading}
        >
          <ThemedText style={styles.signupButtonText}>
            {isLoading ? '가입 중...' : '회원가입'}
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/(tabs)/login')}
        >
          <ThemedText style={styles.loginButtonText}>이미 계정이 있으신가요? 로그인</ThemedText>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  contentContainer: {
    flexGrow: 1,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 32,
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 24,
  },
  input: {
    width: Platform.OS === 'web' ? 300 : '100%',
    height: 50,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  signupButton: {
    width: Platform.OS === 'web' ? 300 : '100%',
    height: 50,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 10,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  loginButton: {
    width: Platform.OS === 'web' ? 300 : '100%',
    height: 50,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 15,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  disabledButton: {
    opacity: 0.7,
  },
}); 