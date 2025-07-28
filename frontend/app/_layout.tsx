import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';

import { HamburgerButton, BackButton } from '../components/HamburgerButton';
import { Sidebar } from '../components/Sidebar';
import { ToastProvider, useToast } from '../components/ToastProvider';
import { NotificationProvider } from '../components/NotificationProvider';
import { NotificationBell } from '../components/NotificationBell';
import { setToastFunction } from '../services/api';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const pathname = usePathname();
  const { showToast } = useToast();

  // 뒤로가기 버튼을 표시할 경로들 (상세 화면들)
  const showBackButtonPaths = ['/exchange-rate', '/interest-rate', '/consumer-price-index', '/mypage', '/community/board', '/community/post'];
  const shouldShowBackButton = showBackButtonPaths.includes(pathname) || pathname.startsWith('/community/board') || pathname.startsWith('/community/post');
  
  // admin 페이지에서는 네비게이션 버튼을 숨김
  const isAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // 토스트 함수를 API 서비스에 설정
  useEffect(() => {
    setToastFunction(showToast);
  }, [showToast]);

  if (!loaded) {
    return null;
  }

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={styles.container}>
        {!isAdminPage && (
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

      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="exchange-rate" options={{ headerShown: false }} />
        <Stack.Screen name="interest-rate" options={{ headerShown: false }} />
        <Stack.Screen name="consumer-price-index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="mypage" options={{ headerShown: false }} />
        <Stack.Screen name="exchange-rate-history" options={{ headerShown: false }} />
        <Stack.Screen name="community" options={{ headerShown: false }} />
        <Stack.Screen name="community/board/[boardType]" options={{ headerShown: false }} />
        <Stack.Screen name="community/post/[postId]" options={{ headerShown: false }} />
        <Stack.Screen name="community/write" options={{ headerShown: false }} />
        <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
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
