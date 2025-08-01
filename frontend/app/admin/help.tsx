import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../../components/ToastProvider';
import { helpApi } from '../../services/api';
import { Picker } from '@react-native-picker/picker';

interface HelpArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  categoryDisplayName: string;
  displayOrder: number;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface HelpCategory {
  category: string;
  displayName: string;
}

export default function AdminHelpScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const colorScheme = useColorScheme();
  
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories] = useState<HelpCategory[]>([
    { category: 'GENERAL', displayName: '일반' },
    { category: 'ECONOMIC_INDICATORS', displayName: '경제지표' },
    { category: 'COMMUNITY', displayName: '커뮤니티' },
    { category: 'ACCOUNT', displayName: '계정' },
    { category: 'NOTIFICATIONS', displayName: '알림' },
    { category: 'TROUBLESHOOTING', displayName: '문제해결' }
  ]);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // 모달 상태
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    displayOrder: 0,
  });

  useEffect(() => {
    loadHelpArticles();
  }, [currentPage, selectedCategory, searchQuery]);

  const loadHelpArticles = async () => {
    try {
      setIsLoading(true);
      const response = await helpApi.getAdminHelpArticles(
        currentPage,
        20,
        searchQuery || undefined,
        selectedCategory || undefined
      );
      
      if (response.data.success) {
        const newArticles = response.data.data.content;
        if (currentPage === 0) {
          setArticles(newArticles);
        } else {
          setArticles(prev => [...prev, ...newArticles]);
        }
        setHasMore(!response.data.data.last);
      }
    } catch (error) {
      console.error('도움말 목록 로드 오류:', error);
      showToast('도움말 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await helpApi.createHelpArticle(formData);
      if (response.data.success) {
        showToast('도움말이 성공적으로 생성되었습니다.', 'success');
        setIsCreateModalVisible(false);
        resetForm();
        setCurrentPage(0);
        loadHelpArticles();
      }
    } catch (error) {
      console.error('도움말 생성 오류:', error);
      showToast('도움말 생성에 실패했습니다.', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!selectedArticle) return;
    
    try {
      const response = await helpApi.updateHelpArticle(selectedArticle.id, formData);
      if (response.data.success) {
        showToast('도움말이 성공적으로 수정되었습니다.', 'success');
        setIsEditModalVisible(false);
        resetForm();
        setCurrentPage(0);
        loadHelpArticles();
      }
    } catch (error) {
      console.error('도움말 수정 오류:', error);
      showToast('도움말 수정에 실패했습니다.', 'error');
    }
  };

  const handleDelete = (article: HelpArticle) => {
    Alert.alert(
      '도움말 삭제',
      `"${article.title}"을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await helpApi.deleteHelpArticle(article.id);
              if (response.data.success) {
                showToast('도움말이 성공적으로 삭제되었습니다.', 'success');
                setCurrentPage(0);
                loadHelpArticles();
              }
            } catch (error) {
              console.error('도움말 삭제 오류:', error);
              showToast('도움말 삭제에 실패했습니다.', 'error');
            }
          }
        }
      ]
    );
  };

  const handleToggle = async (article: HelpArticle) => {
    try {
      const response = await helpApi.toggleHelpArticle(article.id);
      if (response.data.success) {
        showToast(
          response.data.data.isActive ? '도움말이 활성화되었습니다.' : '도움말이 비활성화되었습니다.',
          'success'
        );
        setCurrentPage(0);
        loadHelpArticles();
      }
    } catch (error) {
      console.error('도움말 상태 변경 오류:', error);
      showToast('도움말 상태 변경에 실패했습니다.', 'error');
    }
  };

  const openEditModal = (article: HelpArticle) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      displayOrder: article.displayOrder,
    });
    setIsEditModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'GENERAL',
      displayOrder: 0,
    });
    setSelectedArticle(null);
  };

  const getCategoryDisplayName = (category: string) => {
    const categoryObj = categories.find(cat => cat.category === category);
    return categoryObj ? categoryObj.displayName : category;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'GENERAL': return '#007AFF';
      case 'ECONOMIC_INDICATORS': return '#FF9500';
      case 'COMMUNITY': return '#4ECDC4';
      case 'ACCOUNT': return '#A29BFE';
      case 'NOTIFICATIONS': return '#FF6B6B';
      case 'TROUBLESHOOTING': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>도움말 관리</ThemedText>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsCreateModalVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* 검색 및 필터 */}
        <ThemedView style={styles.filterSection}>
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
              placeholder="도움말 검색..."
              placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={setSelectedCategory}
              style={styles.picker}
            >
              <Picker.Item label="전체 카테고리" value="" />
              {categories.map((category) => (
                <Picker.Item
                  key={category.category}
                  label={category.displayName}
                  value={category.category}
                />
              ))}
            </Picker>
          </View>
        </ThemedView>

        {/* 도움말 목록 */}
        <ThemedView style={styles.articlesSection}>
          {articles.map((article) => (
            <View key={article.id} style={styles.articleItem}>
              <View style={styles.articleHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(article.category) }]}>
                  <ThemedText style={styles.categoryText}>
                    {getCategoryDisplayName(article.category)}
                  </ThemedText>
                </View>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: article.isActive ? '#34C759' : '#FF3B30' 
                  }]}>
                    <ThemedText style={styles.statusText}>
                      {article.isActive ? '활성' : '비활성'}
                    </ThemedText>
                  </View>
                </View>
              </View>
              
              <ThemedText style={styles.articleTitle}>{article.title}</ThemedText>
              <ThemedText style={styles.articleContent} numberOfLines={2}>
                {article.content}
              </ThemedText>
              
              <View style={styles.articleFooter}>
                <View style={styles.articleInfo}>
                  <ThemedText style={styles.articleInfoText}>
                    순서: {article.displayOrder} | 조회수: {article.viewCount}
                  </ThemedText>
                  <ThemedText style={styles.articleInfoText}>
                    {new Date(article.createdAt).toLocaleDateString()}
                  </ThemedText>
                </View>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditModal(article)}
                  >
                    <MaterialCommunityIcons name="pencil" size={16} color="#007AFF" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.toggleButton]}
                    onPress={() => handleToggle(article)}
                  >
                    <MaterialCommunityIcons 
                      name={article.isActive ? "eye-off" : "eye"} 
                      size={16} 
                      color={article.isActive ? "#FF9500" : "#34C759"} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(article)}
                  >
                    <MaterialCommunityIcons name="delete" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          
          {hasMore && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => setCurrentPage(prev => prev + 1)}
              disabled={isLoading}
            >
              <ThemedText style={styles.loadMoreText}>
                {isLoading ? '로딩 중...' : '더 보기'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ScrollView>

      {/* 생성 모달 */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
              <ThemedText style={styles.modalCancelButton}>취소</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>새 도움말</ThemedText>
            <TouchableOpacity onPress={handleCreate}>
              <ThemedText style={styles.modalSaveButton}>저장</ThemedText>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>제목</ThemedText>
              <TextInput
                style={[styles.formInput, {
                  backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="도움말 제목을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>카테고리</ThemedText>
              <View style={[styles.pickerContainer, {
                backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7'
              }]}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  style={styles.picker}
                >
                  {categories.map((category) => (
                    <Picker.Item
                      key={category.category}
                      label={category.displayName}
                      value={category.category}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>표시 순서</ThemedText>
              <TextInput
                style={[styles.formInput, {
                  backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                value={formData.displayOrder.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, displayOrder: parseInt(text) || 0 }))}
                placeholder="0"
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>내용</ThemedText>
              <TextInput
                style={[styles.formTextArea, {
                  backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                value={formData.content}
                onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
                placeholder="도움말 내용을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 수정 모달 */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
              <ThemedText style={styles.modalCancelButton}>취소</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>도움말 수정</ThemedText>
            <TouchableOpacity onPress={handleUpdate}>
              <ThemedText style={styles.modalSaveButton}>저장</ThemedText>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>제목</ThemedText>
              <TextInput
                style={[styles.formInput, {
                  backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="도움말 제목을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>카테고리</ThemedText>
              <View style={[styles.pickerContainer, {
                backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7'
              }]}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  style={styles.picker}
                >
                  {categories.map((category) => (
                    <Picker.Item
                      key={category.category}
                      label={category.displayName}
                      value={category.category}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>표시 순서</ThemedText>
              <TextInput
                style={[styles.formInput, {
                  backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                value={formData.displayOrder.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, displayOrder: parseInt(text) || 0 }))}
                placeholder="0"
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>내용</ThemedText>
              <TextInput
                style={[styles.formTextArea, {
                  backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7',
                  color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                }]}
                value={formData.content}
                onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
                placeholder="도움말 내용을 입력하세요"
                placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  filterSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  pickerContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  articlesSection: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  articleItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  articleContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleInfo: {
    flex: 1,
  },
  articleInfoText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
  },
  toggleButton: {
    backgroundColor: '#FFF8F0',
    borderColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FF3B30',
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#8E8E93',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
  },
  formTextArea: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 120,
  },
}); 