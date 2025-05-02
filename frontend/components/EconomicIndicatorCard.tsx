import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type EconomicIndicatorCardProps = {
  title: string;
  route: string;
  iconName: string;
};

const EconomicIndicatorCard: React.FC<EconomicIndicatorCardProps> = ({
  title,
  route,
  iconName,
}) => {
  const router = useRouter();

  const handlePress = () => {
    router.push(route as any);
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={iconName as any} size={24} color="#1976D2" />
      </View>
      <View style={styles.contentContainer}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.subtitle}>최신 지표 확인하기</ThemedText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default EconomicIndicatorCard; 