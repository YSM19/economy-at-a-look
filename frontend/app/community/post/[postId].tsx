import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, Platform, TextInput, Alert, KeyboardAvoidingView, RefreshControl, Image, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '../../../components/ThemedText';
import { ThemedView } from '../../../components/ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageAttachment } from '../../../components/ImagePicker';
import { ReportModal } from '../../../components/ReportModal';
import { postApi, commentApi, reportApi } from '../../../services/api';
import { requireLogin } from '../../../utils/authUtils';
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
  boardType: string;
  images?: ImageAttachment[];
}

interface Comment {
  id: number;
  content: string;
  author: string;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
}

export default function PostDetailScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const { showToast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  const { width: screenWidth } = Dimensions.get('window');

  const boardConfigs: { [key: string]: { name: string; color: string; icon: string } } = {
    free: { name: '자유게시판', color: '#007AFF', icon: 'chat-outline' },
    investment: { name: '투자 정보 공유', color: '#34C759', icon: 'trending-up' },
    qna: { name: '질문 & 답변', color: '#FF9500', icon: 'help-circle-outline' },
    news: { name: '경제 뉴스 토론', color: '#5856D6', icon: 'newspaper' },
    suggestion: { name: '건의 및 문의', color: '#AF52DE', icon: 'comment-question-outline' }
  };

  // 샘플 데이터
  const samplePost: Post = {
    id: parseInt(postId as string) || 1,
    title: '2024년 투자 전략 공유합니다',
    content: `안녕하세요! 올해도 벌써 반이 지나가네요.
    
저는 지난 5년간 꾸준히 투자를 해오면서 나름의 노하우를 쌓았는데, 많은 분들과 공유하고 싶어서 글을 올립니다.

**제 투자 원칙**

1. **분산 투자는 필수**
   - 주식 50%, 채권 30%, 현금 20%
   - 국내외 주식 비율은 7:3 정도로 유지

2. **장기 관점으로 접근**
   - 최소 5년 이상의 장기 투자
   - 단기 변동성에 흔들리지 않기

3. **꾸준한 적립식 투자**
   - 매월 일정 금액을 투자
   - 시장 타이밍을 맞추려 하지 않기

**올해 포트폴리오**

- 미국 S&P 500 ETF: 30%
- 국내 대형주 ETF: 20%
- 중소형주 펀드: 10%
- 미국 국채 ETF: 20%
- 국내 회사채 펀드: 10%
- 현금 및 예금: 10%

여러분은 어떤 전략으로 투자하고 계신가요? 의견 교환했으면 좋겠습니다!`,
    author: '투자고수',
    createdAt: '2024-01-15T10:30:00Z',
    viewCount: 234,
    likeCount: 45,
    commentCount: 12,
    isLiked: false,
    isBookmarked: true,
    tags: ['투자', '포트폴리오', '2024'],
    boardType: 'investment',
    images: [
      {
        id: '1',
        uri: 'https://via.placeholder.com/400x300/007AFF/FFFFFF?text=Investment+Chart',
        name: 'portfolio_chart.jpg',
        type: 'image/jpeg',
        size: 245760
      },
      {
        id: '2', 
        uri: 'https://via.placeholder.com/400x300/34C759/FFFFFF?text=Asset+Allocation',
        name: 'asset_allocation.jpg',
        type: 'image/jpeg',
        size: 189440
      }
    ]
  };

  const sampleComments: Comment[] = [
    {
      id: 1,
      content: '정말 유용한 정보 감사합니다! 저도 비슷하게 투자하고 있는데, 중소형주 비율을 좀 더 늘려볼까 생각 중이에요.',
      author: '투자초보',
      createdAt: '2024-01-15T11:00:00Z',
      likeCount: 8,
      isLiked: false
    },
    {
      id: 2,
      content: '현금 비율이 10%면 좀 적은 것 같은데 어떻게 생각하시나요? 요즘 시장이 불안정해서 20% 정도는 현금으로 가지고 있어야 할 것 같아요.',
      author: '신중한투자자',
      createdAt: '2024-01-15T11:30:00Z',
      likeCount: 3,
      isLiked: true
    },
    {
      id: 3,
      content: '미국 ETF 추천 좀 해주실 수 있나요? VOO랑 SPY 중에 고민이에요.',
      author: 'ETF러버',
      createdAt: '2024-01-15T12:00:00Z',
      likeCount: 2,
      isLiked: false
    }
  ];

  useEffect(() => {
    checkLoginStatus();
    loadPost();
  }, [postId]);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      
      if (token && userInfoStr) {
        setIsLoggedIn(true);
        setUserInfo(JSON.parse(userInfoStr));
      }
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
    }
  };

  const loadPost = async () => {
    try {
      setIsLoading(true);
      
      const token = await AsyncStorage.getItem('userToken');
      console.log('게시글 상세 조회 - postId:', postId);
      
      const response = await postApi.getPost(parseInt(postId as string), token || undefined);
      
      if (response.data?.success && response.data?.data) {
        const postData = response.data.data;
        console.log('받은 게시글 데이터:', postData);
        
        const post: Post = {
          id: postData.id,
          title: postData.title,
          content: postData.content,
          author: postData.author?.username || '익명',
          createdAt: postData.createdAt,
          viewCount: postData.viewCount || 0,
          likeCount: postData.likeCount || 0,
          commentCount: postData.commentCount || 0,
          isLiked: postData.userInteraction?.isLiked || false,
          isBookmarked: postData.userInteraction?.isBookmarked || false,
          tags: postData.tags || [],
          boardType: postData.boardType?.toLowerCase() || 'free',
          images: postData.images?.map((img: any) => ({
            id: img.id.toString(),
            uri: img.imageUrl,
            name: img.originalFilename || 'image.jpg',
            type: img.contentType || 'image/jpeg',
            size: img.fileSize || 0
          })) || []
        };
        
        setPost(post);
        
        // 로컬에 저장된 좋아요/북마크 상태 불러오기
        try {
          const likeData = await AsyncStorage.getItem(`post_like_${post.id}`);
          const bookmarkData = await AsyncStorage.getItem(`post_bookmark_${post.id}`);
          
          if (likeData) {
            const likeState = JSON.parse(likeData);
            // 24시간 이내의 데이터만 유효
            if (Date.now() - likeState.timestamp < 24 * 60 * 60 * 1000) {
              setPost(prevPost => prevPost ? {
                ...prevPost,
                isLiked: likeState.isLiked
              } : null);
            }
          }
          
          if (bookmarkData) {
            const bookmarkState = JSON.parse(bookmarkData);
            // 24시간 이내의 데이터만 유효
            if (Date.now() - bookmarkState.timestamp < 24 * 60 * 60 * 1000) {
              setPost(prevPost => prevPost ? {
                ...prevPost,
                isBookmarked: bookmarkState.isBookmarked
              } : null);
            }
          }
        } catch (localError) {
          console.error('로컬 상태 불러오기 오류:', localError);
        }
        
        // 댓글도 로드
        try {
          console.log('댓글 로딩 시작 - postId:', postId);
          const commentResponse = await commentApi.getComments(parseInt(postId as string));
          console.log('댓글 응답:', commentResponse);
          
          if (commentResponse.data?.success && commentResponse.data?.data) {
            const commentsData = commentResponse.data.data;
            console.log('댓글 데이터:', commentsData);
            
            // ListResponse 구조에 맞게 수정
            const commentsList = commentsData.comments || commentsData;
            const comments: Comment[] = commentsList.map((comment: any) => ({
              id: comment.id,
              content: comment.content,
              author: comment.author?.username || '익명',
              createdAt: comment.createdAt,
              likeCount: comment.likeCount || 0,
              isLiked: comment.userInteraction?.isLiked || false
            }));
            console.log('변환된 댓글:', comments);
            setComments(comments);
          } else {
            console.log('댓글 데이터가 없습니다.');
            setComments([]);
          }
        } catch (commentError: any) {
          console.error('댓글 로딩 오류:', commentError);
          console.error('댓글 오류 상세:', {
            message: commentError.message,
            status: commentError.response?.status,
            data: commentError.response?.data
          });
          setComments([]);
        }
      } else {
        throw new Error('게시글 데이터를 받을 수 없습니다.');
      }
    } catch (error) {
      console.error('게시글 로딩 오류:', error);
      Alert.alert('오류', '게시글을 불러올 수 없습니다.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPost();
    setRefreshing(false);
  };

  const handleLike = async () => {
    const isLoggedIn = await requireLogin('좋아요', showToast);
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    if (!post) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const response = await postApi.likePost(post.id, token);
      
      if (response.data?.success && response.data?.data) {
        const likeData = response.data.data;
        const updatedPost = {
          ...post,
          isLiked: likeData.isLiked,
          likeCount: likeData.likeCount
        };
        setPost(updatedPost);
        
        // 로컬에 상태 저장
        await AsyncStorage.setItem(`post_like_${post.id}`, JSON.stringify({
          isLiked: likeData.isLiked,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('좋아요 오류:', error);
      Alert.alert('오류', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleBookmark = async () => {
    const isLoggedIn = await requireLogin('북마크', showToast);
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    if (!post) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const response = await postApi.bookmarkPost(post.id, token);
      
      if (response.data?.success && response.data?.data) {
        const bookmarkData = response.data.data;
        const updatedPost = {
          ...post,
          isBookmarked: bookmarkData.isBookmarked
        };
        setPost(updatedPost);
        
        // 로컬에 상태 저장
        await AsyncStorage.setItem(`post_bookmark_${post.id}`, JSON.stringify({
          isBookmarked: bookmarkData.isBookmarked,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('북마크 오류:', error);
      Alert.alert('오류', '북마크 처리 중 오류가 발생했습니다.');
    }
  };

  const handleCommentLike = async (commentId: number) => {
    const isLoggedIn = await requireLogin('댓글 좋아요', showToast);
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const response = await commentApi.likeComment(commentId, token);
      
      if (response.data?.success && response.data?.data) {
        const likeData = response.data.data;
        const updatedComments = comments.map(comment => 
          comment.id === commentId
            ? {
                ...comment,
                isLiked: likeData.isLiked,
                likeCount: likeData.likeCount
              }
            : comment
        );
        setComments(updatedComments);
      }
    } catch (error) {
      console.error('댓글 좋아요 오류:', error);
      Alert.alert('오류', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleSubmitComment = async () => {
    const isLoggedIn = await requireLogin('댓글 작성', showToast);
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    if (!newComment.trim()) {
      Alert.alert('알림', '댓글 내용을 입력해주세요.');
      return;
    }

    if (!post) return;

    setIsSubmittingComment(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const commentData = {
        postId: post.id,
        content: newComment.trim()
      };

      console.log('댓글 작성 요청 데이터:', commentData);
      console.log('댓글 작성 토큰:', token ? '토큰 있음' : '토큰 없음');

      const response = await commentApi.createComment(commentData, token);
      
      if (response.data?.success && response.data?.data) {
        const newCommentObj: Comment = {
          id: response.data.data.id,
          content: response.data.data.content,
          author: response.data.data.author?.username || userInfo?.username || '익명',
          createdAt: response.data.data.createdAt,
          likeCount: 0,
          isLiked: false
        };

        setComments([...comments, newCommentObj]);
        setNewComment('');
        
        setPost({
          ...post,
          commentCount: post.commentCount + 1
        });
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      Alert.alert('오류', '댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditPost = () => {
    if (!post) return;
    
    // 게시글 수정 페이지로 이동
    router.push(`/community/edit/${post.id}` as any);
  };

  const handleDeletePost = async () => {
    if (!post) return;

    Alert.alert(
      '게시글 삭제',
      '정말로 이 게시글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              if (!token) {
                Alert.alert('오류', '로그인이 필요합니다.');
                return;
              }

              await postApi.deletePost(post.id, token);
              
              Alert.alert('삭제 완료', '게시글이 삭제되었습니다.', [
                { text: '확인', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('게시글 삭제 오류:', error);
              Alert.alert('오류', '게시글 삭제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleEditComment = async (commentId: number, currentContent: string) => {
    const isLoggedIn = await requireLogin('댓글 수정', showToast);
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    // 간단한 입력 다이얼로그로 수정
    Alert.prompt(
      '댓글 수정',
      '댓글 내용을 수정하세요:',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '수정',
          onPress: async (newContent) => {
            if (!newContent || newContent.trim() === '') {
              Alert.alert('알림', '댓글 내용을 입력해주세요.');
              return;
            }

            try {
              const token = await AsyncStorage.getItem('userToken');
              if (!token) {
                Alert.alert('오류', '로그인이 필요합니다.');
                return;
              }

              const updateData = { content: newContent.trim() };
              await commentApi.updateComment(commentId, updateData, token);

              // 댓글 목록 업데이트
              setComments(prevComments =>
                prevComments.map(comment =>
                  comment.id === commentId
                    ? { ...comment, content: newContent.trim() }
                    : comment
                )
              );

              Alert.alert('수정 완료', '댓글이 수정되었습니다.');
            } catch (error) {
              console.error('댓글 수정 오류:', error);
              Alert.alert('오류', '댓글 수정 중 오류가 발생했습니다.');
            }
          }
        }
      ],
      'plain-text',
      currentContent
    );
  };

  const handleDeleteComment = async (commentId: number) => {
    const isLoggedIn = await requireLogin('댓글 삭제', showToast);
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    Alert.alert(
      '댓글 삭제',
      '정말로 이 댓글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              if (!token) {
                Alert.alert('오류', '로그인이 필요합니다.');
                return;
              }

              await commentApi.deleteComment(commentId, token);

              // 댓글 목록에서 제거
              setComments(prevComments =>
                prevComments.filter(comment => comment.id !== commentId)
              );

              // 게시글 댓글 수 감소
              if (post) {
                setPost({
                  ...post,
                  commentCount: post.commentCount - 1
                });
              }

              Alert.alert('삭제 완료', '댓글이 삭제되었습니다.');
            } catch (error) {
              console.error('댓글 삭제 오류:', error);
              Alert.alert('오류', '댓글 삭제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
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
        targetId: post?.id,
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

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageModalVisible(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  if (isLoading || !post) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ThemedText>게시글을 불러오는 중...</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const currentBoard = boardConfigs[post.boardType];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* 헤더 */}
          <View style={[styles.header, {
            backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
            borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }]}>
            <View style={styles.boardBadge}>
              <View style={[styles.boardIconSmall, { backgroundColor: `${currentBoard.color}15` }]}>
                <MaterialCommunityIcons 
                  name={currentBoard.icon as any} 
                  size={16} 
                  color={currentBoard.color} 
                />
              </View>
              <ThemedText style={[styles.boardBadgeText, { color: currentBoard.color }]}>
                {currentBoard.name}
              </ThemedText>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleBookmark}
              >
                <MaterialCommunityIcons 
                  name={post.isBookmarked ? "bookmark" : "bookmark-outline"} 
                  size={24} 
                  color={post.isBookmarked ? "#FFCC00" : (colorScheme === 'dark' ? '#ffffff' : '#000000')} 
                />
              </TouchableOpacity>
              
              {/* 게시글 작성자인 경우 수정/삭제 옵션 표시 */}
              {isLoggedIn && userInfo && post.author === userInfo.username && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => {
                    Alert.alert(
                      '게시글 관리',
                      '어떤 작업을 하시겠습니까?',
                      [
                        { text: '취소', style: 'cancel' },
                        { text: '수정', onPress: handleEditPost },
                        { text: '삭제', style: 'destructive', onPress: handleDeletePost }
                      ]
                    );
                  }}
                >
                  <MaterialCommunityIcons 
                    name="dots-vertical" 
                    size={24} 
                    color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
                  />
                </TouchableOpacity>
              )}
              
              {/* 게시글 작성자가 아닌 경우 신고 옵션 표시 */}
              {(!isLoggedIn || !userInfo || post.author !== userInfo.username) && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={async () => {
                    const isLoggedIn = await requireLogin('게시글 신고', showToast);
                    if (isLoggedIn) {
                      setIsReportModalVisible(true);
                    }
                  }}
                >
                  <MaterialCommunityIcons 
                    name="flag-outline" 
                    size={24} 
                    color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* 게시글 내용 */}
            <View style={[styles.postContainer, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }]}>
              <ThemedText style={styles.postTitle}>{post.title}</ThemedText>
              
              <View style={styles.postMeta}>
                <View style={styles.postMetaLeft}>
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
                </View>
              </View>

              {post.tags && post.tags.length > 0 && (
                <View style={styles.tagContainer}>
                  {post.tags.map((tag) => (
                    <View key={tag} style={[styles.tag, { backgroundColor: `${currentBoard.color}15` }]}>
                      <ThemedText style={[styles.tagText, { color: currentBoard.color }]}>
                        #{tag}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

              <ThemedText style={styles.postContent}>{post.content}</ThemedText>

              {/* 이미지 갤러리 */}
              {post.images && post.images.length > 0 && (
                <View style={styles.imageGallery}>
                  <ThemedText style={styles.imageGalleryTitle}>첨부 이미지</ThemedText>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.imageList}
                  >
                    {post.images.map((image, index) => (
                      <TouchableOpacity
                        key={image.id}
                        style={styles.imageContainer}
                        onPress={() => openImageViewer(index)}
                      >
                        <Image source={{ uri: image.uri }} style={styles.thumbnailImage} />
                        <View style={styles.imageInfo}>
                          <ThemedText style={styles.imageName} numberOfLines={1}>
                            {image.name}
                          </ThemedText>
                          <ThemedText style={styles.imageSize}>
                            {formatFileSize(image.size)}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 좋아요 버튼 */}
              <View style={styles.postActions}>
                <TouchableOpacity
                  style={[styles.likeButton, {
                    backgroundColor: post.isLiked ? `${currentBoard.color}15` : 'transparent',
                    borderColor: currentBoard.color
                  }]}
                  onPress={handleLike}
                >
                  <MaterialCommunityIcons 
                    name={post.isLiked ? "heart" : "heart-outline"} 
                    size={20} 
                    color={post.isLiked ? currentBoard.color : (colorScheme === 'dark' ? '#8e8e93' : '#8e8e93')} 
                  />
                  <ThemedText style={[styles.likeButtonText, post.isLiked && { color: currentBoard.color }]}>
                    좋아요 {post.likeCount}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* 댓글 섹션 */}
            <View style={[styles.commentsSection, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }]}>
              <ThemedText style={styles.commentsTitle}>댓글 {comments.length}</ThemedText>
              
              {comments.map((comment) => (
                <View key={comment.id} style={[styles.commentItem, {
                  borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }]}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentHeaderLeft}>
                      <ThemedText style={styles.commentAuthor}>{comment.author}</ThemedText>
                      <ThemedText style={styles.commentDate}>{formatDate(comment.createdAt)}</ThemedText>
                    </View>
                    
                    {/* 댓글 작성자인 경우 수정/삭제 옵션 표시 */}
                    {isLoggedIn && userInfo && comment.author === userInfo.username ? (
                      <TouchableOpacity
                        style={styles.commentActionButton}
                        onPress={() => {
                          Alert.alert(
                            '댓글 관리',
                            '어떤 작업을 하시겠습니까?',
                            [
                              { text: '취소', style: 'cancel' },
                              { text: '수정', onPress: () => handleEditComment(comment.id, comment.content) },
                              { text: '삭제', style: 'destructive', onPress: () => handleDeleteComment(comment.id) }
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
                    ) : (
                      /* 댓글 작성자가 아닌 경우 신고 옵션 표시 */
                      <TouchableOpacity
                        style={styles.commentActionButton}
                        onPress={async () => {
                          const isLoggedIn = await requireLogin('댓글 신고', showToast);
                          if (isLoggedIn) {
                            Alert.alert(
                              '댓글 신고',
                              '이 댓글을 신고하시겠습니까?',
                              [
                                { text: '취소', style: 'cancel' },
                                { 
                                  text: '신고', 
                                  style: 'destructive',
                                  onPress: () => {
                                    // 댓글 신고 로직 구현 필요
                                    Alert.alert('신고', '댓글 신고 기능은 준비 중입니다.');
                                  }
                                }
                              ]
                            );
                          }
                        }}
                      >
                        <MaterialCommunityIcons 
                          name="flag-outline" 
                          size={16} 
                          color={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'} 
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <ThemedText style={styles.commentContent}>{comment.content}</ThemedText>
                  
                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      style={styles.commentLikeButton}
                      onPress={() => handleCommentLike(comment.id)}
                    >
                      <MaterialCommunityIcons 
                        name={comment.isLiked ? "heart" : "heart-outline"} 
                        size={16} 
                        color={comment.isLiked ? "#FF3B30" : (colorScheme === 'dark' ? '#8e8e93' : '#8e8e93')} 
                      />
                      <ThemedText style={[styles.commentLikeText, comment.isLiked && { color: '#FF3B30' }]}>
                        {comment.likeCount}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* 댓글 입력 */}
          <View style={[styles.commentInputContainer, {
            backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
            borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }]}>
            <View style={[styles.commentInputWrapper, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }]}>
              <TextInput
                style={[styles.commentInput, {
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                placeholder={isLoggedIn ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있습니다"}
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                value={newComment}
                onChangeText={setNewComment}
                multiline={true}
                maxLength={500}
                editable={isLoggedIn}
              />
              <TouchableOpacity
                style={[styles.commentSubmitButton, {
                  backgroundColor: currentBoard.color,
                  opacity: (!newComment.trim() || isSubmittingComment || !isLoggedIn) ? 0.5 : 1
                }]}
                onPress={handleSubmitComment}
                disabled={!newComment.trim() || isSubmittingComment || !isLoggedIn}
              >
                <MaterialCommunityIcons 
                  name="send" 
                  size={20} 
                  color="#ffffff" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* 이미지 뷰어 모달 */}
          {post?.images && post.images.length > 0 && (
            <Modal
              visible={isImageModalVisible}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setIsImageModalVisible(false)}
            >
              <View style={styles.imageModalOverlay}>
                <View style={styles.imageModalContainer}>
                  <View style={styles.imageModalHeader}>
                    <ThemedText style={styles.imageModalTitle}>
                      {selectedImageIndex + 1} / {post.images.length}
                    </ThemedText>
                    <TouchableOpacity onPress={() => setIsImageModalVisible(false)}>
                      <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.imageModalViewer}
                    contentOffset={{ x: selectedImageIndex * screenWidth, y: 0 }}
                    onMomentumScrollEnd={(event) => {
                      const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                      setSelectedImageIndex(index);
                    }}
                  >
                    {post.images.map((image) => (
                      <View key={image.id} style={styles.fullImageContainer}>
                        <Image 
                          source={{ uri: image.uri }} 
                          style={styles.fullImage}
                          resizeMode="contain"
                        />
                      </View>
                    ))}
                  </ScrollView>

                  <View style={styles.imageModalFooter}>
                    <View style={styles.imageModalInfo}>
                      <ThemedText style={styles.imageModalName}>
                        {post.images[selectedImageIndex]?.name}
                      </ThemedText>
                      <ThemedText style={styles.imageModalSize}>
                        {formatFileSize(post.images[selectedImageIndex]?.size || 0)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* 신고 모달 */}
          <ReportModal
            visible={isReportModalVisible}
            onClose={() => setIsReportModalVisible(false)}
            onSubmit={handleReport}
            targetType="post"
            targetId={post?.id || 0}
          />

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
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  boardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boardIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  postContainer: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  postTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 16,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  postMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAuthor: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 12,
  },
  postDate: {
    fontSize: 14,
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
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  likeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  commentsSection: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  commentItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionButton: {
    padding: 4,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  commentDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  commentContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    padding: 4,
  },
  commentLikeText: {
    fontSize: 12,
    opacity: 0.7,
  },
  commentInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  commentSubmitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 이미지 갤러리 스타일
  imageGallery: {
    marginVertical: 20,
  },
  imageGalleryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  imageList: {
    flexDirection: 'row',
  },
  imageContainer: {
    marginRight: 12,
  },
  thumbnailImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  imageInfo: {
    marginTop: 4,
    width: 120,
  },
  imageName: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageSize: {
    fontSize: 10,
    opacity: 0.6,
  },
  // 이미지 뷰어 모달 스타일
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  imageModalContainer: {
    flex: 1,
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  imageModalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  imageModalViewer: {
    flex: 1,
  },
  fullImageContainer: {
    width: Dimensions.get('window').width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: Dimensions.get('window').width - 40,
    height: '80%',
  },
  imageModalFooter: {
    padding: 20,
    paddingBottom: 40,
  },
  imageModalInfo: {
    alignItems: 'center',
  },
  imageModalName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  imageModalSize: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.7,
  },
}); 