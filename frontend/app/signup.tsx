import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import axios from 'axios';
import Config from '../constants/Config';
import { useToast } from '../components/ToastProvider';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const validateForm = () => {
    if (!email.trim()) {
      showToast('이메일을 입력해주세요.', 'error');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('올바른 이메일 형식을 입력해주세요.', 'error');
      return false;
    }
    
    if (!password.trim()) {
      showToast('비밀번호를 입력해주세요.', 'error');
      return false;
    }
    
    if (password.length < 6) {
      showToast('비밀번호는 6자 이상이어야 합니다.', 'error');
      return false;
    }
    
    if (password !== confirmPassword) {
      showToast('비밀번호가 일치하지 않습니다.', 'error');
      return false;
    }
    
    if (!username.trim()) {
      showToast('닉네임을 입력해주세요.', 'error');
      return false;
    }
    
    if (username.length < 2) {
      showToast('닉네임은 2자 이상이어야 합니다.', 'error');
      return false;
    }
    
    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await axios.post(`${Config.apiUrl}/api/auth/signup`, {
        email: email.trim(),
        password: password.trim(),
        username: username.trim()
      });

      if (response.data.success) {
        showToast('회원가입이 완료되었습니다!', 'success', 2500);
        
        // 바로 로그인 페이지로 이동
        router.replace('/login');
      } else {
        showToast(response.data.message || '회원가입에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('회원가입 에러:', error);
      let errorMessage = '회원가입 처리 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ title: '회원가입' }} />
      
      <View style={styles.formContainer}>
        <ThemedText style={styles.title}>경제 한눈에 보기</ThemedText>
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
          onPress={() => router.replace('/login')}
        >
          <ThemedText style={styles.loginButtonText}>이미 계정이 있으신가요? 로그인</ThemedText>
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
    marginBottom: 32,
    textAlign: 'center',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#555',
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
    color: '#fff',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  loginButton: {
    marginTop: 20,
    padding: 10,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  backButton: {
    marginTop: 10,
    padding: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
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