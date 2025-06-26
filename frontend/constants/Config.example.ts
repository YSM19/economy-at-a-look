/**
 * 환경별 설정 상수를 정의하는 파일 (템플릿)
 * 
 * 사용법:
 * 1. 이 파일을 Config.ts로 복사
 * 2. YOUR_SERVER_IP를 실제 서버 IP로 교체
 * 3. 필요에 따라 포트나 기타 설정 수정
 */

// 환경 결정 (process.env.NODE_ENV는 Expo/React Native에서 자동 설정됨)
const ENV = process.env.NODE_ENV || 'development';

// 디버그 메시지
console.log(`현재 환경: ${ENV}`);

// 기본 환경 설정
const Config = {
  // 개발 환경 설정
  development: {
    apiUrl: 'http://YOUR_LOCAL_IP:8080',  // 로컬 개발용 IP
    debug: true,
    apiTimeout: 10000, // 10초
    useTestAccount: true,
    useMockData: false,  // 실제 API 데이터 사용
  },
  
  // 테스트 환경 설정
  test: {
    apiUrl: 'http://YOUR_TEST_SERVER_IP:8080',  // 테스트 서버 IP
    debug: true,
    apiTimeout: 10000, // 10초
    useTestAccount: true,
    useMockData: true,
  },
  
  // 운영 환경 설정
  production: {
    apiUrl: 'http://YOUR_EC2_PUBLIC_IP:8080',  // 실제 EC2 퍼블릭 IP로 교체
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