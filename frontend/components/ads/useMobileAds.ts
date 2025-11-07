import { useEffect, useMemo } from 'react';
import { NativeModules, Platform } from 'react-native';

type MobileAdsModule = {
  MobileAds?: () => {
    initialize: () => Promise<unknown>;
    setRequestConfiguration: (config: { maxAdContentRating?: string }) => Promise<unknown>;
  };
  default?: () => {
    initialize: () => Promise<unknown>;
    setRequestConfiguration: (config: { maxAdContentRating?: string }) => Promise<unknown>;
  };
  MaxAdContentRating?: Record<string, string>;
};

export const useMobileAds = () => {
  const nativeAvailable = useMemo(() => {
    if (Platform.OS === 'web') {
      return false;
    }
    const nativeModules = NativeModules as Record<string, unknown>;
    return Boolean(nativeModules?.RNGoogleMobileAdsModule);
  }, []);

  const adsModule = useMemo<MobileAdsModule | null>(() => {
    if (!nativeAvailable) {
      return null;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('react-native-google-mobile-ads') as MobileAdsModule;
    } catch (error) {
      console.warn('[AdMob] google-mobile-ads 패키지를 불러오지 못했습니다:', error);
      return null;
    }
  }, [nativeAvailable]);

  useEffect(() => {
    if (!nativeAvailable || !adsModule) {
      return;
    }

    const mobileAdsFactory =
      typeof adsModule.default === 'function'
        ? adsModule.default
        : typeof adsModule.MobileAds === 'function'
          ? adsModule.MobileAds
          : null;

    if (!mobileAdsFactory) {
      console.warn('[AdMob] mobileAds 인스턴스를 가져오지 못했습니다.');
      return;
    }

    const instance = mobileAdsFactory();
    const maxRating =
      adsModule.MaxAdContentRating?.PG ??
      adsModule.MaxAdContentRating?.T ??
      adsModule.MaxAdContentRating?.G;

    instance
      .setRequestConfiguration({
        maxAdContentRating: maxRating,
      })
      .catch((error: unknown) => {
        console.warn('[AdMob] 광고 요청 설정 실패:', error);
      })
      .finally(() => {
        instance
          .initialize()
          .catch((error: unknown) => {
            console.warn('[AdMob] 모바일 광고 초기화 실패:', error);
          });
      });
  }, [adsModule, nativeAvailable]);

  return { adsModule, nativeAvailable };
};
