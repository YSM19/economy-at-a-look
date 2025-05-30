import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HamburgerButtonProps {
  onPress: () => void;
}

interface BackButtonProps {
  onPress?: () => void;
}

export const HamburgerButton: React.FC<HamburgerButtonProps> = ({ onPress }) => {
  const colorScheme = useColorScheme();
  
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.container}>
        <View style={[styles.line, { backgroundColor: colorScheme === 'dark' ? '#fff' : '#333' }]} />
        <View style={[styles.line, { backgroundColor: colorScheme === 'dark' ? '#fff' : '#333' }]} />
        <View style={[styles.line, { backgroundColor: colorScheme === 'dark' ? '#fff' : '#333' }]} />
      </View>
    </TouchableOpacity>
  );
};

export const BackButton: React.FC<BackButtonProps> = ({ onPress }) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };
  
  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <MaterialCommunityIcons 
        name="arrow-left" 
        size={24} 
        color={colorScheme === 'dark' ? '#fff' : '#333'} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  container: {
    justifyContent: 'space-between',
    height: 14,
  },
  line: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
}); 