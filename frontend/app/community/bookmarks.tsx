import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { postApi } from '../../services/api';
import Config from '../../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireLogin } from '../../utils/authUtils';
import { useToast } from '../../components/ToastProvider';
import { ConfirmationModal } from '../../components/ConfirmationModal';

interface BookmarkedPost {
  id: number;
  title: string;
  content: string;
  boardType: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  author?: {
    username: string;
  };
}

export default function BookmarksScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<BookmarkedPost[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { showToast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    checkLoginAndLoadBookmarks();
  }, []);

  const checkLoginAndLoadBookmarks = async () => {
    const isLoggedIn = await requireLogin('북마크 보기', showToast);
    if (isLoggedIn) {
      loadBookmarks();
    } else {
      setShowLoginModal(true);
    }
  };

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      const token = await AsyncStorage.getItem('userToken');
      const response = await postApi.getBookmarks(0, 20, token || undefined);
      
      if (response.data?.success && response.data?.data?.posts) {
        console.log('북마크 로딩 성공:', response.data.data);
        setBookmarks(response.data.data.posts);
      } else {
        console.log('북마크 데이터 없음:', response.data);
        setBookmarks([]);
      }
    } catch (error: any) {
      console.error('북마크 로딩 오류:', error);
      console.error('응답 데이터:', error.response?.data);
      setErrorMessage('북마크를 불러오는데 실패했습니다.');
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookmarks();
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
        title: '북마크',
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
          <ThemedText style={styles.headerTitle}>북마크</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#007AFF'} />
            <ThemedText style={styles.loadingText}>북마크를 불러오는 중...</ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {bookmarks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="bookmark-outline" 
                  size={60} 
                  color={colorScheme === 'dark' ? '#8e8e93' : '#c7c7cc'} 
                />
                <ThemedText style={styles.emptyText}>아직 북마크한 글이 없습니다</ThemedText>
                <TouchableOpacity
                  style={[styles.exploreButton, {
                    backgroundColor: '#007AFF'
                  }]}
                  onPress={() => router.push('/community' as any)}
                >
                  <ThemedText style={styles.exploreButtonText}>커뮤니티 둘러보기</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.bookmarksContainer}>
                {bookmarks.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={[styles.postCard, {
                      backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }]}
                    onPress={() => navigateToPost(post.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.postHeader}>
                      <View style={styles.boardTypeContainer}>
                        <ThemedText style={styles.boardType}>{getBoardTypeName(post.boardType)}</ThemedText>
                      </View>
                      <ThemedText style={styles.postDate}>{formatDate(post.createdAt)}</ThemedText>
                    </View>
                    
                    <ThemedText style={styles.postTitle} numberOfLines={2}>
                      {post.title}
                    </ThemedText>
                    
                    <ThemedText style={styles.postContent} numberOfLines={3}>
                      {post.content}
                    </ThemedText>
                    
                    <View style={styles.postMeta}>
                      <ThemedText style={styles.authorText}>
                        {post.author?.username || '익명'}
                      </ThemedText>
                    </View>
                    
                    <View style={styles.postStats}>
                      <View style={styles.statItem}>
                        <MaterialCommunityIcons name="eye" size={16} color="#8e8e93" />
                        <ThemedText style={styles.statText}>{post.viewCount}</ThemedText>
                      </View>
                      <View style={styles.statItem}>
                        <MaterialCommunityIcons name="thumb-up" size={16} color="#8e8e93" />
                        <ThemedText style={styles.statText}>{post.likeCount}</ThemedText>
                      </View>
                      <View style={styles.statItem}>
                        <MaterialCommunityIcons name="comment" size={16} color="#8e8e93" />
                        <ThemedText style={styles.statText}>{post.commentCount}</ThemedText>
                      </View>
                    </View>
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
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  bookmarksContainer: {
    gap: 16,
  },
  postCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  postHeader: {
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
  postDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
    lineHeight: 20,
  },
  postMeta: {
    marginBottom: 12,
  },
  authorText: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '500',
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    opacity: 0.7,
  },
}); 