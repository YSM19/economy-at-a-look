import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

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
 * 로그인이 필요한 기능에 대한 알림을 Toast로 표시하는 함수
 */
export const showLoginRequiredToast = (
  featureName: string,
  showToast: (msg: string, type?: 'success' | 'error' | 'info', duration?: number) => void,
  onLoginPress?: () => void
) => {
  showToast(`${featureName}을(를) 이용하려면 로그인이 필요합니다.`, 'error');
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