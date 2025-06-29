import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../constants/Config';
import { useToast } from '../components/ToastProvider';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('이메일과 비밀번호를 모두 입력해주세요.', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await axios.post(`${Config.apiUrl}/api/auth/login`, {
        email: email.trim(),
        password: password.trim()
      });

      if (response.data.success && response.data.data.token) {
        // 토큰 저장
        await AsyncStorage.setItem('userToken', response.data.data.token);
        await AsyncStorage.setItem('userInfo', JSON.stringify(response.data.data.user));
        
        // 로그인 성공 토스트 표시하고 바로 이동
        showToast(
          `${response.data.data.user.username}님, 환영합니다!`,
          'success',
          2000
        );
        
        // 바로 페이지 이동
        if (response.data.data.user.role === 'ADMIN') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/');
        }
      } else {
        showToast(response.data.message || '로그인에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('로그인 에러:', error);
      let errorMessage = '로그인 처리 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // 서버에서 응답을 받았지만 오류 상태 코드
          console.error('서버 응답 오류:', error.response.status, error.response.data);
          errorMessage = error.response.data?.message || `서버 오류 (${error.response.status})`;
        } else if (error.request) {
          // 요청은 보냈지만 응답을 받지 못함
          console.error('네트워크 오류:', error.request);
          errorMessage = '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.';
        } else {
          // 요청 설정 중 오류 발생
          console.error('요청 설정 오류:', error.message);
          errorMessage = '요청 처리 중 오류가 발생했습니다.';
        }
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const goToSignup = () => {
    router.push('/signup');
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ title: '로그인' }} />
      
      <View style={styles.formContainer}>
        <ThemedText style={styles.title}>경제 한눈에 보기</ThemedText>
        <ThemedText style={styles.subtitle}>로그인</ThemedText>
        
        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={[styles.loginButton, isLoading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <ThemedText style={styles.loginButtonText}>
            {isLoading ? '로그인 중...' : '로그인'}
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.signupButton}
          onPress={goToSignup}
        >
          <ThemedText style={styles.signupButtonText}>회원가입</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.backButtonText}>홈으로 돌아가기</ThemedText>
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
  loginButton: {
    width: Platform.OS === 'web' ? 300 : '100%',
    height: 50,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 10,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  signupButton: {
    width: Platform.OS === 'web' ? 300 : '100%',
    height: 50,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 15,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  backButton: {
    marginTop: 20,
    padding: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
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
}); 