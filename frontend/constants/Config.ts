/**
 * 환경별 설정 상수를 정의하는 파일
 * 
 * 개발, 테스트, 운영 환경에 따라 서로 다른 값을 사용합니다.
 */

// 환경 결정 (process.env.NODE_ENV는 Expo/React Native에서 자동 설정됨)
const ENV = process.env.NODE_ENV || 'development';

// 디버그 메시지
console.log(`현재 환경: ${ENV}`);

// 기본 환경 설정
const Config = {
  // 개발 환경 설정
  development: {
    apiUrl: 'http://192.168.0.2:8080',  // 컴퓨터의 실제 IP 주소로 변경
    debug: true,
    apiTimeout: 10000, // 10초
    useTestAccount: true,
    // 개발 환경에서 실제 API 연결이 필요한 경우 모의 데이터 비활성화
    useMockData: false,  // 실제 API 데이터 사용으로 변경
  },
  
  // 테스트 환경 설정
  test: {
    apiUrl: 'https://test-api.economy-at-a-look.com',
    debug: true,
    apiTimeout: 10000, // 10초
    useTestAccount: true,
    useMockData: true,
  },
  
  // 운영 환경 설정
  production: {
    apiUrl: 'http://192.168.0.2:8080',
    debug: false,
    apiTimeout: 30000, // 30초
    useTestAccount: false,
    useMockData: false,
  }
};

// IP 주소 테스트를 위한 디버그 메시지
if (ENV === 'development') {
  console.log(`API URL: ${Config.development.apiUrl}`);
  console.log('Backend connection test enabled');
  
  if (Config.development.useMockData) {
    console.log('⚠️ 모의 데이터 모드 활성화됨');
    console.log('⚠️ 백엔드 서버 없이도 앱이 작동합니다');
  } else {
    console.log('✅ 실제 API 데이터 사용 모드 활성화');
    console.log('✅ 백엔드 서버 연결이 필요합니다');
  }
}

// 현재 환경의 설정 내보내기
export default Config[ENV];

// 현재 환경 이름 내보내기
export const currentEnv = ENV;

// 개발 환경인지 확인하는 유틸리티 함수
export const isDevelopment = ENV === 'development';

// 운영 환경인지 확인하는 유틸리티 함수
export const isProduction = ENV === 'production';

// 테스트 환경인지 확인하는 유틸리티 함수
export const isTest = ENV === 'test';

// 모의 데이터 사용 여부 확인
export const useMockData = Config[ENV].useMockData; 