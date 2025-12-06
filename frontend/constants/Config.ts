import Constants from 'expo-constants';

type Environment = 'development' | 'test' | 'production';

interface EnvironmentConfig {
  apiUrl: string;
  debug: boolean;
  apiTimeout: number;
  useTestAccount: boolean;
  useMockData: boolean;
}

type ExtraConfig = Partial<EnvironmentConfig> & {
  appEnv?: string;
  overrides?: Partial<Record<Environment, Partial<EnvironmentConfig>>>;
};

const expoConfig = Constants?.expoConfig ?? {};
const extra = (expoConfig.extra ?? {}) as ExtraConfig;

const ENV = normaliseEnv(
  extra.appEnv ??
    process.env.EXPO_PUBLIC_APP_ENV ??
    process.env.NODE_ENV ??
    'development',
);

const defaults: Record<Environment, EnvironmentConfig> = {
  development: {
    apiUrl: 'http://10.0.2.2:8080', // Android 에뮬레이터 기본 게이트웨이
    debug: true,
    apiTimeout: 10000,
    useTestAccount: true,
    useMockData: false,
  },
  test: {
    apiUrl: 'http://10.0.2.2:8080',
    debug: true,
    apiTimeout: 15000,
    useTestAccount: true,
    useMockData: false,
  },
  production: {
    apiUrl: 'https://atalook.kro.kr',
    debug: false,
    apiTimeout: 30000,
    useTestAccount: false,
    useMockData: false,
  },
};

const envOverrides = removeUndefined(extra.overrides?.[ENV] ?? {});
const extraOverrides = removeUndefined({
  apiUrl: extra.apiUrl,
  debug: extra.debug,
  apiTimeout: extra.apiTimeout,
  useTestAccount: extra.useTestAccount,
  useMockData: extra.useMockData,
});
const envVariableOverrides = removeUndefined({
  apiUrl: readString(process.env.EXPO_PUBLIC_API_URL),
  apiTimeout: readNumber(process.env.EXPO_PUBLIC_API_TIMEOUT),
  debug: readBool(process.env.EXPO_PUBLIC_DEBUG),
  useTestAccount: readBool(process.env.EXPO_PUBLIC_USE_TEST_ACCOUNT),
  useMockData: readBool(process.env.EXPO_PUBLIC_USE_MOCK_DATA),
});

const activeConfig: EnvironmentConfig = {
  ...defaults[ENV],
  ...envOverrides,
  ...extraOverrides,
  ...envVariableOverrides,
};

if (__DEV__) {
  console.log(`현재 환경: ${ENV}`);
  console.log(`API URL: ${activeConfig.apiUrl}`);
  console.log(
    activeConfig.useMockData
      ? '⚠️ 모의 데이터 모드 활성화됨'
      : '✅ 실제 API 데이터 사용 모드 활성화',
  );
}

export default activeConfig;
export const currentEnv = ENV;
export const isDevelopment = ENV === 'development';
export const isProduction = ENV === 'production';
export const isTest = ENV === 'test';
export const useMockData = activeConfig.useMockData;

function normaliseEnv(value: string): Environment {
  if (value === 'production' || value === 'test') {
    return value;
  }
  return 'development';
}

function readString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readBool(value?: string): boolean | undefined {
  if (!value) {
    return undefined;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return undefined;
}

function removeUndefined<T extends object>(source: Partial<T>): Partial<T> {
  return Object.fromEntries(
    Object.entries(source).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}
