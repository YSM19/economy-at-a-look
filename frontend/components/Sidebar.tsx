import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from './ThemedText';
import { useColorScheme } from '../hooks/useColorScheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ComingSoonModal } from './ComingSoonModal';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.55;

export const Sidebar = ({ isVisible, onClose }: SidebarProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userInfo, setUserInfo] = React.useState<any>(null);
  const [comingSoonModal, setComingSoonModal] = React.useState({
    visible: false,
    featureName: ''
  });

  React.useEffect(() => {
    checkLoginStatus();
  }, []);

  // 사이드바가 열릴 때마다 로그인 상태를 다시 체크
  React.useEffect(() => {
    if (isVisible) {
      checkLoginStatus();
    }
  }, [isVisible]);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      
      if (token && userInfoStr) {
        setIsLoggedIn(true);
        setUserInfo(JSON.parse(userInfoStr));
      } else {
        setIsLoggedIn(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
      setIsLoggedIn(false);
      setUserInfo(null);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      await AsyncStorage.removeItem('adminToken');
      setIsLoggedIn(false);
      setUserInfo(null);
      onClose();
      router.replace('/');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };
  
  React.useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, backdropOpacity]);

  const navigateWithTab = (tab: string) => {
    // index 페이지로 이동한 후 해당 탭을 설정하도록 파라미터 전달
    router.push({
      pathname: '/',
      params: { tab }
    } as any);
    onClose();
  };

  // 출시 예정 기능 알림 핸들러 함수 추가
  const handleComingSoonAlert = (featureName: string) => {
    setComingSoonModal({
      visible: true,
      featureName
    });
  };

  const closeComingSoonModal = () => {
    setComingSoonModal({
      visible: false,
      featureName: ''
    });
  };

  // 링크 클릭 핸들러 함수 추가
  const handleLinkPress = async (urlType: 'TERMS_URL' | 'PRIVACY_URL') => {
    // TODO: 실제 URL로 교체해야 함
    const urls = {
      TERMS_URL: 'https://valley-iguanodon-08c.notion.site/221c5888e155804797f6e327a83880c5?source=copy_link', // 실제 이용약관 URL로 교체 필요
      PRIVACY_URL: 'https://valley-iguanodon-08c.notion.site/221c5888e155805d9920e0d761ec757a?source=copy_link' // 실제 개인정보처리방침 URL로 교체 필요
    };
    
    const url = urls[urlType];
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('오류', '링크를 열 수 없습니다.');
      }
    } catch (error) {
      console.error('링크 열기 오류:', error);
      Alert.alert('오류', '링크를 여는 중 오류가 발생했습니다.');
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.backdrop, 
          { opacity: backdropOpacity }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          onPress={onClose} 
          activeOpacity={1}
        />
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.sidebar, 
          { 
            transform: [{ translateX: slideAnim }],
            backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff'
          }
        ]}
      >
        <View style={[styles.header, { 
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f8f9fa',
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
        }]}>
          <ThemedText style={styles.title}>경제 한눈에</ThemedText>
        </View>
        
        <View style={styles.menuItems}>
          <TouchableOpacity
            style={[styles.menuItem, { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' 
            }]}
            onPress={() => navigateWithTab('exchange')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)' 
            }]}>
              <MaterialCommunityIcons 
                name="currency-usd" 
                size={20} 
                color="#34C759" 
              />
            </View>
            <ThemedText style={styles.menuItemText}>환율</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.menuItem, { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' 
            }]}
            onPress={() => navigateWithTab('interest')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)' 
            }]}>
              <MaterialCommunityIcons 
                name="trending-up" 
                size={20} 
                color="#FF9500" 
              />
            </View>
            <ThemedText style={styles.menuItemText}>금리</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.menuItem, { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' 
            }]}
            onPress={() => navigateWithTab('price')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)' 
            }]}>
              <MaterialCommunityIcons 
                name="shopping" 
                size={20} 
                color="#FF3B30" 
              />
            </View>
            <ThemedText style={styles.menuItemText}>물가</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.menuItem, { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)',
              opacity: 0.7
            }]}
            onPress={() => handleComingSoonAlert('주가')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(88, 86, 214, 0.15)' : 'rgba(88, 86, 214, 0.1)' 
            }]}>
              <MaterialCommunityIcons 
                name="chart-line" 
                size={20} 
                color="#5856D6" 
              />
            </View>
            <ThemedText style={[styles.menuItemText, { 
              color: colorScheme === 'dark' ? '#8e8e93' : '#6d6d70' 
            }]}>주가</ThemedText>
            <View style={styles.comingSoonBadge}>
              <ThemedText style={styles.comingSoonText}>출시 예정</ThemedText>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.menuItem, { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)',
              opacity: 0.7
            }]}
            onPress={() => handleComingSoonAlert('국내총생산(GDP)')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(175, 82, 222, 0.15)' : 'rgba(175, 82, 222, 0.1)' 
            }]}>
              <MaterialCommunityIcons 
                name="chart-pie" 
                size={20} 
                color="#AF52DE" 
              />
            </View>
            <ThemedText style={[styles.menuItemText, { 
              color: colorScheme === 'dark' ? '#8e8e93' : '#6d6d70' 
            }]}>국내총생산</ThemedText>
            <View style={styles.comingSoonBadge}>
              <ThemedText style={styles.comingSoonText}>출시 예정</ThemedText>
            </View>
          </TouchableOpacity>

          {/* 환율 저장 기록 메뉴 (로그인 시에만 표시) */}
          {isLoggedIn && (
            <>
              <View style={styles.sectionSpacer} />
              <TouchableOpacity
                style={[styles.menuItem, { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' 
                }]}
                onPress={() => {
                  router.push('/exchange-rate-history');
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' 
                }]}>
                  <MaterialCommunityIcons 
                    name="history" 
                    size={20} 
                    color="#007AFF" 
                  />
                </View>
                <ThemedText style={styles.menuItemText}>환율 저장 기록</ThemedText>
              </TouchableOpacity>
            </>
          )}
          
          <View style={styles.divider} />
          
          {isLoggedIn ? (
            <>
              <TouchableOpacity 
                style={[styles.userInfo, {
                  backgroundColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.06)',
                  borderColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.15)',
                }]}
                onPress={() => {
                  router.push('/mypage');
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.25)' : 'rgba(0, 122, 255, 0.15)',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                }]}>
                  <MaterialCommunityIcons 
                    name="account-circle" 
                    size={22} 
                    color="#007AFF" 
                  />
                </View>
                <View style={styles.userTextContainer}>
                  <ThemedText style={[styles.userText, {
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000'
                  }]}>
                    {userInfo?.username || userInfo?.email}
                  </ThemedText>
                  {userInfo?.role === 'ADMIN' && (
                    <View style={styles.adminBadge}>
                      <ThemedText style={styles.adminBadgeText}>관리자</ThemedText>
                    </View>
                  )}
                </View>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={18} 
                  color={colorScheme === 'dark' ? '#8e8e93' : '#c7c7cc'} 
                />
              </TouchableOpacity>
              
              {userInfo?.role === 'ADMIN' && (
                <TouchableOpacity
                  style={[styles.menuItem, { 
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' 
                  }]}
                  onPress={() => {
                    router.push('/admin/dashboard');
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { 
                    backgroundColor: colorScheme === 'dark' ? 'rgba(142, 142, 147, 0.15)' : 'rgba(142, 142, 147, 0.1)' 
                  }]}>
                    <MaterialCommunityIcons 
                      name="cog" 
                      size={20} 
                      color="#8E8E93" 
                    />
                  </View>
                  <ThemedText style={styles.menuItemText}>관리자 페이지</ThemedText>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.menuItem, { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' 
                }]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)' 
                }]}>
                  <MaterialCommunityIcons 
                    name="logout" 
                    size={20} 
                    color="#FF3B30" 
                  />
                </View>
                <ThemedText style={styles.menuItemText}>로그아웃</ThemedText>
              </TouchableOpacity>
            </>
                     ) : (
             <TouchableOpacity
               style={[styles.menuItem, { 
                 backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' 
               }]}
               onPress={() => {
                 router.push('/login' as any);
                 onClose();
               }}
               activeOpacity={0.7}
             >
               <View style={[styles.iconContainer, { 
                 backgroundColor: colorScheme === 'dark' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)' 
               }]}>
                 <MaterialCommunityIcons 
                   name="login" 
                   size={20} 
                   color="#34C759" 
                 />
               </View>
               <ThemedText style={styles.menuItemText}>로그인</ThemedText>
             </TouchableOpacity>
           )}
        </View>
        
        {/* 하단 링크 섹션 */}
        <View style={styles.bottomSection}>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => handleLinkPress('TERMS_URL')}
          >
            <MaterialCommunityIcons 
              name="file-document-outline" 
              size={20} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.footerLinkText}>이용약관</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => handleLinkPress('PRIVACY_URL')}
          >
            <MaterialCommunityIcons 
              name="shield-account-outline" 
              size={20} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.footerLinkText}>개인정보처리방침</ThemedText>
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      {/* 출시 예정 기능 모달 */}
      <ComingSoonModal
        visible={comingSoonModal.visible}
        featureName={comingSoonModal.featureName}
        onClose={closeComingSoonModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 8,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 28,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    minHeight: 120,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 30,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 18,
  },
  menuItems: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 22,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginVertical: 16,
    marginHorizontal: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  userTextContainer: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  sectionSpacer: {
    height: 20,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  footerSubText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 14,
  },
  comingSoonBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.1,
  },
}); 