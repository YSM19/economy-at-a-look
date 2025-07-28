import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


import { ToastProvider, useToast } from '../components/ToastProvider';
import { NotificationProvider } from '../components/NotificationProvider';
import { NotificationBell } from '../components/NotificationBell';
import { setToastFunction } from '../services/api';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AppContent() {
  // 사이드바 기능 비활성화
  // const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 뒤로가기 버튼을 표시할 경로들 (상세 화면들)
  const showBackButtonPaths = ['/exchange-rate', '/interest-rate', '/consumer-price-index', '/mypage', '/community/board', '/community/post', '/exchange-rate-history'];
  const shouldShowBackButton = showBackButtonPaths.includes(pathname) || pathname.startsWith('/community/board') || pathname.startsWith('/community/post');
  
  // admin 페이지나 탭 페이지에서는 네비게이션 버튼을 숨김
  const isAdminPage = pathname.startsWith('/admin');
  const isTabPage = pathname.startsWith('/(tabs)');

  // 로그인 상태 확인 (앱 시작 시 한 번만)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userInfo = await AsyncStorage.getItem('userInfo');
        
        if (token && userInfo) {
          // 로그인된 상태에서 로그인/회원가입 페이지에 있다면 홈으로 이동
          if (pathname === '/(tabs)/login' || pathname === '/(tabs)/signup') {
            const user = JSON.parse(userInfo);
            if (user.role === 'ADMIN') {
              router.replace('/(tabs)/profile');
            } else {
              router.back();
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
      } finally {
        setIsCheckingAuth(false);
      }
    };

    if (loaded) {
      checkAuthStatus();
      SplashScreen.hideAsync();
    }
  }, [loaded, pathname, router]);

  // 토스트 함수를 API 서비스에 설정
  useEffect(() => {
    setToastFunction(showToast);
  }, [showToast]);

  if (!loaded || isCheckingAuth) {
    return null;
  }

  // 사이드바 기능 비활성화
  // const toggleSidebar = () => {
  //   setSidebarVisible(!sidebarVisible);
  // };

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={styles.container}>
        {/* 사이드바 기능 비활성화
        {!isAdminPage && !isTabPage && (
          <>
            <View style={styles.hamburgerContainer}>
              {shouldShowBackButton ? (
                <BackButton />
              ) : (
                <HamburgerButton onPress={toggleSidebar} />
              )}
            </View>
            <View style={styles.notificationContainer}>
              <NotificationBell />
            </View>
          </>
        )}

      <Sidebar 
        isVisible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)} 
      />
        */}

      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
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
    <ToastProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hamburgerContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    zIndex: 100,
  },
  notificationContainer: {
    position: 'absolute',
    top: 50,
    right: 10,
    zIndex: 100,
  },
});
