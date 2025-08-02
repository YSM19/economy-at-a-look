import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView, RefreshControl, useColorScheme, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useNotifications, Notification } from './NotificationProvider';
import { useRouter } from 'expo-router';
import { 
  getEnvironment, 
  isServerNotificationSupported 
} from '../utils/environmentUtils';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, removeNotification, loadNotifications } = useNotifications();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    setIsModalVisible(false);
    
    // 알림 타입에 따라 적절한 페이지로 이동
    if (notification.data?.postId) {
      router.push(`/community/post/${notification.data.postId}` as any);
    }
  };

  const handleRemoveNotification = (id: string, event: any) => {
    event.stopPropagation();
    Alert.alert(
      '알림 삭제',
      '이 알림을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => removeNotification(id) }
      ]
    );
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return { name: 'heart', color: '#FF3B30' };
      case 'comment':
        return { name: 'comment', color: '#007AFF' };
      case 'reply':
        return { name: 'reply', color: '#34C759' };
      case 'mention':
        return { name: 'at', color: '#FF9500' };
      case 'system':
        return { name: 'information', color: '#5856D6' };
      default:
        return { name: 'bell', color: '#8E8E93' };
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
    <>
      <TouchableOpacity
        style={styles.bellContainer}
        onPress={() => setIsModalVisible(true)}
      >
        <MaterialCommunityIcons 
          name="bell-outline" 
          size={24} 
          color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, {
            backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff'
          }]}>
            {/* 헤더 */}
            <View style={[styles.modalHeader, {
              borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }]}>
              <ThemedText style={styles.modalTitle}>알림</ThemedText>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={styles.markAllButton}
                    onPress={markAllAsRead}
                  >
                    <ThemedText style={styles.markAllButtonText}>모두 읽음</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <MaterialCommunityIcons 
                    name="close" 
                    size={24} 
                    color={colorScheme === 'dark' ? '#ffffff' : '#000000'} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 알림 목록 */}
            <ScrollView
              style={styles.notificationList}
              refreshControl={
                <RefreshControl refreshing={isLoading} onRefresh={loadNotifications} />
              }
            >
              {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons 
                    name="bell-sleep" 
                    size={64} 
                    color={colorScheme === 'dark' ? '#8e8e93' : '#c7c7cc'} 
                  />
                  <ThemedText style={styles.emptyText}>알림이 없습니다</ThemedText>
                  <ThemedText style={styles.emptySubText}>
                    {!isServerNotificationSupported() 
                      ? `${getEnvironment()} 환경에서는 샘플 알림만 표시됩니다.`
                      : '새로운 알림이 오면 여기에 표시됩니다'
                    }
                  </ThemedText>
                </View>
              ) : (
                notifications.map((notification) => {
                  const iconConfig = getNotificationIcon(notification.type);
                  return (
                    <TouchableOpacity
                      key={notification.id}
                      style={[styles.notificationItem, {
                        backgroundColor: notification.isRead 
                          ? 'transparent' 
                          : (colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)'),
                        borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }]}
                      onPress={() => handleNotificationPress(notification)}
                    >
                      <View style={styles.notificationContent}>
                        <View style={[styles.notificationIcon, { backgroundColor: `${iconConfig.color}15` }]}>
                          <MaterialCommunityIcons 
                            name={iconConfig.name as any} 
                            size={20} 
                            color={iconConfig.color} 
                          />
                        </View>
                        
                        <View style={styles.notificationBody}>
                          <View style={styles.notificationHeader}>
                            <ThemedText style={styles.notificationTitle} numberOfLines={1}>
                              {notification.title}
                            </ThemedText>
                            <ThemedText style={styles.notificationDate}>
                              {formatDate(notification.createdAt)}
                            </ThemedText>
                          </View>
                          
                          <ThemedText style={styles.notificationMessage} numberOfLines={2}>
                            {notification.message}
                          </ThemedText>
                          
                          {!notification.isRead && (
                            <View style={styles.unreadIndicator} />
                          )}
                        </View>
                        
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={(e) => handleRemoveNotification(notification.id, e)}
                        >
                          <MaterialCommunityIcons 
                            name="close" 
                            size={16} 
                            color={colorScheme === 'dark' ? '#8e8e93' : '#8e8e93'} 
                          />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '80%',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 16,
  },
  markAllButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationList: {
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
    textAlign: 'center',
  },
  notificationItem: {
    borderBottomWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationBody: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  notificationDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  notificationMessage: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    right: -8,
    top: 8,
    width: 8,
    height: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
}); 