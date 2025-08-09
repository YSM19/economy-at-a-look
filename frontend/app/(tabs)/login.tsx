import React, { useState, useCallback } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, Platform, ScrollView, useColorScheme } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../services/api';
import Config from '../../constants/Config';
import { useToast } from '../../components/ToastProvider';
import { checkLoginStatusWithValidation } from '../../utils/authUtils';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { showToast } = useToast();

  // 화면이 포커스될 때마다 로그인 상태 확인
  useFocusEffect(
    useCallback(() => {
      const checkExistingLogin = async () => {
        try {
          const authStatus = await checkLoginStatusWithValidation();
          if (authStatus.isLoggedIn) {
            console.log('✅ 이미 로그인된 상태입니다. 홈으로 이동합니다.');
            const user = authStatus.userInfo;
            if (user && user.role === 'ADMIN') {
              router.replace('/profile');
            } else {
              router.replace('/');
            }
          }
        } catch (error) {
          console.error('로그인 상태 확인 중 오류:', error);
        }
      };

      checkExistingLogin();
    }, [router])
  );

  const validateEmail = (email: string) => {
    if (!email.trim()) {
      setEmailError('이메일을 입력해주세요.');
      return false;
    }
    
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('올바른 이메일 형식을 입력해주세요. (예: user@example.com)');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password.trim()) {
      setPasswordError('비밀번호를 입력해주세요.');
      return false;
    }
    
    if (password.trim().length < 6) {
      setPasswordError('비밀번호는 6자 이상 입력해주세요.');
      return false;
    }
    
    // 공백 문자 체크
    if (password.includes(' ')) {
      setPasswordError('비밀번호에 공백을 포함할 수 없습니다.');
      return false;
    }
    
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    // 입력값 검증
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      showToast('입력 정보를 확인해주세요.', 'error');
      return;
    }

    // 추가 검증
    if (email.trim().length === 0 || password.trim().length === 0) {
      showToast('이메일과 비밀번호를 모두 입력해주세요.', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await authApi.login({
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
          // 약간의 지연을 두어 상태 업데이트가 완료되도록 함
          setTimeout(() => {
            router.replace('/(tabs)/profile');
          }, 100);
        } else {
          // 홈으로 이동
          router.back();
        }
      } else {
        showToast(response.data.message || '로그인에 실패했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('로그인 에러:', error);
      console.error('로그인 에러 상세:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        message: error.message
      });
      let errorMessage = '로그인 처리 중 오류가 발생했습니다.';
      
      if (error.response) {
        // 서버에서 응답을 받았지만 오류 상태 코드
        console.error('서버 응답 오류:', error.response.status, error.response.data);
        
        // 서버에서 전달된 구체적인 오류 메시지가 있으면 우선 사용
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        } else {
          // HTTP 상태 코드별 기본 메시지
          switch (error.response.status) {
            case 400:
              errorMessage = '입력 정보를 확인해주세요.';
              break;
            case 401:
              errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
              break;
            case 403:
              errorMessage = '비활성화된 계정입니다. 관리자에게 문의해주세요.';
              break;
            case 404:
              errorMessage = '등록되지 않은 이메일입니다.';
              break;
            case 429:
              errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
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
              errorMessage = `서버 오류 (${error.response.status})`;
          }
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

  const goToSignup = () => {
    router.push('/(tabs)/signup');
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.formContainer}>
        <ThemedText style={styles.title}>이코노뷰</ThemedText>
        <ThemedText style={styles.subtitle}>로그인</ThemedText>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, emailError && styles.inputError]}
            placeholder="이메일 주소를 입력하세요"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) validateEmail(text);
            }}
            onBlur={() => validateEmail(email)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
          />
          {emailError ? (
            <ThemedText style={styles.errorText}>{emailError}</ThemedText>
          ) : null}
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, passwordError && styles.inputError]}
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) validatePassword(text);
            }}
            onBlur={() => validatePassword(password)}
            secureTextEntry
            autoComplete="password"
          />
          {passwordError ? (
            <ThemedText style={styles.errorText}>{passwordError}</ThemedText>
          ) : null}
        </View>
        
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
    textAlign: 'left',
    marginTop: 4,
    marginBottom: 8,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inputContainer: {
    width: Platform.OS === 'web' ? 300 : '100%',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#d32f2f',
    borderWidth: 2,
  },
}); 