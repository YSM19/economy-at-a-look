import React from 'react';
import { View } from 'react-native';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isVisible, onClose }: SidebarProps) => {
  // 사이드바 기능이 비활성화됨
  return null;
};