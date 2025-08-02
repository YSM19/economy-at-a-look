import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getEnvironment, 
  isPushNotificationSupported 
} from './environmentUtils';

// 조건부로 expo-notifications import
let Notifications: any = null;

// 안전한 모듈 로드 함수
const loadNotificationsModule = () => {
  if (Notifications) return Notifications;
  
  try {
    const environment = getEnvironment();
    if (environment === 'development-build' || environment === 'production') {
      Notifications = require('expo-notifications');
      return Notifications;
    }
  } catch (error) {
    console.log('expo-notifications 모듈을 로드할 수 없습니다:', error);
  }
  
  return null;
};

interface NotificationSettings {
  enabled: boolean;
  exchangeRate: {
    enabled: boolean;
    countries: {
      usa: {
        enabled: boolean;
        threshold: string;
      };
      japan: {
        enabled: boolean;
        threshold: string;
      };
      europe: {
        enabled: boolean;
        threshold: string;
      };
      china: {
        enabled: boolean;
        threshold: string;
      };
    };
  };
  interestRate: {
    enabled: boolean;
    threshold: string;
  };
  cpi: {
    enabled: boolean;
    threshold: string;
  };
}

interface ExchangeRateData {
  usdRate: number;
  eurRate: number;
  jpyRate: number;
  cnyRate?: number;
}

interface InterestRateData {
  korea: {
    rate: number;
    announcementDate?: string; // 발표일 추가
  };
}

interface CPIData {
  yearlyChange: number;
  annualRate: number;
  announcementDate?: string; // 발표일 추가
}

// 이전 값 저장용 키
const PREVIOUS_VALUES_KEY = 'notification_previous_values';

// 알림 권한 요청
export const requestNotificationPermissions = async () => {
  // 푸시 알림이 지원되지 않는 환경에서는 비활성화
  if (!isPushNotificationSupported()) {
    const environment = getEnvironment();
    console.log(`${environment} 환경에서는 푸시 알림이 지원되지 않습니다.`);
    return false;
  }

  const notificationsModule = loadNotificationsModule();
  if (!notificationsModule) {
    const environment = getEnvironment();
    console.log(`${environment} 환경에서는 푸시 알림 모듈을 로드할 수 없습니다.`);
    return false;
  }

  try {
    const { status: existingStatus } = await notificationsModule.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await notificationsModule.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('알림 권한이 거부되었습니다.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('알림 권한 요청 실패:', error);
    return false;
  }
};

// 이전 값 로드
const loadPreviousValues = async () => {
  try {
    const values = await AsyncStorage.getItem(PREVIOUS_VALUES_KEY);
    return values ? JSON.parse(values) : {};
  } catch (error) {
    console.error('이전 값 로드 실패:', error);
    return {};
  }
};

// 이전 값 저장
const savePreviousValues = async (values: any) => {
  try {
    await AsyncStorage.setItem(PREVIOUS_VALUES_KEY, JSON.stringify(values));
  } catch (error) {
    console.error('이전 값 저장 실패:', error);
  }
};

// 알림 설정 로드
export const loadNotificationSettings = async (): Promise<NotificationSettings | null> => {
  try {
    const settings = await AsyncStorage.getItem('notificationSettings');
    if (!settings) return null;
    
    const parsedSettings = JSON.parse(settings);
    
    // 기존 설정을 새로운 구조로 마이그레이션
    if (parsedSettings && typeof parsedSettings === 'object') {
      // exchangeRate 설정 마이그레이션
      if (parsedSettings.exchangeRate && parsedSettings.exchangeRate.countries) {
        Object.keys(parsedSettings.exchangeRate.countries).forEach(country => {
          const countrySettings = parsedSettings.exchangeRate.countries[country];
          if (countrySettings && countrySettings.conditions) {
            // conditions 필드 제거
            delete countrySettings.conditions;
          }
        });
      }
      
      // interestRate 설정 마이그레이션
      if (parsedSettings.interestRate && parsedSettings.interestRate.conditions) {
        delete parsedSettings.interestRate.conditions;
      }
      
      // cpi 설정 마이그레이션
      if (parsedSettings.cpi && parsedSettings.cpi.conditions) {
        delete parsedSettings.cpi.conditions;
      }
      
      // 마이그레이션된 설정 저장
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(parsedSettings));
      return parsedSettings;
    }
    
    return null;
  } catch (error) {
    console.error('알림 설정 로드 실패:', error);
    return null;
  }
};

// 환율 알림 체크
export const checkExchangeRateNotification = async (
  exchangeRateData: ExchangeRateData
) => {
  const settings = await loadNotificationSettings();
  if (!settings || !settings.enabled || !settings.exchangeRate.enabled) {
    return;
  }

  const previousValues = await loadPreviousValues();
  const notifications = [];

  // USD 환율 체크
  if (settings.exchangeRate.countries.usa.enabled) {
    const threshold = parseFloat(settings.exchangeRate.countries.usa.threshold);
    const currentRate = exchangeRateData.usdRate;
    const previousRate = previousValues.usdRate;
    
    if (!isNaN(threshold) && !isNaN(currentRate) && !isNaN(previousRate)) {
      // 이전 값과 현재 값 사이에 설정값이 있는지 확인
      const minRate = Math.min(previousRate, currentRate);
      const maxRate = Math.max(previousRate, currentRate);
      
      if (threshold >= minRate && threshold <= maxRate) {
        notifications.push({
          title: '환율 알림',
          body: `미국 달러 환율이 ${threshold}원을 지나갔습니다. (현재: ${currentRate.toFixed(2)}원)`,
          data: { type: 'exchange_rate', country: 'usa', value: currentRate },
        });
      }
    }
  }

  // EUR 환율 체크
  if (settings.exchangeRate.countries.europe.enabled) {
    const threshold = parseFloat(settings.exchangeRate.countries.europe.threshold);
    const currentRate = exchangeRateData.eurRate;
    const previousRate = previousValues.eurRate;
    
    if (!isNaN(threshold) && !isNaN(currentRate) && !isNaN(previousRate)) {
      const minRate = Math.min(previousRate, currentRate);
      const maxRate = Math.max(previousRate, currentRate);
      
      if (threshold >= minRate && threshold <= maxRate) {
        notifications.push({
          title: '환율 알림',
          body: `유럽 유로 환율이 ${threshold}원을 지나갔습니다. (현재: ${currentRate.toFixed(2)}원)`,
          data: { type: 'exchange_rate', country: 'europe', value: currentRate },
        });
      }
    }
  }

  // JPY 환율 체크
  if (settings.exchangeRate.countries.japan.enabled) {
    const threshold = parseFloat(settings.exchangeRate.countries.japan.threshold);
    const currentRate = exchangeRateData.jpyRate;
    const previousRate = previousValues.jpyRate;
    
    if (!isNaN(threshold) && !isNaN(currentRate) && !isNaN(previousRate)) {
      const minRate = Math.min(previousRate, currentRate);
      const maxRate = Math.max(previousRate, currentRate);
      
      if (threshold >= minRate && threshold <= maxRate) {
        notifications.push({
          title: '환율 알림',
          body: `일본 엔화 환율이 ${threshold}원을 지나갔습니다. (현재: ${currentRate.toFixed(2)}원)`,
          data: { type: 'exchange_rate', country: 'japan', value: currentRate },
        });
      }
    }
  }

  // CNY 환율 체크
  if (settings.exchangeRate.countries.china.enabled && exchangeRateData.cnyRate) {
    const threshold = parseFloat(settings.exchangeRate.countries.china.threshold);
    const currentRate = exchangeRateData.cnyRate;
    const previousRate = previousValues.cnyRate;
    
    if (!isNaN(threshold) && !isNaN(currentRate) && !isNaN(previousRate)) {
      const minRate = Math.min(previousRate, currentRate);
      const maxRate = Math.max(previousRate, currentRate);
      
      if (threshold >= minRate && threshold <= maxRate) {
        notifications.push({
          title: '환율 알림',
          body: `중국 위안 환율이 ${threshold}원을 지나갔습니다. (현재: ${currentRate.toFixed(2)}원)`,
          data: { type: 'exchange_rate', country: 'china', value: currentRate },
        });
      }
    }
  }

  // 알림 발송
  for (const notification of notifications) {
    await sendNotification(notification);
  }

  // 현재 값을 이전 값으로 저장
  await savePreviousValues({
    usdRate: exchangeRateData.usdRate,
    eurRate: exchangeRateData.eurRate,
    jpyRate: exchangeRateData.jpyRate,
    cnyRate: exchangeRateData.cnyRate,
  });
};

// 금리 알림 체크 (환율과 동일한 방식으로 개선)
export const checkInterestRateNotification = async (
  interestRateData: InterestRateData
) => {
  const settings = await loadNotificationSettings();
  if (!settings || !settings.enabled || !settings.interestRate.enabled) {
    return;
  }

  const threshold = parseFloat(settings.interestRate.threshold);
  if (isNaN(threshold)) return;

  const currentRate = interestRateData.korea.rate;
  if (isNaN(currentRate)) return;

  const previousValues = await loadPreviousValues();
  const previousRate = previousValues.interestRate;

  if (!isNaN(previousRate)) {
    // 이전 값과 현재 값 사이에 설정값이 있는지 확인
    const minRate = Math.min(previousRate, currentRate);
    const maxRate = Math.max(previousRate, currentRate);
    
    if (threshold >= minRate && threshold <= maxRate) {
      const announcementInfo = interestRateData.korea.announcementDate 
        ? ` (발표일: ${interestRateData.korea.announcementDate})`
        : '';
      
      await sendNotification({
        title: '금리 알림',
        body: `한국은행 기준금리가 ${threshold}%를 지나갔습니다. (현재: ${currentRate}%)${announcementInfo}`,
        data: { type: 'interest_rate', value: currentRate, announcementDate: interestRateData.korea.announcementDate },
      });
    }
  }

  // 현재 값을 이전 값으로 저장
  await savePreviousValues({
    ...previousValues,
    interestRate: currentRate,
  });
};

// 물가 알림 체크 (환율과 동일한 방식으로 개선)
export const checkCPINotification = async (cpiData: CPIData) => {
  const settings = await loadNotificationSettings();
  if (!settings || !settings.enabled || !settings.cpi.enabled) {
    return;
  }

  const threshold = parseFloat(settings.cpi.threshold);
  if (isNaN(threshold)) return;

  const currentCPI = cpiData.yearlyChange || cpiData.annualRate;
  if (isNaN(currentCPI)) return;

  const previousValues = await loadPreviousValues();
  const previousCPI = previousValues.cpi;

  if (!isNaN(previousCPI)) {
    // 이전 값과 현재 값 사이에 설정값이 있는지 확인
    const minCPI = Math.min(previousCPI, currentCPI);
    const maxCPI = Math.max(previousCPI, currentCPI);
    
    if (threshold >= minCPI && threshold <= maxCPI) {
      const announcementInfo = cpiData.announcementDate 
        ? ` (발표일: ${cpiData.announcementDate})`
        : '';
      
      await sendNotification({
        title: '물가 알림',
        body: `소비자물가지수가 ${threshold}%를 지나갔습니다. (현재: ${currentCPI.toFixed(1)}%)${announcementInfo}`,
        data: { type: 'cpi', value: currentCPI, announcementDate: cpiData.announcementDate },
      });
    }
  }

  // 현재 값을 이전 값으로 저장
  await savePreviousValues({
    ...previousValues,
    cpi: currentCPI,
  });
};

// 알림 발송
const sendNotification = async (notification: {
  title: string;
  body: string;
  data?: any;
}) => {
  // 푸시 알림이 지원되지 않는 환경에서는 알림 발송 건너뛰기
  if (!isPushNotificationSupported()) {
    const environment = getEnvironment();
    console.log(`${environment} 환경에서는 푸시 알림이 지원되지 않습니다.`);
    return;
  }

  const notificationsModule = loadNotificationsModule();
  if (!notificationsModule) {
    const environment = getEnvironment();
    console.log(`${environment} 환경에서는 푸시 알림 모듈을 로드할 수 없습니다.`);
    return;
  }

  try {
    await notificationsModule.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
      },
      trigger: null, // 즉시 발송
    });
    console.log('알림 발송됨:', notification.title);
  } catch (error) {
    console.error('알림 발송 실패:', error);
  }
};



// 알림 설정 초기화
export const initializeNotifications = async () => {
  // 푸시 알림이 지원되지 않는 환경에서는 알림 기능 비활성화
  if (!isPushNotificationSupported()) {
    const environment = getEnvironment();
    console.log(`${environment} 환경에서는 푸시 알림이 지원되지 않습니다.`);
    return false;
  }

  const notificationsModule = loadNotificationsModule();
  if (!notificationsModule) {
    const environment = getEnvironment();
    console.log(`${environment} 환경에서는 푸시 알림 모듈을 로드할 수 없습니다.`);
    return false;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('알림 권한이 없습니다.');
      return false;
    }

    // 알림 핸들러 설정
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    return true;
  } catch (error) {
    console.log('알림 초기화 실패:', error);
    return false;
  }
};

// 모든 알림 체크 (주기적으로 호출)
export const checkAllNotifications = async (
  exchangeRateData?: ExchangeRateData,
  interestRateData?: InterestRateData,
  cpiData?: CPIData
) => {
  // 푸시 알림이 지원되지 않는 환경에서는 알림 체크 건너뛰기
  if (!isPushNotificationSupported()) {
    return;
  }

  const settings = await loadNotificationSettings();
  if (!settings || !settings.enabled) {
    return;
  }

  if (exchangeRateData && settings.exchangeRate.enabled) {
    await checkExchangeRateNotification(exchangeRateData);
  }

  if (interestRateData && settings.interestRate.enabled) {
    await checkInterestRateNotification(interestRateData);
  }

  if (cpiData && settings.cpi.enabled) {
    await checkCPINotification(cpiData);
  }
}; 