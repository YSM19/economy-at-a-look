import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminApi } from '../../services/api';

interface Post {
  id: number;
  title: string;
  content: string;
  boardType: string;
  author: string;
  authorEmail: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isDeleted: boolean;
  tags: string[];
}

interface Comment {
  id: number;
  content: string;
  author: string;
  authorEmail: string;
  postId: number;
  postTitle: string;
  createdAt: string;
  likeCount: number;
  isDeleted: boolean;
}

interface CommunityStats {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  todayPosts: number;
  todayComments: number;
  deletedPosts: number;
  deletedComments: number;
  boardStats: BoardStat[];
}

interface BoardStat {
  boardType: string;
  boardName: string;
  postCount: number;
  commentCount: number;
  todayPosts: number;
  todayComments: number;
}

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

export default function AdminCommunityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();

  
  const [activeTab, setActiveTab] = useState<'stats' | 'posts' | 'comments' | 'reports' | 'users'>('stats');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  
  // 통계 데이터
  const [stats, setStats] = useState<CommunityStats | null>(null);
  
  // 게시글 관리
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [postSearchKeyword, setPostSearchKeyword] = useState('');
  const [postBoardType, setPostBoardType] = useState<string>('');
  const [postShowDeleted, setPostShowDeleted] = useState(false);
  
  // 댓글 관리
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedComments, setSelectedComments] = useState<number[]>([]);
  const [commentSearchKeyword, setCommentSearchKeyword] = useState('');
  const [commentShowDeleted, setCommentShowDeleted] = useState(false);

  // 사용자 관리
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userSearchKeyword, setUserSearchKeyword] = useState('');
  const [showSuspendedUsers, setShowSuspendedUsers] = useState(false);
  
  // 신고 관리
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [reportFilterStatus, setReportFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // 모달 상태
  const [isBulkActionModalVisible, setIsBulkActionModalVisible] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'posts' | 'comments'>('posts');
  const [bulkAction, setBulkAction] = useState<'delete' | 'restore'>('delete');
  const [bulkActionReason, setBulkActionReason] = useState('');
  
  // 신고 승인 확인 모달
  const [isApproveConfirmModalVisible, setIsApproveConfirmModalVisible] = useState(false);
  const [selectedReportForApproval, setSelectedReportForApproval] = useState<Report | null>(null);
  const [approveReviewNote, setApproveReviewNote] = useState('');

  // 사용자 정지 모달
  const [isSuspendModalVisible, setIsSuspendModalVisible] = useState(false);
  const [selectedUserForSuspension, setSelectedUserForSuspension] = useState<any>(null);
  const [suspensionDays, setSuspensionDays] = useState(1);
  const [suspensionReason, setSuspensionReason] = useState('');

  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn, activeTab, reportFilterStatus]);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      
      if (token && userInfoStr) {
        const user = JSON.parse(userInfoStr);
        // TODO: 실제 관리자 권한 확인
        if (user.role === 'ADMIN' || user.email === 'admin@example.com') {
          setIsLoggedIn(true);
          setUserInfo(user);
        } else {
          Alert.alert('권한 없음', '관리자 권한이 필요합니다.');
          router.back();
        }
      } else {
        Alert.alert('로그인 필요', '관리자 로그인이 필요합니다.');
        router.back();
      }
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
      Alert.alert('오류', '로그인 상태를 확인할 수 없습니다.');
      router.back();
    }
  };

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('토큰이 없습니다.');
        return;
      }

      console.log('현재 활성 탭:', activeTab);
      
      if (activeTab === 'stats') {
        await loadStats(token);
      } else if (activeTab === 'posts') {
        await loadPosts(token);
      } else if (activeTab === 'comments') {
        await loadComments(token);
      } else if (activeTab === 'reports') {
        await loadReports(token);
      } else if (activeTab === 'users') {
        await loadUsers(token, showSuspendedUsers);
      }
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
      Alert.alert('오류', '데이터를 불러올 수 없습니다.');
    }
  };

  const loadStats = async (token: string) => {
    const response = await adminApi.getCommunityStats(token);
    if (response.data?.success) {
      setStats(response.data.data);
    }
  };

  const loadPosts = async (token: string, showDeleted?: boolean) => {
    try {
      const params: any = {
        page: 0,
        size: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      if (postSearchKeyword) params.keyword = postSearchKeyword;
      if (postBoardType) params.boardType = postBoardType;
      
      // 삭제된 게시글 표시 옵션에 따른 처리
      const shouldShowDeleted = showDeleted !== undefined ? showDeleted : postShowDeleted;
      if (shouldShowDeleted) {
        // 삭제된 게시글도 포함하여 모든 게시글 조회 (isDeleted 파라미터 전송하지 않음)
        console.log('모든 게시글 조회 (삭제된 것 포함)');
      } else {
        // 삭제되지 않은 게시글만 조회
        params.isDeleted = false;
        console.log('삭제되지 않은 게시글만 조회');
      }

      console.log('게시글 관리 API 호출 파라미터:', params);
      console.log('postShowDeleted 상태:', postShowDeleted);
      console.log('isDeleted 파라미터:', params.isDeleted);
      const response = await adminApi.getPostManagementList(params, token);
      console.log('게시글 관리 API 응답:', response.data);
      
      if (response.data?.success) {
        const postsData = response.data.data.posts;
        console.log('받은 게시글 수:', postsData.length);
        console.log('게시글 목록:', postsData.map((post: any) => ({ 
          id: post.id, 
          title: post.title, 
          isDeleted: post.isDeleted,
          author: post.author,
          createdAt: post.createdAt
        })));
        setPosts(postsData);
      } else {
        console.error('게시글 관리 API 응답 실패:', response.data);
        Alert.alert('오류', response.data?.message || '게시글 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('게시글 관리 API 호출 에러:', error);
      Alert.alert('오류', '게시글 목록을 불러올 수 없습니다.');
    }
  };

  const loadComments = async (token: string, showDeleted?: boolean) => {
    try {
      const params: any = {
        page: 0,
        size: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      if (commentSearchKeyword) params.keyword = commentSearchKeyword;
      
      // 삭제된 댓글 표시 옵션에 따른 처리
      const shouldShowDeleted = showDeleted !== undefined ? showDeleted : commentShowDeleted;
      if (shouldShowDeleted) {
        // 삭제된 댓글도 포함하여 모든 댓글 조회 (isDeleted 파라미터 전송하지 않음)
        console.log('모든 댓글 조회 (삭제된 것 포함)');
      } else {
        // 삭제되지 않은 댓글만 조회
        params.isDeleted = false;
        console.log('삭제되지 않은 댓글만 조회');
      }

      console.log('댓글 관리 API 호출 파라미터:', params);
      console.log('commentShowDeleted 상태:', commentShowDeleted);
      console.log('isDeleted 파라미터:', params.isDeleted);
      const response = await adminApi.getCommentManagementList(params, token);
      console.log('댓글 관리 API 응답:', response.data);
      
      if (response.data?.success) {
        const commentsData = response.data.data.comments;
        console.log('받은 댓글 수:', commentsData.length);
        console.log('댓글 목록:', commentsData.map((comment: any) => ({ id: comment.id, content: comment.content, isDeleted: comment.isDeleted })));
        setComments(commentsData);
      } else {
        console.error('댓글 관리 API 응답 실패:', response.data);
        Alert.alert('오류', response.data?.message || '댓글 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('댓글 관리 API 호출 에러:', error);
      Alert.alert('오류', '댓글 목록을 불러올 수 없습니다.');
    }
  };

  const loadReports = async (token: string) => {
    try {
      const params: any = {
        page: 0,
        size: 50,
        status: reportFilterStatus === 'all' ? undefined : reportFilterStatus,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      const response = await adminApi.getReportManagementList(params, token);
      console.log('신고 목록 응답:', response.data);
      
      if (response.data?.success) {
        // 백엔드 응답 구조에 맞게 데이터 변환
        const backendReports = response.data.data?.reports || [];
        const convertedReports: Report[] = backendReports.map((backendReport: any) => ({
          id: backendReport.id,
          targetType: backendReport.targetType?.toLowerCase() || 'post',
          targetId: backendReport.targetId,
          targetTitle: backendReport.targetInfo?.title || backendReport.targetInfo?.content || '제목 없음',
          targetContent: backendReport.targetInfo?.content || '내용 없음',
          targetAuthor: backendReport.targetInfo?.authorUsername || '알 수 없음',
          reason: backendReport.reason?.toLowerCase() || 'other',
          reasonText: backendReport.reasonText || '기타',
          details: backendReport.details || '',
          reportedBy: backendReport.reporter?.username || '알 수 없음',
          status: backendReport.status?.toLowerCase() || 'pending',
          createdAt: backendReport.createdAt,
          reviewedAt: backendReport.reviewedAt,
          reviewedBy: backendReport.reviewer?.username || '',
          reviewNote: backendReport.reviewNote || ''
        }));
        
        console.log('변환된 신고 목록:', convertedReports);
        setReports(convertedReports);
      } else {
        Alert.alert('오류', response.data?.message || '신고 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('신고 목록 로드 에러:', error);
      Alert.alert('오류', '신고 목록을 불러올 수 없습니다.');
    }
  };

  const loadUsers = async (token: string, showSuspended?: boolean) => {
    try {
      const params: any = {
        page: 0,
        size: 50,
        keyword: userSearchKeyword || undefined,
      };

      console.log('사용자 관리 API 호출 파라미터:', params);
      console.log('showSuspended 상태:', showSuspended);
      
      let response;
      if (showSuspended) {
        response = await adminApi.getSuspendedUserList(params, token);
      } else {
        response = await adminApi.getUserList(params, token);
      }
      
      console.log('사용자 관리 API 응답:', response.data);
      
      if (response.data?.success) {
        const usersData = response.data.data.content || response.data.data;
        console.log('받은 사용자 수:', usersData.length);
        console.log('사용자 데이터:', usersData.map((user: any) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isSuspended: user.isSuspended
        })));
        setUsers(usersData);
      } else {
        console.error('사용자 관리 API 응답 실패:', response.data);
        Alert.alert('오류', response.data?.message || '사용자 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('사용자 관리 API 호출 에러:', error);
      Alert.alert('오류', '사용자 목록을 불러올 수 없습니다.');
    }
  };

  // 신고 승인
  const handleApproveReport = async (reportId: number, reviewNote: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await adminApi.approveReport(reportId, { reviewNote }, token);
      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '신고가 승인되었습니다.');
        loadData();
      } else {
        Alert.alert('오류', response.data?.message || '신고 승인에 실패했습니다.');
      }
    } catch (error) {
      console.error('신고 승인 에러:', error);
      Alert.alert('오류', '신고 승인에 실패했습니다.');
    }
  };

  // 신고 승인 확인 모달 열기
  const openApproveConfirmModal = (report: Report) => {
    setSelectedReportForApproval(report);
    setApproveReviewNote('');
    setIsApproveConfirmModalVisible(true);
  };

  // 신고 승인 실행
  const executeApproveReport = async () => {
    if (!selectedReportForApproval) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      const response = await adminApi.approveReport(selectedReportForApproval.id, { reviewNote: approveReviewNote }, token);
      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '신고가 승인되었습니다.');
        setIsApproveConfirmModalVisible(false);
        setSelectedReportForApproval(null);
        setApproveReviewNote('');
        loadData();
      } else {
        Alert.alert('오류', response.data?.message || '신고 승인에 실패했습니다.');
      }
    } catch (error) {
      console.error('신고 승인 에러:', error);
      Alert.alert('오류', '신고 승인에 실패했습니다.');
    }
  };

  // 신고 반려
  const handleRejectReport = async (reportId: number, reviewNote: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await adminApi.rejectReport(reportId, { reviewNote }, token);
      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '신고가 반려되었습니다.');
        loadData();
      } else {
        Alert.alert('오류', response.data?.message || '신고 반려에 실패했습니다.');
      }
    } catch (error) {
      console.error('신고 반려 에러:', error);
      Alert.alert('오류', '신고 반려에 실패했습니다.');
    }
  };

  const handleBulkAction = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const selectedIds = bulkActionType === 'posts' ? selectedPosts : selectedComments;
      
      if (selectedIds.length === 0) {
        Alert.alert('알림', '선택된 항목이 없습니다.');
        return;
      }

      const data = {
        ids: selectedIds,
        action: bulkAction,
        reason: bulkActionReason
      };

      let response;
      if (bulkActionType === 'posts') {
        if (bulkAction === 'delete') {
          response = await adminApi.bulkDeletePosts(data, token);
        } else {
          response = await adminApi.bulkRestorePosts(data, token);
        }
      } else {
        if (bulkAction === 'delete') {
          response = await adminApi.bulkDeleteComments(data, token);
        } else {
          response = await adminApi.bulkRestoreComments(data, token);
        }
      }

      if (response.data?.success) {
        Alert.alert('성공', response.data.message || '작업이 완료되었습니다.');
        setIsBulkActionModalVisible(false);
        setBulkActionReason('');
        setSelectedPosts([]);
        setSelectedComments([]);
        await loadData();
      }
    } catch (error) {
      console.error('일괄 작업 오류:', error);
      Alert.alert('오류', '작업 중 오류가 발생했습니다.');
    }
  };

  const togglePostSelection = (postId: number) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const toggleCommentSelection = (commentId: number) => {
    setSelectedComments(prev => 
      prev.includes(commentId) 
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    );
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };



  const handleUnsuspendUser = async (userId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      const response = await adminApi.unsuspendUser({
        userId
      }, token);
      
      if (response.data?.success) {
        Alert.alert('성공', '사용자 정지가 해제되었습니다.');
        loadData();
      } else {
        Alert.alert('오류', response.data?.message || '사용자 정지 해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 정지 해제 에러:', error);
      Alert.alert('오류', '사용자 정지 해제에 실패했습니다.');
    }
  };

  const openSuspendModal = (user: any) => {
    setSelectedUserForSuspension(user);
    setSuspensionDays(1);
    setSuspensionReason('');
    setIsSuspendModalVisible(true);
  };

  const executeSuspendUser = async () => {
    if (!selectedUserForSuspension) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      const response = await adminApi.suspendUser({
        userId: selectedUserForSuspension.id,
        suspensionDays: suspensionDays,
        reason: suspensionReason || '관리자 정지'
      }, token);
      
      if (response.data?.success) {
        Alert.alert('성공', '사용자가 정지되었습니다.');
        setIsSuspendModalVisible(false);
        setSelectedUserForSuspension(null);
        setSuspensionDays(1);
        setSuspensionReason('');
        loadData();
      } else {
        Alert.alert('오류', response.data?.message || '사용자 정지에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 정지 에러:', error);
      Alert.alert('오류', '사용자 정지에 실패했습니다.');
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

  const getBoardName = (boardType: string) => {
    const boardNames: { [key: string]: string } = {
      'FREE': '자유게시판',
      'INVESTMENT': '투자 정보 공유',
      'QNA': '질문 & 답변',
      'NEWS': '경제 뉴스 토론',
      'SUGGESTION': '건의 및 문의'
    };
    return boardNames[boardType] || boardType;
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'approved': return '#FF3B30';
      case 'rejected': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: Report['status']) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '승인됨';
      case 'rejected': return '반려됨';
      default: return '알 수 없음';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'spam': return '🚫';
      case 'harassment': return '😠';
      case 'misinformation': return '❌';
      case 'inappropriate': return '⚠️';
      default: return '🚨';
    }
  };

  if (!isLoggedIn) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ThemedText>관리자 권한을 확인하는 중...</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        title: '커뮤니티 관리',
        headerShown: false
      }} />
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 */}
        <View style={[styles.header, {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
            />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>커뮤니티 관리</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        


        {/* 탭 네비게이션 */}
        <View style={[styles.tabContainer, {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
            onPress={() => setActiveTab('stats')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
              통계
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
              게시글 관리
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
            onPress={() => setActiveTab('comments')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
              댓글 관리
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
            onPress={() => setActiveTab('reports')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
              신고 관리
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              회원 관리
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* 통계 탭 */}
          {activeTab === 'stats' && stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff' }]}>
                  <ThemedText style={styles.statNumber}>{stats.totalPosts}</ThemedText>
                  <ThemedText style={styles.statLabel}>전체 게시글</ThemedText>
                </View>
                <View style={[styles.statCard, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff' }]}>
                  <ThemedText style={styles.statNumber}>{stats.totalComments}</ThemedText>
                  <ThemedText style={styles.statLabel}>전체 댓글</ThemedText>
                </View>
                <View style={[styles.statCard, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff' }]}>
                  <ThemedText style={styles.statNumber}>{stats.totalUsers}</ThemedText>
                  <ThemedText style={styles.statLabel}>전체 사용자</ThemedText>
                </View>
                <View style={[styles.statCard, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff' }]}>
                  <ThemedText style={styles.statNumber}>{stats.todayPosts}</ThemedText>
                  <ThemedText style={styles.statLabel}>오늘 게시글</ThemedText>
                </View>
              </View>

              <View style={styles.boardStatsContainer}>
                <ThemedText style={styles.sectionTitle}>게시판별 통계</ThemedText>
                {stats.boardStats.map((board) => (
                  <View key={board.boardType} style={[styles.boardStatCard, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff' }]}>
                    <ThemedText style={styles.boardName}>{board.boardName}</ThemedText>
                    <View style={styles.boardStatRow}>
                      <ThemedText style={styles.boardStatText}>게시글: {board.postCount}</ThemedText>
                      <ThemedText style={styles.boardStatText}>댓글: {board.commentCount}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 게시글 관리 탭 */}
          {activeTab === 'posts' && (
            <View style={styles.managementContainer}>
              {/* 검색 및 필터 */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={[styles.searchInput, { 
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }]}
                  placeholder="제목, 내용, 작성자로 검색..."
                  placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                  value={postSearchKeyword}
                  onChangeText={setPostSearchKeyword}
                />
                <TouchableOpacity
                  style={[styles.searchButton, { backgroundColor: '#007AFF' }]}
                  onPress={async () => {
                    const token = await AsyncStorage.getItem('userToken');
                    if (token) {
                      loadPosts(token);
                    }
                  }}
                >
                  <MaterialCommunityIcons name="magnify" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* 삭제된 게시글 표시 옵션 */}
              <View style={styles.filterContainer}>
                                <TouchableOpacity
                  style={[styles.filterButton, postShowDeleted && styles.activeFilterButton]}
                  onPress={async () => {
                    const newShowDeleted = !postShowDeleted;
                    setPostShowDeleted(newShowDeleted);
                    const token = await AsyncStorage.getItem('userToken');
                    if (token) {
                      // 상태를 즉시 반영하여 API 호출
                      await loadPosts(token, newShowDeleted);
                    }
                  }}
                >
                  <ThemedText style={[styles.filterButtonText, postShowDeleted && styles.activeFilterButtonText]}>
                    삭제된 게시글 표시
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* 일괄 작업 버튼 */}
              {selectedPosts.length > 0 && (
                <View style={styles.bulkActionContainer}>
                  <TouchableOpacity
                    style={[styles.bulkActionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => {
                      setBulkActionType('posts');
                      setBulkAction('delete');
                      setIsBulkActionModalVisible(true);
                    }}
                  >
                    <ThemedText style={styles.bulkActionButtonText}>
                      선택 삭제 ({selectedPosts.length})
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* 게시글 목록 */}
              <View style={styles.listContainer}>
                {posts.map((post) => (
                  <View key={post.id} style={[styles.itemCard, { 
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    opacity: post.isDeleted ? 0.6 : 1
                  }]}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => togglePostSelection(post.id)}
                    >
                      <MaterialCommunityIcons 
                        name={selectedPosts.includes(post.id) ? "checkbox-marked" : "checkbox-blank-outline"} 
                        size={20} 
                        color="#007AFF" 
                      />
                    </TouchableOpacity>
                    
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <ThemedText style={styles.itemTitle} numberOfLines={2}>
                          {post.title}
                        </ThemedText>
                        <View style={styles.itemMeta}>
                          <ThemedText style={styles.itemAuthor}>{post.author}</ThemedText>
                          <ThemedText style={styles.itemDate}>{formatDate(post.createdAt)}</ThemedText>
                        </View>
                      </View>
                      
                      <View style={styles.itemStats}>
                        <ThemedText style={styles.itemStat}>조회 {post.viewCount}</ThemedText>
                        <ThemedText style={styles.itemStat}>좋아요 {post.likeCount}</ThemedText>
                        <ThemedText style={styles.itemStat}>댓글 {post.commentCount}</ThemedText>
                        <ThemedText style={styles.itemBoard}>{getBoardName(post.boardType)}</ThemedText>
                      </View>
                      
                      {post.isDeleted && (
                        <View style={styles.deletedBadge}>
                          <ThemedText style={styles.deletedText}>삭제됨</ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 신고 관리 탭 */}
          {activeTab === 'reports' && (
            <View style={styles.managementContainer}>
              {/* 필터 */}
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, reportFilterStatus === 'all' && styles.activeFilterButton]}
                  onPress={() => setReportFilterStatus('all')}
                >
                  <ThemedText style={[styles.filterButtonText, reportFilterStatus === 'all' && styles.activeFilterButtonText]}>
                    전체
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, reportFilterStatus === 'pending' && styles.activeFilterButton]}
                  onPress={() => setReportFilterStatus('pending')}
                >
                  <ThemedText style={[styles.filterButtonText, reportFilterStatus === 'pending' && styles.activeFilterButtonText]}>
                    대기중
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, reportFilterStatus === 'approved' && styles.activeFilterButton]}
                  onPress={() => setReportFilterStatus('approved')}
                >
                  <ThemedText style={[styles.filterButtonText, reportFilterStatus === 'approved' && styles.activeFilterButtonText]}>
                    승인됨
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, reportFilterStatus === 'rejected' && styles.activeFilterButton]}
                  onPress={() => setReportFilterStatus('rejected')}
                >
                  <ThemedText style={[styles.filterButtonText, reportFilterStatus === 'rejected' && styles.activeFilterButtonText]}>
                    반려됨
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* 신고 목록 */}
              <View style={styles.listContainer}>
                {reports.map((report) => (
                  <View key={report.id} style={[styles.reportCard, { 
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff'
                  }]}>
                    <View style={styles.reportHeader}>
                      <View style={styles.reportType}>
                        <ThemedText style={styles.reportTypeText}>
                          {report.targetType === 'post' ? '📝 게시글' : '💬 댓글'}
                        </ThemedText>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                        <ThemedText style={styles.statusText}>
                          {getStatusText(report.status)}
                        </ThemedText>
                      </View>
                    </View>
                    
                    <View style={styles.reportContent}>
                      <ThemedText style={styles.reportTitle} numberOfLines={2}>
                        {report.targetTitle}
                      </ThemedText>
                      <ThemedText style={styles.reportContentText} numberOfLines={3}>
                        {report.targetContent}
                      </ThemedText>
                      
                      <View style={styles.reportInfo}>
                        <ThemedText style={styles.reportAuthor}>
                          작성자: {report.targetAuthor}
                        </ThemedText>
                        <ThemedText style={styles.reportReason}>
                          {getReasonIcon(report.reason)} {report.reasonText}
                        </ThemedText>
                      </View>
                      
                      <View style={styles.reportDetails}>
                        <ThemedText style={styles.reportDetailsText}>
                          신고자: {report.reportedBy}
                        </ThemedText>
                        <ThemedText style={styles.reportDetailsText}>
                          신고일: {formatDate(report.createdAt)}
                        </ThemedText>
                        {report.details && (
                          <ThemedText style={styles.reportDetailsText}>
                            상세: {report.details}
                          </ThemedText>
                        )}
                      </View>
                      
                      {report.status !== 'pending' && (
                        <View style={styles.reviewInfo}>
                          <ThemedText style={styles.reviewInfoText}>
                            검토자: {report.reviewedBy}
                          </ThemedText>
                          <ThemedText style={styles.reviewInfoText}>
                            검토일: {formatDate(report.reviewedAt || '')}
                          </ThemedText>
                          {report.reviewNote && (
                            <ThemedText style={styles.reviewNoteText}>
                              검토 의견: {report.reviewNote}
                            </ThemedText>
                          )}
                        </View>
                      )}
                      
                      {/* 대기중인 신고에만 승인/반려 버튼 표시 */}
                      {report.status === 'pending' && (
                        <View style={styles.reportActions}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() => openApproveConfirmModal(report)}
                          >
                            <ThemedText style={styles.actionButtonText}>승인</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => {
                              Alert.alert(
                                '신고 반려',
                                '신고를 반려하시겠습니까?',
                                [
                                  { text: '취소', style: 'cancel' },
                                  { 
                                    text: '반려', 
                                    style: 'destructive',
                                    onPress: () => handleRejectReport(report.id, '')
                                  }
                                ]
                              );
                            }}
                          >
                            <ThemedText style={styles.actionButtonText}>반려</ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 사용자 관리 탭 */}
          {activeTab === 'users' && (
            <View style={styles.managementContainer}>
              {/* 검색 및 필터 */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={[styles.searchInput, { 
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }]}
                  placeholder="이름, 이메일로 검색..."
                  placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                  value={userSearchKeyword}
                  onChangeText={setUserSearchKeyword}
                />
                <TouchableOpacity
                  style={[styles.searchButton, { backgroundColor: '#007AFF' }]}
                  onPress={async () => {
                    const token = await AsyncStorage.getItem('userToken');
                    if (token) {
                      await loadUsers(token, showSuspendedUsers);
                    }
                  }}
                >
                  <MaterialCommunityIcons name="magnify" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* 정지된 사용자 표시 옵션 */}
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, showSuspendedUsers && styles.activeFilterButton]}
                  onPress={async () => {
                    const newShowSuspended = !showSuspendedUsers;
                    setShowSuspendedUsers(newShowSuspended);
                    const token = await AsyncStorage.getItem('userToken');
                    if (token) {
                      await loadUsers(token, newShowSuspended);
                    }
                  }}
                >
                  <ThemedText style={[styles.filterButtonText, showSuspendedUsers && styles.activeFilterButtonText]}>
                    정지된 사용자만 표시
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* 사용자 목록 */}
              <View style={styles.listContainer}>
                {users.map((user) => (
                  <View key={user.id} style={[styles.userCard, { 
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    opacity: user.isSuspended ? 0.6 : 1
                  }]}>
                    <View style={styles.userContent}>
                      <View style={styles.userHeader}>
                        <ThemedText style={styles.userName}>{user.username}</ThemedText>
                        <View style={styles.userMeta}>
                          <ThemedText style={styles.userEmail}>{user.email}</ThemedText>
                          <ThemedText style={styles.userDate}>가입일: {formatDate(user.createdAt)}</ThemedText>
                        </View>
                      </View>
                      
                      {user.isSuspended && (
                        <View style={styles.suspensionInfo}>
                          <ThemedText style={styles.suspensionText}>
                            🚫 정지됨 (정지일: {formatDate(user.suspendedAt)})
                          </ThemedText>
                          <ThemedText style={styles.suspensionText}>
                            정지 기간: {formatDate(user.suspendedAt)} ~ {formatDate(user.suspendedUntil)}
                          </ThemedText>
                          <ThemedText style={styles.suspensionText}>
                            정지 사유: {user.suspensionReason}
                          </ThemedText>
                          <ThemedText style={styles.suspensionText}>
                            정지자: {user.suspendedBy}
                          </ThemedText>
                        </View>
                      )}
                      
                      <View style={styles.userActions}>
                        {/* 관리자가 아닌 경우에만 정지/해제 버튼 표시 */}
                        {user.role && user.role !== 'ADMIN' && (
                          <>
                            {!user.isSuspended ? (
                              <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
                                onPress={() => openSuspendModal(user)}
                              >
                                <ThemedText style={styles.actionButtonText}>정지</ThemedText>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#34C759' }]}
                                onPress={() => {
                                  Alert.alert(
                                    '정지 해제',
                                    '사용자의 정지를 해제하시겠습니까?',
                                    [
                                      { text: '취소', style: 'cancel' },
                                      { 
                                        text: '해제', 
                                        style: 'default',
                                        onPress: () => handleUnsuspendUser(user.id)
                                      }
                                    ]
                                  );
                                }}
                              >
                                <ThemedText style={styles.actionButtonText}>정지 해제</ThemedText>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                        {/* 관리자인 경우 관리자 표시 */}
                        {user.role && user.role === 'ADMIN' && (
                          <View style={styles.adminBadge}>
                            <ThemedText style={styles.adminBadgeText}>관리자</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 댓글 관리 탭 */}
          {activeTab === 'comments' && (
            <View style={styles.managementContainer}>
              {/* 검색 및 필터 */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={[styles.searchInput, { 
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }]}
                  placeholder="내용, 작성자로 검색..."
                  placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                  value={commentSearchKeyword}
                  onChangeText={setCommentSearchKeyword}
                />
                <TouchableOpacity
                  style={[styles.searchButton, { backgroundColor: '#007AFF' }]}
                  onPress={async () => {
                    const token = await AsyncStorage.getItem('userToken');
                    if (token) {
                      await loadComments(token);
                    }
                  }}
                >
                  <MaterialCommunityIcons name="magnify" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* 삭제된 댓글 표시 옵션 */}
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, commentShowDeleted && styles.activeFilterButton]}
                  onPress={async () => {
                    const newShowDeleted = !commentShowDeleted;
                    setCommentShowDeleted(newShowDeleted);
                    const token = await AsyncStorage.getItem('userToken');
                    if (token) {
                      // 상태를 즉시 반영하여 API 호출
                      await loadComments(token, newShowDeleted);
                    }
                  }}
                >
                  <ThemedText style={[styles.filterButtonText, commentShowDeleted && styles.activeFilterButtonText]}>
                    삭제된 댓글 표시
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* 일괄 작업 버튼 */}
              {selectedComments.length > 0 && (
                <View style={styles.bulkActionContainer}>
                  <TouchableOpacity
                    style={[styles.bulkActionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => {
                      setBulkActionType('comments');
                      setBulkAction('delete');
                      setIsBulkActionModalVisible(true);
                    }}
                  >
                    <ThemedText style={styles.bulkActionButtonText}>
                      선택 삭제 ({selectedComments.length})
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* 댓글 목록 */}
              <View style={styles.listContainer}>
                {comments.map((comment) => (
                  <View key={comment.id} style={[styles.itemCard, { 
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                    opacity: comment.isDeleted ? 0.6 : 1
                  }]}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleCommentSelection(comment.id)}
                    >
                      <MaterialCommunityIcons 
                        name={selectedComments.includes(comment.id) ? "checkbox-marked" : "checkbox-blank-outline"} 
                        size={20} 
                        color="#007AFF" 
                      />
                    </TouchableOpacity>
                    
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <ThemedText style={styles.itemTitle} numberOfLines={3}>
                          {comment.content}
                        </ThemedText>
                        <View style={styles.itemMeta}>
                          <ThemedText style={styles.itemAuthor}>{comment.author}</ThemedText>
                          <ThemedText style={styles.itemDate}>{formatDate(comment.createdAt)}</ThemedText>
                        </View>
                      </View>
                      
                      <View style={styles.itemStats}>
                        <ThemedText style={styles.itemStat}>좋아요 {comment.likeCount}</ThemedText>
                        <ThemedText style={styles.itemPost}>게시글: {comment.postTitle}</ThemedText>
                      </View>
                      
                      {comment.isDeleted && (
                        <View style={styles.deletedBadge}>
                          <ThemedText style={styles.deletedText}>삭제됨</ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* 일괄 작업 모달 */}
        <Modal
          visible={isBulkActionModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsBulkActionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff'
            }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  {bulkAction === 'delete' ? '삭제' : '복구'} 사유 입력
                </ThemedText>
                <TouchableOpacity onPress={() => setIsBulkActionModalVisible(false)}>
                  <MaterialCommunityIcons 
                    name="close" 
                    size={24} 
                    color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
                  />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={[styles.modalInput, {
                  backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                placeholder="사유를 입력하세요..."
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                value={bulkActionReason}
                onChangeText={setBulkActionReason}
                multiline={true}
                numberOfLines={3}
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#8e8e93' }]}
                  onPress={() => setIsBulkActionModalVisible(false)}
                >
                  <ThemedText style={styles.modalButtonText}>취소</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: bulkAction === 'delete' ? '#FF3B30' : '#34C759' }]}
                  onPress={handleBulkAction}
                >
                  <ThemedText style={styles.modalButtonText}>
                    {bulkAction === 'delete' ? '삭제' : '복구'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 신고 승인 확인 모달 */}
        <Modal
          visible={isApproveConfirmModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsApproveConfirmModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff'
            }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  신고 승인 확인
                </ThemedText>
                <TouchableOpacity onPress={() => setIsApproveConfirmModalVisible(false)}>
                  <MaterialCommunityIcons 
                    name="close" 
                    size={24} 
                    color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
                  />
                </TouchableOpacity>
              </View>
              
              {selectedReportForApproval && (
                <View style={styles.approveConfirmContent}>
                  <ThemedText style={styles.approveConfirmText}>
                    이 신고를 승인하면 해당 {selectedReportForApproval.targetType === 'post' ? '게시글' : '댓글'}이 삭제됩니다.
                  </ThemedText>
                  <ThemedText style={styles.approveConfirmText}>
                    일반 사용자에게는 보이지 않지만, 관리자는 삭제된 {selectedReportForApproval.targetType === 'post' ? '게시글' : '댓글'}도 확인할 수 있습니다.
                  </ThemedText>
                  
                  <TextInput
                    style={[styles.modalInput, {
                      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
                      color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                    }]}
                    placeholder="검토 의견을 입력하세요 (선택사항)..."
                    placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                    value={approveReviewNote}
                    onChangeText={setApproveReviewNote}
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#8e8e93' }]}
                  onPress={() => setIsApproveConfirmModalVisible(false)}
                >
                  <ThemedText style={styles.modalButtonText}>취소</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#FF3B30' }]}
                  onPress={executeApproveReport}
                >
                  <ThemedText style={styles.modalButtonText}>승인 및 삭제</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 사용자 정지 모달 */}
        <Modal
          visible={isSuspendModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsSuspendModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff'
            }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  사용자 정지
                </ThemedText>
                <TouchableOpacity onPress={() => setIsSuspendModalVisible(false)}>
                  <MaterialCommunityIcons 
                    name="close" 
                    size={24} 
                    color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
                  />
                </TouchableOpacity>
              </View>
              
              {selectedUserForSuspension && (
                <View style={styles.suspendModalContent}>
                  <ThemedText style={styles.suspendModalText}>
                    사용자: {selectedUserForSuspension.username} ({selectedUserForSuspension.email})
                  </ThemedText>
                  
                  <View style={styles.suspensionOptions}>
                    <ThemedText style={styles.suspensionLabel}>정지 기간:</ThemedText>
                    <View style={styles.suspensionDaysContainer}>
                      {[1, 3, 7, 10, 14, 15, 20, 30].map((days) => (
                        <TouchableOpacity
                          key={days}
                          style={[
                            styles.suspensionDayButton,
                            suspensionDays === days && styles.selectedSuspensionDay
                          ]}
                          onPress={() => setSuspensionDays(days)}
                        >
                          <ThemedText style={[
                            styles.suspensionDayText,
                            suspensionDays === days && styles.selectedSuspensionDayText
                          ]}>
                            {days}일
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.suspensionReasonContainer}>
                    <ThemedText style={styles.suspensionLabel}>정지 사유:</ThemedText>
                    <TextInput
                      style={[styles.modalInput, {
                        backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
                        color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                      }]}
                      placeholder="정지 사유를 입력하세요..."
                      placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                      value={suspensionReason}
                      onChangeText={setSuspensionReason}
                      multiline={true}
                      numberOfLines={3}
                    />
                  </View>
                </View>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#8e8e93' }]}
                  onPress={() => setIsSuspendModalVisible(false)}
                >
                  <ThemedText style={styles.modalButtonText}>취소</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#FF9500' }]}
                  onPress={executeSuspendUser}
                >
                  <ThemedText style={styles.modalButtonText}>정지</ThemedText>
                </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40, // 상단 여백 추가
    borderBottomWidth: 1,
  },
  hamburgerButton: {
    padding: 4,
    marginRight: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  boardStatsContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  boardStatCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  boardName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  boardStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  boardStatText: {
    fontSize: 12,
    opacity: 0.7,
  },
  managementContainer: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkActionContainer: {
    marginBottom: 16,
  },
  bulkActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bulkActionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContainer: {
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  checkbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  itemAuthor: {
    fontSize: 12,
    opacity: 0.7,
  },
  itemDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  itemStats: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  itemStat: {
    fontSize: 11,
    opacity: 0.6,
  },
  itemBoard: {
    fontSize: 11,
    opacity: 0.6,
    backgroundColor: '#007AFF15',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemPost: {
    fontSize: 11,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  deletedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deletedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  // 신고 관리 스타일
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  reportCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportType: {
    backgroundColor: '#007AFF15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reportTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  reportContent: {
    gap: 8,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportContentText: {
    fontSize: 13,
    opacity: 0.8,
    lineHeight: 18,
  },
  reportInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportAuthor: {
    fontSize: 12,
    opacity: 0.7,
  },
  reportReason: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF3B30',
  },
  reportDetails: {
    gap: 4,
  },
  reportDetailsText: {
    fontSize: 11,
    opacity: 0.6,
  },
  reviewInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: 4,
  },
  reviewInfoText: {
    fontSize: 11,
    opacity: 0.6,
  },
  reviewNoteText: {
    fontSize: 11,
    opacity: 0.8,
    fontStyle: 'italic',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  approveConfirmContent: {
    marginBottom: 16,
  },
  approveConfirmText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  userCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  userContent: {
    padding: 16,
  },
  userHeader: {
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userMeta: {
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  userDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  suspensionInfo: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  suspensionText: {
    fontSize: 12,
    color: '#FF3B30',
    marginBottom: 2,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  suspendModalContent: {
    marginBottom: 16,
  },
  suspendModalText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  suspensionOptions: {
    marginBottom: 16,
  },
  suspensionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  suspensionDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suspensionDayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  selectedSuspensionDay: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  suspensionDayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectedSuspensionDayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  suspensionReasonContainer: {
    marginBottom: 16,
  },
  adminBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
}); 