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
import { setToastFunction } from '../services/api';

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

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={styles.container}>
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
});
