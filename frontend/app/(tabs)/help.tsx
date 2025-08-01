import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../../components/ToastProvider';
import { helpApi } from '../../services/api';

interface HelpArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  displayOrder: number;
  viewCount: number;
}

interface HelpCategory {
  category: string;
  displayName: string;
}

export default function HelpScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const colorScheme = useColorScheme();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHelpData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchArticles();
    } else if (selectedCategory === 'ALL') {
      loadAllArticles();
    } else {
      loadArticlesByCategory(selectedCategory);
    }
  }, [searchQuery, selectedCategory]);

  // 로컬 필터링을 위한 별도 useEffect
  useEffect(() => {
    // API 호출 후에도 로컬 필터링 적용
    if (articles && articles.length > 0) {
      filterArticlesLocally();
    }
  }, [searchQuery, selectedCategory, articles.length]);

  const loadHelpData = async () => {
    // 기본 데이터로 초기화
    const defaultCategories = [
      { category: 'GENERAL', displayName: '일반' },
      { category: 'ECONOMIC_INDICATORS', displayName: '경제지표' },
      { category: 'COMMUNITY', displayName: '커뮤니티' },
      { category: 'ACCOUNT', displayName: '계정' },
      { category: 'NOTIFICATIONS', displayName: '알림' },
      { category: 'TROUBLESHOOTING', displayName: '문제해결' }
    ];

    const defaultArticles = [
      {
        id: 1,
        title: '이코노뷰는 어떤 앱인가요?',
        content: '이코노뷰는 실시간 경제 지표를 제공하는 모바일 애플리케이션입니다. 환율, 금리, 물가 등 주요 경제 데이터를 한눈에 확인할 수 있으며, 설정한 기준값에 도달하면 알림을 받을 수 있습니다.',
        category: 'GENERAL',
        displayOrder: 1,
        viewCount: 0
      },
      {
        id: 2,
        title: '환율 알림은 어떻게 설정하나요?',
        content: '프로필 → 알림 설정에서 환율 알림을 활성화하고, 원하는 기준 환율을 설정하세요. 설정한 환율을 지나갈 때 알림을 받을 수 있습니다.',
        category: 'NOTIFICATIONS',
        displayOrder: 2,
        viewCount: 0
      },
      {
        id: 3,
        title: '금리 알림은 언제 받을 수 있나요?',
        content: '한국은행 기준금리가 설정한 값에 도달하거나 지나갈 때 알림을 받을 수 있습니다. 금리는 발표일 기준으로 업데이트됩니다.',
        category: 'NOTIFICATIONS',
        displayOrder: 3,
        viewCount: 0
      },
      {
        id: 4,
        title: '커뮤니티 기능은 어떻게 사용하나요?',
        content: '커뮤니티에서는 다른 사용자들과 경제 관련 의견을 나누고 정보를 공유할 수 있습니다. 게시글 작성, 댓글, 좋아요 기능을 이용하세요.',
        category: 'COMMUNITY',
        displayOrder: 4,
        viewCount: 0
      },
      {
        id: 5,
        title: '계정 정보는 어떻게 변경하나요?',
        content: '프로필 → 개인정보 관리에서 사용자명, 이메일, 비밀번호 등을 변경할 수 있습니다.',
        category: 'ACCOUNT',
        displayOrder: 5,
        viewCount: 0
      },
      {
        id: 6,
        title: '알림이 오지 않을 때는 어떻게 하나요?',
        content: '1. 앱 설정에서 알림 권한이 허용되어 있는지 확인하세요.\n2. 디바이스의 알림 설정에서 앱 알림이 활성화되어 있는지 확인하세요.\n3. 알림 설정에서 해당 알림이 활성화되어 있는지 확인하세요.',
        category: 'TROUBLESHOOTING',
        displayOrder: 6,
        viewCount: 0
      }
    ];

    // 기본 데이터로 먼저 설정
    setCategories(defaultCategories);
    setArticles(defaultArticles);

    try {
      const [categoriesResponse, articlesResponse] = await Promise.all([
        helpApi.getHelpCategories(),
        helpApi.getHelpArticles()
      ]);

      if (categoriesResponse.data.success && categoriesResponse.data.data) {
        setCategories(categoriesResponse.data.data);
      }

      if (articlesResponse.data.success && articlesResponse.data.data) {
        setArticles(articlesResponse.data.data);
      }
    } catch (error) {
      console.error('도움말 데이터 로드 오류:', error);
      // 기본 데이터는 이미 설정되어 있으므로 추가 설정 불필요
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllArticles = async () => {
    try {
      const response = await helpApi.getHelpArticles();
      if (response.data.success && response.data.data) {
        setArticles(response.data.data);
      }
    } catch (error) {
      console.error('도움말 로드 오류:', error);
      // API 실패 시 기본 데이터 유지
    }
  };

  const loadArticlesByCategory = async (category: string) => {
    try {
      const response = await helpApi.getHelpArticlesByCategory(category);
      if (response.data.success && response.data.data) {
        setArticles(response.data.data);
      }
    } catch (error) {
      console.error('카테고리별 도움말 로드 오류:', error);
      // API 실패 시 로컬 필터링 사용
      filterArticlesLocally();
    }
  };

  const searchArticles = async () => {
    try {
      let response;
      if (selectedCategory === 'ALL') {
        response = await helpApi.searchHelpArticles(searchQuery);
      } else {
        response = await helpApi.searchHelpArticlesByCategory(selectedCategory, searchQuery);
      }
      
      if (response.data.success && response.data.data) {
        setArticles(response.data.data);
      }
    } catch (error) {
      console.error('도움말 검색 오류:', error);
      // API 실패 시 로컬 검색 사용
      filterArticlesLocally();
    }
  };

  // 로컬 필터링 함수
  const filterArticlesLocally = () => {
    if (!articles || articles.length === 0) {
      return;
    }

    let filteredArticles = [...articles];

    // 카테고리 필터링
    if (selectedCategory !== 'ALL') {
      filteredArticles = filteredArticles.filter(article => article.category === selectedCategory);
    }

    // 검색어 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredArticles = filteredArticles.filter(article => 
        article.title.toLowerCase().includes(query) || 
        article.content.toLowerCase().includes(query)
      );
    }

    setArticles(filteredArticles);
  };

  const toggleItem = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getCategoryDisplayName = (category: string) => {
    if (!categories || categories.length === 0) {
      return category;
    }
    const categoryObj = categories.find(cat => cat.category === category);
    return categoryObj ? categoryObj.displayName : category;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'GENERAL':
        return 'information';
      case 'ECONOMIC_INDICATORS':
        return 'chart-line';
      case 'COMMUNITY':
        return 'account-group';
      case 'ACCOUNT':
        return 'account';
      case 'NOTIFICATIONS':
        return 'bell';
      case 'TROUBLESHOOTING':
        return 'wrench';
      default:
        return 'help-circle';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'GENERAL':
        return '#007AFF';
      case 'ECONOMIC_INDICATORS':
        return '#FF9500';
      case 'COMMUNITY':
        return '#4ECDC4';
      case 'ACCOUNT':
        return '#A29BFE';
      case 'NOTIFICATIONS':
        return '#FF6B6B';
      case 'TROUBLESHOOTING':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>도움말</ThemedText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText>도움말을 불러오는 중...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

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
        <ThemedText style={styles.headerTitle}>도움말</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* 검색 */}
        <ThemedView style={styles.searchSection}>
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
        </ThemedView>

        {/* 카테고리 필터 */}
        <ThemedView style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            <TouchableOpacity
              style={[styles.categoryButton, selectedCategory === 'ALL' && { backgroundColor: '#007AFF' }]}
              onPress={() => setSelectedCategory('ALL')}
            >
              <ThemedText style={[styles.categoryButtonText, selectedCategory === 'ALL' && { color: '#ffffff' }]}>
                전체
              </ThemedText>
            </TouchableOpacity>
            {categories && categories.map((category) => (
              <TouchableOpacity
                key={category.category}
                style={[styles.categoryButton, selectedCategory === category.category && { backgroundColor: getCategoryColor(category.category) }]}
                onPress={() => setSelectedCategory(category.category)}
              >
                <ThemedText style={[styles.categoryButtonText, selectedCategory === category.category && { color: '#ffffff' }]}>
                  {category.displayName}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>

        {/* 도움말 목록 */}
        {!articles || articles.length === 0 ? (
          <ThemedView style={styles.emptySection}>
            <MaterialCommunityIcons name="help-circle-outline" size={48} color="#8E8E93" />
            <ThemedText style={styles.emptyText}>
              {searchQuery.trim() ? '검색 결과가 없습니다.' : '도움말이 없습니다.'}
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.articlesSection}>
            {articles.map((article) => (
              <View key={article.id} style={styles.articleItem}>
                <TouchableOpacity
                  style={styles.articleQuestion}
                  onPress={() => toggleItem(article.id)}
                >
                  <View style={styles.articleHeader}>
                    <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(article.category) }]}>
                      <MaterialCommunityIcons 
                        name={getCategoryIcon(article.category) as any} 
                        size={16} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <ThemedText style={styles.categoryLabel}>
                      {getCategoryDisplayName(article.category)}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.questionText}>{article.title}</ThemedText>
                  <MaterialCommunityIcons 
                    name={expandedItems.has(article.id) ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#8E8E93" 
                  />
                </TouchableOpacity>
                
                {expandedItems.has(article.id) && (
                  <View style={styles.articleAnswer}>
                    <ThemedText style={styles.answerText}>{article.content}</ThemedText>
                  </View>
                )}
              </View>
            ))}
          </ThemedView>
        )}

        {/* 연락처 정보 */}
        <ThemedView style={styles.contactSection}>
          <ThemedText style={styles.sectionTitle}>연락처</ThemedText>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="email" size={20} color="#007AFF" />
              <ThemedText style={styles.contactText}>support@economyview.com</ThemedText>
            </View>
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="web" size={20} color="#007AFF" />
              <ThemedText style={styles.contactText}>www.economyview.com</ThemedText>
            </View>
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="clock" size={20} color="#007AFF" />
              <ThemedText style={styles.contactText}>평일 09:00 - 18:00</ThemedText>
            </View>
          </View>
        </ThemedView>

      </ScrollView>
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
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  searchSection: {
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
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  categorySection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  categoryScrollContent: {
    paddingHorizontal: 0,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  emptySection: {
    margin: 16,
    padding: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  articleQuestion: {
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  articleAnswer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  contactSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
}); 