import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, Platform, TextInput, Alert, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImagePickerComponent, ImageAttachment } from '../../components/ImagePicker';
import { postApi, fileUploadApi } from '../../services/api';
import { requireLogin } from '../../utils/authUtils';
import { useToast } from '../../components/ToastProvider';
import { ConfirmationModal } from '../../components/ConfirmationModal';

interface BoardOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function WritePostScreen() {
  const router = useRouter();
  const { boardType } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  // URL 파라미터의 게시판 타입을 백엔드 enum으로 매핑
  const boardTypeMapping: { [key: string]: string } = {
    'free': 'FREE',
    'investment': 'INVESTMENT', 
    'qna': 'QNA',
    'news': 'NEWS',
    'suggestion': 'SUGGESTION'
  };

  const [selectedBoard, setSelectedBoard] = useState(
    boardTypeMapping[boardType as string] || 'FREE'
  );

  // 디버깅을 위한 로그
  useEffect(() => {
    console.log('글 작성 페이지 - URL boardType:', boardType);
    console.log('글 작성 페이지 - 선택된 boardType:', selectedBoard);
  }, [boardType, selectedBoard]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBoardModalVisible, setIsBoardModalVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const { showToast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const boardOptions: BoardOption[] = [
    { id: 'free', name: '자유게시판', icon: 'chat-outline', color: '#007AFF' },
    { id: 'investment', name: '투자 정보 공유', icon: 'trending-up', color: '#34C759' },
    { id: 'qna', name: '질문 & 답변', icon: 'help-circle-outline', color: '#FF9500' },
    { id: 'news', name: '경제 뉴스 토론', icon: 'newspaper', color: '#5856D6' },
    { id: 'suggestion', name: '건의 및 문의', icon: 'comment-question-outline', color: '#AF52DE' }
  ];

  // selectedBoard는 백엔드 enum 값이므로, boardOptions에서 찾을 때는 역매핑 필요
  const selectedBoardInfo = boardOptions.find(board => boardTypeMapping[board.id] === selectedBoard) || boardOptions[0];

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const isLoggedIn = await requireLogin('글 작성', showToast);
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      
      if (token && userInfoStr) {
        setIsLoggedIn(true);
        setUserInfo(JSON.parse(userInfoStr));
      } else {
        router.back();
      }
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
      router.back();
    }
  };

  const addTag = () => {
    const trimmedTag = currentTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    
    if (!content.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      // 이미지 업로드 처리
      let uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        try {
          console.log('이미지 업로드 시작...');
          const uploadPromises = images.map(async (image) => {
            const formData = new FormData();
            formData.append('file', {
              uri: image.uri,
              type: image.type,
              name: image.name,
            } as any);
            formData.append('category', 'post');
            
            const uploadResponse = await fileUploadApi.uploadImage(formData, token);
            return uploadResponse.data?.data?.fileUrl;
          });
          
          uploadedImageUrls = await Promise.all(uploadPromises);
          console.log('업로드된 이미지 URLs:', uploadedImageUrls);
        } catch (uploadError) {
          console.error('이미지 업로드 오류:', uploadError);
          Alert.alert('경고', '이미지 업로드에 실패했습니다. 텍스트만 작성하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '계속', onPress: () => {} }
          ]);
          return;
        }
      }

      // 이미지 정보를 백엔드가 기대하는 형식으로 변환
      const postImages = uploadedImageUrls.map((url, index) => ({
        uploadedImageUrl: url,
        originalFilename: `image_${index + 1}.jpg`,
        contentType: 'image/jpeg',
        fileSize: 0,
        displayOrder: index + 1
      }));

      const postData = {
        title: title.trim(),
        content: content.trim(),
        boardType: selectedBoard,
        tags: tags,
        images: postImages
      };

      console.log('글 작성 데이터:', postData);
      console.log('선택된 게시판 타입:', selectedBoard);
      
      const response = await postApi.createPost(postData, token);
      console.log('글 작성 응답:', response);
      
      if (response.data?.success) {
        Alert.alert(
          '성공',
          '글이 성공적으로 작성되었습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                router.back();
              }
            }
          ]
        );
      } else {
        throw new Error(response.data?.message || '글 작성에 실패했습니다.');
      }
      
    } catch (error: any) {
      console.error('글 작성 오류:', error);
      
      let errorMessage = '글 작성 중 오류가 발생했습니다. 다시 시도해주세요.';
      
      if (error.response?.status === 400) {
        errorMessage = '입력 정보가 올바르지 않습니다. 제목과 내용을 확인해주세요.';
      } else if (error.response?.status === 401) {
        errorMessage = '로그인이 필요합니다. 다시 로그인해주세요.';
      } else if (error.response?.status === 403) {
        errorMessage = '글 작성 권한이 없습니다.';
      } else if (error.response?.status >= 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = '네트워크 연결을 확인해주세요.';
      }
      
      Alert.alert('오류', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (title.trim() || content.trim() || images.length > 0) {
      Alert.alert(
        '작성 취소',
        '작성 중인 내용이 있습니다. 정말 취소하시겠습니까?',
        [
          { text: '계속 작성', style: 'cancel' },
          { text: '취소', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  if (!isLoggedIn) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ThemedText>로그인 확인 중...</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

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
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <MaterialCommunityIcons 
                name="close" 
                size={24} 
                color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>
            
            <ThemedText style={styles.headerTitle}>글쓰기</ThemedText>
            
            <TouchableOpacity
              style={[styles.submitButton, { 
                backgroundColor: selectedBoardInfo.color,
                opacity: (!title.trim() || !content.trim() || isSubmitting) ? 0.5 : 1
              }]}
              onPress={handleSubmit}
              disabled={!title.trim() || !content.trim() || isSubmitting}
            >
              <ThemedText style={styles.submitButtonText}>
                {isSubmitting ? '작성 중...' : '완료'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
            {/* 게시판 선택 */}
            <TouchableOpacity
              style={[styles.boardSelector, {
                backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }]}
              onPress={() => setIsBoardModalVisible(true)}
            >
              <View style={styles.boardSelectorContent}>
                <View style={[styles.boardIconSmall, { backgroundColor: `${selectedBoardInfo.color}15` }]}>
                  <MaterialCommunityIcons 
                    name={selectedBoardInfo.icon as any} 
                    size={20} 
                    color={selectedBoardInfo.color} 
                  />
                </View>
                <ThemedText style={styles.boardSelectorText}>{selectedBoardInfo.name}</ThemedText>
              </View>
              <MaterialCommunityIcons 
                name="chevron-down" 
                size={20} 
                color={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'} 
              />
            </TouchableOpacity>

            {/* 제목 입력 */}
            <View style={[styles.inputContainer, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }]}>
              <TextInput
                style={[styles.titleInput, {
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                placeholder="제목을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                multiline={false}
              />
              <ThemedText style={styles.characterCount}>{title.length}/100</ThemedText>
            </View>

            {/* 내용 입력 */}
            <View style={[styles.inputContainer, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              minHeight: 300
            }]}>
              <TextInput
                style={[styles.contentInput, {
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                placeholder="내용을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                value={content}
                onChangeText={setContent}
                maxLength={5000}
                multiline={true}
                textAlignVertical="top"
              />
              <View style={styles.contentFooter}>
                <ThemedText style={styles.characterCount}>{content.length}/5000</ThemedText>
              </View>
            </View>

            {/* 태그 입력 */}
            <View style={[styles.inputContainer, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }]}>
              <ThemedText style={styles.sectionTitle}>태그 (선택사항)</ThemedText>
              
              {tags.length > 0 && (
                <View style={styles.tagContainer}>
                  {tags.map((tag) => (
                    <View key={tag} style={[styles.tag, { backgroundColor: `${selectedBoardInfo.color}15` }]}>
                      <ThemedText style={[styles.tagText, { color: selectedBoardInfo.color }]}>
                        #{tag}
                      </ThemedText>
                      <TouchableOpacity onPress={() => removeTag(tag)}>
                        <MaterialCommunityIcons 
                          name="close-circle" 
                          size={16} 
                          color={selectedBoardInfo.color} 
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.tagInputContainer}>
                <TextInput
                  style={[styles.tagInput, {
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
                    backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7'
                  }]}
                  placeholder="태그 입력 후 추가 버튼을 누르세요"
                  placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                  value={currentTag}
                  onChangeText={setCurrentTag}
                  maxLength={20}
                  onSubmitEditing={addTag}
                />
                <TouchableOpacity
                  style={[styles.addTagButton, { 
                    backgroundColor: selectedBoardInfo.color,
                    opacity: (!currentTag.trim() || tags.length >= 5) ? 0.5 : 1
                  }]}
                  onPress={addTag}
                  disabled={!currentTag.trim() || tags.length >= 5}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
              
              <ThemedText style={styles.tagHelper}>
                {tags.length}/5 개의 태그 • 엔터키로도 추가할 수 있습니다
              </ThemedText>
            </View>

            {/* 이미지 첨부 */}
            <View style={[styles.inputContainer, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }]}>
              <ImagePickerComponent
                images={images}
                onImagesChange={setImages}
                maxImages={5}
                maxSizeInMB={10}
              />
            </View>
          </ScrollView>

          {/* 게시판 선택 모달 */}
          <Modal
            visible={isBoardModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsBoardModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, {
                backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff'
              }]}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>게시판 선택</ThemedText>
                  <TouchableOpacity onPress={() => setIsBoardModalVisible(false)}>
                    <MaterialCommunityIcons 
                      name="close" 
                      size={24} 
                      color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
                    />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent}>
                  {boardOptions.map((board) => (
                    <TouchableOpacity
                      key={board.id}
                      style={[styles.boardOption, {
                        backgroundColor: selectedBoard === boardTypeMapping[board.id] ? `${board.color}15` : 'transparent',
                        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }]}
                      onPress={() => {
                        console.log('선택된 게시판 ID:', board.id);
                        console.log('매핑된 boardType:', boardTypeMapping[board.id]);
                        setSelectedBoard(boardTypeMapping[board.id] || 'FREE');
                        setIsBoardModalVisible(false);
                      }}
                    >
                      <View style={[styles.boardIconSmall, { backgroundColor: `${board.color}15` }]}>
                        <MaterialCommunityIcons 
                          name={board.icon as any} 
                          size={20} 
                          color={board.color} 
                        />
                      </View>
                      <ThemedText style={styles.boardOptionText}>{board.name}</ThemedText>
                      {selectedBoard === boardTypeMapping[board.id] && (
                        <MaterialCommunityIcons 
                          name="check-circle" 
                          size={20} 
                          color={board.color} 
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
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
  cancelButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  boardSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  boardSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boardIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    textAlignVertical: 'top',
  },
  contentFooter: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tagInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  addTagButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagHelper: {
    fontSize: 12,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 142, 147, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    padding: 20,
  },
  boardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  boardOptionText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
}); 