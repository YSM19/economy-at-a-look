import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import axios from 'axios';
import Config from '../constants/Config';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('입력 오류', '올바른 이메일 형식을 입력해주세요.');
      return false;
    }
    
    if (!password.trim()) {
      Alert.alert('입력 오류', '비밀번호를 입력해주세요.');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 6자 이상이어야 합니다.');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
      return false;
    }
    
    if (!username.trim()) {
      Alert.alert('입력 오류', '닉네임을 입력해주세요.');
      return false;
    }
    
    if (username.length < 2) {
      Alert.alert('입력 오류', '닉네임은 2자 이상이어야 합니다.');
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
        Alert.alert('성공', '회원가입이 완료되었습니다.', [
          {
            text: '확인',
            onPress: () => router.replace('/login')
          }
        ]);
      } else {
        Alert.alert('회원가입 실패', response.data.message || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      console.error('회원가입 에러:', error);
      let errorMessage = '회원가입 처리 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      Alert.alert('회원가입 실패', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButton: {
    marginTop: 20,
    padding: 10,
  },
  loginButtonText: {
    color: '#0066CC',
    fontSize: 14,
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
}); 