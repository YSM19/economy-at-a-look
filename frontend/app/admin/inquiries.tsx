import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../../components/ToastProvider';
import { inquiryApi } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Inquiry {
  id: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
  title: string;
  content: string;
  type: string;
  typeDisplayName: string;
  status: string;
  statusDisplayName: string;
  adminResponse?: string;
  respondedAt?: string;
  respondedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

interface InquiryType {
  type: string;
  typeDisplayName: string;
}

interface InquiryStatus {
  status: string;
  statusDisplayName: string;
}

export default function AdminInquiriesScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const colorScheme = useColorScheme();
  
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiryTypes] = useState<InquiryType[]>([
    { type: 'SUGGESTION', typeDisplayName: '건의사항' },
    { type: 'BUG_REPORT', typeDisplayName: '버그 신고' },
    { type: 'FEATURE_REQUEST', typeDisplayName: '기능 요청' },
    { type: 'GENERAL_INQUIRY', typeDisplayName: '일반 문의' },
    { type: 'ACCOUNT_ISSUE', typeDisplayName: '계정 문제' },
    { type: 'TECHNICAL_ISSUE', typeDisplayName: '기술 문제' }
  ]);
  
  const [inquiryStatuses] = useState<InquiryStatus[]>([
    { status: 'PENDING', statusDisplayName: '대기중' },
    { status: 'IN_PROGRESS', statusDisplayName: '처리중' },
    { status: 'COMPLETED', statusDisplayName: '완료' },
    { status: 'REJECTED', statusDisplayName: '거절' }
  ]);
  
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // 모달 상태
  const [isResponseModalVisible, setIsResponseModalVisible] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  
  // 폼 상태
  const [responseData, setResponseData] = useState({
    status: 'PENDING',
    adminResponse: '',
    respondedBy: '',
  });

  useEffect(() => {
    loadInquiries();
  }, [currentPage, selectedType, selectedStatus]);

  const loadInquiries = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('로그인이 필요합니다.', 'error');
        router.push('/(tabs)/login');
        return;
      }

      const response = await inquiryApi.getAllInquiries(
        token,
        selectedType || undefined,
        selectedStatus || undefined,
        currentPage,
        20
      );
      
      if (response.data.success) {
        const newInquiries = response.data.data.content;
        if (currentPage === 0) {
          setInquiries(newInquiries);
        } else {
          setInquiries(prev => [...prev, ...newInquiries]);
        }
        setHasMore(!response.data.data.last);
      }
    } catch (error) {
      console.error('문의 목록 로드 오류:', error);
      showToast('문의 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedInquiry) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showToast('로그인이 필요합니다.', 'error');
        return;
      }

      const response = await inquiryApi.updateInquiryStatus(
        selectedInquiry.id,
        responseData,
        token
      );
      
      if (response.data.success) {
        showToast('문의 상태가 성공적으로 업데이트되었습니다.', 'success');
        setIsResponseModalVisible(false);
        resetForm();
        setCurrentPage(0);
        loadInquiries();
      }
    } catch (error) {
      console.error('문의 상태 업데이트 오류:', error);
      showToast('문의 상태 업데이트에 실패했습니다.', 'error');
    }
  };

  const openResponseModal = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setResponseData({
      status: inquiry.status,
      adminResponse: inquiry.adminResponse || '',
      respondedBy: inquiry.respondedBy || '',
    });
    setIsResponseModalVisible(true);
  };

  const resetForm = () => {
    setResponseData({
      status: 'PENDING',
      adminResponse: '',
      respondedBy: '',
    });
    setSelectedInquiry(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SUGGESTION': return '#007AFF';
      case 'BUG_REPORT': return '#FF3B30';
      case 'FEATURE_REQUEST': return '#FF9500';
      case 'GENERAL_INQUIRY': return '#4ECDC4';
      case 'ACCOUNT_ISSUE': return '#A29BFE';
      case 'TECHNICAL_ISSUE': return '#FF6B6B';
      default: return '#8E8E93';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#FF9500';
      case 'IN_PROGRESS': return '#007AFF';
      case 'COMPLETED': return '#34C759';
      case 'REJECTED': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>문의</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* 필터 */}
        <ThemedView style={styles.filterSection}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedType}
              onValueChange={setSelectedType}
              style={styles.picker}
            >
              <Picker.Item label="전체 유형" value="" />
              {inquiryTypes.map((type) => (
                <Picker.Item
                  key={type.type}
                  label={type.typeDisplayName}
                  value={type.type}
                />
              ))}
            </Picker>
          </View>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedStatus}
              onValueChange={setSelectedStatus}
              style={styles.picker}
            >
              <Picker.Item label="전체 상태" value="" />
              {inquiryStatuses.map((status) => (
                <Picker.Item
                  key={status.status}
                  label={status.statusDisplayName}
                  value={status.status}
                />
              ))}
            </Picker>
          </View>
        </ThemedView>

        {/* 문의 목록 */}
        <ThemedView style={styles.inquiriesSection}>
          {inquiries.map((inquiry) => (
            <View key={inquiry.id} style={styles.inquiryItem}>
              <View style={styles.inquiryHeader}>
                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(inquiry.type) }]}>
                  <ThemedText style={styles.typeText}>
                    {inquiry.typeDisplayName}
                  </ThemedText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inquiry.status) }]}>
                  <ThemedText style={styles.statusText}>
                    {inquiry.statusDisplayName}
                  </ThemedText>
                </View>
              </View>
              
              <ThemedText style={styles.inquiryTitle}>{inquiry.title}</ThemedText>
              <ThemedText style={styles.inquiryContent} numberOfLines={3}>
                {inquiry.content}
              </ThemedText>
              
              <View style={styles.inquiryInfo}>
                <ThemedText style={styles.inquiryInfoText}>
                  작성자: {inquiry.userName || '익명'} | 이메일: {inquiry.userEmail}
                </ThemedText>
                <ThemedText style={styles.inquiryInfoText}>
                  {new Date(inquiry.createdAt).toLocaleDateString()}
                </ThemedText>
              </View>
              
              {inquiry.adminResponse && (
                <View style={styles.responseSection}>
                  <ThemedText style={styles.responseTitle}>관리자 답변:</ThemedText>
                  <ThemedText style={styles.responseContent}>
                    {inquiry.adminResponse}
                  </ThemedText>
                  <ThemedText style={styles.responseInfo}>
                    {inquiry.respondedBy} | {inquiry.respondedAt ? new Date(inquiry.respondedAt).toLocaleDateString() : ''}
                  </ThemedText>
                </View>
              )}
              
              <TouchableOpacity
                style={styles.responseButton}
                onPress={() => openResponseModal(inquiry)}
              >
                <MaterialCommunityIcons name="reply" size={16} color="#007AFF" />
                <ThemedText style={styles.responseButtonText}>
                  {inquiry.adminResponse ? '답변 수정' : '답변 작성'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          ))}
          
          {hasMore && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => setCurrentPage(prev => prev + 1)}
              disabled={isLoading}
            >
              <ThemedText style={styles.loadMoreText}>
                {isLoading ? '로딩 중...' : '더 보기'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ScrollView>

      {/* 답변 모달 */}
      <Modal
        visible={isResponseModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsResponseModalVisible(false)}>
              <ThemedText style={styles.modalCancelButton}>취소</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>문의 답변</ThemedText>
            <TouchableOpacity onPress={handleUpdateStatus}>
              <ThemedText style={styles.modalSaveButton}>저장</ThemedText>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedInquiry && (
              <View style={styles.selectedInquirySection}>
                <ThemedText style={styles.selectedInquiryTitle}>
                  {selectedInquiry.title}
                </ThemedText>
                <ThemedText style={styles.selectedInquiryContent}>
                  {selectedInquiry.content}
                </ThemedText>
              </View>
            )}
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>상태</ThemedText>
              <View style={[styles.pickerContainer, {
                backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7'
              }]}>
                <Picker
                  selectedValue={responseData.status}
                  onValueChange={(value) => setResponseData(prev => ({ ...prev, status: value }))}
                  style={styles.picker}
                >
                  {inquiryStatuses.map((status) => (
                    <Picker.Item
                      key={status.status}
                      label={status.statusDisplayName}
                      value={status.status}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>담당자</ThemedText>
              <TextInput
                style={[styles.formInput, {
                  backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                value={responseData.respondedBy}
                onChangeText={(text) => setResponseData(prev => ({ ...prev, respondedBy: text }))}
                placeholder="담당자 이름을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>답변 내용</ThemedText>
              <TextInput
                style={[styles.formTextArea, {
                  backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                value={responseData.adminResponse}
                onChangeText={(text) => setResponseData(prev => ({ ...prev, adminResponse: text }))}
                placeholder="답변 내용을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  filterSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  pickerContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  inquiriesSection: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  inquiryItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  inquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  inquiryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inquiryContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  inquiryInfo: {
    marginBottom: 12,
  },
  inquiryInfoText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  responseSection: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  responseContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  responseInfo: {
    fontSize: 12,
    color: '#8E8E93',
  },
  responseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
  },
  responseButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#8E8E93',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  selectedInquirySection: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectedInquiryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedInquiryContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
  },
  formTextArea: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 120,
  },
}); 