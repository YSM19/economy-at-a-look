import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import 'react-native-reanimated';
import { View, StyleSheet, AppState, AppStateStatus, Platform, NativeModules } from 'react-native';

import { ToastProvider, useToast } from '../components/ToastProvider';
import { NotificationProvider } from '../components/NotificationProvider';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { setToastFunction } from '../services/api';
import { checkLoginStatusWithValidation } from '../utils/authUtils';
import { safeGetItem, safeParseJSON } from '../utils/safeStorage';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const nativeModules = NativeModules as Record<string, unknown>;
    if (!nativeModules?.RNGoogleMobileAdsModule) {
      console.warn('[AdMob] RNGoogleMobileAdsModule이 없어 광고 초기화를 건너뜁니다.');
      return;
    }

    let adsModule: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      adsModule = require('react-native-google-mobile-ads');
    } catch (error) {
      console.warn('[AdMob] google-mobile-ads 모듈 로드 실패:', error);
      return;
    }

    const mobileAdsFactory =
      typeof adsModule.default === 'function'
        ? adsModule.default
        : typeof adsModule.MobileAds === 'function'
          ? adsModule.MobileAds
          : null;

    if (!mobileAdsFactory) {
      console.warn('[AdMob] mobileAds 인스턴스를 가져오지 못했습니다.');
      return;
    }

    const mobileAdsInstance = mobileAdsFactory();
    const MaxAdContentRating = adsModule.MaxAdContentRating;

    mobileAdsInstance
      .setRequestConfiguration({
        maxAdContentRating:
          MaxAdContentRating?.PG ?? MaxAdContentRating?.T ?? MaxAdContentRating?.G ?? undefined,
      })
      .catch((error: unknown) => {
        console.warn('[AdMob] 광고 요청 설정 실패:', error);
      })
      .finally(() => {
        mobileAdsInstance
          .initialize()
          .catch((error: unknown) => {
            console.warn('[AdMob] 모바일 광고 초기화 실패:', error);
          });
      });
  }, []);

  // 앱 상태 변경 감지 및 토큰 유효성 검증
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // 앱이 포그라운드로 돌아올 때만 토큰 검증
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 앱이 포그라운드로 돌아왔습니다. 토큰 유효성을 검증합니다.');
        
        try {
          const authStatus = await checkLoginStatusWithValidation();
          
          if (!authStatus.isLoggedIn) {
            console.log('❌ 토큰이 유효하지 않습니다. 로그인 페이지로 이동합니다.');
            showToast('로그인 세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
            router.replace('/(tabs)/login');
          } else {
            console.log('✅ 토큰이 유효합니다.');
          }
        } catch (error) {
          console.error('토큰 검증 중 오류:', error);
        }
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [router, showToast]);

  // 로그인 상태 확인 (앱 시작 시 한 번만)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await safeGetItem('userToken');
        const userInfo = await safeGetItem('userInfo');
        
        if (token && userInfo) {
          // 로그인된 상태에서 로그인/회원가입 페이지에 있다면 홈으로 이동
          if (pathname === '/(tabs)/login' || pathname === '/(tabs)/signup') {
            const user = safeParseJSON(userInfo, null) as any;
            if (user && user.role === 'ADMIN') {
              router.replace('/(tabs)/profile');
            } else if (user) {
              router.back();
            } else {
              // 파싱 오류 시 로그인 페이지로 이동
              router.replace('/(tabs)/login');
            }
          }
        } else {
          // 로그인되지 않은 상태에서 보호된 페이지에 있다면 로그인으로 이동
          const protectedPaths = ['/(tabs)/index', '/(tabs)/indicators', '/(tabs)/tools', '/(tabs)/community', '/(tabs)/profile'];
          if (protectedPaths.includes(pathname)) {
            router.replace('/(tabs)/login');
          }
        }
      } catch (error) {
        console.error('인증 상태 확인 오류:', error);
        // 오류 발생 시 로그인 페이지로 이동
        router.replace('/(tabs)/login');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    if (loaded) {
      checkAuthStatus();
      SplashScreen.hideAsync().catch(error => {
        console.error('스플래시 스크린 숨김 오류:', error);
      });
    }
  }, [loaded, pathname, router]);

  // 토스트 함수를 API 서비스에 설정
  useEffect(() => {
    setToastFunction(showToast);
  }, [showToast]);

  if (!loaded || isCheckingAuth) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={styles.container}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin/inquiries" options={{ headerShown: false }} />
        <Stack.Screen name="admin/help" options={{ headerShown: false }} />
        <Stack.Screen name="admin/reports" options={{ headerShown: false }} />
        <Stack.Screen name="admin/community" options={{ headerShown: false }} />
        <Stack.Screen name="admin/api-requests" options={{ headerShown: false }} />
        <Stack.Screen name="community/board/[boardType]" options={{ headerShown: false }} />
        <Stack.Screen name="community/post/[postId]" options={{ headerShown: false }} />
        <Stack.Screen name="community/write" options={{ headerShown: false }} />
        <Stack.Screen name="community/bookmarks" options={{ headerShown: false }} />
        <Stack.Screen name="community/my-posts" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </View>
  </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
