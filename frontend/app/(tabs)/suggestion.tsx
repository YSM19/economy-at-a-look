import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../../components/ToastProvider';
import { checkLoginStatusWithValidation } from '../../utils/authUtils';
import { inquiryApi } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InquiryForm {
  type: 'SUGGESTION' | 'BUG_REPORT' | 'FEATURE_REQUEST' | 'GENERAL_INQUIRY' | 'ACCOUNT_ISSUE' | 'TECHNICAL_ISSUE';
  title: string;
  content: string;
  email: string;
}

interface InquiryType {
  type: string;
  typeDisplayName: string;
}

export default function SuggestionScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [form, setForm] = useState<InquiryForm>({
    type: 'SUGGESTION',
    title: '',
    content: '',
    email: '',
  });

  const [inquiryTypes, setInquiryTypes] = useState<InquiryType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInquiryTypes();
  }, []);

  const loadInquiryTypes = async () => {
    try {
      const response = await inquiryApi.getInquiryTypes();
      if (response.data.success) {
        setInquiryTypes(response.data.data);
      } else {
        // 기본 문의 유형 설정
        setInquiryTypes([
          { type: 'SUGGESTION', typeDisplayName: '건의사항' },
          { type: 'BUG_REPORT', typeDisplayName: '버그 신고' },
          { type: 'FEATURE_REQUEST', typeDisplayName: '기능 요청' },
          { type: 'GENERAL_INQUIRY', typeDisplayName: '일반 문의' },
          { type: 'ACCOUNT_ISSUE', typeDisplayName: '계정 문제' },
          { type: 'TECHNICAL_ISSUE', typeDisplayName: '기술 문제' }
        ]);
      }
    } catch (error) {
      console.error('문의 유형 로드 오류:', error);
      
      // API 실패 시 기본 문의 유형 설정
      setInquiryTypes([
        { type: 'SUGGESTION', typeDisplayName: '건의사항' },
        { type: 'BUG_REPORT', typeDisplayName: '버그 신고' },
        { type: 'FEATURE_REQUEST', typeDisplayName: '기능 요청' },
        { type: 'GENERAL_INQUIRY', typeDisplayName: '일반 문의' },
        { type: 'ACCOUNT_ISSUE', typeDisplayName: '계정 문제' },
        { type: 'TECHNICAL_ISSUE', typeDisplayName: '기술 문제' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    // 로그인 상태 확인
    const { isLoggedIn } = await checkLoginStatusWithValidation();
    if (!isLoggedIn) {
      Alert.alert(
        '로그인 필요',
        '건의사항을 제출하려면 로그인이 필요합니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '로그인', onPress: () => router.push('/(tabs)/login') }
        ]
      );
      return;
    }

    // 폼 유효성 검사
    if (!form.title.trim()) {
      showToast('제목을 입력해주세요.', 'error');
      return;
    }

    if (!form.content.trim()) {
      showToast('내용을 입력해주세요.', 'error');
      return;
    }

    if (!form.email.trim()) {
      showToast('이메일을 입력해주세요.', 'error');
      return;
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      showToast('올바른 이메일 형식을 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // 토큰 가져오기
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await inquiryApi.createInquiry({
        type: form.type,
        title: form.title,
        content: form.content,
        email: form.email
      }, token || undefined);

      if (response.data.success) {
        showToast('건의사항이 성공적으로 제출되었습니다.', 'success');
        
        // 폼 초기화
        setForm({
          type: 'SUGGESTION',
          title: '',
          content: '',
          email: '',
        });
        
        // 마이페이지로 돌아가기
        router.back();
      } else {
        showToast('건의사항 제출에 실패했습니다. 다시 시도해주세요.', 'error');
      }
    } catch (error) {
      console.error('건의사항 제출 오류:', error);
      showToast('건의사항 제출에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUGGESTION':
        return 'lightbulb';
      case 'BUG_REPORT':
        return 'bug';
      case 'FEATURE_REQUEST':
        return 'star';
      case 'GENERAL_INQUIRY':
        return 'help-circle';
      case 'ACCOUNT_ISSUE':
        return 'account';
      case 'TECHNICAL_ISSUE':
        return 'wrench';
      default:
        return 'comment-question';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SUGGESTION':
        return '#007AFF';
      case 'BUG_REPORT':
        return '#FF3B30';
      case 'FEATURE_REQUEST':
        return '#FF9500';
      case 'GENERAL_INQUIRY':
        return '#4ECDC4';
      case 'ACCOUNT_ISSUE':
        return '#A29BFE';
      case 'TECHNICAL_ISSUE':
        return '#FF6B6B';
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
          <ThemedText style={styles.headerTitle}>건의 및 문의</ThemedText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText>문의 유형을 불러오는 중...</ThemedText>
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
        <ThemedText style={styles.headerTitle}>건의 및 문의</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* 안내 메시지 */}
        <ThemedView style={styles.infoSection}>
          <MaterialCommunityIcons name="information" size={24} color="#007AFF" />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoTitle}>건의사항 제출 안내</ThemedText>
            <ThemedText style={styles.infoText}>
              앱 개선을 위한 건의사항이나 버그 신고, 기능 요청을 보내주세요. 
              빠른 시일 내에 검토하여 답변드리겠습니다.
            </ThemedText>
          </View>
        </ThemedView>

        {/* 문의 유형 선택 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>문의 유형</ThemedText>
          <View style={styles.typeGrid}>
            {inquiryTypes.map((type) => (
              <TouchableOpacity
                key={type.type}
                style={[
                  styles.typeItem,
                  form.type === type.type && styles.typeItemSelected
                ]}
                onPress={() => setForm({ ...form, type: type.type as any })}
              >
                <MaterialCommunityIcons 
                  name={getTypeIcon(type.type) as any} 
                  size={24} 
                  color={form.type === type.type ? '#FFFFFF' : getTypeColor(type.type)} 
                />
                <ThemedText style={[
                  styles.typeLabel,
                  form.type === type.type && styles.typeLabelSelected
                ]}>
                  {type.typeDisplayName}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* 제목 입력 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>제목 *</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="제목을 입력해주세요"
            value={form.title}
            onChangeText={(text) => setForm({ ...form, title: text })}
            maxLength={100}
          />
          <ThemedText style={styles.charCount}>{form.title.length}/100</ThemedText>
        </ThemedView>

        {/* 내용 입력 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>내용 *</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="상세한 내용을 입력해주세요"
            value={form.content}
            onChangeText={(text) => setForm({ ...form, content: text })}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <ThemedText style={styles.charCount}>{form.content.length}/1000</ThemedText>
        </ThemedView>

        {/* 이메일 입력 */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>답변 받을 이메일 *</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="example@email.com"
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </ThemedView>

        {/* 제출 버튼 */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View style={styles.loadingContainer}>
              <MaterialCommunityIcons name="loading" size={20} color="#FFFFFF" />
              <ThemedText style={styles.submitButtonText}>제출 중...</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.submitButtonText}>건의사항 제출</ThemedText>
          )}
        </TouchableOpacity>

        {/* 추가 정보 */}
        <ThemedView style={styles.additionalInfoSection}>
          <ThemedText style={styles.additionalInfoTitle}>추가 정보</ThemedText>
          <View style={styles.additionalInfoList}>
            <View style={styles.additionalInfoItem}>
              <MaterialCommunityIcons name="clock" size={16} color="#8E8E93" />
              <ThemedText style={styles.additionalInfoText}>
                평일 09:00 - 18:00 내 답변
              </ThemedText>
            </View>
            <View style={styles.additionalInfoItem}>
              <MaterialCommunityIcons name="email" size={16} color="#8E8E93" />
              <ThemedText style={styles.additionalInfoText}>
                이메일로 답변 발송
              </ThemedText>
            </View>
            <View style={styles.additionalInfoItem}>
              <MaterialCommunityIcons name="shield" size={16} color="#8E8E93" />
              <ThemedText style={styles.additionalInfoText}>
                개인정보 보호
              </ThemedText>
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
  scrollView: {
    flex: 1,
  },
  infoSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  section: {
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeItem: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  typeItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  typeLabelSelected: {
    color: '#FFFFFF',
  },

  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  additionalInfoSection: {
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
  additionalInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  additionalInfoList: {
    gap: 8,
  },
  additionalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  additionalInfoText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
}); 