import AsyncStorage from '@react-native-async-storage/async-storage';

// 안전한 AsyncStorage 읽기 함수
export const safeGetItem = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`AsyncStorage 읽기 오류 (${key}):`, error);
    return null;
  }
};

// 안전한 AsyncStorage 쓰기 함수
export const safeSetItem = async (key: string, value: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`AsyncStorage 쓰기 오류 (${key}):`, error);
    return false;
  }
};

// 안전한 AsyncStorage 삭제 함수
export const safeRemoveItem = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`AsyncStorage 삭제 오류 (${key}):`, error);
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