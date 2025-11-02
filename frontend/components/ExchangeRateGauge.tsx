import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { economicIndexApi } from '../services/api';

type ExchangeRateGaugeProps = {
  value?: number;
  country?: 'usa' | 'japan' | 'china' | 'europe' | string;
};

type ExchangeRateHistoryItem = {
  date?: string;
  curUnit?: string;
  dealBasRate?: number | string | null;
};

type ChangeInfo = {
  amount: number;
  percent: number | null;
};

type PeriodSeriesItem = {
  date?: string;
  usdRate?: number | string | null;
  jpyRate?: number | string | null;
  eurRate?: number | string | null;
  cnyRate?: number | string | null;
};

const countryMeta: Record<string, { code: string; title: string; unitLabel: string }> = {
  usa: { code: 'USD', title: '환율 (USD/KRW)', unitLabel: '원' },
  japan: { code: 'JPY(100)', title: '환율 (JPY/KRW)', unitLabel: '원' },
  china: { code: 'CNH', title: '환율 (CNY/KRW)', unitLabel: '원' },
  europe: { code: 'EUR', title: '환율 (EUR/KRW)', unitLabel: '원' },
};

const seriesFieldMap: Record<string, keyof PeriodSeriesItem> = {
  usa: 'usdRate',
  japan: 'jpyRate',
  china: 'cnyRate',
  europe: 'eurRate',
};

const formatNumber = (
  value: number | string | null | undefined,
  fractionDigits = 1
) => {
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

const formatNumberWithUnit = (
  value: number | string | null | undefined,
  unit: string,
  fractionDigits = 1
): string => {
  const formatted = formatNumber(value, fractionDigits);
  if (!formatted) {
    return `-${unit ? ` ${unit}` : ''}`.trim();
  }

  return `${formatted}${unit}`;
};

const formatSignedCurrency = (value: number, unit: string, fractionDigits = 2) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const formatted = formatNumber(Math.abs(value), fractionDigits);
  if (!formatted) {
    return `${sign}-${unit}`;
  }
  return `${sign}${formatted}${unit}`;
};

const formatSignedPercent = (value: number) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  let formatted = absolute.toFixed(2);
  formatted = formatted.replace(/\.0+$/, '');
  formatted = formatted.replace(/(\.\d*[1-9])0+$/, '$1');
  return `${sign}${formatted}%`;
};

const sanitizeNumericString = (value: string) => value.replace(/[^\d.+-]/g, '').replace(/,/g, '');

const parseRate = (rate?: number | string | null) => {
  if (rate === null || rate === undefined) {
    return null;
  }

  if (typeof rate === 'number') {
    return Number.isNaN(rate) ? null : rate;
  }

  const sanitized = sanitizeNumericString(rate);
  if (!sanitized) {
    return null;
  }

  const numeric = parseFloat(sanitized);
  return Number.isNaN(numeric) ? null : numeric;
};

const pickSummaryRate = (payload: any, country: string) => {
  if (!payload) return null;

  switch (country) {
    case 'japan':
      return payload.jpyRate ?? null;
    case 'china':
      return payload.cnyRate ?? null;
    case 'europe':
      return payload.eurRate ?? null;
    case 'usa':
    default:
      return payload.usdRate ?? null;
  }
};

const findLatestAndPrevious = (history: ExchangeRateHistoryItem[], code: string) => {
  const filtered = history
    .filter(
      (item) =>
        item.curUnit === code &&
        item.dealBasRate !== null &&
        item.dealBasRate !== undefined &&
        !!item.date
    )
    .slice()
    .sort((a, b) => {
      const aTime = new Date(normalizeDateString(a.date) || 0).getTime();
      const bTime = new Date(normalizeDateString(b.date) || 0).getTime();
      return bTime - aTime;
    });

  if (filtered.length === 0) {
    return { latest: null, previous: null };
  }

  const [latestCandidate, ...rest] = filtered;
  const latestDate = normalizeDateString(latestCandidate.date);

  const previousCandidate =
    rest.find((item) => normalizeDateString(item.date) !== latestDate) ?? null;

  return { latest: latestCandidate, previous: previousCandidate };
};

const normalizeDateString = (date?: string | null) => {
  if (!date) return null;
  if (date.includes('T')) return date;
  return `${date}T00:00:00`;
};

const ExchangeRateGauge: React.FC<ExchangeRateGaugeProps> = ({ value, country = 'usa' }) => {
  const { code, title, unitLabel } = countryMeta[country] ?? countryMeta.usa;
  const rateField = seriesFieldMap[country] ?? 'usdRate';

  const [rate, setRate] = useState<number | null>(value ?? null);
  const [previousRate, setPreviousRate] = useState<number | null>(null);
  const [changeInfo, setChangeInfo] = useState<ChangeInfo | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExchangeRateData();
  }, [country]);

  useEffect(() => {
    if (value === undefined) {
      return;
    }

    const numericValue = parseRate(value);
    setRate(numericValue);
  }, [value]);

  const fetchExchangeRateData = async () => {
    setLoading(true);
    setError(null);

    try {
      const periodWindowStart = new Date();
      periodWindowStart.setDate(periodWindowStart.getDate() - 14);
      const startDate = periodWindowStart.toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await economicIndexApi.getExchangeRate();
      const payload = response.data?.data ?? response.data;
      if (!payload) {
        throw new Error('환율 데이터가 비어 있습니다.');
      }

      const history: ExchangeRateHistoryItem[] = Array.isArray(payload.history)
        ? payload.history
        : [];
      const { latest, previous } = findLatestAndPrevious(history, code);

      const latestRate = parseRate(latest?.dealBasRate);
      const summaryRate = parseRate(pickSummaryRate(payload, country));
      const propRate = parseRate(value ?? null);

      let resolvedRate = latestRate ?? summaryRate ?? propRate;
      let resolvedDate = latest?.date ?? null;
      let previousNumeric = parseRate(previous?.dealBasRate);

      try {
        const periodResponse = await economicIndexApi.getExchangeRateByPeriod(startDate, endDate);
        const periodPayload = periodResponse.data?.data ?? periodResponse.data;

        if (Array.isArray(periodPayload)) {
          const series = periodPayload
            .map((item: PeriodSeriesItem) => ({
              date: item.date,
              rate: parseRate(item[rateField]),
            }))
            .filter(entry => entry.rate !== null && entry.date)
            .sort((a, b) => {
              const aTime = new Date(normalizeDateString(a.date) || 0).getTime();
              const bTime = new Date(normalizeDateString(b.date) || 0).getTime();
              return bTime - aTime;
            });

          if (series.length > 0) {
            const [seriesLatest, ...restSeries] = series;
            const latestSeriesRate =
              seriesLatest.rate !== null && seriesLatest.rate !== undefined
                ? seriesLatest.rate
                : null;

            if (resolvedRate === null && latestSeriesRate !== null) {
              resolvedRate = latestSeriesRate;
            }
            if (!resolvedDate && seriesLatest.date) {
              resolvedDate = seriesLatest.date;
            }

            if (previousNumeric === null) {
              const previousEntry = restSeries.find(entry => entry.rate !== null);
              if (previousEntry) {
                const previousSeriesRate =
                  previousEntry.rate !== null && previousEntry.rate !== undefined
                    ? previousEntry.rate
                    : null;
                if (previousSeriesRate !== null) {
                  previousNumeric = previousSeriesRate;
                }
              }
            }
          }
        }
      } catch (periodError) {
        console.warn('환율 기간 데이터를 불러오는 중 문제가 발생했습니다.', periodError);
      }

      if (resolvedRate === null) {
        throw new Error('선택된 통화의 환율을 찾을 수 없습니다.');
      }

      setRate(resolvedRate);
      setLastUpdated(resolvedDate ?? null);

      if (previousNumeric !== null) {
        setPreviousRate(previousNumeric);
        const amount = resolvedRate - previousNumeric;
        const percent =
          previousNumeric !== 0 ? (amount / previousNumeric) * 100 : null;
        setChangeInfo({ amount, percent });
      } else {
        setPreviousRate(null);
        setChangeInfo(null);
      }
    } catch (fetchError) {
      console.error('환율 데이터를 불러오는 중 오류 발생:', fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : '환율 데이터를 불러오는 중 문제가 발생했습니다.'
      );
      setRate(parseRate(value ?? null));
      setPreviousRate(null);
      setChangeInfo(null);
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

  if (loading) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#007AFF" />
          <ThemedText style={styles.loadingText}>환율 정보를 불러오는 중입니다...</ThemedText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>

      <View style={styles.valueBlock}>
        <ThemedText style={styles.valueText}>
          {rate !== null ? formatNumberWithUnit(rate, unitLabel) : '-'}
        </ThemedText>
        {changeInfo ? (
          <ThemedText
            style={[
              styles.changeText,
              changeInfo.amount > 0
                ? styles.positiveText
                : changeInfo.amount < 0
                ? styles.negativeText
                : styles.neutralChangeText,
            ]}
          >
            전일 대비{' '}
            {`${formatSignedCurrency(changeInfo.amount, unitLabel)}${
              changeInfo.percent !== null
                ? ` (${formatSignedPercent(changeInfo.percent)})`
                : ''
            }`}
          </ThemedText>
        ) : (
          <ThemedText style={styles.neutralText}>
            전일 대비 데이터를 준비 중입니다.
          </ThemedText>
        )}
        {previousRate !== null && (
          <ThemedText style={styles.previousText}>
            전일: {formatNumberWithUnit(previousRate, unitLabel)}
          </ThemedText>
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
  neutralChangeText: {
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
});

export default ExchangeRateGauge;
