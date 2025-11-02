import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExchangeRateGauge from '../../components/ExchangeRateGauge';
import InterestRateGauge from '../../components/InterestRateGauge';
import CPIGauge from '../../components/CPIGauge';
import { ExchangeRateChart } from '../../components/charts/ExchangeRateChart';
import { InterestRateChart } from '../../components/charts/InterestRateChart';
import { CPIChart } from '../../components/charts/CPIChart';
import ExchangeRateRecommendations from '../../components/ExchangeRateRecommendations';
import InterestRateRecommendations from '../../components/InterestRateRecommendations';
import CPIRecommendations from '../../components/CPIRecommendations';
import NotificationSettingsModal from '../../components/NotificationSettingsModal';
import { economicIndexApi } from '../../services/api';
import { LineChart } from 'react-native-gifted-charts';
import { 
  initializeNotifications, 
  checkExchangeRateNotification, 
  checkInterestRateNotification, 
  checkCPINotification 
} from '../../utils/notificationUtils';

interface ExchangeRateData {
  currentRate: number;
  prevRate: number;
  changeRate: number;
  trend: string;
}

interface InterestRateData {
  currentRate: number;
  prevRate: number;
  changeRate: number;
  trend: string;
}

interface CPIData {
  currentCPI: number;
  prevMonthCPI: number;
  changeRate: number;
  annualRate: number;
  date?: string;
}

interface PeriodData {
  date: string;
  usdRate: number;
  eurRate: number;
  jpyRate: number;
  cnyRate?: number;
}

interface InterestRatePeriodData {
  date: string;
  rate: number;
  announcementDate: string;
}

type CountryKey = 'usa' | 'japan' | 'china' | 'europe';
const COUNTRY_KEYS: CountryKey[] = ['usa', 'japan', 'china', 'europe'];

const getRateForCountryKey = (item: Partial<PeriodData>, country: CountryKey): number | null => {
  switch (country) {
    case 'usa':
      return item.usdRate ?? null;
    case 'japan':
      return item.jpyRate ?? null;
    case 'china':
      return item.cnyRate ?? null;
    case 'europe':
      return item.eurRate ?? null;
    default:
      return null;
  }
};
export default function IndicatorsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [activeTab, setActiveTab] = useState(
    typeof params.tab === 'string' ? params.tab : 'exchange'
  );
  const [activeCountry, setActiveCountry] = useState('usa');
  
  const [exchangeRateData, setExchangeRateData] = useState<ExchangeRateData | null>(null);
  const [interestRateData, setInterestRateData] = useState<InterestRateData | null>(null);
  const [cpiData, setCpiData] = useState<CPIData | null>(null);
  const [weeklyData, setWeeklyData] = useState<PeriodData[]>([]);
  const [monthlyData, setMonthlyData] = useState<PeriodData[]>([]);
  const [yearlyData, setYearlyData] = useState<PeriodData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [showYearlySection, setShowYearlySection] = useState(false);
  const [interestRateHistoryData, setInterestRateHistoryData] = useState<InterestRatePeriodData[]>([]);
  const [cpiHistoryData, setCpiHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  const formatCurrency = (value: number | null, fractionDigits = 2) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '-';
    }
    return `${value.toLocaleString('ko-KR', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}원`;
  };

  const formatQuarterChange = (value: number | null) => {
    if (value === null) {
      return '기준 분기';
    }
    if (value === 0) {
      return '변화 없음';
    }
    const formatted = Math.abs(value).toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${value > 0 ? '+' : '-'}${formatted}원`;
  };

  const buildAxis = useCallback((values: number[], desiredSections: number) => {
    if (!values.length) {
      return null;
    }

    let min = Math.min(...values);
    let max = Math.max(...values);

    if (min === max) {
      const delta = Math.max(Math.abs(min) * 0.01, 1);
      min -= delta;
      max += delta;
    }

    const range = max - min;
    const padding = Math.max(range * 0.1, 1);

    min = Math.max(min - padding, 0);
    max = max + padding;

    min = parseFloat(min.toFixed(2));
    max = parseFloat(max.toFixed(2));

    const sections = Math.max(Math.min(desiredSections, 6), 2);
    const stepRaw = (max - min) / sections;
    const step = stepRaw > 0 ? parseFloat(stepRaw.toFixed(2)) : 1;

    const labels = Array.from({ length: sections + 1 }, (_, idx) => {
      const value = max - step * idx;
      return value.toLocaleString('ko-KR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    });

    return {
      min,
      max,
      step,
      sections,
      labels,
    };
  }, []);

  const quarterlySummary = useMemo(() => {
    if (!yearlyData || yearlyData.length === 0) {
      return [];
    }

    const buckets: Record<number, { sum: number; count: number }> = {};

    yearlyData.forEach(item => {
      const parsedDate = new Date(item.date);
      if (Number.isNaN(parsedDate.getTime())) {
        return;
      }

      const rate = getRateForCountryKey(item, activeCountry as CountryKey);
      if (rate === null || rate === undefined) {
        return;
      }

      const quarter = Math.floor(parsedDate.getMonth() / 3) + 1;
      if (!buckets[quarter]) {
        buckets[quarter] = { sum: 0, count: 0 };
      }
      buckets[quarter].sum += rate;
      buckets[quarter].count += 1;
    });

    const summaries: {
      quarter: number;
      average: number;
      change: number | null;
    }[] = [];

    let previousAverage: number | null = null;

    for (let q = 1; q <= 4; q += 1) {
      const bucket = buckets[q];
      if (!bucket || bucket.count === 0) {
        continue;
      }
      const average = Number((bucket.sum / bucket.count).toFixed(2));
      const change = previousAverage !== null ? average - previousAverage : null;

      summaries.push({
        quarter: q,
        average,
        change,
      });

      previousAverage = average;
    }

    return summaries;
  }, [yearlyData, activeCountry]);

  const yearlyMonthlyAverageData = useMemo(() => {
    if (!yearlyData.length) {
      return [];
    }

    const buckets = new Map<number, { sums: Record<CountryKey, number>; counts: Record<CountryKey, number> }>();

    yearlyData.forEach(item => {
      const parsedDate = new Date(item.date);
      if (Number.isNaN(parsedDate.getTime())) {
        return;
      }
      const month = parsedDate.getMonth();
      const bucket = buckets.get(month) ?? (() => {
        const sums: Record<CountryKey, number> = { usa: 0, japan: 0, china: 0, europe: 0 };
        const counts: Record<CountryKey, number> = { usa: 0, japan: 0, china: 0, europe: 0 };
        const fresh = { sums, counts };
        buckets.set(month, fresh);
        return fresh;
      })();

      COUNTRY_KEYS.forEach(countryKey => {
        const rate = getRateForCountryKey(item, countryKey);
        if (rate !== null) {
          bucket.sums[countryKey] += rate;
          bucket.counts[countryKey] += 1;
        }
      });
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([month, bucket]) => {
        const date = `${selectedYear}-${String(month + 1).padStart(2, '0')}-01`;
        const result: PeriodData = {
          date,
          usdRate: bucket.counts.usa ? Number((bucket.sums.usa / bucket.counts.usa).toFixed(2)) : 0,
          eurRate: bucket.counts.europe ? Number((bucket.sums.europe / bucket.counts.europe).toFixed(2)) : 0,
          jpyRate: bucket.counts.japan ? Number((bucket.sums.japan / bucket.counts.japan).toFixed(2)) : 0,
          cnyRate: bucket.counts.china ? Number((bucket.sums.china / bucket.counts.china).toFixed(2)) : 0,
        };
        return result;
      });
  }, [yearlyData, selectedYear]);
  const yearlyAxis = useMemo(() => {
    const values = yearlyMonthlyAverageData
      .map(item => getRateForCountryKey(item, activeCountry as CountryKey))
      .filter((value): value is number => value !== null && value !== undefined && !Number.isNaN(value) && value > 0);

    if (!values.length) {
      return null;
    }

    return buildAxis(values, Math.min(values.length, 6));
  }, [yearlyMonthlyAverageData, activeCountry, buildAxis]);



  const quarterlyChartData = useMemo(() => {
    return quarterlySummary.map(item => ({
      value: Number(item.average.toFixed(2)),
      label: `${item.quarter}Q`,
      dataPointText: formatCurrency(item.average, 2),
    }));
  }, [quarterlySummary]);

  const quarterlyAxis = useMemo(() => {
    if (!quarterlySummary.length) {
      return null;
    }

    const values = quarterlySummary
      .map(item => item.average)
      .filter(value => !Number.isNaN(value) && value > 0);

    if (!values.length) {
      return null;
    }

    return buildAxis(values, Math.min(values.length, 4));
  }, [quarterlySummary, buildAxis]);

  const currentYear = new Date().getFullYear();
  const MIN_YEAR = 1990;
  const yearlyDataCacheRef = useRef<Record<number, PeriodData[]>>({});

  const countryColors = useMemo(() => ({
    usa: '#3b82f6',
    japan: '#f97316',
    china: '#22c55e',
    europe: '#e11d48',
  }), []);

  const activeLineColor = countryColors[activeCountry as keyof typeof countryColors] ?? '#3b82f6';

  // 알림 초기화 (Expo Go 환경에서는 제한적)
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await initializeNotifications();
      } catch (error) {
        console.log('알림 초기화 실패 (Expo Go 환경일 수 있음):', error);
      }
    };
    
    initNotifications();
  }, []);

  // params.tab이 변경되면 activeTab도 업데이트
  useEffect(() => {
    if (params.tab && typeof params.tab === 'string') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  // 달력 기준으로 n일 전 날짜 계산
  const getDaysAgo = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const getToday = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const handleYearChange = (offset: number) => {
    setSelectedYear(prevYear => {
      let nextYear = prevYear + offset;
      if (nextYear > currentYear) {
        nextYear = currentYear;
      }
      if (nextYear < MIN_YEAR) {
        nextYear = MIN_YEAR;
      }
      return nextYear;
    });
  };

  const normalizeDateValue = (value: any): string | null => {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && value.length >= 3) {
      const [year, month, day] = value;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    if (typeof value === 'object') {
      const source: any = value.date ?? value;
      const year = source?.year ?? source?.y ?? source?.Y;
      const month = source?.monthValue ?? source?.month ?? source?.M;
      const day = source?.dayOfMonth ?? source?.day ?? source?.d;
      if (year !== undefined && month !== undefined && day !== undefined) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    return null;
  };

  const parseRateValue = (value: any): number | null => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[\\s,]/g, '');
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const mapYearlyPeriodEntries = (entries: any[]): PeriodData[] => {
    const mapped = entries
      .map((item: any) => {
        const date = normalizeDateValue(item?.date ?? item?.searchDate);
        if (!date) {
          return null;
        }

        const usdRate = parseRateValue(item?.usdRate ?? item?.usd_rate ?? item?.usd);
        const eurRate = parseRateValue(item?.eurRate ?? item?.eur_rate ?? item?.eur);
        const jpyRate = parseRateValue(item?.jpyRate ?? item?.jpy_rate ?? item?.jpy);
        const cnyRate = parseRateValue(item?.cnyRate ?? item?.cny_rate ?? item?.cny);

        if (usdRate === null && eurRate === null && jpyRate === null && cnyRate === null) {
          return null;
        }

        return {
          date,
          usdRate: usdRate ?? 0,
          eurRate: eurRate ?? 0,
          jpyRate: jpyRate ?? 0,
          cnyRate: cnyRate ?? 0,
        };
      })
      .filter((item): item is PeriodData => item !== null);

    return mapped.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const fetchYearlyContent = useCallback(async (year: number): Promise<PeriodData[]> => {
    const cached = yearlyDataCacheRef.current[year];
    if (cached) {
      return cached;
    }

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const response = await economicIndexApi.getExchangeRateByPeriod(startDate, endDate);
    const apiResponse = response.data;

    if (!apiResponse?.success || !Array.isArray(apiResponse.data)) {
      yearlyDataCacheRef.current[year] = [];
      return [];
    }

    const mapped = mapYearlyPeriodEntries(apiResponse.data);
    yearlyDataCacheRef.current[year] = mapped;
    return mapped;
  }, []);

  // 환율 차트 데이터 가져오기
  const fetchExchangeRateChartData = async () => {
    try {
      setChartLoading(true);
      
      // 현재 환율 데이터 가져오기
      const currentResponse = await economicIndexApi.getExchangeRate();
      if (currentResponse.data && currentResponse.data.success && currentResponse.data.data) {
        const apiData = currentResponse.data.data;
        let currentRate = 0;
        
        // 국가별 기본값 설정
        const getDefaultRate = (country: string) => {
          switch(country) {
            case 'usa': return 1300;
            case 'japan': return 1000;
            case 'china': return 180;
            case 'europe': return 1400;
            default: return 1300;
          }
        };
        
        // 선택된 국가에 따라 환율 설정
        switch(activeCountry) {
          case 'usa':
            currentRate = apiData.usdRate || getDefaultRate('usa');
            break;
          case 'japan':
            currentRate = apiData.jpyRate || getDefaultRate('japan');
            break;
          case 'china':
            currentRate = apiData.cnyRate || getDefaultRate('china');
            break;
          case 'europe':
            currentRate = apiData.eurRate || getDefaultRate('europe');
            break;
          default:
            currentRate = apiData.usdRate || getDefaultRate('usa');
        }
        
        setExchangeRateData({
          currentRate: currentRate,
          prevRate: currentRate,
          changeRate: 0,
          trend: '보합'
        });

        // 환율 알림 체크
        await checkExchangeRateNotification(apiData);
      }
      
      // 7일 데이터 가져오기
      const weekStartDate = getDaysAgo(14);
      const weekEndDate = getToday();
      const weeklyResponse = await economicIndexApi.getExchangeRateByPeriod(weekStartDate, weekEndDate);
      
      if (weeklyResponse.data && weeklyResponse.data.success && weeklyResponse.data.data) {
        const allWeeklyData = weeklyResponse.data.data;
        const filteredData = allWeeklyData.filter((item: PeriodData) => {
          const date = new Date(item.date);
          const dayOfWeek = date.getDay();
          return dayOfWeek !== 0 && dayOfWeek !== 6; // 주말 제외
        });
        const recentSevenDays = filteredData.length >= 7 ? filteredData.slice(-7) : filteredData;
        setWeeklyData(recentSevenDays);
      }

      // 30일 데이터 가져오기
      const monthStartDate = getDaysAgo(45);
      const monthEndDate = getToday();
      const monthlyResponse = await economicIndexApi.getExchangeRateByPeriod(monthStartDate, monthEndDate);
      
      if (monthlyResponse.data && monthlyResponse.data.success && monthlyResponse.data.data) {
        const allMonthlyData = monthlyResponse.data.data;
        const filteredData = allMonthlyData.filter((item: PeriodData) => {
          const date = new Date(item.date);
          const dayOfWeek = date.getDay();
          return dayOfWeek !== 0 && dayOfWeek !== 6; // 주말 제외
        });
        const recentThirtyDays = filteredData.length >= 30 ? filteredData.slice(-30) : filteredData;
        setMonthlyData(recentThirtyDays);
      }
    } catch (err) {
      console.error('환율 차트 데이터 로딩 실패:', err);
    } finally {
      setChartLoading(false);
    }
  };

  // 금리 차트 데이터 가져오기
  const fetchInterestRateChartData = async () => {
    try {
      setChartLoading(true);
      
      // 현재 금리 정보와 발표일 데이터를 병렬로 가져오기
      const [currentRateResponse, announcementsResponse] = await Promise.all([
        economicIndexApi.getInterestRate(),
        economicIndexApi.getInterestRateAnnouncements('KR')
      ]);
      
      if (currentRateResponse.data && currentRateResponse.data.success && currentRateResponse.data.data &&
          announcementsResponse.data && announcementsResponse.data.success) {
        
        // 현재 금리 데이터 설정
        const koreaData = currentRateResponse.data.data.korea;
        const announcements = announcementsResponse.data.data || [];
        
        const toNumber = (input: any): number | null => {
          if (input === null || input === undefined) return null;
          const numeric = typeof input === 'number' ? input : parseFloat(input);
          return Number.isNaN(numeric) ? null : numeric;
        };

        const sortedAnnouncements = announcements
          .map((item: any) => ({
            date: item.date,
            rate: toNumber(item.interestRate),
          }))
          .filter((item: any) => item.rate !== null)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const previousAnnouncement = sortedAnnouncements.length > 1 ? sortedAnnouncements[1] : null;
        const currentRate = toNumber(koreaData.rate) ?? (sortedAnnouncements[0]?.rate ?? 0);
        const previousRate = previousAnnouncement?.rate ?? currentRate;
        const changeAmount = currentRate - previousRate;
        const trend =
          changeAmount > 0 ? '상승' : changeAmount < 0 ? '하락' : '보합';

        setInterestRateData({
          currentRate,
          prevRate: previousRate,
          changeRate: changeAmount,
          trend,
        });
        
        // 발표일 데이터를 차트용으로 변환
        const historyData: InterestRatePeriodData[] = announcements.map((item: any) => ({
          date: item.date,
          rate: toNumber(item.interestRate) ?? 0,
          announcementDate: item.date
        }));
        
        setInterestRateHistoryData(historyData);

        // 금리 알림 체크
        await checkInterestRateNotification(currentRateResponse.data.data);
      }
    } catch (err) {
      console.error('금리 차트 데이터 로딩 실패:', err);
      // 오류 시 기본 데이터 생성
      const defaultData: InterestRatePeriodData[] = [];
      const currentDate = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        
        defaultData.push({
          date: date.toISOString().split('T')[0],
          rate: 3.50,
          announcementDate: date.toISOString().split('T')[0]
        });
      }
      
      setInterestRateHistoryData(defaultData);
    } finally {
      setChartLoading(false);
    }
  };

  // 물가(CPI) 데이터 가져오기
  const fetchCPIData = async () => {
    try {
      setChartLoading(true);
      
      const response = await economicIndexApi.getConsumerPriceIndex();
      
      if (response.data && response.data.success && response.data.data) {
        const cpiData = response.data.data;
        
        console.log('🔍 [indicators] CPI API 응답 데이터:', cpiData);
        console.log('🔍 [indicators] CPI date 필드:', cpiData.date);
        console.log('🔍 [indicators] CPI 사용 가능한 필드:', Object.keys(cpiData));
        
        const toNumber = (input: any): number | null => {
          if (input === null || input === undefined) return null;
          const numeric = typeof input === 'number' ? input : parseFloat(input);
          return Number.isNaN(numeric) ? null : numeric;
        };

        const toDateValue = (raw: string): number => {
          if (raw.includes('-')) {
            return new Date(raw).getTime();
          }
          if (raw.length === 6) {
            const year = Number(raw.slice(0, 4));
            const month = Number(raw.slice(4)) - 1;
            return new Date(year, month, 1).getTime();
          }
          return new Date(raw).getTime();
        };

        const currentCPI = toNumber(cpiData.currentCPI ?? cpiData.cpiValue) ?? 0;

        const historyEntries = Array.isArray(cpiData.history) ? [...cpiData.history] : [];
        const sortedHistory = historyEntries
          .map((item: any) => ({
            date: item.date,
            cpiValue: toNumber(item.cpiValue ?? item.cpi),
            monthlyChange: toNumber(item.monthlyChange),
            annualChange: toNumber(item.annualChange),
          }))
          .filter((item: any) => item.date && item.cpiValue !== null)
          .sort((a: any, b: any) => toDateValue(b.date) - toDateValue(a.date));

        const previousHistoryEntry = sortedHistory.length > 1 ? sortedHistory[1] : null;
        const rawPrevMonthCPI = toNumber(cpiData.prevMonthCPI) ?? previousHistoryEntry?.cpiValue ?? null;
        const prevMonthCPI = rawPrevMonthCPI ?? currentCPI;

        const monthlyPercent =
          toNumber(cpiData.changeRate) ?? previousHistoryEntry?.monthlyChange ?? null;
        const annualPercent =
          toNumber(cpiData.annualRate) ?? previousHistoryEntry?.annualChange ?? null;

        const computedMonthlyPercent =
          monthlyPercent !== null
            ? monthlyPercent
            : prevMonthCPI !== 0
            ? ((currentCPI - prevMonthCPI) / prevMonthCPI) * 100
            : null;

        console.log('📅 [indicators] CPI date 저장:', cpiData.date);
        
        setCpiData({
          currentCPI: currentCPI,
          prevMonthCPI: prevMonthCPI,
          changeRate: computedMonthlyPercent ?? 0,
          annualRate: annualPercent ?? 0,
          date: cpiData.date
        });
        
        console.log('✅ [indicators] CPI 데이터 설정 완료, date:', cpiData.date);
        
        // 히스토리 데이터 처리
        if (sortedHistory.length > 0) {
          const recentHistory = sortedHistory.slice(0, 6);
          const finalHistory = [...recentHistory]
            .sort((a: any, b: any) => toDateValue(a.date) - toDateValue(b.date))
            .map((item: any) => ({
              date: item.date,
              cpi: item.cpiValue ?? 0,
              monthlyChange: item.monthlyChange ?? 0,
              annualChange: item.annualChange ?? 0
            }));
          
          setCpiHistoryData(finalHistory);
        }

        // 물가 알림 체크
        await checkCPINotification(cpiData);
      }
    } catch (err) {
      console.error('물가 데이터 로딩 실패:', err);
    } finally {
      setChartLoading(false);
    }
  };

  // 데이터 로딩
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'exchange') {
          // 환율 차트 데이터 가져오기
          await fetchExchangeRateChartData();
        } else if (activeTab === 'interest') {
          // 금리 차트 데이터 가져오기
          await fetchInterestRateChartData();
        } else if (activeTab === 'cpi') {
          // 물가 데이터 가져오기
          await fetchCPIData();
        }
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  // 국가 변경 시 차트 데이터 다시 가져오기
  useEffect(() => {
    if (activeTab === 'exchange') {
      fetchExchangeRateChartData();
    }
  }, [activeCountry]);

  useEffect(() => {
    if (activeTab !== 'exchange') {
      return;
    }

    let cancelled = false;

    const loadYearlyData = async () => {
      setYearlyLoading(true);
      try {
        const mapped = await fetchYearlyContent(selectedYear);
        if (!cancelled) {
          setYearlyData(mapped);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('연도별 환율 데이터 로딩 실패:', error);
          setYearlyData([]);
        }
      } finally {
        if (!cancelled) {
          setYearlyLoading(false);
        }
      }
    };

    loadYearlyData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedYear, fetchYearlyContent]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'exchange':
        return (
          <View style={styles.tabContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ThemedText>로딩 중...</ThemedText>
              </View>
            ) : (exchangeRateData && !loading) ? (
              <>
                <ExchangeRateGauge 
                  value={exchangeRateData.currentRate}
                  country={activeCountry}
                />
                
                {/* 7일 환율 변동 추이 */}
                <View style={styles.chartContainer}>
                  <ThemedText style={styles.chartTitle}>최근 7일 환율 변동 추이</ThemedText>
                  <ThemedText style={styles.chartSubtitle}>주말 및 공휴일 제외</ThemedText>
                  {chartLoading ? (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>차트 데이터 로딩 중...</ThemedText>
                    </View>
                  ) : weeklyData.length > 0 ? (
                    <ExchangeRateChart 
                      data={weeklyData} 
                      country={activeCountry}
                      height={180}
                    />
                  ) : (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>7일 데이터가 없습니다.</ThemedText>
                    </View>
                  )}
                </View>
                
                <ExchangeRateRecommendations country={activeCountry} />

                {/* 30일 환율 변동 추이 */}
                <View style={styles.chartContainer}>
                  <ThemedText style={styles.chartTitle}>최근 30일 환율 변동 추이</ThemedText>
                  <ThemedText style={styles.chartSubtitle}>주말 및 공휴일 제외</ThemedText>
                  {chartLoading ? (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>차트 데이터 로딩 중...</ThemedText>
                    </View>
                  ) : monthlyData.length > 0 ? (
                    <ExchangeRateChart 
                      data={monthlyData} 
                      country={activeCountry}
                      height={180}
                      showOnlyDay={true}
                    />
                  ) : (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>30일 데이터가 없습니다.</ThemedText>
                    </View>
                  )}
                </View>

                <View style={[styles.chartContainer, styles.yearToggleCard]}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.yearToggleHeader}
                    onPress={() => setShowYearlySection(prev => !prev)}
                  >
                    <ThemedText style={styles.yearToggleTitle}>연도별 환율 변동 추이</ThemedText>
                    <MaterialCommunityIcons
                      name={showYearlySection ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color="#007AFF"
                    />
                  </TouchableOpacity>

                  {showYearlySection && (
                    <View style={styles.yearToggleContent}>
                      <View style={styles.yearControls}>
                        <TouchableOpacity
                          style={[
                            styles.yearButton,
                            selectedYear <= MIN_YEAR ? styles.yearButtonDisabled : null,
                          ]}
                          onPress={() => handleYearChange(-1)}
                          disabled={selectedYear <= MIN_YEAR}
                        >
                          <MaterialCommunityIcons
                            name="chevron-left"
                            size={24}
                            color={selectedYear <= MIN_YEAR ? '#A0AEC0' : '#007AFF'}
                          />
                        </TouchableOpacity>
                        <ThemedText style={styles.yearText}>{selectedYear}년</ThemedText>
                        <TouchableOpacity
                          style={[
                            styles.yearButton,
                            selectedYear >= currentYear ? styles.yearButtonDisabled : null,
                          ]}
                          onPress={() => handleYearChange(1)}
                          disabled={selectedYear >= currentYear}
                        >
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color={selectedYear >= currentYear ? '#A0AEC0' : '#007AFF'}
                          />
                        </TouchableOpacity>
                      </View>

                      <ThemedText style={styles.yearlySubtitle}>연간 일별 변동 추이</ThemedText>

                      {yearlyLoading ? (
                        <View style={styles.chartPlaceholder}>
                          <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                          <ThemedText style={styles.chartPlaceholderText}>
                            연도별 데이터를 불러오는 중...
                          </ThemedText>
                        </View>
                      ) : yearlyMonthlyAverageData.length > 0 ? (
                        <ExchangeRateChart
                          data={yearlyMonthlyAverageData}
                          country={activeCountry}
                          height={220}
                          showOnlyDay={true}
                          customYAxis={yearlyAxis ?? undefined}
                        />
                      ) : (
                        <View style={styles.chartPlaceholder}>
                          <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                          <ThemedText style={styles.chartPlaceholderText}>
                            선택한 연도에 대한 데이터가 없습니다.
                          </ThemedText>
                        </View>
                      )}

                      {quarterlySummary.length > 0 && (
                        <View style={styles.quarterSection}>
                          <ThemedText style={styles.quarterTitle}>분기별 환율 변동 추이</ThemedText>

                          {quarterlyChartData.length > 0 && quarterlyAxis && (
                            <View style={styles.quarterChartWrapper}>
                              <LineChart
                                data={quarterlyChartData}
                                height={170}
                                color={activeLineColor}
                                dataPointsColor={activeLineColor}
                                dataPointsRadius={5}
                                thickness={3}
                                initialSpacing={20}
                                spacing={60}
                                focusEnabled={false}
                                hideRules
                                yAxisThickness={0}
                                xAxisThickness={0}
                                xAxisLabelTextStyle={styles.quarterAxisLabel}
                                xAxisLabelShift={10}
                                yAxisMinValue={quarterlyAxis.min}
                                yAxisMaxValue={quarterlyAxis.max}
                                stepValue={quarterlyAxis.step}
                                noOfSections={quarterlyAxis.sections}
                                yAxisLabelTexts={quarterlyAxis.labels}
                                yAxisLabelSuffix="원"
                                yAxisLabelTextStyle={styles.quarterYAxisLabel}
                                adjustToWidth
                                isAnimated
                                animationDuration={600}
                              />
                            </View>
                          )}

                          {quarterlySummary.map(item => {
                            const changeStyle =
                              item.change === null
                                ? styles.quarterChangeNeutral
                                : item.change > 0
                                ? styles.quarterChangePositive
                                : item.change < 0
                                ? styles.quarterChangeNegative
                                : styles.quarterChangeNeutral;

                            return (
                              <View key={`quarter-${item.quarter}`} style={styles.quarterRow}>
                                <ThemedText style={styles.quarterLabel}>{item.quarter}분기</ThemedText>
                                <View style={styles.quarterValues}>
                                  <ThemedText style={styles.quarterValue}>
                                    {formatCurrency(item.average)}
                                  </ThemedText>
                                  <ThemedText style={[styles.quarterChange, changeStyle]}>
                                    {formatQuarterChange(item.change)}
                                  </ThemedText>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* 환율의 의미 설명 */}
                <TouchableOpacity 
                  style={styles.infoContainer}
                  onPress={() => router.push('/(tabs)/tools?tab=glossary')}
                >
                  <View style={styles.infoHeader}>
                    <ThemedText style={styles.infoTitle}>환율이란?</ThemedText>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#007AFF" />
                  </View>
                  <ThemedText style={styles.infoContent}>
                    • 정의: 두 나라 화폐 간 교환 비율입니다.{'\n'}
                    • 영향: 원/달러 환율 상승 시 수입품 가격 상승, 수출 경쟁력 향상.{'\n'}
                    • 정책요인: 한국은행 콜금리 인상 시 원/달러 환율 상승. 미국 연준 금리 인상 시 원/달러 환율 하락.{'\n'}
                    • 중요성: 무역·투자·소비 등 경제 전반에 영향을 미칩니다.
                  </ThemedText>
                  <ThemedText style={styles.clickHint}>탭하여 자세히 보기</ThemedText>
                </TouchableOpacity>

                <ThemedText style={styles.adviceText}>
                  투자나 정책 판단 시에는 환율 외 다른 지표와 전문가 의견을 종합적으로 살펴보세요.
                </ThemedText>
              </>
            ) : (
              <ThemedText>환율 데이터를 불러올 수 없습니다.</ThemedText>
            )}
          </View>
        );
      
      case 'interest':
        return (
          <View style={styles.tabContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ThemedText>로딩 중...</ThemedText>
              </View>
            ) : (
              <>
                <InterestRateGauge 
                  value={interestRateData?.currentRate || 3.50}
                />
                
                <InterestRateRecommendations />

                {/* 금리 변동 추이 */}
                <View style={styles.chartContainer}>
                  <ThemedText style={styles.chartTitle}>정책금리 동향</ThemedText>
                  {chartLoading ? (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>차트 데이터 로딩 중...</ThemedText>
                    </View>
                  ) : interestRateHistoryData.length > 0 ? (
                    <InterestRateChart 
                      data={interestRateHistoryData}
                    />
                  ) : (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>정책금리 히스토리 데이터를 준비 중입니다.</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.levelsContainer}>
                  <ThemedText style={styles.levelsTitle}>금리 스탠스 분류 기준 및 특징</ThemedText>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#1565C0' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>매우 완화적 (≤ -1.5%p)</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 급격한 금리 인하로 경기 부양에 총력전.{'\n'}
                        • 유동성 공급 확대와 대규모 재정 정책과 함께 등장하는 경우가 많습니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#2E7D32' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>완화적 (-1.5%p ~ 0%p)</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 완만한 금리 인하로 경기 회복에 우선순위를 둡니다.{'\n'}
                        • 통화 완화 효과를 유지하며 향후 추가 대응을 탐색하는 국면입니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#F9A825' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>중립적 (0%p ~ +1%p)</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 기준금리를 동결하거나 소폭 조정하며 상황을 관망합니다.{'\n'}
                        • 경기·물가 지표를 주시하며 향후 방향성을 결정하는 중립 구간입니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#EF6C00' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>긴축적 (+1%p ~ +3%p)</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 물가 압력을 낮추기 위해 금리를 적극 인상합니다.{'\n'}
                        • 대출 이자 상승과 소비 둔화가 나타나기 시작하는 단계입니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#C62828' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>매우 긴축적 (> +3%p)</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 급격한 물가 안정 조치로 강도 높은 금리 인상을 단행합니다.{'\n'}
                        • 경기 둔화 위험이 커지므로 정책 당국은 부작용을 면밀히 관리합니다.
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.infoContainer}
                  onPress={() => router.push('/(tabs)/tools?tab=glossary')}
                >
                  <View style={styles.infoHeader}>
                    <ThemedText style={styles.infoTitle}>기준금리란?</ThemedText>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#007AFF" />
                  </View>
                  <ThemedText style={styles.infoContent}>
                    • 역할: 물가 조절의 스위치입니다.{'\n'}
                    • 파급효과: 금리 상승 시 예금 이자 상승, 대출 금리 상승.{'\n'}
                    • 정책 전파: 기준금리 인상 시 전반적 시장금리 상승, 소비 억제·저축 유도.
                  </ThemedText>
                  <ThemedText style={styles.clickHint}>탭하여 자세히 보기</ThemedText>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      
      case 'cpi':
        return (
          <View style={styles.tabContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ThemedText>로딩 중...</ThemedText>
              </View>
            ) : cpiData ? (
              <>
                <CPIGauge value={cpiData.currentCPI} dataDate={cpiData.date} />
                
                <CPIRecommendations />
                
                {/* CPI 차트 */}
                <View style={styles.chartContainer}>
                  {chartLoading ? (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>차트 데이터 로딩 중...</ThemedText>
                    </View>
                  ) : cpiHistoryData.length > 0 ? (
                    <CPIChart data={cpiHistoryData} />
                  ) : (
                    <View style={styles.chartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color="#8E8E93" />
                      <ThemedText style={styles.chartPlaceholderText}>CPI 히스토리 데이터를 준비 중입니다.</ThemedText>
                    </View>
                  )}
                </View>

                {/* 물가 수준별 기준 및 특징 */}
                <View style={styles.levelsContainer}>
                  <ThemedText style={styles.levelsTitle}>물가 수준별 기준 및 특징</ThemedText>
                  
                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#F44336' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>디플레이션 : -1%~0%</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 물가가 지속적으로 하락하는 현상으로, 경제에 가장 위험한 신호 중 하나입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 소비 절벽: 사람들이 물가가 계속 떨어질 것으로 기대해 아예 소비를 멈춥니다.{'\n'}
                        • 기업 실적 악화 및 도산: 물건값이 떨어지고 안 팔리니 기업의 매출과 이익이 급감합니다.{'\n'}
                        • 실질 부채 부담 증가: 빚의 가치는 그대로인데 돈의 가치가 오르면서 빚을 갚기가 더 어려워집니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#FF9800' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>저물가 (디스인플레이션) : 0%~1%</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 물가가 오르긴 하지만, 그 상승률이 목표치(2%)에 크게 못 미치는 낮은 수준을 보이는 상태입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 소비 지연: "나중에 사면 더 싸지 않을까?"라는 심리 때문에 소비를 미루게 됩니다.{'\n'}
                        • 기업 투자 위축: 물건이 안 팔리니 기업들이 생산과 투자를 줄입니다.{'\n'}
                        • 경기 침체 우려: 저물가가 길어지면 '디플레이션'으로 빠질 위험이 커집니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#4CAF50' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>안정적인 물가 (물가안정목표) : 1%~3%</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 경제가 건강하게 성장하고 있다는 신호입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 소비자들은 물가가 완만하게 오를 것을 예상하므로 소비를 미루지 않습니다.{'\n'}
                        • 기업들은 적절한 투자를 통해 생산을 늘립니다.{'\n'}
                        • 경제가 선순환하며 성장하기에 가장 이상적인 상태입니다.{'\n'}
                        • 한국은행, 미국 연준(Fed) 등 세계 중앙은행의 공식적인 목표치입니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#FF9800' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>고물가 (인플레이션) : 3%~5%</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 물가상승률이 목표치(2%)를 지속적으로, 그리고 큰 폭으로 웃도는 상태입니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 3~5%: '우려' 또는 '경계' 수준으로 진입했다고 봅니다.{'\n'}
                        • 화폐 가치 하락: 똑같은 돈으로 살 수 있는 물건이 줄어듭니다.{'\n'}
                        • 실질 소득 감소: 월급은 그대로인데 물건값이 올라 생활이 팍팍해집니다.{'\n'}
                        • 중앙은행이 금리 인상 등 통화정책 대응을 고려하는 단계입니다.
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.levelItem}>
                    <View style={[styles.levelIndicator, { backgroundColor: '#F44336' }]} />
                    <View style={styles.levelContent}>
                      <ThemedText style={styles.levelName}>초고물가 : 5% 이상</ThemedText>
                      <ThemedText style={styles.levelStatus}>상태: 확실한 '고물가' 국면으로 판단하며, 중앙은행이 금리 인상 등 적극적인 대응에 나섭니다.</ThemedText>
                      <ThemedText style={styles.levelDescription}>
                        • 화폐 가치 급락: 돈의 구매력이 빠르게 감소합니다.{'\n'}
                        • 경제 불확실성 증가: 미래를 예측하기 어려워 기업들이 투자를 꺼리게 됩니다.{'\n'}
                        • 긴급한 정책 대응 필요: 중앙은행의 적극적인 금리 인상 정책이 시행됩니다.{'\n'}
                        • 생활비 부담 급증: 필수재 가격 상승으로 서민 생활이 어려워집니다.
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* 소비자물가지수 설명 */}
                <TouchableOpacity 
                  style={styles.infoContainer}
                  onPress={() => router.push('/(tabs)/tools?tab=glossary')}
                >
                  <View style={styles.infoHeader}>
                    <ThemedText style={styles.infoTitle}>소비자물가지수(CPI)란?</ThemedText>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#007AFF" />
                  </View>
                  <ThemedText style={styles.infoContent}>
                    • 정의: 소비자가 구입하는 상품·서비스의 가격 변동 지표입니다.{'\n'}
                    • 해석: CPI 상승 = 인플레이션 신호.{'\n'}
                    • 정책: 물가 안정은 핵심 목표이며, 한국은행이 통화정책으로 대응합니다.
                  </ThemedText>
                  <ThemedText style={styles.clickHint}>탭하여 자세히 보기</ThemedText>
                </TouchableOpacity>

                {/* 물가 범위 기준 안내 */}
                <View style={styles.noticeContainer}>
                  <ThemedText style={styles.noticeTitle}>📋 물가 범위 기준 안내</ThemedText>
                  <ThemedText style={styles.noticeText}>
                    • 물가 구간은 한국은행 2% 물가안정목표 정책을 바탕으로 재구성되었습니다.{'\n'}
                    • 안정물가 범위(1%~3%)는 한국은행의 물가안정목표 ±1%p 기준입니다.{'\n'}
                    • 디플레이션(-1%~0%), 저물가(0%~1%) 구간도 이에 맞춰 조정되었습니다.{'\n'}
                    • 실제 투자 결정 시에는 다양한 경제 지표를 종합적으로 고려하시기 바랍니다.
                  </ThemedText>
                </View>
              </>
            ) : (
              <ThemedText>물가 데이터를 불러올 수 없습니다.</ThemedText>
            )}
          </View>
        );
      
      default:
        return null;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'exchange': return '환율';
      case 'interest': return '금리';
      case 'cpi': return '물가';
      default: return '지표';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'exchange': return '실시간 환율 정보';
      case 'interest': return '기준금리 및 금리 동향';
      case 'cpi': return '소비자물가지수 현황';
      default: return '경제 지표 현황';
    }
  };



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.headerTitle}>{getTabTitle()}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{getTabSubtitle()}</ThemedText>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => setNotificationModalVisible(true)}
        >
          <MaterialCommunityIcons name="bell" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* 탭 버튼 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'exchange' && styles.activeTabButton]}
          onPress={() => setActiveTab('exchange')}
        >
          <MaterialCommunityIcons 
            name="currency-usd" 
            size={20} 
            color={activeTab === 'exchange' ? '#007AFF' : '#8E8E93'} 
          />
          <ThemedText style={[
            styles.tabButtonText, 
            activeTab === 'exchange' && styles.activeTabButtonText
          ]}>
            환율
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'interest' && styles.activeTabButton]}
          onPress={() => setActiveTab('interest')}
        >
          <MaterialCommunityIcons 
            name="percent" 
            size={20} 
            color={activeTab === 'interest' ? '#007AFF' : '#8E8E93'} 
          />
          <ThemedText style={[
            styles.tabButtonText, 
            activeTab === 'interest' && styles.activeTabButtonText
          ]}>
            금리
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'cpi' && styles.activeTabButton]}
          onPress={() => setActiveTab('cpi')}
        >
          <MaterialCommunityIcons 
            name="chart-line" 
            size={20} 
            color={activeTab === 'cpi' ? '#007AFF' : '#8E8E93'} 
          />
          <ThemedText style={[
            styles.tabButtonText, 
            activeTab === 'cpi' && styles.activeTabButtonText
          ]}>
            물가
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* 국가 선택 (환율 탭에서만) */}
      {activeTab === 'exchange' && (
        <View style={styles.countryContainer}>
          <TouchableOpacity
            style={[styles.countryButton, activeCountry === 'usa' && styles.activeCountryButton]}
            onPress={() => setActiveCountry('usa')}
          >
            <ThemedText style={[
              styles.countryButtonText, 
              activeCountry === 'usa' && styles.activeCountryButtonText
            ]}>
              USD
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.countryButton, activeCountry === 'japan' && styles.activeCountryButton]}
            onPress={() => setActiveCountry('japan')}
          >
            <ThemedText style={[
              styles.countryButtonText, 
              activeCountry === 'japan' && styles.activeCountryButtonText
            ]}>
              JPY
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.countryButton, activeCountry === 'europe' && styles.activeCountryButton]}
            onPress={() => setActiveCountry('europe')}
          >
            <ThemedText style={[
              styles.countryButtonText, 
              activeCountry === 'europe' && styles.activeCountryButtonText
            ]}>
              EUR
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.countryButton, activeCountry === 'china' && styles.activeCountryButton]}
            onPress={() => setActiveCountry('china')}
          >
            <ThemedText style={[
              styles.countryButtonText, 
              activeCountry === 'china' && styles.activeCountryButtonText
            ]}>
              CNY
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* 컨텐츠 */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* 알림 설정 모달 */}
      <NotificationSettingsModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
      />
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 36,
    paddingVertical: 0,
    marginVertical: 0,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 20,
    paddingVertical: 0,
    marginVertical: 0,
  },
  notificationButton: {
    padding: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#F0F8FF',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 6,
  },
  activeTabButtonText: {
    color: '#007AFF',
  },
  countryContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  countryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeCountryButton: {
    backgroundColor: '#F0F8FF',
  },
  countryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeCountryButtonText: {
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  yearToggleCard: {
    paddingBottom: 12,
  },
  yearToggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yearToggleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  yearToggleContent: {
    marginTop: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  yearlySubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 12,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  yearControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quarterSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    gap: 12,
  },
  quarterChartWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
  },
  quarterAxisLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  quarterYAxisLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  quarterTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  quarterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  quarterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  quarterValues: {
    alignItems: 'flex-end',
  },
  quarterValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  quarterChange: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  quarterChangePositive: {
    color: '#EF4444',
  },
  quarterChangeNegative: {
    color: '#10B981',
  },
  quarterChangeNeutral: {
    color: '#475569',
  },
  yearButton: {
    padding: 6,
    borderRadius: 8,
  },
  yearButtonDisabled: {
    opacity: 0.4,
  },
  yearText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 12,
  },
  chartPlaceholder: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginVertical: 16,
  },
  chartPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  infoContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  infoContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
  clickHint: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  levelsContainer: {
    backgroundColor: '#FBFCFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  levelsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  levelItem: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  levelIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  levelContent: {
    flex: 1,
  },
  levelName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  levelStatus: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  levelDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#555',
  },
  noticeContainer: {
    backgroundColor: '#FBFCFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  adviceText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 16,
  },
}); 















