// 사이드바 기능 비활성화 - 전체 파일이 주석처리됨
/*
import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HamburgerButtonProps {
  onPress: () => void;
}

export const HamburgerButton: React.FC<HamburgerButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <MaterialCommunityIcons name="menu" size={24} color="#007AFF" />
    </TouchableOpacity>
  );
};

export const BackButton: React.FC<HamburgerButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 8,
  },
});
*/ 