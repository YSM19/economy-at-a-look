import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
// 사이드바 기능 비활성화
// import { Sidebar } from '../../components/Sidebar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminApi } from '../../services/api';

interface Report {
  id: number;
  targetType: 'post' | 'comment';
  targetId: number;
  targetTitle: string;
  targetContent: string;
  targetAuthor: string;
  reason: string;
  reasonText: string;
  details: string;
  reportedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export default function AdminReportsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  // 사이드바 기능 비활성화
  // const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isAdmin, setIsAdmin] = useState(false);





  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadReports();
    }
  }, [isAdmin, filterStatus]);



  const checkAdminStatus = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        if (userInfo.role !== 'ADMIN') {
          Alert.alert('접근 권한 없음', '관리자만 접근할 수 있습니다.', [
            { text: '확인', onPress: () => router.back() }
          ]);
          return;
        }
        setIsAdmin(true);
      } else {
        router.push('/login' as any);
      }
    } catch (error) {
      console.error('관리자 권한 확인 오류:', error);
      router.back();
    }
  };

  const loadReports = async () => {
    try {
      console.log('loadReports 시작');
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('토큰 없음');
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const params: any = {
        page: 0,
        size: 50,
        status: filterStatus === 'all' ? undefined : filterStatus,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      console.log('API 호출 파라미터:', params);
      const response = await adminApi.getReportManagementList(params, token);
      console.log('API 응답:', response.data);
      
      if (response.data?.success) {
        const backendReports = response.data.data?.reports || [];
        console.log('백엔드 신고 목록:', backendReports);
        
        const convertedReports: Report[] = backendReports.map((backendReport: any) => ({
          id: backendReport.id,
          targetType: backendReport.targetType?.toLowerCase() || 'post',
          targetId: backendReport.targetId,
          targetTitle: backendReport.targetTitle || '제목 없음',
          targetContent: backendReport.targetContent || '내용 없음',
          targetAuthor: backendReport.targetAuthor || '알 수 없음',
          reason: backendReport.reason?.toLowerCase() || 'other',
          reasonText: backendReport.reasonText || '기타',
          details: backendReport.details || '',
          reportedBy: backendReport.reportedBy || '알 수 없음',
          status: backendReport.status?.toLowerCase() || 'pending',
          createdAt: backendReport.createdAt,
          reviewedAt: backendReport.reviewedAt,
          reviewedBy: backendReport.reviewedBy || '',
          reviewNote: backendReport.reviewNote || ''
        }));
        
        console.log('변환된 신고 목록:', convertedReports);
        setReports(convertedReports);
      } else {
        console.log('API 응답 실패:', response.data);
        Alert.alert('오류', response.data?.message || '신고 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('신고 목록 로딩 오류:', error);
      Alert.alert('오류', '신고 목록을 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleReportAction = async (reportId: number, action: 'approve' | 'reject', note: string = '') => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      let response;
      if (action === 'approve') {
        response = await adminApi.approveReport(reportId, { reviewNote: note }, token);
      } else {
        response = await adminApi.rejectReport(reportId, { reviewNote: note }, token);
      }

      if (response.data?.success) {
        Alert.alert(
          '처리 완료',
          response.data.message || `신고가 ${action === 'approve' ? '승인' : '반려'}되었습니다.`
        );
        
        // 목록 새로고침
        await loadReports();
        
        setIsDetailModalVisible(false);
        setSelectedReport(null);
      } else {
        Alert.alert('오류', response.data?.message || '신고 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('신고 처리 오류:', error);
      Alert.alert('오류', '신고 처리 중 오류가 발생했습니다.');
    }
  };

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    console.log('actionModalVisible 상태 변경:', actionModalVisible);
  }, [actionModalVisible]);

  const showActionDialog = (report: Report) => {
    console.log('showActionDialog 호출됨:', report);
    setSelectedReport(report);
    setActionModalVisible(true);
    console.log('actionModalVisible 설정됨:', true);
  };

  const handleActionConfirm = () => {
    if (selectedReport && selectedAction) {
      handleReportAction(selectedReport.id, selectedAction, actionNote);
      setActionModalVisible(false);
      setSelectedAction(null);
      setActionNote('');
    }
  };

  const handleActionCancel = () => {
    setActionModalVisible(false);
    setSelectedAction(null);
    setActionNote('');
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'approved':
        return '#FF3B30';
      case 'rejected':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '반려됨';
      default:
        return '알 수 없음';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'spam':
        return 'alert-circle';
      case 'harassment':
        return 'account-remove';
      case 'inappropriate':
        return 'eye-off';
      case 'misinformation':
        return 'information-off';
      case 'copyright':
        return 'copyright';
      case 'personal_info':
        return 'shield-alert';
      default:
        return 'dots-horizontal';
    }
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

  const filteredReports = reports.filter(report => 
    filterStatus === 'all' || report.status === filterStatus
  );

  if (!isAdmin) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ThemedText>권한 확인 중...</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 */}
        <View style={[styles.header, {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }]}>
          {/* 사이드바 기능 비활성화
          <TouchableOpacity onPress={() => setIsSidebarVisible(true)} style={styles.hamburgerButton}>
            <MaterialCommunityIcons 
              name="menu" 
              size={24} 
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
            />
          </TouchableOpacity>
          */}
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="flag" size={24} color="#FF3B30" />
            <View style={styles.headerText}>
              <ThemedText style={styles.title}>신고 관리</ThemedText>
              <ThemedText style={styles.subtitle}>
                총 {filteredReports.length}개의 신고
              </ThemedText>
            </View>
          </View>
        </View>
        
        {/* 사이드바 기능 비활성화
        <Sidebar 
          isVisible={isSidebarVisible} 
          onClose={() => setIsSidebarVisible(false)} 
        />
        */}

        {/* 필터 탭 */}
        <View style={[styles.filterContainer, {
          backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterTabs}>
              {[
                { key: 'all', label: '전체', count: reports.length },
                { key: 'pending', label: '대기중', count: reports.filter(r => r.status === 'pending').length },
                { key: 'approved', label: '승인됨', count: reports.filter(r => r.status === 'approved').length },
                { key: 'rejected', label: '반려됨', count: reports.filter(r => r.status === 'rejected').length }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.filterTab, {
                    backgroundColor: filterStatus === tab.key 
                      ? '#FF3B30' 
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)')
                  }]}
                  onPress={() => setFilterStatus(tab.key as any)}
                >
                  <ThemedText style={[styles.filterTabText, {
                    color: filterStatus === tab.key ? '#ffffff' : undefined
                  }]}>
                    {tab.label} ({tab.count})
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 신고 목록 */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ThemedText>로딩 중...</ThemedText>
            </View>
          ) : filteredReports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="flag-checkered" 
                size={64} 
                color={colorScheme === 'dark' ? '#8e8e93' : '#c7c7cc'} 
              />
              <ThemedText style={styles.emptyText}>신고가 없습니다</ThemedText>
              <ThemedText style={styles.emptySubText}>
                {filterStatus === 'all' ? '아직 신고된 내용이 없습니다' : `${getStatusText(filterStatus as any)} 상태의 신고가 없습니다`}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.reportList}>
              {filteredReports.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={[styles.reportCard, {
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                  }]}
                  onPress={() => {
                    console.log('신고 카드 클릭됨:', report);
                    setSelectedReport(report);
                    setIsDetailModalVisible(true);
                  }}
                >
                  <View style={styles.reportHeader}>
                    <View style={styles.reportInfo}>
                      <View style={[styles.reasonIcon, { backgroundColor: `${getStatusColor(report.status)}15` }]}>
                        <MaterialCommunityIcons 
                          name={getReasonIcon(report.reason)} 
                          size={20} 
                          color={getStatusColor(report.status)} 
                        />
                      </View>
                      <View style={styles.reportMeta}>
                        <ThemedText style={styles.reportTitle} numberOfLines={1}>
                          {report.targetTitle}
                        </ThemedText>
                        <ThemedText style={styles.reportReason}>
                          {report.reasonText}
                        </ThemedText>
                      </View>
                    </View>
                    
                    <View style={styles.reportStatus}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                        <ThemedText style={styles.statusText}>
                          {getStatusText(report.status)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <ThemedText style={styles.reportContent} numberOfLines={2}>
                    {report.targetContent}
                  </ThemedText>

                  <View style={styles.reportFooter}>
                    <ThemedText style={styles.reportDate}>
                      {formatDate(report.createdAt)}
                    </ThemedText>
                    <ThemedText style={styles.reportBy}>
                      신고자: {report.reportedBy}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* 신고 상세 모달 */}
        <Modal
          visible={isDetailModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, {
              backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff'
            }]}>
              {selectedReport && (
                <>
                  <View style={[styles.modalHeader, {
                    borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                  }]}>
                    <ThemedText style={styles.modalTitle}>신고 상세 정보</ThemedText>
                    <TouchableOpacity onPress={() => setIsDetailModalVisible(false)}>
                      <MaterialCommunityIcons 
                        name="close" 
                        size={24} 
                        color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
                      />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalContent}>
                    <View style={styles.detailSection}>
                      <ThemedText style={styles.detailLabel}>신고 대상</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {selectedReport.targetType === 'post' ? '게시글' : '댓글'}: {selectedReport.targetTitle}
                      </ThemedText>
                    </View>

                    <View style={styles.detailSection}>
                      <ThemedText style={styles.detailLabel}>신고 내용</ThemedText>
                      <ThemedText style={styles.detailValue}>{selectedReport.targetContent}</ThemedText>
                    </View>

                    <View style={styles.detailSection}>
                      <ThemedText style={styles.detailLabel}>신고 이유</ThemedText>
                      <ThemedText style={styles.detailValue}>{selectedReport.reasonText}</ThemedText>
                    </View>

                    {selectedReport.details && (
                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>상세 설명</ThemedText>
                        <ThemedText style={styles.detailValue}>{selectedReport.details}</ThemedText>
                      </View>
                    )}

                    <View style={styles.detailSection}>
                      <ThemedText style={styles.detailLabel}>작성자</ThemedText>
                      <ThemedText style={styles.detailValue}>{selectedReport.targetAuthor}</ThemedText>
                    </View>

                    <View style={styles.detailSection}>
                      <ThemedText style={styles.detailLabel}>신고자</ThemedText>
                      <ThemedText style={styles.detailValue}>{selectedReport.reportedBy}</ThemedText>
                    </View>

                    <View style={styles.detailSection}>
                      <ThemedText style={styles.detailLabel}>신고 일시</ThemedText>
                      <ThemedText style={styles.detailValue}>{formatDate(selectedReport.createdAt)}</ThemedText>
                    </View>

                    {selectedReport.reviewedAt && (
                      <>
                        <View style={styles.detailSection}>
                          <ThemedText style={styles.detailLabel}>처리 일시</ThemedText>
                          <ThemedText style={styles.detailValue}>{formatDate(selectedReport.reviewedAt)}</ThemedText>
                        </View>

                        <View style={styles.detailSection}>
                          <ThemedText style={styles.detailLabel}>처리자</ThemedText>
                          <ThemedText style={styles.detailValue}>{selectedReport.reviewedBy}</ThemedText>
                        </View>

                        {selectedReport.reviewNote && (
                          <View style={styles.detailSection}>
                            <ThemedText style={styles.detailLabel}>처리 사유</ThemedText>
                            <ThemedText style={styles.detailValue}>{selectedReport.reviewNote}</ThemedText>
                          </View>
                        )}
                      </>
                    )}
                  </ScrollView>

                  <View style={[styles.modalFooter, {
                    borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                  }]}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => {
                        console.log('조치 취하기 버튼 클릭됨');
                        console.log('selectedReport:', selectedReport);
                        console.log('selectedReport.status:', selectedReport?.status);
                        showActionDialog(selectedReport);
                      }}
                    >
                      <ThemedText style={styles.actionButtonText}>
                        조치 취하기 (상태: {selectedReport?.status || 'unknown'})
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* 액션 선택 모달 */}
        <Modal
          visible={actionModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleActionCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, {
              backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
              height: '60%'
            }]}>
              <View style={[styles.modalHeader, {
                borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }]}>
                <ThemedText style={styles.modalTitle}>신고 처리</ThemedText>
                <TouchableOpacity onPress={handleActionCancel}>
                  <MaterialCommunityIcons 
                    name="close" 
                    size={24} 
                    color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <ThemedText style={styles.actionLabel}>처리 방식을 선택해주세요</ThemedText>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionOption, selectedAction === 'approve' && styles.selectedAction]}
                    onPress={() => setSelectedAction('approve')}
                  >
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={24} 
                      color={selectedAction === 'approve' ? '#ffffff' : '#FF3B30'} 
                    />
                    <ThemedText style={[styles.actionOptionText, selectedAction === 'approve' && styles.selectedActionText]}>
                      승인
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionOption, selectedAction === 'reject' && styles.selectedAction]}
                    onPress={() => setSelectedAction('reject')}
                  >
                    <MaterialCommunityIcons 
                      name="close-circle" 
                      size={24} 
                      color={selectedAction === 'reject' ? '#ffffff' : '#34C759'} 
                    />
                    <ThemedText style={[styles.actionOptionText, selectedAction === 'reject' && styles.selectedActionText]}>
                      반려
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {selectedAction && (
                  <View style={styles.noteSection}>
                    <ThemedText style={styles.noteLabel}>
                      {selectedAction === 'approve' ? '승인' : '반려'} 사유 (선택사항)
                    </ThemedText>
                    <TextInput
                      style={[styles.noteInput, {
                        backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f8f9fa',
                        color: colorScheme === 'dark' ? '#ffffff' : '#000000',
                        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }]}
                      placeholder="처리 사유를 입력해주세요"
                      placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                      value={actionNote}
                      onChangeText={setActionNote}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}
              </View>

              <View style={[styles.modalFooter, {
                borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }]}>
                <View style={styles.footerButtons}>
                  <TouchableOpacity
                    style={[styles.footerButton, styles.cancelButton]}
                    onPress={handleActionCancel}
                  >
                    <ThemedText style={styles.cancelButtonText}>취소</ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.footerButton, styles.confirmButton, !selectedAction && styles.disabledButton]}
                    onPress={handleActionConfirm}
                    disabled={!selectedAction}
                  >
                    <ThemedText style={styles.confirmButtonText}>확인</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  hamburgerButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  filterContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  reportList: {
    padding: 16,
    gap: 12,
  },
  reportCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportMeta: {
    marginLeft: 12,
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reportReason: {
    fontSize: 14,
    opacity: 0.7,
  },
  reportStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  reportContent: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 12,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  reportBy: {
    fontSize: 12,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minWidth: 120,
    justifyContent: 'center',
  },
  selectedAction: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  actionOptionText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedActionText: {
    color: '#ffffff',
  },
  noteSection: {
    marginBottom: 20,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
}); 