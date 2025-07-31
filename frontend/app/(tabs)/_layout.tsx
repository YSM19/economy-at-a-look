import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabLayout() {



  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          height: Platform.OS === 'ios' ? 120 : 85,
          paddingBottom: Platform.OS === 'ios' ? 45 : 25,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="indicators"
        options={{
          title: '지표',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: '도구',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tools" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '커뮤니티',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          href: null, // 탭바에서 숨김
        }}
      />
      <Tabs.Screen
        name="signup"
        options={{
          href: null, // 탭바에서 숨김
        }}
      />
      <Tabs.Screen
        name="profile-management"
        options={{
          href: null, // 탭바에서 숨김
        }}
      />
      <Tabs.Screen
        name="notification-settings"
        options={{
          href: null, // 탭바에서 숨김
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          href: null, // 탭바에서 숨김
        }}
      />
      <Tabs.Screen
        name="suggestion"
        options={{
          href: null, // 탭바에서 숨김
        }}
      />
    </Tabs>
  );
} 