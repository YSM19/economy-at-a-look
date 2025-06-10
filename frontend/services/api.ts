import axios, { AxiosResponse } from 'axios';
import Config, { isDevelopment, useMockData } from '../constants/Config';

/**
 * 환경 설정에 따라 구성된 axios 인스턴스
 */
const api = axios.create({
  baseURL: Config.apiUrl,
  timeout: Config.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// 요청 인터셉터 설정
api.interceptors.request.use(
  config => {
    // 디버그 모드일 때 요청 정보 로깅
    if (Config.debug) {
      console.log(`🌐 API 요청: ${config.method?.toUpperCase()} ${config.url}`);
      if (config.params) {
        console.log('📝 요청 파라미터:', config.params);
      }
      if (config.data) {
        console.log('📋 요청 데이터:', config.data);
      }
    }
    return config;
  },
  error => {
    if (Config.debug) {
      console.error('❌ 요청 오류:', error);
    }
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
api.interceptors.response.use(
  response => {
    // 디버그 모드일 때 응답 정보 로깅
    if (Config.debug) {
      console.log(`✅ 응답 성공: ${response.config.method?.toUpperCase()} ${response.config.url}`);
      console.log('📊 응답 데이터:', response.data);
    }
    return response;
  },
  error => {
    // 디버그 모드일 때 오류 로깅
    if (Config.debug) {
      console.error('❌ 응답 오류:', error);
      if (error.response) {
        console.error('📉 오류 상태:', error.response.status);
        console.error('📄 오류 데이터:', error.response.data);
      } else if (error.request) {
        console.error('🔌 네트워크 오류: 서버에 연결할 수 없습니다.');
        console.error('📡 요청 정보:', error.request);
        console.error('URL:', error.config?.url);
        console.error('메소드:', error.config?.method);
      } else {
        console.error('⚠️ 요청 설정 오류:', error.message);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// 모의 응답 생성 헬퍼 함수
const createMockResponse = <T>(data: T): Promise<AxiosResponse<T>> => {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any
  });
};

// API 요청에 재시도 로직을 추가하는 함수
const withRetry = async <T>(apiCall: () => Promise<AxiosResponse<T>>, mockData?: T, maxRetries = 3, delay = 1000): Promise<AxiosResponse<T>> => {
  // 모의 데이터 사용 옵션이 켜져 있고, 모의 데이터가 제공되었으면 바로 반환
  if (useMockData && mockData) {
    console.log('🧪 모의 데이터 사용 중');
    return createMockResponse(mockData);
  }
  
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0 && Config.debug) {
        console.log(`🔄 재시도 ${attempt}/${maxRetries} 중...`);
      }
      
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      if (Config.debug) {
        console.error(`⚠️ 시도 ${attempt + 1}/${maxRetries} 실패`, error);
      }
      
      // 모든 시도 실패 후 모의 데이터가 있다면 사용
      if (attempt === maxRetries - 1 && mockData) {
        console.log('🧪 API 호출 실패 후 모의 데이터로 대체 (혹은 마지막으로 저장된 데이터 사용)');
        return createMockResponse(mockData);
      }
      
      // 지정된 시간만큼 지연 후 재시도
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// 환율 관련 API 호출 (재시도 1회로 제한)
export const exchangeRateApi = {
  getTodayRates: () => withRetry(
    () => api.get('/api/exchange-rates/today'),
    undefined,
    1 // 재시도 1회만
  ),
  getLatestRates: () => withRetry(
    () => api.get('/api/exchange-rates/latest'),
    undefined,
    1 // 재시도 1회만
  ),
  getRatesByCurrency: (currency: string) => 
    withRetry(
      () => api.get(`/api/exchange-rates/currency/${currency}`),
      undefined,
      1 // 재시도 1회만
    ),
  fetchRates: (date?: string) => {
    const params = date ? { date } : {};
    return withRetry(
      () => api.post('/api/exchange-rates/fetch', null, { params }),
      undefined,
      1 // 재시도 1회만
    );
  }
};

// 경제 지표 관련 API 호출 (재시도 1회로 제한)
export const economicIndexApi = {
  getEconomicIndex: () => withRetry(() => api.get('/api/economic/index')),
  getExchangeRate: () => withRetry(() => api.get('/api/economic/exchange-rate')),
  getExchangeRateByPeriod: (startDate: string, endDate: string) => 
    withRetry(() => api.get('/api/economic/exchange-rate/period', {
      params: { startDate, endDate }
    })),
  getInterestRate: () => withRetry(() => api.get('/api/economic/interest-rate')),
  getInterestRateAnnouncements: (countryCode?: string) => withRetry(() => 
    countryCode ? 
    api.get(`/api/economic/interest-rate/announcements/${countryCode}`) : 
    api.get('/api/economic/interest-rate/announcements')
  ),
  getConsumerPriceIndex: () => withRetry(() => api.get('/api/economic/consumer-price-index')),
}; 