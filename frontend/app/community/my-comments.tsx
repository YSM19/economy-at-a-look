import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { commentApi } from '../../services/api';
import Config from '../../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireLogin } from '../../utils/authUtils';
import { useToast } from '../../components/ToastProvider';
import { ConfirmationModal } from '../../components/ConfirmationModal';

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  post: {
    id: number;
    title: string;
    boardType: string;
  };
}

export default function MyCommentsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { showToast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    checkLoginAndLoadMyComments();
  }, []);

  const checkLoginAndLoadMyComments = async () => {
    const isLoggedIn = await requireLogin('내 작성 댓글 보기', showToast);
    if (isLoggedIn) {
      loadMyComments();
    } else {
      setShowLoginModal(true);
    }
  };

  const loadMyComments = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('토큰이 없습니다.');
      }
      
             const response = await commentApi.getMyComments(token, 0, 20);
       console.log('댓글 API 응답 전체:', response);
      
             if (response.data?.success && response.data?.data?.comments) {
         console.log('내 댓글 로딩 성공:', response.data.data);
         // post 정보가 있는 댓글만 필터링
         const validComments = response.data.data.comments.filter((comment: any) => comment.post);
         setComments(validComments);
       } else if (response.data?.success && response.data?.data?.content) {
         // 다른 응답 구조일 경우
         console.log('내 댓글 로딩 성공 (content):', response.data.data);
         const validComments = response.data.data.content.filter((comment: any) => comment.post);
         setComments(validComments);
       } else if (response.data?.success && Array.isArray(response.data?.data)) {
         // 배열 형태로 직접 반환되는 경우
         console.log('내 댓글 로딩 성공 (array):', response.data.data);
         const validComments = response.data.data.filter((comment: any) => comment.post);
         setComments(validComments);
       } else {
         console.log('내 댓글 데이터 없음:', response.data);
         console.log('전체 응답:', response);
         setComments([]);
       }
    } catch (error: any) {
      console.error('내 댓글 로딩 오류:', error);
      console.error('응답 데이터:', error.response?.data);
      setErrorMessage('내 댓글을 불러오는데 실패했습니다.');
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyComments();
    setRefreshing(false);
  };

  const navigateToPost = (postId: number) => {
    router.push(`/community/post/${postId}` as any);
  };

  const getBoardTypeName = (boardType: string) => {
    const boardTypeNames: { [key: string]: string } = {
      'FREE': '자유게시판',
      'INVESTMENT': '투자',
      'QNA': 'Q&A',
      'NEWS': '뉴스',
      'SUGGESTION': '건의 및 문의'
    };
    return boardTypeNames[boardType] || boardType;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return '방금 전';
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        title: '내 작성 댓글',
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
          <ThemedText style={styles.headerTitle}>내 작성 댓글</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#007AFF'} />
            <ThemedText style={styles.loadingText}>내 댓글을 불러오는 중...</ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {comments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="comment-text-outline" 
                  size={60} 
                  color={colorScheme === 'dark' ? '#8e8e93' : '#c7c7cc'} 
                />
                <ThemedText style={styles.emptyText}>아직 작성한 댓글이 없습니다</ThemedText>
                <TouchableOpacity
                  style={[styles.writeButton, {
                    backgroundColor: '#007AFF'
                  }]}
                  onPress={() => router.push('/(tabs)/community' as any)}
                >
                  <ThemedText style={styles.writeButtonText}>커뮤니티로 가기</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.commentsContainer}>
                {comments.map((comment) => (
                  <TouchableOpacity
                    key={comment.id}
                    style={[styles.commentCard, {
                      backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }]}
                                         onPress={() => comment.post?.id ? navigateToPost(comment.post.id) : null}
                    activeOpacity={0.7}
                  >
                                         <View style={styles.commentHeader}>
                       <View style={styles.boardTypeContainer}>
                         <ThemedText style={styles.boardType}>
                           {comment.post?.boardType ? getBoardTypeName(comment.post.boardType) : '알 수 없음'}
                         </ThemedText>
                       </View>
                       <ThemedText style={styles.commentDate}>{formatDate(comment.createdAt)}</ThemedText>
                     </View>
                     
                     <ThemedText style={styles.postTitle} numberOfLines={1}>
                       {comment.post?.title || '삭제된 게시글'}
                     </ThemedText>
                    
                    <ThemedText style={styles.commentContent} numberOfLines={3}>
                      {comment.content}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
      <ConfirmationModal
        visible={showLoginModal}
        title="로그인 필요"
        message="로그인 페이지로 이동하시겠습니까?"
        confirmText="이동"
        cancelText="취소"
        onConfirm={() => { setShowLoginModal(false); router.push('/login'); }}
        onCancel={() => setShowLoginModal(false)}
        iconName="login"
        iconColor="#FF9500"
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  backButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 16,
    marginBottom: 24,
  },
  writeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  writeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  commentsContainer: {
    gap: 16,
  },
  commentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  boardTypeContainer: {
    backgroundColor: '#007AFF15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boardType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  commentDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  commentContent: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
}); 