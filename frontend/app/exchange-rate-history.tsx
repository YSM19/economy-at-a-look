import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../components/ToastProvider';
import { router } from 'expo-router';
import { exchangeRateHistoryApi } from '../services/api';

type ExchangeRateHistory = {
  id: number;
  currencyCode: string;
  currencyName: string;
  exchangeRate: number;
  krwAmount: number;
  foreignAmount: number;
  createdAt: string;
  memo?: string;
  isKrwFirst?: boolean;
};

export default function ExchangeRateHistoryScreen() {
  const [histories, setHistories] = useState<ExchangeRateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const { showToast } = useToast();

  useEffect(() => {
    checkLoginAndLoadData();
  }, []);

  const checkLoginAndLoadData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoggedIn(false);
        showToast('로그인이 필요합니다.', 'error');
        router.push('/login');
        return;
      }
      
      setIsLoggedIn(true);
      await loadExchangeRateHistory();
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error);
      setIsLoggedIn(false);
    }
  };

  const loadExchangeRateHistory = async () => {
    if (!loading) setRefreshing(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('로그인 토큰이 없습니다.', 'error');
        return;
      }
      
      const response = await exchangeRateHistoryApi.getMyHistory(token);

      if (response.data.success) {
        console.log('불러온 기록 데이터:', response.data.data);
        response.data.data?.forEach((item: any, index: number) => {
          console.log(`기록 ${index}:`, {
            id: item.id,
            currencyCode: item.currencyCode,
            isKrwFirst: item.isKrwFirst,
            krwAmount: item.krwAmount,
            foreignAmount: item.foreignAmount
          });
        });
        setHistories(response.data.data || []);
      } else {
        showToast(response.data.message || '기록을 불러오는데 실패했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('환율 기록 로드 실패:', error);
      if (error?.request) {
        showToast('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.', 'error');
      } else {
        showToast('기록을 불러오는 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteHistory = async (historyId: number) => {
    Alert.alert(
      '삭제 확인',
      '이 저장 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              if (!token) {
                showToast('로그인 토큰이 없습니다.', 'error');
                return;
              }
              
              const response = await exchangeRateHistoryApi.deleteHistory(historyId, token);

              if (response.data.success) {
                showToast('기록이 삭제되었습니다.', 'success');
                loadExchangeRateHistory();
              } else {
                showToast(response.data.message || '삭제에 실패했습니다.', 'error');
              }
            } catch (error: any) {
              console.error('삭제 실패:', error);
              if (error?.request) {
                showToast('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.', 'error');
              } else {
                showToast('삭제 중 오류가 발생했습니다.', 'error');
              }
            }
          }
        }
      ]
    );
  };

  const deleteAllHistory = async () => {
    Alert.alert(
      '모든 기록 삭제',
      '정말로 모든 환율 저장 기록을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '모두 삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              if (!token) {
                showToast('로그인 토큰이 없습니다.', 'error');
                return;
              }
              
              const response = await exchangeRateHistoryApi.deleteAllHistory(token);

              if (response.data.success) {
                showToast('모든 기록이 삭제되었습니다.', 'success');
                loadExchangeRateHistory();
              } else {
                showToast(response.data.message || '삭제에 실패했습니다.', 'error');
              }
            } catch (error: any) {
              console.error('모든 기록 삭제 실패:', error);
              if (error?.request) {
                showToast('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.', 'error');
              } else {
                showToast('모든 기록 삭제 중 오류가 발생했습니다.', 'error');
              }
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const getCurrencyIcon = (currencyCode: string) => {
    switch(currencyCode) {
      case 'USD': return 'currency-usd';
      case 'JPY': return 'currency-jpy';
      case 'EUR': return 'currency-eur';
      case 'CNY': return 'cash';
      default: return 'cash';
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    switch(currencyCode) {
      case 'USD': return '$';
      case 'JPY': return '¥';
      case 'EUR': return '€';
      case 'CNY': return '¥';
      default: return currencyCode;
    }
  };

  if (!isLoggedIn) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="history" size={24} color="#4CAF50" />
          <ThemedText style={styles.title}>환율 저장 기록</ThemedText>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="login" size={48} color="#ccc" />
          <ThemedText style={styles.emptyText}>로그인이 필요합니다.</ThemedText>
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={() => router.push('/login')}
          >
            <ThemedText style={styles.loginButtonText}>로그인하기</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="history" size={24} color="#4CAF50" />
          <ThemedText style={styles.title}>환율 저장 기록</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={32} color="#4CAF50" />
          <ThemedText style={styles.loadingText}>기록을 불러오는 중...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="history" size={24} color="#4CAF50" />
          <ThemedText style={styles.title}>환율 저장 기록</ThemedText>
        </View>
        <View style={styles.headerRight}>
          {histories.length > 0 && (
            <TouchableOpacity 
              style={styles.deleteAllButton}
              onPress={deleteAllHistory}
            >
              <MaterialCommunityIcons name="delete-sweep" size={20} color="#f44336" />
              <ThemedText style={styles.deleteAllButtonText}>모두 삭제</ThemedText>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadExchangeRateHistory}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {histories.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadExchangeRateHistory} />
          }
        >
          <MaterialCommunityIcons name="database-off" size={48} color="#ccc" />
          <ThemedText style={styles.emptyText}>저장된 환율 기록이 없습니다.</ThemedText>
          <ThemedText style={styles.emptySubText}>
            환율 계산기에서 결과를 저장해보세요!
          </ThemedText>
        </ScrollView>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadExchangeRateHistory} />
          }
        >
          {histories.map((history) => (
            <View key={history.id} style={styles.historyCard}>
              {/* 카드 헤더 - 통화 정보와 날짜 */}
              <View style={styles.cardHeader}>
                <View style={styles.currencyHeader}>
                  <MaterialCommunityIcons 
                    name={getCurrencyIcon(history.currencyCode)} 
                    size={24} 
                    color="#4CAF50" 
                  />
                  <View style={styles.currencyTextContainer}>
                    <ThemedText style={styles.currencyName}>
                      {history.currencyName}
                    </ThemedText>
                    <ThemedText style={styles.currencyCode}>
                      {history.currencyCode}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.dateText}>
                  {formatDate(history.createdAt)}
                </ThemedText>
              </View>

              {/* 환율 정보 */}
              <View style={styles.rateSection}>
                <ThemedText style={styles.rateLabel}>환율</ThemedText>
                <ThemedText style={styles.rateValue}>
                  1 {history.currencyCode} = {formatNumber(history.exchangeRate)}원
                </ThemedText>
              </View>

              {/* 금액 정보 */}
              <View style={styles.amountSection}>
                {/* 첫 번째 통화 */}
                <View style={styles.amountItem}>
                  <ThemedText style={styles.amountLabel}>
                    {(history.isKrwFirst !== false) ? '원화' : history.currencyName}
                  </ThemedText>
                  <ThemedText style={styles.amountValue}>
                    {(history.isKrwFirst !== false) 
                      ? `₩ ${formatNumber(history.krwAmount)}`
                      : `${getCurrencySymbol(history.currencyCode)} ${formatNumber(history.foreignAmount)}`
                    }
                  </ThemedText>
                </View>
                <View style={styles.exchangeIcon}>
                  <MaterialCommunityIcons name="arrow-right" size={24} color="#4CAF50" />
                </View>
                {/* 두 번째 통화 */}
                <View style={styles.amountItem}>
                  <ThemedText style={styles.amountLabel}>
                    {(history.isKrwFirst !== false) ? history.currencyName : '원화'}
                  </ThemedText>
                  <ThemedText style={styles.amountValue}>
                    {(history.isKrwFirst !== false) 
                      ? `${getCurrencySymbol(history.currencyCode)} ${formatNumber(history.foreignAmount)}`
                      : `₩ ${formatNumber(history.krwAmount)}`
                    }
                  </ThemedText>
                </View>
              </View>

              {/* 삭제 버튼 */}
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteHistory(history.id)}
              >
                <MaterialCommunityIcons name="delete-outline" size={18} color="#ff5252" />
                <ThemedText style={styles.deleteButtonText}>삭제</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 26,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  deleteAllButtonText: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '600',
    marginLeft: 4,
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    color: '#999',
  },
  loginButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyTextContainer: {
    marginLeft: 12,
  },
  currencyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  currencyCode: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  rateSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  rateLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2196F3',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  exchangeIcon: {
    marginHorizontal: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#ff5252',
    fontWeight: '600',
    marginLeft: 4,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  recordKrw: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 24,
  },
  recordForeign: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  recordRate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    textAlign: 'right',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  recordDate: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 2,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 15,
  },
  emptyRecordText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
}); 