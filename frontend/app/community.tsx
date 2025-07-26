import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, Platform, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { postApi, healthApi } from '../services/api';
import Config from '../constants/Config';
import { requireLogin } from '../utils/authUtils';
import { useToast } from '../components/ToastProvider';
import { ConfirmationModal } from '../components/ConfirmationModal';

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
    {
      id: 'SUGGESTION',
      name: '건의 및 문의',
      description: '앱 개선사항이나 문의사항을 남겨주세요',
      icon: 'comment-question-outline',
      color: '#AF52DE',
    }
  ];

  useEffect(() => {
    checkBackendConnection();
  }, []);

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
      
      // 게시판 통계 API 호출
      const response = await postApi.getBoardStats();
      
      if (response.data?.success && response.data?.data) {
        const statsData = response.data.data;
        
        // 기본 설정과 통계 데이터를 병합
        const mergedBoardList = defaultBoardConfigs.map(config => {
          const stat = statsData.boardStats?.find(
            (s: any) => s.boardType === config.id
          );
          
          return {
            ...config,
            postCount: stat?.postCount || 0,
            recentPost: stat?.latestPost ? {
              title: stat.latestPost.title,
              author: stat.latestPost.author?.username || '익명',
              createdAt: stat.latestPost.createdAt
            } : undefined
          };
        });
        
        setBoardList(mergedBoardList);
      } else {
        // API 응답이 없을 경우 기본 설정만 사용
        setBoardList(defaultBoardConfigs.map(config => ({
          ...config,
          postCount: 0
        })));
      }
    } catch (error: any) {
      console.error('게시판 통계 로딩 오류:', error);
      // 오류 시에도 기본 게시판은 표시
      setBoardList(defaultBoardConfigs.map(config => ({
        ...config,
        postCount: 0
      })));
      
      if (error?.code !== 'ECONNABORTED') {
        Alert.alert('알림', '게시판 정보를 불러오는데 실패했습니다. 나중에 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkBackendConnection();
    setRefreshing(false);
  };

  const navigateToBoard = (boardType: string) => {
    // 백엔드 enum을 URL 파라미터로 변환
    const boardTypeMapping: { [key: string]: string } = {
      'FREE': 'free',
      'INVESTMENT': 'investment', 
      'QNA': 'qna',
      'NEWS': 'news',
      'SUGGESTION': 'suggestion'
    };
    
    const urlBoardType = boardTypeMapping[boardType] || 'free';
    console.log(`게시판 이동: ${boardType} -> ${urlBoardType}`);
    router.push(`/community/board/${urlBoardType}` as any);
  };

  const handleMyPostsPress = async () => {
    const isLoggedIn = await requireLogin('내 작성글 보기', showToast);
    if (isLoggedIn) {
      router.push('/community/my-posts' as any);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleBookmarksPress = async () => {
    const isLoggedIn = await requireLogin('북마크 보기', showToast);
    if (isLoggedIn) {
      router.push('/community/bookmarks' as any);
    } else {
      setShowLoginModal(true);
    }
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
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          paddingTop: 40, // 상단 여백 추가
        }]}>
          <View style={styles.headerLeft}>
            <ThemedText style={styles.title}>커뮤니티</ThemedText>
            <ThemedText style={styles.subtitle}>경제 정보를 함께 나누고 토론해요</ThemedText>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleMyPostsPress}
            >
              <MaterialCommunityIcons 
                name="account-edit" 
                size={24} 
                color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleBookmarksPress}
            >
              <MaterialCommunityIcons 
                name="bookmark" 
                size={24} 
                color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {loading && connectionStatus === 'checking' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#007AFF'} />
            <ThemedText style={styles.loadingText}>
              {connectionStatus === 'checking' ? '백엔드 서버 연결 확인 중...' : '게시판 정보를 불러오는 중...'}
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
            <View style={styles.boardGrid}>
              {boardList.map((board) => (
              <TouchableOpacity
                key={board.id}
                style={[styles.boardCard, {
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }]}
                onPress={() => navigateToBoard(board.id)}
                activeOpacity={0.7}
              >
                <View style={styles.boardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: `${board.color}15` }]}>
                    <MaterialCommunityIcons 
                      name={board.icon as any} 
                      size={24} 
                      color={board.color} 
                    />
                  </View>
                  <View style={styles.boardInfo}>
                    <ThemedText style={styles.boardName}>{board.name}</ThemedText>
                    <ThemedText style={styles.boardDescription}>{board.description}</ThemedText>
                  </View>
                  <View style={styles.postCountContainer}>
                    <ThemedText style={styles.postCount}>{board.postCount}</ThemedText>
                    <ThemedText style={styles.postCountLabel}>게시글</ThemedText>
                  </View>
                </View>

                {board.recentPost && (
                  <View style={[styles.recentPost, {
                    borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                  }]}>
                    <View style={styles.recentPostContent}>
                      <ThemedText style={styles.recentPostTitle} numberOfLines={1}>
                        {board.recentPost.title}
                      </ThemedText>
                      <View style={styles.recentPostMeta}>
                        <ThemedText style={styles.recentPostAuthor}>
                          {board.recentPost.author}
                        </ThemedText>
                        <ThemedText style={styles.recentPostDate}>
                          {formatDate(board.recentPost.createdAt)}
                        </ThemedText>
                      </View>
                    </View>
                    <MaterialCommunityIcons 
                      name="chevron-right" 
                      size={16} 
                      color={colorScheme === 'dark' ? '#8e8e93' : '#c7c7cc'} 
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>


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
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  boardGrid: {
    gap: 16,
  },
  boardCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  boardName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  boardDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  postCountContainer: {
    alignItems: 'center',
  },
  postCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  postCountLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  recentPost: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  recentPostContent: {
    flex: 1,
  },
  recentPostTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  recentPostMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentPostAuthor: {
    fontSize: 12,
    opacity: 0.7,
    marginRight: 8,
  },
  recentPostDate: {
    fontSize: 12,
    opacity: 0.5,
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