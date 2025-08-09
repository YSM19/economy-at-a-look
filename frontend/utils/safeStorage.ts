import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// 안전한 AsyncStorage 읽기 함수
export const safeGetItem = async (key: string): Promise<string | null> => {
  try {
    // 우선 SecureStore에서 조회(운영 권장)
    const secure = await SecureStore.getItemAsync(key);
    if (secure != null) return secure;
    // 폴백: 기존 AsyncStorage 값 조회(마이그레이션 단계용)
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`저장소 읽기 오류 (${key}):`, error);
    return null;
  }
};

// 안전한 AsyncStorage 쓰기 함수
export const safeSetItem = async (key: string, value: string): Promise<boolean> => {
  try {
    // 운영 저장: SecureStore
    await SecureStore.setItemAsync(key, value, { keychainService: 'economy-at-a-look' });
    // 폴백 동기화(선택): AsyncStorage에도 복사해 기존 경로 호환
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`저장소 쓰기 오류 (${key}):`, error);
    return false;
  }
};

// 안전한 AsyncStorage 삭제 함수
export const safeRemoveItem = async (key: string): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(key);
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`저장소 삭제 오류 (${key}):`, error);
    return false;
  }
};

// 안전한 JSON 파싱 함수
export const safeParseJSON = <T>(jsonString: string | null, defaultValue: T): T => {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('JSON 파싱 오류:', error);
    return defaultValue;
  }
};

// 안전한 JSON 문자열화 함수
export const safeStringifyJSON = (value: any): string | null => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('JSON 문자열화 오류:', error);
    return null;
  }
}; 