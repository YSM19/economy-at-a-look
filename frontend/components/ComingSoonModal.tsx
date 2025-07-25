import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Platform,
  TouchableOpacity,
  Modal,
  useColorScheme
} from 'react-native';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ComingSoonModalProps {
  visible: boolean;
  featureName: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const ComingSoonModal = ({ 
  visible, 
  featureName, 
  onClose 
}: ComingSoonModalProps) => {
  const colorScheme = useColorScheme();
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // 모달 나타나기
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 모달 사라지기
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getColors = () => {
    return {
      backdrop: 'rgba(0, 0, 0, 0.5)',
      background: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
      border: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e7',
      accent: '#007AFF',
      accentLight: colorScheme === 'dark' ? '#2d4a5a' : '#e3f2fd',
      text: colorScheme === 'dark' ? '#ffffff' : '#000000',
      subtext: colorScheme === 'dark' ? '#8e8e93' : '#6d6d70',
      buttonText: '#ffffff',
    };
  };

  const colors = getColors();

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <Animated.View
        style={[
          styles.backdrop,
          { 
            backgroundColor: colors.backdrop,
            opacity: fadeAnim 
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          onPress={onClose} 
          activeOpacity={1}
        />
        
        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* 헤더 아이콘 */}
          <View style={[styles.iconContainer, { backgroundColor: colors.accentLight }]}>
            <MaterialCommunityIcons 
              name="rocket-launch" 
              size={32} 
              color={colors.accent}
            />
          </View>
          
          {/* 제목 */}
          <ThemedText style={[styles.title, { color: colors.text }]}>
            준비 중인 기능
          </ThemedText>
          
          {/* 메시지 */}
          <ThemedText style={[styles.description, { color: colors.subtext }]}>
            <ThemedText style={[styles.featureName, { color: colors.accent }]}>
              {featureName}
            </ThemedText>
            {' '}기능은 곧 출시될 예정입니다.{'\n'}
            업데이트를 기다려 주세요!
          </ThemedText>
          
          {/* 이모지 */}
          <ThemedText style={styles.emoji}>🔥</ThemedText>
          
          {/* 버튼 */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={onClose}
          >
            <ThemedText style={[styles.closeButtonText, { color: colors.buttonText }]}>
              확인
            </ThemedText>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    maxWidth: width - 80,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 26,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  featureName: {
    fontWeight: '600',
  },
  emoji: {
    fontSize: 24,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
}); 