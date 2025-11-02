import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { economicIndexApi } from '../services/api';

type CPIGaugeProps = {
  value?: number;
  dataDate?: string;
  prevMonthValue?: number;
  changeRate?: number;
  annualRate?: number;
};

type CPIHistoryItem = {
  date?: string;
  cpiValue?: number | string | null;
  monthlyChange?: number | string | null;
  annualChange?: number | string | null;
};

type CPIResponse = {
  currentCPI?: number | string | null;
  prevMonthCPI?: number | string | null;
  changeRate?: number | string | null;
  annualRate?: number | string | null;
  date?: string | null;
  history?: CPIHistoryItem[];
};

type ChangeInfo = {
  amount: number;
  percent: number | null;
};

type InflationLevelInfo = {
  label: string;
  backgroundColor: string;
  textColor: string;
};

const parseValue = (value?: number | string | null) => {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isNaN(numeric) ? null : numeric;
};

const formatNumber = (value: number | string | null | undefined, fractionDigits = 1) => {
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

const getInflationLevelInfo = (percent: number): InflationLevelInfo => {
  if (percent < 0) {
    return {
      label: '디플레이션 (0% 미만)',
      backgroundColor: '#FFE8E6',
      textColor: '#C62828',
    };
  }
  if (percent < 1) {
    return {
      label: '저물가 (0%~1%)',
      backgroundColor: '#FFF3E0',
      textColor: '#EF6C00',
    };
  }
  if (percent < 3) {
    return {
      label: '안정적인 물가 (1%~3%)',
      backgroundColor: '#E8F5E9',
      textColor: '#2E7D32',
    };
  }
  if (percent < 5) {
    return {
      label: '고물가 (3%~5%)',
      backgroundColor: '#FFE0B2',
      textColor: '#D84315',
    };
  }
  return {
    label: '초고물가 (5% 이상)',
    backgroundColor: '#FFEBEE',
    textColor: '#B71C1C',
  };
};

const formatCpiDate = (date?: string | null) => {
  if (!date) {
    return null;
  }

  if (date.includes('-')) {
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
      });
    }
  }

  if (date.length === 6) {
    const year = date.slice(0, 4);
    const month = date.slice(4);
    return `${year}년 ${parseInt(month, 10)}월`;
  }

  return date;
};

const CPIGauge: React.FC<CPIGaugeProps> = ({
  value,
  dataDate,
  prevMonthValue,
  changeRate,
  annualRate,
}) => {
  const [cpi, setCpi] = useState<number | null>(value ?? null);
  const [previousCpi, setPreviousCpi] = useState<number | null>(
    prevMonthValue ?? null
  );
  const [monthlyInfo, setMonthlyInfo] = useState<ChangeInfo | null>(null);
  const [annualChange, setAnnualChange] = useState<number | null>(
    annualRate ?? null
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(dataDate ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCpiData();
  }, []);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setCpi(value);
    }
  }, [value]);

  useEffect(() => {
    if (prevMonthValue !== undefined && prevMonthValue !== null) {
      setPreviousCpi(prevMonthValue);
    }
  }, [prevMonthValue]);

  useEffect(() => {
    if (annualRate !== undefined && annualRate !== null) {
      setAnnualChange(annualRate);
    }
  }, [annualRate]);

  useEffect(() => {
    if (dataDate) {
      setLastUpdated(dataDate);
    }
  }, [dataDate]);

  const fetchCpiData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await economicIndexApi.getConsumerPriceIndex();
      const payload: CPIResponse | undefined =
        response.data?.data ?? response.data;

      if (!payload) {
        throw new Error('소비자물가지수 데이터를 찾을 수 없습니다.');
      }

      const current =
        parseValue(value ?? null) ??
        parseValue(payload.currentCPI) ??
        null;
      const previous =
        parseValue(prevMonthValue ?? null) ??
        parseValue(payload.prevMonthCPI) ??
        null;

      if (current === null) {
        throw new Error('소비자물가지수 값이 올바르지 않습니다.');
      }

      setCpi(current);
      setPreviousCpi(previous);
      setLastUpdated(payload.date ?? dataDate ?? null);

      if (previous !== null) {
        const amount = current - previous;
        const percent =
          changeRate !== undefined && changeRate !== null
            ? changeRate
            : payload.changeRate !== undefined && payload.changeRate !== null
            ? parseValue(payload.changeRate)
            : previous !== 0
            ? (amount / previous) * 100
            : null;
        setMonthlyInfo({
          amount,
          percent: percent === null ? null : (percent as number),
        });
      } else {
        setMonthlyInfo(null);
      }

      const resolvedAnnual =
        parseValue(annualRate ?? null) ?? parseValue(payload.annualRate);
      setAnnualChange(resolvedAnnual);
    } catch (err) {
      console.error('물가 데이터를 불러오는 중 오류 발생:', err);
      setError(
        err instanceof Error
          ? err.message
          : '물가 데이터를 불러오는 중 문제가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inflationLevel = useMemo(() => {
    if (annualChange === null) return null;
    return getInflationLevelInfo(annualChange);
  }, [annualChange]);

  const formattedDate = useMemo(
    () => formatCpiDate(lastUpdated),
    [lastUpdated]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>소비자물가지수(CPI)</ThemedText>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#007AFF" />
          <ThemedText style={styles.loadingText}>물가 정보를 불러오는 중입니다...</ThemedText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>소비자물가지수(CPI)</ThemedText>
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>소비자물가지수(CPI)</ThemedText>

      <View style={styles.valueBlock}>
        <ThemedText style={styles.valueText}>
          {cpi !== null ? formatNumber(cpi, 1) : '-'}
        </ThemedText>

        {monthlyInfo ? (
          <ThemedText
            style={[
              styles.changeText,
              monthlyInfo.amount > 0
                ? styles.positiveText
                : monthlyInfo.amount < 0
                ? styles.negativeText
                : styles.neutralText,
            ]}
          >
            전월 대비{' '}
            {`${formatSignedNumber(monthlyInfo.amount, 2)}p${
              monthlyInfo.percent !== null
                ? ` (${formatSignedNumber(monthlyInfo.percent, 2)}%)`
                : ''
            }`}
          </ThemedText>
        ) : (
          <ThemedText style={styles.neutralText}>
            전월 대비 데이터를 준비 중입니다.
          </ThemedText>
        )}

        {annualChange !== null && (
          <ThemedText
            style={[
              styles.additionalText,
              annualChange > 0
                ? styles.positiveText
                : annualChange < 0
                ? styles.negativeText
                : styles.neutralText,
            ]}
          >
            전년 동월 대비 {formatSignedNumber(annualChange, 2)}%
          </ThemedText>
        )}
        {inflationLevel && (
          <ThemedText
            style={[
              styles.levelTag,
              {
                backgroundColor: inflationLevel.backgroundColor,
                color: inflationLevel.textColor,
              },
            ]}
          >
            {inflationLevel.label}
          </ThemedText>
        )}
      </View>

      {formattedDate && (
        <ThemedText style={styles.lastUpdated}>
          기준: {formattedDate}
        </ThemedText>
      )}
    </View>
  );
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
    marginBottom: 6,
    lineHeight: 22,
    includeFontPadding: false,
  },
  additionalText: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
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
  levelTag: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  lastUpdated: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default CPIGauge;
