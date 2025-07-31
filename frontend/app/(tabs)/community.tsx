import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, Platform, RefreshControl, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { postApi, healthApi } from '../../services/api';
import Config from '../../constants/Config';
import { requireLoginWithAlert, checkLoginStatusWithValidation } from '../../utils/authUtils';
import { useToast } from '../../components/ToastProvider';
import { ConfirmationModal } from '../../components/ConfirmationModal';

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  boardType: string;
  tags?: string[];
}

interface BoardInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  postCount: number;
  recentPost?: {
    title: string;
    author: string;
    createdAt: string;
  };
}

export default function CommunityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boardList, setBoardList] = useState<BoardInfo[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { showToast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 새로운 상태들
  const [selectedBoard, setSelectedBoard] = useState<string>('ALL');
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  // 기본 게시판 설정 (백엔드 API에서 가져올 수 없는 정적 정보)
  const defaultBoardConfigs = [
    {
      id: 'FREE',
      name: '자유게시판',
      description: '자유롭게 이야기를 나누세요',
      icon: 'chat-outline',
      color: '#007AFF',
    },
    {
      id: 'INVESTMENT', 
      name: '투자',
      description: '투자 팁과 정보를 공유해요',
      icon: 'trending-up',
      color: '#34C759',
    },
    {
      id: 'QNA',
      name: 'Q&A',
      description: '궁금한 것을 물어보세요',
      icon: 'help-circle-outline',
      color: '#FF9500',
    },
    {
      id: 'NEWS',
      name: '뉴스',
      description: '경제 뉴스에 대해 토론해요',
      icon: 'newspaper',
      color: '#5856D6',
    },
  ];

  // 화면이 포커스될 때마다 토큰 유효성 검증 (로그인된 사용자만)
  useFocusEffect(
    useCallback(() => {
      const validateToken = async () => {
        try {
          const authStatus = await checkLoginStatusWithValidation();
          if (!authStatus.isLoggedIn) {
            console.log('ℹ️ 커뮤니티 화면: 로그인되지 않은 사용자입니다.');
            // 로그인되지 않은 사용자도 커뮤니티 화면을 볼 수 있도록 자동 이동하지 않음
          }
        } catch (error) {
          console.error('토큰 검증 중 오류:', error);
        }
      };

      validateToken();
    }, [router, showToast])
  );

  useEffect(() => {
    checkBackendConnection();
  }, []);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      loadPosts();
    }
  }, [selectedBoard, sortBy, connectionStatus]);

  const checkBackendConnection = async () => {
    try {
      setConnectionStatus('checking');
      setErrorMessage('');
      
      console.log('🔍 백엔드 연결 확인 중...', Config.apiUrl);
      
      // 먼저 헬스체크 API 시도
      try {
        await healthApi.checkConnection();
        console.log('✅ 헬스체크 성공');
        setConnectionStatus('connected');
      } catch (healthError) {
        console.log('⚠️ 헬스체크 실패, 게시글 API로 재시도');
        
        // 헬스체크 실패 시 실제 API 엔드포인트로 테스트
        await healthApi.testEndpoint();
        console.log('✅ 게시글 API 연결 성공');
        setConnectionStatus('connected');
      }
      
      // 연결 성공 시 데이터 로드
      await loadBoardStats();
      
    } catch (error: any) {
      console.error('❌ 백엔드 연결 실패:', error);
      setConnectionStatus('disconnected');
      
      let userMessage = '백엔드 서버에 연결할 수 없습니다.';
      
      if (error.code === 'ECONNREFUSED') {
        userMessage = `서버가 실행되지 않았습니다.\n확인할 주소: ${Config.apiUrl}`;
      } else if (error.code === 'ENOTFOUND') {
        userMessage = `서버 주소를 찾을 수 없습니다.\n설정된 주소: ${Config.apiUrl}`;
      } else if (error.code === 'ECONNABORTED') {
        userMessage = '연결 시간이 초과되었습니다.';
      } else if (error.response?.status === 404) {
        userMessage = `API 엔드포인트를 찾을 수 없습니다.\n상태 코드: ${error.response.status}`;
      } else if (error.response?.status >= 500) {
        userMessage = `서버 내부 오류가 발생했습니다.\n상태 코드: ${error.response.status}`;
      }
      
      setErrorMessage(userMessage);
      
      // 연결 실패해도 기본 게시판은 표시
      setBoardList(defaultBoardConfigs.map(config => ({
        ...config,
        postCount: 0
      })));
      setLoading(false);
    }
  };

  const loadBoardStats = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      console.log('📊 게시판 통계 로딩 중...');
      
      // 각 게시판별로 통계 정보 가져오기
      const boardStatsPromises = defaultBoardConfigs.map(async (boardConfig) => {
        try {
          const response = await postApi.getPosts(boardConfig.id, 'latest', 0, 1);
          
          if (response.data?.success && response.data?.data) {
            const data = response.data.data;
            const recentPost = data.posts && data.posts.length > 0 ? {
              title: data.posts[0].title,
              author: data.posts[0].author?.username || '익명',
              createdAt: data.posts[0].createdAt
            } : undefined;
            
            return {
              ...boardConfig,
              postCount: data.totalCount || 0,
              recentPost
            };
          } else {
            console.log(`게시판 ${boardConfig.name} 데이터 없음:`, response.data);
            return {
              ...boardConfig,
              postCount: 0
            };
          }
        } catch (error: any) {
          console.error(`게시판 ${boardConfig.name} 통계 로딩 실패:`, error);
          return {
            ...boardConfig,
            postCount: 0
          };
        }
      });
      
      const boardStats = await Promise.all(boardStatsPromises);
      setBoardList(boardStats);
      
      console.log('✅ 게시판 통계 로딩 완료:', boardStats);
      
    } catch (error: any) {
      console.error('❌ 게시판 통계 로딩 실패:', error);
      setErrorMessage('게시판 정보를 불러오는데 실패했습니다.');
      
      // 에러 시에도 기본 게시판은 표시
      setBoardList(defaultBoardConfigs.map(config => ({
        ...config,
        postCount: 0
      })));
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      if (selectedBoard === 'ALL') {
        // 모든 게시판의 게시글을 가져오기
        const allPostsPromises = defaultBoardConfigs.map(async (boardConfig) => {
          try {
            const response = await postApi.getPosts(boardConfig.id, sortBy, 0, 10, searchQuery || undefined);
            if (response.data?.success && response.data?.data?.posts) {
              return response.data.data.posts.map((post: any) => ({
                id: post.id,
                title: post.title,
                content: post.content,
                author: post.author?.username || '익명',
                createdAt: post.createdAt,
                viewCount: post.viewCount || 0,
                likeCount: post.likeCount || 0,
                commentCount: post.commentCount || 0,
                isLiked: post.userInteraction?.isLiked || false,
                isBookmarked: post.userInteraction?.isBookmarked || false,
                boardType: boardConfig.id,
                tags: post.tags || []
              }));
            }
            return [];
          } catch (error) {
            console.error(`게시판 ${boardConfig.name} 게시글 로딩 실패:`, error);
            return [];
          }
        });

        const allPostsArrays = await Promise.all(allPostsPromises);
        const allPosts = allPostsArrays.flat();
        
        // 정렬
        const sortedPosts = allPosts.sort((a, b) => {
          if (sortBy === 'latest') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          } else {
            return (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount);
          }
        });

        setPosts(sortedPosts.slice(0, 20)); // 최대 20개만 표시
      } else {
        // 특정 게시판의 게시글만 가져오기
        const response = await postApi.getPosts(selectedBoard, sortBy, 0, 20, searchQuery || undefined);
        if (response.data?.success && response.data?.data?.posts) {
          const postsData = response.data.data.posts.map((post: any) => ({
            id: post.id,
            title: post.title,
            content: post.content,
            author: post.author?.username || '익명',
            createdAt: post.createdAt,
            viewCount: post.viewCount || 0,
            likeCount: post.likeCount || 0,
            commentCount: post.commentCount || 0,
            isLiked: post.userInteraction?.isLiked || false,
            isBookmarked: post.userInteraction?.isBookmarked || false,
            boardType: selectedBoard,
            tags: post.tags || []
          }));
          setPosts(postsData);
        } else {
          setPosts([]);
        }
      }
    } catch (error: any) {
      console.error('게시글 로딩 오류:', error);
      setPosts([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBoardStats();
    await loadPosts();
    setRefreshing(false);
  };

  const navigateToBoard = (boardType: string) => {
    // 백엔드 enum을 URL 파라미터로 변환
    const boardTypeMapping: { [key: string]: string } = {
      'FREE': 'free',
      'INVESTMENT': 'investment', 
      'QNA': 'qna',
      'NEWS': 'news'
    };
    
    const urlBoardType = boardTypeMapping[boardType] || 'free';
    console.log(`게시판 이동: ${boardType} -> ${urlBoardType}`);
    router.push(`/community/board/${urlBoardType}` as any);
  };

  const handlePostPress = (postId: number) => {
    console.log('게시글 클릭 - postId:', postId);
    router.push(`/community/post/${postId}` as any);
  };

  const handleWritePress = async () => {
    const { isLoggedIn } = await checkLoginStatusWithValidation();
    if (isLoggedIn) {
      router.push('/community/write' as any);
    } else {
      requireLoginWithAlert('글 작성', showToast, setShowLoginModal);
    }
  };

  const getBoardConfig = (boardType: string) => {
    return defaultBoardConfigs.find(config => config.id === boardType) || defaultBoardConfigs[0];
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

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 */}
        <View style={[styles.header, {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          paddingTop: Platform.OS === 'ios' ? 10 : 20,
        }]}>
          <View style={styles.headerLeft}>
            <ThemedText style={styles.title}>커뮤니티</ThemedText>
            <ThemedText style={styles.subtitle}>경제 정보를 함께 나누고 토론해요</ThemedText>
          </View>
          <TouchableOpacity
            style={[styles.writeButton, { backgroundColor: '#007AFF' }]}
            onPress={handleWritePress}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* 필터링 버튼 */}
        <View style={[styles.filterContainer, {
          backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[styles.filterButton, selectedBoard === 'ALL' && { backgroundColor: '#007AFF' }]}
              onPress={() => setSelectedBoard('ALL')}
            >
              <ThemedText style={[styles.filterButtonText, selectedBoard === 'ALL' && { color: '#ffffff' }]}>
                전체
              </ThemedText>
            </TouchableOpacity>
            {defaultBoardConfigs.map((board) => (
              <TouchableOpacity
                key={board.id}
                style={[styles.filterButton, selectedBoard === board.id && { backgroundColor: board.color }]}
                onPress={() => setSelectedBoard(board.id)}
              >
                <ThemedText style={[styles.filterButtonText, selectedBoard === board.id && { color: '#ffffff' }]}>
                  {board.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 검색 및 정렬 */}
        <View style={[styles.searchContainer, {
          backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }]}>
          <View style={[styles.searchInputContainer, {
            backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7'
          }]}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={20} 
              color={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'} 
            />
            <TextInput
              style={[styles.searchInput, {
                color: colorScheme === 'dark' ? '#ffffff' : '#000000'
              }]}
              placeholder="게시글 검색..."
              placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'latest' && { backgroundColor: '#007AFF' }]}
              onPress={() => setSortBy('latest')}
            >
              <ThemedText style={[styles.sortButtonText, sortBy === 'latest' && { color: '#ffffff' }]}>
                최신순
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'popular' && { backgroundColor: '#007AFF' }]}
              onPress={() => setSortBy('popular')}
            >
              <ThemedText style={[styles.sortButtonText, sortBy === 'popular' && { color: '#ffffff' }]}>
                인기순
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {loading && connectionStatus === 'checking' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#007AFF'} />
            <ThemedText style={styles.loadingText}>
              {connectionStatus === 'checking' ? '백엔드 서버 연결 확인 중...' : '게시글을 불러오는 중...'}
            </ThemedText>
          </View>
        ) : connectionStatus === 'disconnected' && errorMessage ? (
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons 
              name="server-network-off" 
              size={60} 
              color={colorScheme === 'dark' ? '#ff6b6b' : '#e74c3c'} 
            />
            <ThemedText style={[styles.loadingText, { marginTop: 16, fontSize: 18, fontWeight: '700' }]}>
              서버 연결 실패
            </ThemedText>
            <ThemedText style={styles.loadingText}>{errorMessage}</ThemedText>
            <ThemedText style={[styles.loadingText, { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
              {`현재 환경: ${Config.debug ? 'DEBUG' : 'PROD'}\n설정 URL: ${Config.apiUrl}`}
            </ThemedText>
            <TouchableOpacity
              style={[styles.loadingContainer, {
                backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0',
                padding: 12,
                borderRadius: 8,
                marginTop: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8
              }]}
              onPress={() => checkBackendConnection()}
            >
              <MaterialCommunityIcons 
                name="refresh" 
                size={20} 
                color={colorScheme === 'dark' ? '#fff' : '#000'} 
              />
              <ThemedText style={[styles.loadingText, { fontWeight: '600' }]}>다시 시도</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredPosts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="post-outline" 
                  size={64} 
                  color={colorScheme === 'dark' ? '#8e8e93' : '#c7c7cc'} 
                />
                <ThemedText style={styles.emptyText}>
                  {searchQuery ? '검색 결과가 없습니다' : '아직 게시글이 없습니다'}
                </ThemedText>
                <ThemedText style={styles.emptySubText}>
                  {searchQuery ? '다른 키워드로 검색해보세요' : '첫 번째 글을 작성해보세요!'}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.postList}>
                {filteredPosts.map((post) => {
                  const boardConfig = getBoardConfig(post.boardType);
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={[styles.postCard, {
                        backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }]}
                      onPress={() => handlePostPress(post.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.postHeader}>
                        <View style={styles.postTitleContainer}>
                          <ThemedText style={styles.postTitle} numberOfLines={2}>
                            {post.title}
                          </ThemedText>
                          <View style={[styles.boardTag, { backgroundColor: `${boardConfig.color}15` }]}>
                            <ThemedText style={[styles.boardTagText, { color: boardConfig.color }]}>
                              {boardConfig.name}
                            </ThemedText>
                          </View>
                        </View>
                        {post.tags && post.tags.length > 0 && (
                          <View style={styles.tagContainer}>
                            {post.tags.slice(0, 2).map((tag) => (
                              <View 
                                key={tag} 
                                style={[styles.tag, { backgroundColor: `${boardConfig.color}15` }]}
                              >
                                <ThemedText style={[styles.tagText, { color: boardConfig.color }]}>
                                  #{tag}
                                </ThemedText>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      
                      <ThemedText style={styles.postContent} numberOfLines={2}>
                        {post.content}
                      </ThemedText>
                      
                      <View style={styles.postFooter}>
                        <View style={styles.postMeta}>
                          <ThemedText style={styles.postAuthor}>{post.author}</ThemedText>
                          <ThemedText style={styles.postDate}>{formatDate(post.createdAt)}</ThemedText>
                        </View>
                        
                        <View style={styles.postStats}>
                          <View style={styles.statItem}>
                            <MaterialCommunityIcons 
                              name="eye" 
                              size={14} 
                              color={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'} 
                            />
                            <ThemedText style={styles.statText}>{post.viewCount}</ThemedText>
                          </View>
                          <View style={styles.statItem}>
                            <MaterialCommunityIcons 
                              name={post.isLiked ? "heart" : "heart-outline"} 
                              size={14} 
                              color={post.isLiked ? "#FF3B30" : (colorScheme === 'dark' ? '#8e8e93' : '#8e8e93')} 
                            />
                            <ThemedText style={styles.statText}>{post.likeCount}</ThemedText>
                          </View>
                          <View style={styles.statItem}>
                            <MaterialCommunityIcons 
                              name="comment-outline" 
                              size={14} 
                              color={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'} 
                            />
                            <ThemedText style={styles.statText}>{post.commentCount}</ThemedText>
                          </View>
                          {post.isBookmarked && (
                            <MaterialCommunityIcons 
                              name="bookmark" 
                              size={14} 
                              color="#FFCC00" 
                            />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
      <ConfirmationModal
        visible={showLoginModal}
        title="로그인 필요"
        message="해당 기능을 사용하려면 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?"
        confirmText="로그인"
        cancelText="취소"
        onConfirm={() => { setShowLoginModal(false); router.push('/(tabs)/login'); }}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  writeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 36,
    paddingVertical: 0,
    marginVertical: 0,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    lineHeight: 20,
    paddingVertical: 0,
    marginVertical: 0,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
  },
  sortButtonText: {
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
  },
  postList: {
    padding: 16,
    gap: 12,
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  postHeader: {
    marginBottom: 8,
  },
  postTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    lineHeight: 22,
    marginRight: 8,
  },
  boardTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  boardTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  postContent: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAuthor: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  postDate: {
    fontSize: 13,
    opacity: 0.6,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
}); 