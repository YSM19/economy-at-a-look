import React, { useMemo, useState, useCallback } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import Constants from 'expo-constants';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useMobileAds } from './useMobileAds';

type BannerPlacement = 'exchangeRecommendations' | 'interestRecommendations' | 'cpiRecommendations';
type SupportedBannerSize = keyof typeof BannerAdSize;

interface BannerAdSlotProps {
  placement: BannerPlacement;
  containerStyle?: ViewStyle;
  bannerSize?: SupportedBannerSize;
}

type AdmobExtra = {
  banner?: {
    default?: string;
    android?: string;
    ios?: string;
    placements?: Record<BannerPlacement, Partial<Record<'default' | 'android' | 'ios', string>>>;
  };
};

const getAdmobExtra = (): AdmobExtra | undefined => {
  const expoExtra = (Constants.expoConfig?.extra as any) || {};
  const manifestExtra = (Constants.manifest as any)?.extra || {};
  return (expoExtra.admob as AdmobExtra) || (manifestExtra.admob as AdmobExtra) || undefined;
};

const resolveBannerId = (
  extra: AdmobExtra | undefined,
  placement: BannerPlacement,
  platformKey: 'ios' | 'android' | 'default',
  fallback: string
): string => {
  const placements = extra?.banner?.placements;
  const fromPlacement =
    placements?.[placement]?.[platformKey] ?? placements?.[placement]?.default ?? null;

  if (fromPlacement) {
    return fromPlacement;
  }

  const fromBannerConfig =
    (platformKey !== 'default' ? extra?.banner?.[platformKey] : undefined) ?? extra?.banner?.default ?? null;

  if (fromBannerConfig) {
    return fromBannerConfig;
  }

  return fallback;
};

export const BannerAdSlot: React.FC<BannerAdSlotProps> = ({
  placement,
  containerStyle,
  bannerSize = 'MEDIUM_RECTANGLE',
}) => {
  const { nativeAvailable } = useMobileAds();
  const [shouldShow, setShouldShow] = useState(true);

  const extra = useMemo(() => getAdmobExtra(), []);
  const platformKey: 'ios' | 'android' | 'default' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'default';
  const fallbackTestId = TestIds.BANNER;

  const adUnitId = useMemo(
    () => resolveBannerId(extra, placement, platformKey, fallbackTestId),
    [extra, placement, platformKey, fallbackTestId]
  );

  const handleLoadError = useCallback(
    (error: Error) => {
      console.warn(`[AdMob] ${placement} 배너 로딩 실패:`, error);
      setShouldShow(false);
    },
    [placement]
  );

  const handleAdLoaded = useCallback(() => {
    setShouldShow(true);
  }, []);

  if (Platform.OS === 'web' || !nativeAvailable) {
    return null;
  }

  const sizeValue = BannerAdSize[bannerSize] ?? BannerAdSize.MEDIUM_RECTANGLE;

  return (
    <View style={[styles.container, containerStyle]}>
      {shouldShow ? (
        <BannerAd
          unitId={adUnitId}
          size={sizeValue}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={handleLoadError}
          onAdLoaded={handleAdLoaded}
        />
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 16,
  },
  placeholder: {
    width: 320,
    height: 100,
  },
});

