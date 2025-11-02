import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { economicIndexApi } from '../services/api';

type InterestRateGaugeProps = {
  value?: number;
};

type InterestRateHistoryItem = {
  date?: string;
  rates?: Record<string, number | string | null>;
};

type InterestRatePayload = {
  korea?: {
    rate?: number | string;
    lastUpdated?: string;
    previousRate?: number | string | null;
    countryCode?: string;
  };
  history?: InterestRateHistoryItem[];
  lastUpdated?: string;
};

type ChangeInfo = {
  amount: number;
  percent: number | null;
};

type RateStanceInfo = {
  label: string;
  description: string;
  backgroundColor: string;
  textColor: string;
};

const formatNumber = (value: number | string | null | undefined, fractionDigits = 2) => {
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  if (numeric === null || numeric === undefined || Number.isNaN(numeric)) {
    return null;
  }

  const formatter = new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });

  return formatter.format(numeric);
};

const formatSignedNumber = (value: number, fractionDigits = 2) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const formatted = formatNumber(Math.abs(value), fractionDigits);
  if (!formatted) {
    return `${sign}-`;
  }

  return `${sign}${formatted}`;
};

const getRateStanceInfo = (changeAmount: number): RateStanceInfo => {
  if (changeAmount <= -1.5) {
    return {
      label: '매우 완화적',
      description: '',
      backgroundColor: '#E3F2FD',
      textColor: '#1565C0',
    };
  }
  if (changeAmount < 0) {
    return {
      label: '완화적',
      description: '',
      backgroundColor: '#E8F5E9',
      textColor: '#2E7D32',
    };
  }
  if (changeAmount <= 1) {
    return {
      label: '중립적',
      description: '',
      backgroundColor: '#FFF9C4',
      textColor: '#F9A825',
    };
  }
  if (changeAmount <= 3) {
    return {
      label: '긴축적',
      description: '',
      backgroundColor: '#FFE0B2',
      textColor: '#EF6C00',
    };
  }
  return {
    label: '매우 긴축적',
    description: '',
    backgroundColor: '#FFEBEE',
    textColor: '#C62828',
  };
};

const normalizeDateString = (date?: string | null) => {
  if (!date) return null;
  if (date.includes('T')) return date;
  return `${date}T00:00:00`;
};

const InterestRateGauge: React.FC<InterestRateGaugeProps> = ({ value }) => {
  const [rate, setRate] = useState<number | null>(value ?? null);
  const [previousRate, setPreviousRate] = useState<number | null>(null);
  const [changeInfo, setChangeInfo] = useState<ChangeInfo | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInterestRate();
  }, []);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setRate(value);
    }
  }, [value]);

const fetchInterestRate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await economicIndexApi.getInterestRate();
      const payload: InterestRatePayload | undefined =
        response.data?.data ?? response.data;

      if (!payload) {
        throw new Error('금리 데이터를 찾을 수 없습니다.');
      }

      const countryCode = payload.korea?.countryCode ?? 'KR';
      const historyEntries = Array.isArray(payload.history) ? payload.history : [];

      const sortedHistory = historyEntries
        .map((entry) => {
          const rawRate = entry?.rates ? entry.rates[countryCode] : null;
          return {
            date: entry?.date ?? null,
            rate: parseRate(rawRate),
          };
        })
        .filter((entry) => entry.date && entry.rate !== null)
        .sort((a, b) => {
          const dateA = new Date(a.date as string).getTime();
          const dateB = new Date(b.date as string).getTime();
          return dateB - dateA;
        });

      const historyLatest = sortedHistory[0] ?? null;
      const historyPrevious = sortedHistory.length > 1 ? sortedHistory[1] : null;

      let currentRate =
        parseRate(value ?? null) ??
        parseRate(payload.korea?.rate) ??
        (historyLatest ? historyLatest.rate : null);

      if (currentRate === null) {
        throw new Error('한국 기준금리 데이터를 찾을 수 없습니다.');
      }

      setRate(currentRate);

      const resolvedLastUpdated =
        payload.korea?.lastUpdated ??
        (historyLatest?.date ?? payload.lastUpdated ?? null);
      setLastUpdated(resolvedLastUpdated);

      const previousNumeric =
        parseRate(payload.korea?.previousRate) ??
        (historyPrevious ? historyPrevious.rate : null);

      if (previousNumeric !== null) {
        setPreviousRate(previousNumeric);
        const amount = currentRate - previousNumeric;
        const percent =
          previousNumeric !== 0 ? (amount / previousNumeric) * 100 : null;
        setChangeInfo({ amount, percent });
      } else {
        setPreviousRate(null);
        setChangeInfo({ amount: 0, percent: null });
      }
    } catch (err) {
      console.error('금리 데이터를 불러오는 중 오류 발생:', err);
      setError(
        err instanceof Error
          ? err.message
          : '금리 데이터를 불러오는 중 문제가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = useMemo(() => {
    const normalized = normalizeDateString(lastUpdated);
    if (!normalized) return null;

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [lastUpdated]);

  const stanceInfo = useMemo(() => {
    if (!changeInfo) return null;
    return getRateStanceInfo(changeInfo.amount);
  }, [changeInfo]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>한국은행 기준금리</ThemedText>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#007AFF" />
          <ThemedText style={styles.loadingText}>금리 정보를 불러오는 중입니다...</ThemedText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>한국은행 기준금리</ThemedText>
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>한국은행 기준금리</ThemedText>

      <View style={styles.valueBlock}>
        <ThemedText style={styles.valueText}>
          {rate !== null ? `${formatNumber(rate, 2)}%` : '-'}
        </ThemedText>
        {stanceInfo && (
          <View
            style={[
              styles.stanceBadge,
              {
                backgroundColor: stanceInfo.backgroundColor,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.stanceLabel,
                { color: stanceInfo.textColor },
              ]}
            >
              {stanceInfo.label}
            </ThemedText>
          </View>
        )}
      </View>

      {formattedDate && (
        <ThemedText style={styles.lastUpdated}>
          업데이트: {formattedDate}
        </ThemedText>
      )}
    </View>
  );
};

const parseRate = (value?: number | string | null) => {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isNaN(numeric) ? null : numeric;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    marginTop: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    lineHeight: 20,
  },
  valueBlock: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
  },
  valueText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    lineHeight: 38,
    includeFontPadding: false,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 22,
    includeFontPadding: false,
  },
  positiveText: {
    color: '#d84315',
  },
  negativeText: {
    color: '#1b5e20',
  },
  neutralText: {
    fontSize: 14,
    color: '#666',
  },
  previousText: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    lineHeight: 20,
    includeFontPadding: false,
  },
  lastUpdated: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  stanceBadge: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  stanceLabel: {
    fontSize: 14,
    fontWeight: '700',
    includeFontPadding: false,
  },
  stanceDescription: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 18,
    includeFontPadding: false,
  },
});

export default InterestRateGauge;
