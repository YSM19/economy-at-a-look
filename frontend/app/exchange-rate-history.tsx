import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, useColorScheme, Platform } from 'react-native';
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
  const [editingMemo, setEditingMemo] = useState<{ id: number, memo: string } | null>(null);
  const [isMemoModalVisible, setIsMemoModalVisible] = useState(false);
  const [editingExchangeRate, setEditingExchangeRate] = useState<{
    id: number;
    exchangeRate: string;
    krwAmount: string;
    foreignAmount: string;
    memo: string;
    currencyCode: string;
    currencyName: string;
  } | null>(null);
  const [isExchangeRateModalVisible, setIsExchangeRateModalVisible] = useState(false);
  
  const { showToast } = useToast();
  const colorScheme = useColorScheme();

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

  const openMemoEditModal = (historyId: number, currentMemo: string) => {
    setEditingMemo({ id: historyId, memo: currentMemo || '' });
    setIsMemoModalVisible(true);
  };

  const updateMemo = async () => {
    if (!editingMemo) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('로그인 토큰이 없습니다.', 'error');
        return;
      }

      const response = await exchangeRateHistoryApi.updateMemo(
        editingMemo.id, 
        editingMemo.memo, 
        token
      );

      if (response.data.success) {
        showToast('메모가 업데이트되었습니다.', 'success');
        setIsMemoModalVisible(false);
        setEditingMemo(null);
        loadExchangeRateHistory(); // 목록 새로고침
      } else {
        showToast(response.data.message || '메모 업데이트에 실패했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('메모 업데이트 실패:', error);
      if (error?.request) {
        showToast('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.', 'error');
      } else {
        showToast('메모 업데이트 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const openExchangeRateEditModal = (history: ExchangeRateHistory) => {
    setEditingExchangeRate({
      id: history.id,
      exchangeRate: history.exchangeRate.toString(),
      krwAmount: history.krwAmount.toString(),
      foreignAmount: history.foreignAmount.toString(),
      memo: history.memo || '',
      currencyCode: history.currencyCode,
      currencyName: history.currencyName,
    });
    setIsExchangeRateModalVisible(true);
  };

  const updateExchangeRate = async () => {
    if (!editingExchangeRate) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('로그인 토큰이 없습니다.', 'error');
        return;
      }

      const updateData = {
        exchangeRate: parseFloat(editingExchangeRate.exchangeRate),
        krwAmount: parseFloat(editingExchangeRate.krwAmount.replace(/,/g, '')),
        foreignAmount: parseFloat(editingExchangeRate.foreignAmount.replace(/,/g, '')),
        memo: editingExchangeRate.memo,
      };

      // 유효성 검사
      if (isNaN(updateData.exchangeRate) || updateData.exchangeRate <= 0) {
        showToast('유효한 환율을 입력해주세요.', 'error');
        return;
      }
      if (isNaN(updateData.krwAmount) || updateData.krwAmount <= 0) {
        showToast('유효한 원화 금액을 입력해주세요.', 'error');
        return;
      }
      if (isNaN(updateData.foreignAmount) || updateData.foreignAmount <= 0) {
        showToast('유효한 외화 금액을 입력해주세요.', 'error');
        return;
      }

      const response = await exchangeRateHistoryApi.updateExchangeRate(
        editingExchangeRate.id, 
        updateData, 
        token
      );

      if (response.data.success) {
        showToast('환율 정보가 업데이트되었습니다.', 'success');
        setIsExchangeRateModalVisible(false);
        setEditingExchangeRate(null);
        loadExchangeRateHistory(); // 목록 새로고침
      } else {
        showToast(response.data.message || '환율 정보 업데이트에 실패했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('환율 정보 업데이트 실패:', error);
      if (error?.request) {
        showToast('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.', 'error');
      } else {
        showToast('환율 정보 업데이트 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day} ${hours}:${minutes}`;
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
        <View style={[styles.header, { paddingTop: 80 }]}>
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
        <View style={[styles.header, { paddingTop: 80 }]}>
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
      <View style={[styles.header, { paddingTop: 80 }]}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="history" size={24} color="#4CAF50" />
          <ThemedText style={styles.title}>환율 저장 기록</ThemedText>
        </View>
        <View style={styles.headerRightButtons}>
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
                            {/* 상단 헤더 - 통화, 환율, 날짜, 버튼 */}
              <View style={styles.compactHeader}>
                {/* 왼쪽: 통화 정보 + 환율 */}
                <View style={styles.leftSection}>
                  <View style={styles.currencyRow}>
                    <MaterialCommunityIcons 
                      name={getCurrencyIcon(history.currencyCode)} 
                      size={18} 
                      color="#4CAF50" 
                    />
                    <ThemedText style={styles.currencyText}>
                      {history.currencyName} ({history.currencyCode})
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.rateText}>
                    1 {history.currencyCode} = {formatNumber(history.exchangeRate)}원
                  </ThemedText>
                </View>

                {/* 오른쪽: 날짜 + 버튼 */}
                <View style={styles.rightSection}>
                  <ThemedText style={styles.dateText} numberOfLines={1} ellipsizeMode="tail">
                    {formatDate(history.createdAt)}
                  </ThemedText>
                  <View style={styles.topRightButtons}>
                    <TouchableOpacity 
                      style={styles.editButtonTop}
                      onPress={() => openExchangeRateEditModal(history)}
                    >
                      <MaterialCommunityIcons name="pencil" size={14} color="#FF9800" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButtonTop}
                      onPress={() => deleteHistory(history.id)}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={14} color="#ff5252" />
                    </TouchableOpacity>
                  </View>
                </View>
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

                            {/* 메모 섹션 (인라인) */}
              {history.memo && (
                <View style={styles.memoRow}>
                  <MaterialCommunityIcons name="note-text-outline" size={14} color="#999" />
                  <ThemedText style={styles.memoText} numberOfLines={2} ellipsizeMode="tail">
                    {history.memo}
                  </ThemedText>
                </View>
              )}


            </View>
          ))}
        </ScrollView>
      )}

      {/* 메모 편집 모달 */}
      <Modal
        visible={isMemoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsMemoModalVisible(false);
          setEditingMemo(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff' }]}>
            <ThemedText style={styles.modalTitle}>메모 편집</ThemedText>
            <ThemedText style={styles.modalSubtitle}>환율 저장 기록에 대한 메모를 편집하세요</ThemedText>
            
            <TextInput
              style={[
                styles.memoInput,
                { 
                  borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }
              ]}
              placeholder="메모를 입력하세요 (최대 200자)"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
              value={editingMemo?.memo || ''}
              onChangeText={(text) => setEditingMemo(prev => prev ? { ...prev, memo: text } : null)}
              autoFocus={true}
              maxLength={200}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsMemoModalVisible(false);
                  setEditingMemo(null);
                }}
              >
                <ThemedText style={styles.cancelButtonText}>취소</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={updateMemo}
              >
                <ThemedText style={styles.confirmButtonText}>저장</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 환율 편집 모달 */}
      <Modal
        visible={isExchangeRateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsExchangeRateModalVisible(false);
          setEditingExchangeRate(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff' }]}>
            <ThemedText style={styles.modalTitle}>환율 정보 편집</ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              {editingExchangeRate?.currencyName} ({editingExchangeRate?.currencyCode}) 정보를 수정하세요
            </ThemedText>
            
            {/* 환율 입력 */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>환율</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }
                ]}
                placeholder="환율을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                value={editingExchangeRate?.exchangeRate || ''}
                onChangeText={(text) => setEditingExchangeRate(prev => prev ? { ...prev, exchangeRate: text } : null)}
                keyboardType="numeric"
              />
            </View>

            {/* 원화 금액 입력 */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>원화 금액 (₩)</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }
                ]}
                placeholder="원화 금액을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                value={editingExchangeRate?.krwAmount || ''}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9.]/g, '');
                  setEditingExchangeRate(prev => prev ? { ...prev, krwAmount: numericText } : null);
                }}
                keyboardType="numeric"
              />
            </View>

            {/* 외화 금액 입력 */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                외화 금액 ({getCurrencySymbol(editingExchangeRate?.currencyCode || '')})
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }
                ]}
                placeholder="외화 금액을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                value={editingExchangeRate?.foreignAmount || ''}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9.]/g, '');
                  setEditingExchangeRate(prev => prev ? { ...prev, foreignAmount: numericText } : null);
                }}
                keyboardType="numeric"
              />
            </View>

            {/* 메모 입력 */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>메모 (선택사항)</ThemedText>
              <TextInput
                style={[
                  styles.memoInput,
                  { 
                    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }
                ]}
                placeholder="메모를 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                value={editingExchangeRate?.memo || ''}
                onChangeText={(text) => setEditingExchangeRate(prev => prev ? { ...prev, memo: text } : null)}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={200}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsExchangeRateModalVisible(false);
                  setEditingExchangeRate(null);
                }}
              >
                <ThemedText style={styles.cancelButtonText}>취소</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={updateExchangeRate}
              >
                <ThemedText style={styles.confirmButtonText}>저장</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    marginLeft: 12,
    textAlign: 'left',
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
    padding: 6,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftSection: {
    flex: 1,
    marginRight: 12,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  rateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  topRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  editButtonTop: {
    padding: 3,
    borderRadius: 10,
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ffcc02',
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
    textAlign: 'right',
    marginBottom: 4,
  },
  deleteButtonTop: {
    padding: 3,
    borderRadius: 10,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffebee',
  },

  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  exchangeIcon: {
    marginHorizontal: 16,
  },
  memoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  memoText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 22,
    marginLeft: 6,
    flex: 1,
  },
  // 메모 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: Platform.OS === 'web' ? 400 : '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
  memoInput: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
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