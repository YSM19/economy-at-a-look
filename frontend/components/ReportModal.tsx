import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, ScrollView, useColorScheme, Alert, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';

export interface ReportReason {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
  targetType: 'post' | 'comment';
  targetId: number;
}

const REPORT_REASONS: ReportReason[] = [
  {
    id: 'spam',
    title: '스팸 또는 광고',
    description: '상업적 목적의 스팸 또는 광고 콘텐츠',
    icon: 'alert-circle'
  },
  {
    id: 'harassment',
    title: '괴롭힘 또는 혐오',
    description: '개인이나 집단에 대한 괴롭힘, 혐오 발언',
    icon: 'account-remove'
  },
  {
    id: 'inappropriate',
    title: '부적절한 콘텐츠',
    description: '음란물, 폭력적 내용, 불법 콘텐츠',
    icon: 'eye-off'
  },
  {
    id: 'misinformation',
    title: '잘못된 정보',
    description: '의도적인 허위 정보 또는 가짜 뉴스',
    icon: 'information-off'
  },
  {
    id: 'copyright',
    title: '저작권 침해',
    description: '저작권자의 허가 없이 사용된 콘텐츠',
    icon: 'copyright'
  },
  {
    id: 'personal_info',
    title: '개인정보 노출',
    description: '개인정보 또는 사생활 침해',
    icon: 'shield-alert'
  },
  {
    id: 'other',
    title: '기타',
    description: '위 항목에 해당하지 않는 다른 문제',
    icon: 'dots-horizontal'
  }
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  onSubmit,
  targetType,
  targetId
}) => {
  const colorScheme = useColorScheme();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('신고 이유 선택', '신고 이유를 선택해주세요.');
      return;
    }

    if (selectedReason === 'other' && !details.trim()) {
      Alert.alert('상세 내용 입력', '기타 사유의 경우 상세 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(selectedReason, details.trim());
      
      // 성공 시 모달 닫기만 하고 Alert는 호출하는 컴포넌트에서 처리
      setSelectedReason('');
      setDetails('');
      onClose();
    } catch (error) {
      console.error('신고 제출 오류:', error);
      Alert.alert('오류', '신고 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (selectedReason || details.trim()) {
      Alert.alert(
        '신고 취소',
        '작성 중인 신고 내용이 있습니다. 정말 취소하시겠습니까?',
        [
          { text: '계속 작성', style: 'cancel' },
          { 
            text: '취소', 
            style: 'destructive', 
            onPress: () => {
              setSelectedReason('');
              setDetails('');
              onClose();
            }
          }
        ]
      );
    } else {
      onClose();
    }
  };

  const getReasonIcon = (reason: ReportReason) => {
    const isSelected = selectedReason === reason.id;
    return (
      <View style={[styles.reasonIcon, {
        backgroundColor: isSelected ? '#FF3B30' : (colorScheme === 'dark' ? '#3a3a3c' : '#f2f2f7')
      }]}>
        <MaterialCommunityIcons 
          name={reason.icon as any} 
          size={24} 
          color={isSelected ? '#ffffff' : (colorScheme === 'dark' ? '#8e8e93' : '#8e8e93')} 
        />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff'
        }]}>
          {/* 헤더 */}
          <View style={[styles.modalHeader, {
            borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }]}>
            <View style={styles.headerContent}>
              <MaterialCommunityIcons 
                name="flag" 
                size={24} 
                color="#FF3B30" 
              />
              <ThemedText style={styles.modalTitle}>
                {targetType === 'post' ? '게시글' : '댓글'} 신고
              </ThemedText>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <MaterialCommunityIcons 
                name="close" 
                size={24} 
                color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* 안내 메시지 */}
            <View style={[styles.infoBox, {
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 149, 0, 0.05)',
              borderColor: '#FF9500'
            }]}>
              <MaterialCommunityIcons name="information" size={20} color="#FF9500" />
              <ThemedText style={styles.infoText}>
                부적절한 콘텐츠를 발견하셨나요? 신고해주시면 빠르게 검토하겠습니다.
              </ThemedText>
            </View>

            {/* 신고 이유 선택 */}
            <ThemedText style={styles.sectionTitle}>신고 이유를 선택해주세요</ThemedText>
            
            <View style={styles.reasonList}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[styles.reasonItem, {
                    backgroundColor: selectedReason === reason.id 
                      ? (colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 59, 48, 0.05)')
                      : (colorScheme === 'dark' ? '#2c2c2e' : '#ffffff'),
                    borderColor: selectedReason === reason.id 
                      ? '#FF3B30' 
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)')
                  }]}
                  onPress={() => setSelectedReason(reason.id)}
                >
                  {getReasonIcon(reason)}
                  
                  <View style={styles.reasonContent}>
                    <ThemedText style={[styles.reasonTitle, {
                      color: selectedReason === reason.id ? '#FF3B30' : undefined
                    }]}>
                      {reason.title}
                    </ThemedText>
                    <ThemedText style={styles.reasonDescription}>
                      {reason.description}
                    </ThemedText>
                  </View>

                  <View style={styles.reasonCheck}>
                    <MaterialCommunityIcons 
                      name={selectedReason === reason.id ? "radiobox-marked" : "radiobox-blank"} 
                      size={20} 
                      color={selectedReason === reason.id ? '#FF3B30' : (colorScheme === 'dark' ? '#8e8e93' : '#c7c7cc')} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* 상세 내용 입력 */}
            {selectedReason && (
              <View style={styles.detailsSection}>
                <ThemedText style={styles.sectionTitle}>
                  {selectedReason === 'other' ? '상세 내용 (필수)' : '추가 설명 (선택사항)'}
                </ThemedText>
                <View style={[styles.detailsInputContainer, {
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }]}>
                  <TextInput
                    style={[styles.detailsInput, {
                      color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                    }]}
                    placeholder={selectedReason === 'other' 
                      ? '구체적인 신고 사유를 입력해주세요...' 
                      : '추가로 설명하고 싶은 내용이 있다면 입력해주세요...'}
                    placeholderTextColor={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'}
                    value={details}
                    onChangeText={setDetails}
                    multiline={true}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <ThemedText style={styles.characterCount}>
                    {details.length}/500
                  </ThemedText>
                </View>
              </View>
            )}
          </ScrollView>

          {/* 하단 버튼 */}
          <View style={[styles.modalFooter, {
            borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }]}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={handleClose}
            >
              <ThemedText style={styles.cancelButtonText}>취소</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.footerButton, styles.submitButton, {
                opacity: (!selectedReason || (selectedReason === 'other' && !details.trim()) || isSubmitting) ? 0.5 : 1
              }]}
              onPress={handleSubmit}
              disabled={!selectedReason || (selectedReason === 'other' && !details.trim()) || isSubmitting}
            >
              <ThemedText style={styles.submitButtonText}>
                {isSubmitting ? '신고 중...' : '신고하기'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  reasonList: {
    gap: 12,
    marginBottom: 24,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 16,
  },
  reasonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonContent: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reasonDescription: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
  },
  reasonCheck: {
    marginLeft: 8,
  },
  detailsSection: {
    marginTop: 8,
  },
  detailsInputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  detailsInput: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  submitButton: {
    backgroundColor: '#FF3B30',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
}); 