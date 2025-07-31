import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, Platform, RefreshControl, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ThemedText } from '../../../components/ThemedText';
import { ThemedView } from '../../../components/ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReportModal } from '../../../components/ReportModal';
import { postApi, reportApi } from '../../../services/api';
import { requireLogin, checkLoginStatusWithValidation, requireLoginWithAlert } from '../../../utils/authUtils';
import { useToast } from '../../../components/ToastProvider';
import { ConfirmationModal } from '../../../components/ConfirmationModal';

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
  tags?: string[];
}

interface BoardConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export default function BoardScreen() {
  const router = useRouter();
  const { boardType } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<number | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const { showToast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const boardConfigs: { [key: string]: BoardConfig } = {
    free: {
      id: 'free',
      name: '자유게시판',
      description: '자유롭게 이야기를 나누세요',
      icon: 'chat-outline',
      color: '#007AFF'
    },
    investment: {
      id: 'investment',
      name: '투자 정보 공유',
      description: '투자 팁과 정보를 공유해요',
      icon: 'trending-up',
      color: '#34C759'
    },
    qna: {
      id: 'qna',
      name: '질문 & 답변',
      description: '궁금한 것을 물어보세요',
      icon: 'help-circle-outline',
      color: '#FF9500'
    },
    news: {
      id: 'news',
      name: '경제 뉴스 토론',
      description: '경제 뉴스에 대해 토론해요',
      icon: 'newspaper',
      color: '#5856D6'
    },
    suggestion: {
      id: 'suggestion',
      name: '건의 및 문의',
      description: '앱 개선사항이나 문의사항을 남겨주세요',
      icon: 'comment-question-outline',
      color: '#AF52DE'
    }
  };

  // BoardType 매핑 수정 (백엔드 enum과 일치시키기)
  const boardTypeMapping: { [key: string]: string } = {
    'free': 'FREE',
    'investment': 'INVESTMENT', 
    'qna': 'QNA',
    'news': 'NEWS',
    'suggestion': 'SUGGESTION'
  };

  const currentBoard = boardConfigs[boardType as string] || boardConfigs.free;
  const backendBoardType = boardTypeMapping[boardType as string] || 'FREE';

  // 디버깅을 위한 로그
  useEffect(() => {
    console.log('게시판 페이지 - URL boardType:', boardType);
    console.log('게시판 페이지 - 백엔드 boardType:', backendBoardType);
    console.log('게시판 페이지 - 현재 게시판:', currentBoard.name);
  }, [boardType, backendBoardType, currentBoard]);

  useEffect(() => {
    checkLoginStatus();
    loadPosts();
  }, [boardType, sortBy]);

  // 화면이 포커스될 때마다 게시글 목록을 다시 로드
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [boardType, sortBy])
  );

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      
      if (token && userInfoStr) {
        setIsLoggedIn(true);
        setUserInfo(JSON.parse(userInfoStr));
      } else {
        setIsLoggedIn(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
      setIsLoggedIn(false);
      setUserInfo(null);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await postApi.getPosts(
        backendBoardType, 
        sortBy, 
        0, 
        20, 
        searchQuery || undefined
      );
      
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
          tags: post.tags || []
        }));

        // 로컬에 저장된 좋아요/북마크 상태 불러오기
        const postsWithLocalState = await Promise.all(
          postsData.map(async (post: Post) => {
            try {
              const likeData = await AsyncStorage.getItem(`post_like_${post.id}`);
              const bookmarkData = await AsyncStorage.getItem(`post_bookmark_${post.id}`);
              
              let updatedPost = { ...post };
              
              if (likeData) {
                const likeState = JSON.parse(likeData);
                if (Date.now() - likeState.timestamp < 24 * 60 * 60 * 1000) {
                  updatedPost.isLiked = likeState.isLiked;
                }
              }
              
              if (bookmarkData) {
                const bookmarkState = JSON.parse(bookmarkData);
                if (Date.now() - bookmarkState.timestamp < 24 * 60 * 60 * 1000) {
                  updatedPost.isBookmarked = bookmarkState.isBookmarked;
                }
              }
              
              return updatedPost;
            } catch (error) {
              console.error(`게시글 ${post.id} 로컬 상태 불러오기 오류:`, error);
              return post;
            }
          })
        );

        setPosts(postsWithLocalState);
      } else {
        setPosts([]);
      }
    } catch (error: any) {
      console.error('게시글 로딩 오류:', error);
      setPosts([]);
      
      if (error?.code !== 'ECONNABORTED') {
        Alert.alert('오류', '게시글을 불러오는데 실패했습니다. 나중에 다시 시도해주세요.');
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handlePostPress = (postId: number) => {
    console.log('게시글 클릭 - postId:', postId);
    console.log('이동할 경로:', `/community/post/${postId}`);
    router.push(`/community/post/${postId}` as any);
  };

  const handleWritePress = async () => {
    const { isLoggedIn } = await checkLoginStatusWithValidation();
    if (isLoggedIn) {
      router.push(`/community/write?boardType=${boardType}` as any);
    } else {
      requireLoginWithAlert('글 작성', showToast, setShowLoginModal);
    }
  };

  const handleReportPost = async (postId: number) => {
    const { isLoggedIn } = await checkLoginStatusWithValidation();
    if (!isLoggedIn) {
      requireLoginWithAlert('게시글 신고', showToast, setShowLoginModal);
      return;
    }
    
    setReportingPostId(postId);
    setIsReportModalVisible(true);
  };

  const handleReport = async (reason: string, details: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }
      
      // reason을 enum으로 변환
      const reasonEnum = reason.toUpperCase();
      
      // reasonText 매핑
      const reasonTextMap: { [key: string]: string } = {
        'SPAM': '스팸 또는 광고',
        'HARASSMENT': '괴롭힘 또는 혐오',
        'INAPPROPRIATE': '부적절한 콘텐츠',
        'MISINFORMATION': '잘못된 정보',
        'COPYRIGHT': '저작권 침해',
        'PERSONAL_INFO': '개인정보 노출',
        'OTHER': '기타'
      };
      
      const reportData = {
        targetType: 'POST', // enum으로 변환
        targetId: reportingPostId,
        reason: reasonEnum,
        reasonText: reasonTextMap[reasonEnum] || '기타',
        details: details || ''
      };

      console.log('신고 데이터:', reportData);
      
      await reportApi.createReport(reportData, token);
      
      Alert.alert('신고 완료', '신고가 성공적으로 제출되었습니다.');
      
    } catch (error) {
      console.error('신고 제출 오류:', error);
      Alert.alert('오류', '신고 제출 중 오류가 발생했습니다.');
      throw error;
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

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount);
    }
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 */}
        <View style={[styles.header, {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)/community')}
          >
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
            />
          </TouchableOpacity>
          
          <View style={styles.boardInfo}>
            <View style={[styles.boardIcon, { backgroundColor: `${currentBoard.color}15` }]}>
              <MaterialCommunityIcons 
                name={currentBoard.icon as any} 
                size={24} 
                color={currentBoard.color} 
              />
            </View>
            <View style={styles.boardTitleContainer}>
              <ThemedText style={styles.boardTitle}>{currentBoard.name}</ThemedText>
              <ThemedText style={styles.boardDescription}>{currentBoard.description}</ThemedText>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.writeButton, { backgroundColor: currentBoard.color }]}
            onPress={handleWritePress}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* 검색 및 필터 */}
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
              style={[styles.sortButton, sortBy === 'latest' && { backgroundColor: currentBoard.color }]}
              onPress={() => setSortBy('latest')}
            >
              <ThemedText style={[styles.sortButtonText, sortBy === 'latest' && { color: '#ffffff' }]}>
                최신순
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'popular' && { backgroundColor: currentBoard.color }]}
              onPress={() => setSortBy('popular')}
            >
              <ThemedText style={[styles.sortButtonText, sortBy === 'popular' && { color: '#ffffff' }]}>
                인기순
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* 게시글 목록 */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {sortedPosts.length === 0 ? (
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
              {sortedPosts.map((post) => (
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
                    <ThemedText style={styles.postTitle} numberOfLines={2}>
                      {post.title}
                    </ThemedText>
                    {post.tags && post.tags.length > 0 && (
                      <View style={styles.tagContainer}>
                        {post.tags.slice(0, 2).map((tag) => (
                          <View 
                            key={tag} 
                            style={[styles.tag, { backgroundColor: `${currentBoard.color}15` }]}
                          >
                            <ThemedText style={[styles.tagText, { color: currentBoard.color }]}>
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
                    
                    <TouchableOpacity
                      style={styles.moreButton}
                      onPress={() => {
                        Alert.alert(
                          '게시글 옵션',
                          '어떤 작업을 하시겠습니까?',
                          [
                            { text: '취소', style: 'cancel' },
                            { 
                              text: '신고하기', 
                              style: 'destructive',
                              onPress: () => handleReportPost(post.id)
                            }
                          ]
                        );
                      }}
                    >
                      <MaterialCommunityIcons 
                        name="dots-vertical" 
                        size={16} 
                        color={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'} 
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* 신고 모달 */}
      <ReportModal
        visible={isReportModalVisible}
        onClose={() => {
          setIsReportModalVisible(false);
          setReportingPostId(null);
        }}
        onSubmit={handleReport}
        targetType="post"
        targetId={reportingPostId || 0}
      />
      <ConfirmationModal
        visible={showLoginModal}
        title="로그인 필요"
        message="해당 기능을 사용하려면 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?"
        confirmText="이동"
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
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingTop: 40, // 상단 여백 추가
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 2,
    marginRight: 8,
  },
  boardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 2,
  },
  boardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  boardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  boardDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  writeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
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
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
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
  moreButton: {
    padding: 8,
    marginLeft: 8,
  },
}); 