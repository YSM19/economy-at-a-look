import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { authApi } from '../services/api';

/**
 * 로그인 상태를 확인하는 함수
 */
export const checkLoginStatus = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const userInfoStr = await AsyncStorage.getItem('userInfo');
    
    if (token && userInfoStr) {
      return {
        isLoggedIn: true,
        userInfo: JSON.parse(userInfoStr),
        token
      };
    } else {
      return {
        isLoggedIn: false,
        userInfo: null,
        token: null
      };
    }
  } catch (error) {
    console.error('로그인 상태 확인 오류:', error);
    return {
      isLoggedIn: false,
      userInfo: null,
      token: null
    };
  }
};

/**
 * 토큰 유효성을 서버에서 검증하는 함수
 */
export const validateTokenWithServer = async (token: string) => {
  try {
    const response = await authApi.validateToken(token);
    return response.data.success;
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    return false;
  }
};

/**
 * 로그인 상태를 확인하고 토큰 유효성을 검증하는 함수
 */
export const checkLoginStatusWithValidation = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const userInfoStr = await AsyncStorage.getItem('userInfo');
    
    if (token && userInfoStr) {
      // 토큰 유효성 검증
      const isValid = await validateTokenWithServer(token);
      
      if (isValid) {
        return {
          isLoggedIn: true,
          userInfo: JSON.parse(userInfoStr),
          token
        };
      } else {
        // 토큰이 유효하지 않으면 저장된 정보 삭제
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userInfo');
        await AsyncStorage.removeItem('adminToken');
        
        return {
          isLoggedIn: false,
          userInfo: null,
          token: null
        };
      }
    } else {
      return {
        isLoggedIn: false,
        userInfo: null,
        token: null
      };
    }
  } catch (error) {
    console.error('로그인 상태 확인 오류:', error);
    return {
      isLoggedIn: false,
      userInfo: null,
      token: null
    };
  }
};

/**
 * 로그아웃 함수
 */
export const logout = async () => {
  try {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userInfo');
    await AsyncStorage.removeItem('adminToken');
    router.replace('/login');
  } catch (error) {
    console.error('로그아웃 오류:', error);
  }
};

/**
 * 로그인 상태를 확인하고 로그인이 필요하면 Toast로 알림을 표시하는 함수
 */
export const requireLogin = async (
  featureName: string,
  showToast: (msg: string, type?: 'success' | 'error' | 'info', duration?: number) => void,
  onLoginPress?: () => void
): Promise<boolean> => {
  const { isLoggedIn } = await checkLoginStatus();
  
  if (!isLoggedIn) {
    showLoginRequiredToast(featureName, showToast, onLoginPress);
    return false;
  }
  
  return true;
};

/**
 * 로그인 상태를 확인하고 로그인이 필요하면 Toast로 알림을 표시한 후 콜백을 실행하는 함수
 */
export const withLoginCheck = async <T>(
  featureName: string,
  showToast: (msg: string, type?: 'success' | 'error' | 'info', duration?: number) => void,
  callback: () => T | Promise<T>,
  onLoginPress?: () => void
): Promise<T | null> => {
  const isLoggedIn = await requireLogin(featureName, showToast, onLoginPress);
  
  if (isLoggedIn) {
    return await callback();
  }
  
  return null;
};

/**
 * 로그인 필요 토스트 메시지 표시
 */
const showLoginRequiredToast = (
  featureName: string,
  showToast: (msg: string, type?: 'success' | 'error' | 'info', duration?: number) => void,
  onLoginPress?: () => void
) => {
  showToast(`${featureName} 기능을 사용하려면 로그인이 필요합니다.`, 'error');
  
  if (onLoginPress) {
    // 2초 후 로그인 페이지로 이동
    setTimeout(() => {
      onLoginPress();
    }, 2000);
  } else {
    // 2초 후 로그인 페이지로 이동
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  }
}; 