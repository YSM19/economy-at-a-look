import Constants from 'expo-constants';

// 환경 타입 정의
export type Environment = 'expo-go' | 'development-build' | 'production' | 'web' | 'unknown';

// 환경 감지 함수
export const getEnvironment = (): Environment => {
  // 웹 환경 확인
  if (typeof window !== 'undefined' && Constants.appOwnership === 'expo') {
    return 'web';
  }
  
  // Expo Go 환경
  if (Constants.appOwnership === 'expo') {
    return 'expo-go';
  }
  
  // 개발 빌드 환경
  if (__DEV__ && Constants.appOwnership === 'standalone') {
    return 'development-build';
  }
  
  // 운영 환경 (앱 스토어에서 다운로드한 앱)
  if (!__DEV__ && Constants.appOwnership === 'standalone') {
    return 'production';
  }
  
  return 'unknown';
};

// 푸시 알림이 지원되는 환경인지 확인
export const isPushNotificationSupported = (): boolean => {
  const environment = getEnvironment();
  return environment === 'development-build' || environment === 'production';
};

// 서버 알림이 지원되는 환경인지 확인
export const isServerNotificationSupported = (): boolean => {
  const environment = getEnvironment();
  return environment === 'development-build' || environment === 'production';
};

// 개발 환경인지 확인
export const isDevelopmentEnvironment = (): boolean => {
  const environment = getEnvironment();
  return environment === 'expo-go' || environment === 'development-build';
};

// 운영 환경인지 확인
export const isProductionEnvironment = (): boolean => {
  const environment = getEnvironment();
  return environment === 'production';
};

// 환경별 설명 텍스트 반환
export const getEnvironmentDescription = (): string => {
  const environment = getEnvironment();
  
  switch (environment) {
    case 'expo-go':
      return 'Expo Go 환경';
    case 'development-build':
      return '개발 빌드 환경';
    case 'production':
      return '운영 환경';
    case 'web':
      return '웹 환경';
    default:
      return '알 수 없는 환경';
  }
};

// 환경별 기능 지원 상태 반환
export const getEnvironmentCapabilities = () => {
  const environment = getEnvironment();
  
  return {
    pushNotifications: isPushNotificationSupported(),
    serverNotifications: isServerNotificationSupported(),
    nativeModules: environment === 'development-build' || environment === 'production',
    appStoreDistribution: environment === 'production',
    environment: environment,
    description: getEnvironmentDescription()
  };
}; 