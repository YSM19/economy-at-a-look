import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  TouchableOpacity,
  Modal,
  useColorScheme
} from 'react-native';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  iconName?: string;
  iconColor?: string;
}

const { width } = Dimensions.get('window');

export const ConfirmationModal = ({ 
  visible, 
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  iconName = 'alert-circle-outline',
  iconColor = '#FF9500',
}: ConfirmationModalProps) => {
  const colorScheme = useColorScheme();
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const colors = {
    backdrop: 'rgba(0, 0, 0, 0.5)',
    background: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
    border: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e7',
    accent: iconColor,
    accentLight: colorScheme === 'dark' ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
    text: colorScheme === 'dark' ? '#ffffff' : '#000000',
    subtext: colorScheme === 'dark' ? '#8e8e93' : '#6d6d70',
    confirmButton: iconColor,
    confirmText: '#ffffff',
    cancelButton: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5e7',
    cancelText: colorScheme === 'dark' ? '#ffffff' : '#000000',
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onCancel}
      animationType="none"
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdropTouchable} onPress={onCancel} activeOpacity={1} />
        
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
          <View style={[styles.iconContainer, { backgroundColor: colors.accentLight }]}>
            <MaterialCommunityIcons 
              name={iconName as any}
              size={32} 
              color={colors.accent}
            />
          </View>
          
          <ThemedText style={[styles.title, { color: colors.text }]}>
            {title}
          </ThemedText>
          
          <ThemedText style={[styles.description, { color: colors.subtext }]}>
            {message}
          </ThemedText>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.cancelButton }]}
              onPress={onCancel}
            >
              <ThemedText style={[styles.buttonText, { color: colors.cancelText }]}>
                {cancelText}
              </ThemedText>
            </TouchableOpacity>
            <View style={{width: 10}} />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.confirmButton }]}
              onPress={onConfirm}
            >
              <ThemedText style={[styles.buttonText, { color: colors.confirmText }]}>
                {confirmText}
              </ThemedText>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    maxWidth: width - 60,
    minWidth: 280,
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
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 