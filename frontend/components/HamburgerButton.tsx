import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';

interface HamburgerButtonProps {
  onPress: () => void;
}

export const HamburgerButton = ({ onPress }: HamburgerButtonProps) => {
  const colorScheme = useColorScheme();
  const barColor = colorScheme === 'dark' ? '#ffffff' : '#000000';

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <View style={[styles.bar, { backgroundColor: barColor }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 10,
  },
  bar: {
    height: 2,
    width: 20,
    marginVertical: 2,
    borderRadius: 1,
  },
}); 