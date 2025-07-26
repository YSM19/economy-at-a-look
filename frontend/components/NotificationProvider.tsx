import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationApi } from '../services/api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'like' | 'comment' | 'reply' | 'mention' | 'system';
  isRead: boolean;
  createdAt: string;
  data?: {
    postId?: number;
    commentId?: number;
    userId?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  loadNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // 샘플 알림 데이터
  const sampleNotifications: Notification[] = [
    {
      id: '1',
      title: '새로운 댓글',
      message: '투자고수님이 회원님의 글에 댓글을 남겼습니다.',
      type: 'comment',
      isRead: false,
      createdAt: '2024-01-15T10:30:00Z',
      data: { postId: 1, userId: 'investor123' }
    },
    {
      id: '2', 
      title: '좋아요 알림',
      message: '경제분석가님이 회원님의 글을 좋아합니다.',
      type: 'like',
      isRead: false,
      createdAt: '2024-01-15T09:15:00Z',
      data: { postId: 2, userId: 'analyst456' }
    },
    {
      id: '3',
      title: '시스템 알림',
      message: '새로운 기능이 추가되었습니다! 이미지 첨부 기능을 확인해보세요.',
      type: 'system',
      isRead: true,
      createdAt: '2024-01-14T18:00:00Z'
    }
  ];

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setNotifications([]);
        return;
      }
      
      const response = await notificationApi.getNotifications(token);
      if (response.data?.success) {
        setNotifications(response.data.data?.notifications || []);
      } else {
        // 실패 시 샘플 데이터로 대체
        setNotifications(sampleNotifications);
      }
      
    } catch (error) {
      console.error('알림 로딩 오류:', error);
      // 오류 시 샘플 데이터로 대체
      setNotifications(sampleNotifications);
    } finally {
      setIsLoading(false);
    }
  };

  const addNotification = (notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      isRead: false,
      createdAt: new Date().toISOString(),
      ...notificationData
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      await notificationApi.markAsRead(id, token);
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('알림 읽음 처리 오류:', error);
      // 로컬 상태라도 업데이트
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      await notificationApi.markAllAsRead(token);
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error('전체 알림 읽음 처리 오류:', error);
      // 로컬 상태라도 업데이트
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    }
  };

  const removeNotification = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      await notificationApi.deleteNotification(id, token);
      
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (error) {
      console.error('알림 삭제 오류:', error);
      // 로컬 상태라도 업데이트
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 알림 로드
    loadNotifications();
    
    // 실시간 알림을 위한 폴링 (선택사항)
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // 30초마다 확인
    
    return () => clearInterval(interval);
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    loadNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 