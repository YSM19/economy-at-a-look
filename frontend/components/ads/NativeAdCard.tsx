import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { useMobileAds } from './useMobileAds';

type NativeAdInstance = {
  destroy: () => void;
  headline?: string | null;
  advertiser?: string | null;
  body?: string | null;
  callToActionText?: string | null;
  callToAction?: string | null;
  [key: string]: unknown;
};

type NativeAdClass = {
  createForAdRequest: (
    unitId: string,
    options?: Record<string, unknown>
  ) => Promise<NativeAdInstance | null>;
};

const TEST_NATIVE_IDS = {
  ios: 'ca-app-pub-3940256099942544/3986624511',
  android: 'ca-app-pub-3940256099942544/2247696110',
};
const LOAD_TIMEOUT_MS = 8000;

type PlatformKey = 'ios' | 'android' | 'default';

type AdmobExtra = {
  native?: {
    default?: string;
    android?: string;
    ios?: string;
  };
};

const getAdmobExtra = (): AdmobExtra | undefined => {
  const expoExtra = (Constants.expoConfig?.extra as any) || {};
  const manifestExtra = (Constants.manifest as any)?.extra || {};
  return (expoExtra.admob as AdmobExtra) || (manifestExtra.admob as AdmobExtra) || undefined;
};

const resolveNativeUnitId = (extra: AdmobExtra | undefined, platformKey: PlatformKey, fallback: string) => {
  if (!extra?.native) {
    return fallback;
  }
  const fromPlatform = platformKey !== 'default' ? extra.native[platformKey] : undefined;
  return fromPlatform ?? extra.native.default ?? fallback;
};

export const NativeAdCard: React.FC = () => {
  const { nativeAvailable, adsModule } = useMobileAds();
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nativeAd, setNativeAd] = useState<NativeAdInstance | null>(null);
  const mountedRef = useRef(true);
  const nativeAdRef = useRef<NativeAdInstance | null>(null);
  const loadIdRef = useRef(0);

  const extra = useMemo(() => getAdmobExtra(), []);
  const platformKey: PlatformKey =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'default';
  const fallbackNativeTestId =
    adsModule?.TestIds?.NATIVE_ADVANCED ||
    (platformKey === 'ios' ? TEST_NATIVE_IDS.ios : TEST_NATIVE_IDS.android);
  const NativeAdComponent = adsModule?.NativeAd as NativeAdClass | undefined;
  const NativeAdViewComponent = adsModule?.NativeAdView;
  const NativeAssetComponent = adsModule?.NativeAsset;
  const NativeAssetTypeEnum = adsModule?.NativeAssetType as Record<string, string> | undefined;
  const NativeMediaViewComponent = adsModule?.NativeMediaView;

  const unitId = useMemo(
    () => resolveNativeUnitId(extra, platformKey, fallbackNativeTestId),
    [extra, platformKey, fallbackNativeTestId]
  );

  const cleanupNativeAd = useCallback(() => {
    nativeAdRef.current?.destroy();
    nativeAdRef.current = null;
    setNativeAd(null);
  }, []);

  const updateNativeAd = useCallback(
    (ad: NativeAdInstance | null) => {
      if (!mountedRef.current) {
        ad?.destroy();
        return;
      }
      nativeAdRef.current?.destroy();
      nativeAdRef.current = ad;
      setNativeAd(ad);
    },
    []
  );

  const loadNativeAd = useCallback(async () => {
    if (!nativeAvailable || Platform.OS === 'web' || !unitId || !NativeAdComponent) {
      cleanupNativeAd();
      return;
    }

    const currentLoadId = loadIdRef.current + 1;
    loadIdRef.current = currentLoadId;

    setIsLoading(true);
    setHasError(false);

    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      if (!mountedRef.current || loadIdRef.current !== currentLoadId) {
        return;
      }
      didTimeout = true;
      console.warn('[AdMob] 네이티브 광고 로딩이 제한 시간 내에 완료되지 않았습니다.');
      cleanupNativeAd();
      setIsLoading(false);
      setHasError(true);
    }, LOAD_TIMEOUT_MS);

    try {
      const ad = await NativeAdComponent.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      if (!mountedRef.current || loadIdRef.current !== currentLoadId) {
        ad?.destroy();
        return;
      }

      if (didTimeout) {
        ad?.destroy();
        return;
      }

      updateNativeAd(ad);
    } catch (error) {
      console.warn('[AdMob] 네이티브 광고 로딩 실패:', error);
      if (!mountedRef.current || loadIdRef.current !== currentLoadId) {
        return;
      }

      cleanupNativeAd();
      setHasError(true);
    } finally {
      clearTimeout(timeoutId);
      if (!didTimeout && mountedRef.current && loadIdRef.current === currentLoadId) {
        setIsLoading(false);
      }
    }
  }, [NativeAdComponent, cleanupNativeAd, nativeAvailable, unitId, updateNativeAd]);

  useEffect(() => {
    loadNativeAd();
  }, [loadNativeAd]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      nativeAdRef.current?.destroy();
      nativeAdRef.current = null;
    };
  }, []);

  const renderFallback = (
    title: string,
    subtitle: string,
    actionLabel?: string,
    onAction?: () => void
  ) => (
    <View style={styles.wrapper}>
      <View style={[styles.container, styles.fallbackContainer]}>
        <Text style={styles.fallbackTitle}>{title}</Text>
        <Text style={styles.fallbackSubtitle}>{subtitle}</Text>
        {actionLabel && onAction ? (
          <TouchableOpacity style={styles.retryButton} onPress={onAction} disabled={isLoading}>
            <Text style={styles.retryButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  if (!nativeAvailable || Platform.OS === 'web' || !unitId) {
    return renderFallback(
      '네이티브 광고 모듈을 불러오지 못했습니다.',
      'Expo Go에서는 표시되지 않으며, Dev Client/빌드 앱에서만 동작합니다.'
    );
  }

  if (
    !NativeAdComponent ||
    !NativeAdViewComponent ||
    !NativeAssetComponent ||
    !NativeAssetTypeEnum ||
    !NativeMediaViewComponent
  ) {
    return renderFallback(
      '광고 컴포넌트를 초기화할 수 없습니다.',
      'Dev Client/빌드 앱 환경에서 다시 시도해주세요.'
    );
  }

  if (hasError) {
    return renderFallback('광고 로딩에 실패했습니다.', '잠시 후 다시 시도해주세요.', '다시 시도', () => {
      if (!isLoading) {
        loadNativeAd();
      }
    });
  }

  if (isLoading || !nativeAd) {
    return renderFallback('광고를 불러오는 중입니다.', '잠시만 기다려주세요.');
  }

  return (
    <View style={styles.wrapper}>
      <NativeAdViewComponent nativeAd={nativeAd} style={styles.container}>
        <View style={styles.content}>
          <NativeMediaViewComponent style={styles.media} />
          <View style={styles.textContainer}>
            <NativeAssetComponent assetType={NativeAssetTypeEnum.HEADLINE}>
              <Text style={styles.headline} numberOfLines={2}>
                {nativeAd.headline}
              </Text>
            </NativeAssetComponent>
            {nativeAd.body ? (
              <NativeAssetComponent assetType={NativeAssetTypeEnum.BODY}>
                <Text style={styles.tagline} numberOfLines={2}>
                  {nativeAd.body}
                </Text>
              </NativeAssetComponent>
            ) : null}
            {nativeAd.advertiser ? (
              <NativeAssetComponent assetType={NativeAssetTypeEnum.ADVERTISER}>
                <Text style={styles.advertiser} numberOfLines={1}>
                  {nativeAd.advertiser}
                </Text>
              </NativeAssetComponent>
            ) : null}
            {nativeAd.callToAction ? (
              <NativeAssetComponent assetType={NativeAssetTypeEnum.CALL_TO_ACTION}>
                <TouchableOpacity style={styles.cta} activeOpacity={0.85}>
                  <Text style={styles.ctaText} numberOfLines={1}>
                    {nativeAd.callToAction}
                  </Text>
                </TouchableOpacity>
              </NativeAssetComponent>
            ) : null}
          </View>
        </View>
      </NativeAdViewComponent>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginTop: 16,
    marginBottom: 8,
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  media: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#EEF1F5',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  headline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  tagline: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 6,
  },
  advertiser: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  cta: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    paddingVertical: 24,
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  fallbackSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
