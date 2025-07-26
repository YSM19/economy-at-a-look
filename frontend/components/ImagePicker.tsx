import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, useColorScheme, Modal, ScrollView, Image, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import * as ImagePicker from 'expo-image-picker';

export interface ImageAttachment {
  id: string;
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface ImagePickerComponentProps {
  images: ImageAttachment[];
  onImagesChange: (images: ImageAttachment[]) => void;
  maxImages?: number;
  maxSizeInMB?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const ImagePickerComponent: React.FC<ImagePickerComponentProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
  maxSizeInMB = 10
}) => {
  const colorScheme = useColorScheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const pickImage = async (useCamera: boolean = false) => {
    try {
      // 권한 요청
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('권한 필요', '카메라 사용을 위해 권한이 필요합니다.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('권한 필요', '사진 라이브러리 접근을 위해 권한이 필요합니다.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // 파일 크기 체크
        if (asset.fileSize && asset.fileSize > maxSizeInMB * 1024 * 1024) {
          Alert.alert('파일 크기 초과', `${maxSizeInMB}MB 이하의 이미지만 업로드할 수 있습니다.`);
          return;
        }

        // 최대 이미지 수 체크
        if (images.length >= maxImages) {
          Alert.alert('이미지 수 초과', `최대 ${maxImages}개의 이미지만 첨부할 수 있습니다.`);
          return;
        }

        const newImage: ImageAttachment = {
          id: Date.now().toString(),
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        };

        onImagesChange([...images, newImage]);
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  const removeImage = (imageId: string) => {
    Alert.alert(
      '이미지 삭제',
      '이 이미지를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive', 
          onPress: () => onImagesChange(images.filter(img => img.id !== imageId))
        }
      ]
    );
  };

  const showImageOptions = () => {
    Alert.alert(
      '이미지 선택',
      '이미지를 어떻게 추가하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '카메라', onPress: () => pickImage(true) },
        { text: '갤러리', onPress: () => pickImage(false) }
      ]
    );
  };

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setIsModalVisible(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>이미지 첨부</ThemedText>
        <ThemedText style={styles.subtitle}>
          {images.length}/{maxImages} (최대 {maxSizeInMB}MB)
        </ThemedText>
      </View>

      {/* 이미지 목록 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
        {images.map((image, index) => (
          <View key={image.id} style={styles.imageContainer}>
            <TouchableOpacity
              style={styles.imageWrapper}
              onPress={() => openImageViewer(index)}
            >
              <Image source={{ uri: image.uri }} style={styles.image} />
              <View style={styles.imageOverlay}>
                <ThemedText style={styles.imageName} numberOfLines={1}>
                  {image.name}
                </ThemedText>
                <ThemedText style={styles.imageSize}>
                  {formatFileSize(image.size)}
                </ThemedText>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(image.id)}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        {/* 이미지 추가 버튼 */}
        {images.length < maxImages && (
          <TouchableOpacity
            style={[styles.addButton, {
              backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7',
              borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }]}
            onPress={showImageOptions}
          >
            <MaterialCommunityIcons 
              name="plus" 
              size={32} 
              color={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'} 
            />
            <ThemedText style={styles.addButtonText}>이미지 추가</ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 이미지 뷰어 모달 */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {selectedImageIndex + 1} / {images.length}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageViewer}
              contentOffset={{ x: selectedImageIndex * screenWidth, y: 0 }}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setSelectedImageIndex(index);
              }}
            >
              {images.map((image) => (
                <View key={image.id} style={styles.fullImageContainer}>
                  <Image 
                    source={{ uri: image.uri }} 
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.imageInfo}>
                <ThemedText style={styles.modalImageName}>
                  {images[selectedImageIndex]?.name}
                </ThemedText>
                <ThemedText style={styles.modalImageSize}>
                  {formatFileSize(images[selectedImageIndex]?.size || 0)}
                </ThemedText>
              </View>
              
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={() => {
                  const imageId = images[selectedImageIndex]?.id;
                  if (imageId) {
                    setIsModalVisible(false);
                    removeImage(imageId);
                  }
                }}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#FF3B30" />
                <ThemedText style={styles.modalDeleteText}>삭제</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
  },
  imageList: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
  },
  imageName: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  imageSize: {
    color: '#ffffff',
    fontSize: 8,
    opacity: 0.8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  imageViewer: {
    flex: 1,
  },
  fullImageContainer: {
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: screenWidth - 40,
    height: '80%',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  imageInfo: {
    flex: 1,
  },
  modalImageName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalImageSize: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.7,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderRadius: 8,
    gap: 6,
  },
  modalDeleteText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
}); 