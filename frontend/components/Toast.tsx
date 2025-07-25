import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform, useColorScheme } from 'react-native';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onHide?: () => void;
}

const { width } = Dimensions.get('window');

export const Toast = ({ 
  visible, 
  message, 
  type = 'success', 
  duration = 3000, 
  onHide 
}: ToastProps) => {
  const colorScheme = useColorScheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      // 토스트 나타나기
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 지정된 시간 후 자동으로 사라지기
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'info':
        return 'information';
      default:
        return 'check-circle';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          background: colorScheme === 'dark' ? '#2d5a2d' : '#d4edda',
          border: colorScheme === 'dark' ? '#4caf50' : '#c3e6cb',
          icon: '#4caf50',
          text: colorScheme === 'dark' ? '#ffffff' : '#155724',
        };
      case 'error':
        return {
          background: colorScheme === 'dark' ? '#5a2d2d' : '#f8d7da',
          border: colorScheme === 'dark' ? '#f44336' : '#f5c6cb',
          icon: '#f44336',
          text: colorScheme === 'dark' ? '#ffffff' : '#721c24',
        };
      case 'info':
        return {
          background: colorScheme === 'dark' ? '#2d4a5a' : '#d1ecf1',
          border: colorScheme === 'dark' ? '#2196f3' : '#bee5eb',
          icon: '#2196f3',
          text: colorScheme === 'dark' ? '#ffffff' : '#0c5460',
        };
      default:
        return {
          background: colorScheme === 'dark' ? '#2d5a2d' : '#d4edda',
          border: colorScheme === 'dark' ? '#4caf50' : '#c3e6cb',
          icon: '#4caf50',
          text: colorScheme === 'dark' ? '#ffffff' : '#155724',
        };
    }
  };

  const colors = getColors();

  if (!visible) return null;

  return (
    <View 
      style={[
        styles.container,
        Platform.OS === 'web' && { position: 'fixed' as any }
      ]} 
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <MaterialCommunityIcons 
          name={getIcon() as any} 
          size={20} 
          color={colors.icon}
          style={styles.icon}
        />
        <ThemedText 
          style={[
            styles.message,
            { color: colors.text }
          ]}
        >
          {message}
        </ThemedText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 60 : 50,
    left: 0,
    right: 0,
    zIndex: 999999,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: width - 20,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
    flexWrap: 'nowrap',
  },
}); 