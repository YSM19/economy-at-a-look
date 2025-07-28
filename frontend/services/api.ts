import axios, { AxiosResponse } from 'axios';
import Config, { isDevelopment, useMockData } from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// 토스트 메시지를 표시하는 함수 (전역에서 사용 가능하도록)
let showToastFunction: ((message: string, type?: 'success' | 'error' | 'info', duration?: number) => void) | null = null;

export const setToastFunction = (toastFn: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void) => {
  showToastFunction = toastFn;
};

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
      console.log(`📡 Base URL: ${Config.apiUrl}`);
      console.log(`🔧 Full URL: ${config.baseURL}${config.url}`);
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
      console.error('❌ 응답 오류:', error);
      console.error('🔍 오류 상세:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      });
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
      console.log('📊 응답 상태:', response.status);
      console.log('📊 응답 데이터:', response.data);
    }
    return response;
  },
  async error => {
    // 디버그 모드일 때 오류 로깅
    if (Config.debug) {
      console.error('❌ 응답 오류:', error);
      console.error('🔧 현재 API URL:', Config.apiUrl);
      if (error.response) {
        console.error('📉 오류 상태:', error.response.status);
        console.error('📄 오류 데이터:', error.response.data);
        console.error('🌐 응답 헤더:', error.response.headers);
      } else if (error.request) {
        console.error('🔌 네트워크 오류: 서버에 연결할 수 없습니다.');
        console.error('📡 요청 정보:', error.request);
        console.error('URL:', error.config?.url);
        console.error('메소드:', error.config?.method);
        console.error('타임아웃:', error.config?.timeout);
      } else {
        console.error('⚠️ 요청 설정 오류:', error.message);
      }
    }

    // JWT 토큰 만료 처리 (401 Unauthorized)
    if (error.response?.status === 401) {
      console.log('🔐 JWT 토큰이 만료되었습니다. 토큰 갱신을 시도합니다.');
      
      try {
        // 현재 토큰 가져오기
        const currentToken = await AsyncStorage.getItem('userToken');
        
        if (currentToken && !error.config.url?.includes('/api/auth/refresh')) {
          // 토큰 갱신 시도
          const refreshResponse = await api.post('/api/auth/refresh', {}, {
            headers: {
              'Authorization': `Bearer ${currentToken}`,
            }
          });
          
          if (refreshResponse.data.success && refreshResponse.data.data.token) {
            // 새로운 토큰 저장
            await AsyncStorage.setItem('userToken', refreshResponse.data.data.token);
            console.log('✅ 토큰 갱신 성공');
            
            // 원래 요청 재시도
            const originalRequest = error.config;
            originalRequest.headers['Authorization'] = `Bearer ${refreshResponse.data.data.token}`;
            return api(originalRequest);
          }
        }
        
        // 토큰 갱신 실패 시 자동 로그아웃
        console.log('❌ 토큰 갱신 실패. 자동 로그아웃을 진행합니다.');
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userInfo');
        await AsyncStorage.removeItem('adminToken');
        
        // 토스트 메시지 표시
        if (showToastFunction) {
          showToastFunction('로그인 세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
        }
        
        // 로그인 페이지로 리다이렉트 (현재 페이지가 로그인 페이지가 아닌 경우에만)
        const currentRoute = router.canGoBack() ? 'current' : '/login';
        if (currentRoute !== '/login') {
          router.replace('/login');
        }
        
      } catch (refreshError) {
        console.error('토큰 갱신 중 오류:', refreshError);
        
        // 갱신 실패 시에도 자동 로그아웃
        try {
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userInfo');
          await AsyncStorage.removeItem('adminToken');
          
          // 토스트 메시지 표시
          if (showToastFunction) {
            showToastFunction('로그인 세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
          }
          
          const currentRoute = router.canGoBack() ? 'current' : '/login';
          if (currentRoute !== '/login') {
            router.replace('/login');
          }
        } catch (storageError) {
          console.error('토큰 삭제 중 오류:', storageError);
        }
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

// 환율 저장 기록 관련 API 호출
export const exchangeRateHistoryApi = {
  saveHistory: (data: any, token: string) => withRetry(() => 
    api.post('/api/exchange-rate-history/save', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  getMyHistory: (token: string) => withRetry(() => 
    api.get('/api/exchange-rate-history/my-history', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  updateMemo: (historyId: number, memo: string, token: string) => withRetry(() => 
    api.put(`/api/exchange-rate-history/${historyId}/memo`, { memo }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })
  ),
  updateExchangeRate: (historyId: number, data: any, token: string) => withRetry(() => 
    api.put(`/api/exchange-rate-history/${historyId}`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })
  ),
  deleteHistory: (historyId: number, token: string) => withRetry(() => 
    api.delete(`/api/exchange-rate-history/${historyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  deleteAllHistory: (token: string) => withRetry(() => 
    api.delete('/api/exchange-rate-history/all', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  getHistoryCount: (token: string) => withRetry(() => 
    api.get('/api/exchange-rate-history/count', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
};

// 알림 관련 API 호출
export const notificationApi = {
  getNotifications: (token: string, page = 0, size = 20) => withRetry(() =>
    api.get('/api/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: { page, size }
    })
  ),
  getUnreadCount: (token: string) => withRetry(() =>
    api.get('/api/notifications/unread-count', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  markAsRead: (notificationId: string, token: string) => withRetry(() =>
    api.put(`/api/notifications/${notificationId}/read`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  markAllAsRead: (token: string) => withRetry(() =>
    api.put('/api/notifications/read-all', {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  deleteNotification: (notificationId: string, token: string) => withRetry(() =>
    api.delete(`/api/notifications/${notificationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  createLikeNotification: (data: any, token: string) => withRetry(() =>
    api.post('/api/notifications/create-like', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  createCommentNotification: (data: any, token: string) => withRetry(() =>
    api.post('/api/notifications/create-comment', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
};

// 게시글 관련 API 호출
export const postApi = {
  getPosts: (boardType?: string, sort = 'latest', page = 0, size = 20, search?: string) => withRetry(() =>
    api.get('/api/posts', {
      params: { boardType, sort, page, size, search }
    })
  ),
  getPost: (postId: number, token?: string) => withRetry(() =>
    api.get(`/api/posts/${postId}`, {
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {}
    })
  ),
  createPost: (data: any, token: string) => withRetry(() =>
    api.post('/api/posts', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  updatePost: (postId: number, data: any, token: string) => withRetry(() =>
    api.put(`/api/posts/${postId}`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  deletePost: (postId: number, token: string) => withRetry(() =>
    api.delete(`/api/posts/${postId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  likePost: (postId: number, token: string) => withRetry(() =>
    api.post(`/api/posts/${postId}/like`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  bookmarkPost: (postId: number, token: string) => withRetry(() =>
    api.post(`/api/posts/${postId}/bookmark`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  getMyPosts: (page = 0, size = 20, token?: string) => withRetry(() =>
    api.get('/api/posts/my', {
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {},
      params: { page, size }
    })
  ),
  getBookmarks: (page = 0, size = 20, token?: string) => withRetry(() =>
    api.get('/api/posts/bookmarks', {
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {},
      params: { page, size }
    })
  ),
  getTrendingPosts: (days = 7, limit = 10) => withRetry(() =>
    api.get('/api/posts/trending', {
      params: { days, limit }
    })
  ),
  searchPosts: (query: string, boardType?: string, page = 0, size = 20) => withRetry(() =>
    api.get('/api/posts/search', {
      params: { query, boardType, page, size }
    })
  ),
  getBoardStats: () => withRetry(() =>
    api.get('/api/posts/board-stats')
  ),
};

// 백엔드 연결 상태 체크 API
export const healthApi = {
  checkConnection: () => withRetry(() =>
    api.get('/api/health', { timeout: 5000 })
  ),
  testEndpoint: () => withRetry(() =>
    api.get('/api/posts?boardType=FREE&page=0&size=1', { timeout: 5000 })
  ),
};

// 댓글 관련 API 호출
export const commentApi = {
  getComments: (postId: number, page = 0, size = 20) => withRetry(() =>
    api.get(`/api/comments/post/${postId}`, {
      params: { page, size }
    })
  ),
  createComment: (data: any, token: string) => withRetry(() =>
    api.post('/api/comments', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  updateComment: (commentId: number, data: any, token: string) => withRetry(() =>
    api.put(`/api/comments/${commentId}`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  deleteComment: (commentId: number, token: string) => withRetry(() =>
    api.delete(`/api/comments/${commentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  likeComment: (commentId: number, token: string) => withRetry(() =>
    api.post(`/api/comments/${commentId}/like`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  getMyComments: (token: string, page = 0, size = 20) => withRetry(() =>
    api.get('/api/comments/my', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: { page, size }
    })
  ),
  getReplies: (commentId: number, page = 0, size = 20) => withRetry(() =>
    api.get(`/api/comments/${commentId}/replies`, {
      params: { page, size }
    })
  ),
};

// 신고 관련 API 호출
export const reportApi = {
  createReport: (data: any, token: string) => withRetry(() =>
    api.post('/api/reports', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  getReports: (token: string, status?: string, page = 0, size = 20) => withRetry(() =>
    api.get('/api/reports', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: { status, page, size }
    })
  ),
  reviewReport: (reportId: number, data: any, token: string) => withRetry(() =>
    api.put(`/api/reports/${reportId}/review`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  getMyReports: (token: string, page = 0, size = 20) => withRetry(() =>
    api.get('/api/reports/my', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: { page, size }
    })
  ),
  getReportStatistics: (token: string) => withRetry(() =>
    api.get('/api/reports/statistics', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
};

// 파일 업로드 관련 API 호출
export const fileUploadApi = {
  uploadImage: (file: FormData, token: string) => withRetry(() =>
    api.post('/api/files/upload', file, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      }
    })
  ),
  uploadImages: (files: FormData, token: string) => withRetry(() =>
    api.post('/api/files/upload-multiple', files, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      }
    })
  ),

  deleteFile: (fileUrl: string, token: string) => withRetry(() =>
    api.delete('/api/files/delete', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: { fileUrl }
    })
  ),
};

// 관리자 관련 API 호출
export const adminApi = {
  // 게시글 관리
  getPostManagementList: (params: any, token: string) => withRetry(() =>
    api.get('/api/admin/posts', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params
    })
  ),
  
  bulkDeletePosts: (data: any, token: string) => withRetry(() =>
    api.post('/api/admin/posts/bulk-delete', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  
  bulkRestorePosts: (data: any, token: string) => withRetry(() =>
    api.post('/api/admin/posts/bulk-restore', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  
  // 댓글 관리
  getCommentManagementList: (params: any, token: string) => withRetry(() =>
    api.get('/api/admin/comments', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params
    })
  ),
  
  bulkDeleteComments: (data: any, token: string) => withRetry(() =>
    api.post('/api/admin/comments/bulk-delete', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  
  bulkRestoreComments: (data: any, token: string) => withRetry(() =>
    api.post('/api/admin/comments/bulk-restore', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  
  // 통계
  getCommunityStats: (token: string) => withRetry(() =>
    api.get('/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  // 신고 관리
  getReportManagementList: (params: any, token: string) => withRetry(() =>
    api.get('/api/reports/admin', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params
    })
  ),
  approveReport: (reportId: number, data: any, token: string) => withRetry(() =>
    api.post(`/api/admin/reports/${reportId}/approve`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  rejectReport: (reportId: number, data: any, token: string) => withRetry(() =>
    api.post(`/api/admin/reports/${reportId}/reject`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),

  // 사용자 정지 관리
  getUserList: (params: any, token: string) => withRetry(() =>
    api.get('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params
    })
  ),

  getSuspendedUserList: (params: any, token: string) => withRetry(() =>
    api.get('/api/admin/users/suspended', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params
    })
  ),

  suspendUser: (data: any, token: string) => withRetry(() =>
    api.post('/api/admin/users/suspend', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),

  unsuspendUser: (data: any, token: string) => withRetry(() =>
    api.post('/api/admin/users/unsuspend', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),

  getUserSuspensionStatus: (userId: number, token: string) => withRetry(() =>
    api.get(`/api/admin/users/${userId}/suspension`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),

  releaseExpiredSuspensions: (token: string) => withRetry(() =>
    api.post('/api/admin/users/release-expired-suspensions', {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
}; 

// 인증 관련 API 호출
export const authApi = {
  login: (data: any) => withRetry(() => 
    api.post('/api/auth/login', data)
  ),
  signup: (data: any) => withRetry(() => 
    api.post('/api/auth/signup', data)
  ),
  validateToken: (token: string) => withRetry(() => 
    api.get('/api/auth/validate', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  refreshToken: (token: string) => withRetry(() => 
    api.post('/api/auth/refresh', {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  changeUsername: (data: any, token: string) => withRetry(() => 
    api.put('/api/auth/change-username', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
  changePassword: (data: any, token: string) => withRetry(() => 
    api.put('/api/auth/change-password', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    })
  ),
}; 