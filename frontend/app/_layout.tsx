import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { HamburgerButton, BackButton } from '../components/HamburgerButton';
import { Sidebar } from '../components/Sidebar';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const pathname = usePathname();

  // 뒤로가기 버튼을 표시할 경로들 (상세 화면들)
  const showBackButtonPaths = ['/exchange-rate', '/interest-rate', '/consumer-price-index'];
  const shouldShowBackButton = showBackButtonPaths.includes(pathname);
  
  // admin 페이지에서는 네비게이션 버튼을 숨김
  const isAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.container}>
        {!isAdminPage && (
          <View style={styles.hamburgerContainer}>
            {shouldShowBackButton ? (
              <BackButton />
            ) : (
              <HamburgerButton onPress={toggleSidebar} />
            )}
          </View>
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
          <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </View>
    </ThemeProvider>
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
});
