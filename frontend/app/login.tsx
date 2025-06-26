import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../constants/Config';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.');
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
        
        Alert.alert('성공', '로그인되었습니다.', [
          {
            text: '확인',
            onPress: () => {
              // 관리자라면 관리자 페이지로, 일반 사용자라면 홈으로
              if (response.data.data.user.role === 'ADMIN') {
                router.replace('/admin/dashboard');
              } else {
                router.replace('/');
              }
            }
          }
        ]);
      } else {
        Alert.alert('로그인 실패', response.data.message || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('로그인 에러:', error);
      let errorMessage = '로그인 처리 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      Alert.alert('로그인 실패', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const goToSignup = () => {
    router.push('/signup');
  };

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0066CC',
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
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
    padding: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
}); 