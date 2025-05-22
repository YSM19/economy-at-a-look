import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from './ThemedText';
import { useColorScheme } from '../hooks/useColorScheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.6;

export const Sidebar = ({ isVisible, onClose }: SidebarProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, backdropOpacity]);

  const navigateWithTab = (tab: string) => {
    // index 페이지로 이동한 후 해당 탭을 설정하도록 파라미터 전달
    router.push({
      pathname: '/',
      params: { tab }
    } as any);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.backdrop, 
          { opacity: backdropOpacity }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          onPress={onClose} 
          activeOpacity={1}
        />
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.sidebar, 
          { 
            transform: [{ translateX: slideAnim }],
            backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff'
          }
        ]}
      >
        <View style={styles.header}>
          <ThemedText style={styles.headerText}>한눈에</ThemedText>
        </View>
        
        <View style={styles.menuItems}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigateWithTab('exchange')}
          >
            <MaterialCommunityIcons 
              name="currency-usd" 
              size={24} 
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
            />
            <ThemedText style={styles.menuText}>환율</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigateWithTab('interest')}
          >
            <MaterialCommunityIcons 
              name="trending-up" 
              size={24} 
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
            />
            <ThemedText style={styles.menuText}>금리</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigateWithTab('price')}
          >
            <MaterialCommunityIcons 
              name="shopping" 
              size={24} 
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
            />
            <ThemedText style={styles.menuText}>물가</ThemedText>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  backdropTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuItems: {
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingLeft: 15,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
  },
}); 