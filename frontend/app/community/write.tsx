import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, Platform, TextInput, Alert, Modal, KeyboardAvoidingView, Image } from 'react-native';
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

  const pickImage = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      
      // 권한 요청
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 라이브러리 접근을 위해 권한이 필요합니다.');
        return;
      }

      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // CROP 기능 제거
        aspect: undefined,
        quality: 0.8,
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // 파일 크기 체크
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('파일 크기 초과', '10MB 이하의 이미지만 업로드할 수 있습니다.');
          return;
        }

        // 최대 이미지 수 체크
        if (images.length >= 5) {
          Alert.alert('이미지 수 초과', '최대 5개의 이미지만 첨부할 수 있습니다.');
          return;
        }

        const newImage: ImageAttachment = {
          id: Date.now().toString(),
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        };

        setImages([...images, newImage]);
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
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
      let uploadedImages: any[] = [];
      if (images.length > 0) {
        try {
          console.log('이미지 업로드 시작...');
          const uploadPromises = images.map(async (image, index) => {
            const formData = new FormData();
            
            // 파일 확장자에 따른 MIME 타입 설정
            const extension = image.name.split('.').pop()?.toLowerCase();
            let contentType: string;
            switch (extension) {
              case 'jpg':
              case 'jpeg':
                contentType = 'image/jpeg';
                break;
              case 'png':
                contentType = 'image/png';
                break;
              case 'gif':
                contentType = 'image/gif';
                break;
              case 'webp':
                contentType = 'image/webp';
                break;
              default:
                contentType = 'image/jpeg';
            }
            
            formData.append('file', {
              uri: image.uri,
              type: contentType,
              name: image.name,
            } as any);
            formData.append('category', 'post');
            
            const uploadResponse = await fileUploadApi.uploadImage(formData, token);
            console.log('이미지 업로드 응답:', uploadResponse.data);
            
            if (uploadResponse.data?.success && uploadResponse.data?.data) {
              return {
                uploadedImageUrl: uploadResponse.data.data.fileUrl,
                originalFilename: uploadResponse.data.data.originalFilename,
                contentType: uploadResponse.data.data.contentType,
                fileSize: uploadResponse.data.data.fileSize,
                displayOrder: index + 1
              };
            } else {
              throw new Error('이미지 업로드 실패');
            }
          });
          
          uploadedImages = await Promise.all(uploadPromises);
          console.log('업로드된 이미지 정보:', uploadedImages);
        } catch (uploadError) {
          console.error('이미지 업로드 오류:', uploadError);
          Alert.alert('경고', '이미지 업로드에 실패했습니다. 텍스트만 작성하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '계속', onPress: () => {} }
          ]);
          return;
        }
      }

      const postData = {
        title: title.trim(),
        content: content.trim(),
        boardType: selectedBoard,
        tags: tags,
        images: uploadedImages
      };

      console.log('글 작성 데이터:', postData);
      console.log('선택된 게시판 타입:', selectedBoard);
      console.log('업로드된 이미지 개수:', uploadedImages.length);
      console.log('업로드된 이미지 상세:', JSON.stringify(uploadedImages, null, 2));
      
      const response = await postApi.createPost(postData, token);
      console.log('글 작성 응답:', response);
      
      if (response.data?.success) {
        showToast('글이 성공적으로 작성되었습니다.', 'success');
        router.back();
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
            <View style={styles.boardSelectorContainer}>
              <ThemedText style={[styles.boardSelectorLabel, {
                color: colorScheme === 'dark' ? '#8e8e93' : '#6c757d'
              }]}>
                게시판
              </ThemedText>
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
                  <ThemedText style={[styles.boardSelectorText, {
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }]}>
                    {selectedBoardInfo.name}
                  </ThemedText>
                </View>
                <MaterialCommunityIcons 
                  name="chevron-down" 
                  size={20} 
                  color={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'} 
                />
              </TouchableOpacity>
            </View>

            {/* 제목 입력 */}
            <View style={styles.inputSection}>
              <ThemedText style={[styles.inputLabel, {
                color: colorScheme === 'dark' ? '#8e8e93' : '#6c757d'
              }]}>
                제목
              </ThemedText>
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
                <ThemedText style={[styles.characterCount, {
                  color: colorScheme === 'dark' ? '#8e8e93' : '#6c757d'
                }]}>
                  {title.length}/100
                </ThemedText>
              </View>
            </View>

            {/* 내용 입력 */}
            <View style={styles.inputSection}>
              <ThemedText style={[styles.inputLabel, {
                color: colorScheme === 'dark' ? '#8e8e93' : '#6c757d'
              }]}>
                내용
              </ThemedText>
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
                <ThemedText style={[styles.characterCount, {
                  color: colorScheme === 'dark' ? '#8e8e93' : '#6c757d'
                }]}>
                  {content.length}/5000
                </ThemedText>
              </View>
            </View>
          </View>

          {/* 이미지 첨부 섹션 */}
          <View style={styles.inputSection}>
            <ThemedText style={[styles.inputLabel, {
              color: colorScheme === 'dark' ? '#8e8e93' : '#6c757d'
            }]}>
              첨부 이미지
            </ThemedText>
            <View style={[styles.inputContainer, {
              backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }]}>
              <View style={styles.imageAttachHeader}>
                <ThemedText style={[styles.imageAttachTitle, {
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}>
                  이미지 추가
                </ThemedText>
                <ThemedText style={[styles.imageAttachCount, {
                  color: colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'
                }]}>
                  {images.length}/5
                </ThemedText>
              </View>
              
              <TouchableOpacity
                style={[styles.imageAttachButton, {
                  backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                }]}
                onPress={() => pickImage()}
                disabled={images.length >= 5}
              >
                <View style={[styles.imageAttachIcon, {
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#e9ecef'
                }]}>
                  <MaterialCommunityIcons 
                    name="camera-plus" 
                    size={24} 
                    color={selectedBoardInfo.color} 
                  />
                </View>
                <View style={styles.imageAttachTextContainer}>
                  <ThemedText style={[styles.imageAttachText, {
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }]}>
                    이미지 선택
                  </ThemedText>
                  <ThemedText style={[styles.imageAttachSubtext, {
                    color: colorScheme === 'dark' ? '#8e8e93' : '#6c757d'
                  }]}>
                    최대 5개, 10MB 이하
                  </ThemedText>
                </View>
              </TouchableOpacity>
              
              {/* 첨부된 이미지 미리보기 */}
              {images.length > 0 && (
                <View style={styles.imagePreviewContainer}>
                  <ThemedText style={[styles.imagePreviewTitle, {
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }]}>
                    첨부된 이미지
                  </ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                    {images.map((image, index) => (
                      <View key={image.id} style={styles.imagePreviewItem}>
                        <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                        <View style={styles.imagePreviewOverlay}>
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => {
                              const newImages = images.filter((_, i) => i !== index);
                              setImages(newImages);
                            }}
                          >
                            <MaterialCommunityIcons name="close" size={16} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.imagePreviewInfo}>
                          <ThemedText style={styles.imagePreviewName} numberOfLines={1}>
                            {image.name}
                          </ThemedText>
                          <ThemedText style={styles.imagePreviewSize}>
                            {(image.size / 1024).toFixed(1)}KB
                          </ThemedText>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

            {/* 태그 입력 */}
            <View style={styles.inputSection}>
              <ThemedText style={[styles.inputLabel, {
                color: colorScheme === 'dark' ? '#8e8e93' : '#6c757d'
              }]}>
                태그 (선택사항)
              </ThemedText>
              <View style={[styles.inputContainer, {
                backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }]}>
                <ThemedText style={[styles.sectionTitle, {
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}>
                  태그 추가
                </ThemedText>
              
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
              
              <ThemedText style={[styles.tagHelper, {
                color: colorScheme === 'dark' ? '#8e8e93' : '#6c757d'
              }]}>
                {tags.length}/5 개의 태그 • 엔터키로도 추가할 수 있습니다
              </ThemedText>
            </View>
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
  boardSelectorContainer: {
    marginBottom: 20,
  },
  boardSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  boardSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
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
  // 이미지 첨부 관련 스타일
  imageAttachSection: {
    marginTop: 16,
    marginBottom: 12,
  },
  imageAttachHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageAttachTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  imageAttachCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  imageAttachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  imageAttachIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageAttachTextContainer: {
    flex: 1,
  },
  imageAttachText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  imageAttachSubtext: {
    fontSize: 13,
    fontWeight: '400',
  },
  imagePreviewContainer: {
    marginTop: 16,
  },
  imagePreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  imagePreviewScroll: {
    flexDirection: 'row',
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 12,
    width: 100,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  imagePreviewOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  removeImageButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewInfo: {
    marginTop: 8,
  },
  imagePreviewName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  imagePreviewSize: {
    fontSize: 11,
    opacity: 0.6,
  },
}); 