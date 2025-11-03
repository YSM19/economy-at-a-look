import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, ScrollView } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LineChart } from 'react-native-gifted-charts';

interface ExchangeRateDataPoint {
  date: string | number | Date | Record<string, any> | [number, number, number];
  usdRate?: number | string | null;
  eurRate?: number | string | null;
  jpyRate?: number | string | null;
  cnyRate?: number | string | null;
  [key: string]: any;
}

const SUPPORTED_COUNTRIES = ['usa', 'japan', 'china', 'europe'] as const;
type CountryKey = typeof SUPPORTED_COUNTRIES[number];

interface NormalizedExchangeRateDataPoint {
  date: string;
  usdRate: number | null;
  eurRate: number | null;
  jpyRate: number | null;
  cnyRate: number | null;
}

const COUNTRY_LABELS: Record<CountryKey, string> = {
  usa: '원/달러 환율',
  japan: '원/100엔 환율',
  china: '원/위안 환율',
  europe: '원/유로 환율',
};

const COUNTRY_COLORS: Record<CountryKey, string> = {
  usa: '#3b82f6',
  japan: '#f97316',
  china: '#22c55e',
  europe: '#e11d48',
};

const RATE_FIELD_CANDIDATES: Record<CountryKey, string[]> = {
  usa: ['usdRate', 'usd_rate', 'usd', 'USD', 'usdrate', 'us_rate', 'usdValue'],
  japan: ['jpyRate', 'jpy_rate', 'jpy', 'JPY', 'jpy100Rate', 'jpy_100_rate', 'jpyValue'],
  china: ['cnyRate', 'cny_rate', 'cny', 'CNY', 'cnhRate', 'cnh_rate', 'CNH', 'cnyValue'],
  europe: ['eurRate', 'eur_rate', 'eur', 'EUR', 'euroRate', 'euro_rate', 'eurValue'],
};

const GENERIC_NESTED_RATE_KEYS = [
  'value',
  'rate',
  'amount',
  'avg',
  'average',
  'dealBasRate',
  'dealBasR',
  'deal_bas_rate',
  'deal_bas_r',
];

const DATE_KEY_CANDIDATES = [
  'date',
  'searchDate',
  'search_date',
  'baseDate',
  'base_date',
  'createdDate',
  'created_date',
  'regDate',
  'reg_date',
];

const parseRateValue = (value?: number | string | null): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const matches = text.match(/-?[\d.,\s]+/g);
  if (!matches) {
    return null;
  }

  const normalizeToken = (token: string): number | null => {
    const stripped = token.replace(/[^\d.,\-]/g, '').replace(/\s+/g, '');
    if (!stripped || stripped === '-' || stripped === '.' || stripped === ',') {
      return null;
    }

    const negative = stripped.startsWith('-');
    const compact = negative ? stripped.slice(1) : stripped;
    if (!compact) {
      return null;
    }

    const lastComma = compact.lastIndexOf(',');
    const lastDot = compact.lastIndexOf('.');

    let normalized = compact;

    if (lastComma !== -1 && lastDot !== -1) {
      if (lastDot > lastComma) {
        normalized = compact.replace(/,/g, '');
      } else {
        normalized = compact.replace(/\./g, '').replace(',', '.');
      }
    } else if (lastComma !== -1) {
      const decimals = compact.length - lastComma - 1;
      if ((compact.match(/,/g)?.length ?? 0) === 1 && decimals > 0 && decimals <= 3) {
        normalized = compact.replace(',', '.');
      } else {
        normalized = compact.replace(/,/g, '');
      }
    } else if (lastDot !== -1) {
      const decimals = compact.length - lastDot - 1;
      if (decimals <= 0 || decimals > 3) {
        normalized = compact.replace(/\./g, '');
      }
    }

    const parsed = Number(negative ? `-${normalized}` : normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  let parsed: number | null = null;

  matches.forEach(token => {
    const candidate = normalizeToken(token);
    if (candidate === null) {
      return;
    }
    if (parsed === null || Math.abs(candidate) > Math.abs(parsed)) {
      parsed = candidate;
    }
  });

  return parsed;
};

const getValueByKey = (source: Record<string, any>, key: string) => {
  if (source[key] !== undefined) {
    return source[key];
  }

  const lowerKey = key.toLowerCase();
  const candidateKey = Object.keys(source).find(
    existingKey => existingKey.toLowerCase() === lowerKey
  );

  return candidateKey ? source[candidateKey] : undefined;
};

const normalizeDateValue = (value: any): string | null => {
  if (!value && value !== 0) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime())
      ? trimmed
      : parsed.toISOString().split('T')[0];
  }

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number') {
    const candidate = new Date(value);
    return Number.isNaN(candidate.getTime())
      ? null
      : candidate.toISOString().split('T')[0];
  }

  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value;
    if (
      typeof year === 'number' &&
      typeof month === 'number' &&
      typeof day === 'number'
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  if (typeof value === 'object') {
    if ('date' in value) {
      const nested = normalizeDateValue((value as any).date);
      if (nested) {
        return nested;
      }
    }

    const year =
      value.year ?? value.y ?? value.Y ?? value.searchYear ?? value.search_year;

    let month =
      value.monthValue ??
      value.month ??
      value.m ??
      value.M ??
      value.monthNumber ??
      value.month_number;

    if (
      (month === undefined || month === null) &&
      value.monthValueZeroBased !== undefined
    ) {
      month = (value.monthValueZeroBased as number) + 1;
    }

    const day =
      value.dayOfMonth ??
      value.day ??
      value.d ??
      value.dayOfMonthValue ??
      value.day_of_month ??
      value.date;

    if (
      typeof year === 'number' &&
      typeof month === 'number' &&
      typeof day === 'number'
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    if (typeof value.value === 'string') {
      return normalizeDateValue(value.value);
    }
  }

  return null;
};

const extractDate = (item: Record<string, any>): string | null => {
  for (const key of DATE_KEY_CANDIDATES) {
    const candidate = getValueByKey(item, key);
    const normalized = normalizeDateValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return normalizeDateValue(item);
};

const parseCandidateRateValue = (
  rawValue: any,
  parser: (value: any) => number | null
): number | null => {
  const direct = parser(rawValue);
  if (direct !== null) {
    return direct;
  }

  if (rawValue && typeof rawValue === 'object') {
    for (const nestedKey of GENERIC_NESTED_RATE_KEYS) {
      if (rawValue[nestedKey] !== undefined) {
        const nestedParsed = parser(rawValue[nestedKey]);
        if (nestedParsed !== null) {
          return nestedParsed;
        }
      }
    }
  }

  return null;
};

const extractRateValue = (
  item: Record<string, any>,
  keys: string[],
  parser: (value: any) => number | null
): number | null => {
  for (const key of keys) {
    const candidate = getValueByKey(item, key);
    if (candidate !== undefined && candidate !== null) {
      const parsed = parseCandidateRateValue(candidate, parser);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return null;
};

const fallbackParseRateValue = (value: any): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const tokens = value.trim().match(/-?\d+(?:[.,]\d+)?/g);
  if (!tokens) {
    return null;
  }

  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const candidate = tokens[i];
    const normalizedCandidates = [
      candidate.replace(/,/g, ''),
      candidate.replace(/\./g, '').replace(',', '.'),
    ];

    for (const normalized of normalizedCandidates) {
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

const toCountryKey = (country?: string): CountryKey => {
  if (country && SUPPORTED_COUNTRIES.includes(country as CountryKey)) {
    return country as CountryKey;
  }
  return 'usa';
};

interface ExchangeRateChartProps {
  data: ExchangeRateDataPoint[];
  country?: string;
  height?: number;
  showOnlyDay?: boolean;
  customLabels?: string[];
  customYAxis?: {
    min: number;
    max: number;
    step: number;
    sections?: number;
    labels?: string[];
  };
  spacingMultiplier?: number;
}

export const ExchangeRateChart: React.FC<ExchangeRateChartProps> = ({ 
  data, 
  country = 'usa',
  height = 220,
  showOnlyDay,
  customLabels,
  customYAxis,
  spacingMultiplier,
}) => {
  const screenWidth = Dimensions.get('window').width - 32;
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const countryKey = useMemo(() => toCountryKey(country), [country]);

  const buildNormalizedData = useCallback(
    (parser: (value: any) => number | null): NormalizedExchangeRateDataPoint[] => {
      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .map(originalItem => {
          if (!originalItem) {
            return null;
          }

          const item = originalItem as Record<string, any>;
          const normalizedDate = extractDate(item);
          if (!normalizedDate) {
            return null;
          }

          const usdRate = extractRateValue(item, RATE_FIELD_CANDIDATES.usa, parser);
          const eurRate = extractRateValue(item, RATE_FIELD_CANDIDATES.europe, parser);
          const jpyRate = extractRateValue(item, RATE_FIELD_CANDIDATES.japan, parser);
          const cnyRate = extractRateValue(item, RATE_FIELD_CANDIDATES.china, parser);

          if (usdRate === null && eurRate === null && jpyRate === null && cnyRate === null) {
            return null;
          }

          return {
            date: normalizedDate,
            usdRate,
            eurRate,
            jpyRate,
            cnyRate,
          };
        })
        .filter((item): item is NormalizedExchangeRateDataPoint => item !== null)
        .sort(
          (a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    },
    [data]
  );

  const normalizedData = useMemo(
    () => buildNormalizedData(parseRateValue),
    [buildNormalizedData]
  );

  const getRateForCountry = useCallback(
    (item: NormalizedExchangeRateDataPoint): number | null => {
      switch (countryKey) {
        case 'usa':
          return item.usdRate;
        case 'japan':
          return item.jpyRate;
        case 'china':
          return item.cnyRate;
        case 'europe':
          return item.eurRate;
        default:
          return item.usdRate;
      }
    },
    [countryKey]
  );

  const filterValidData = useCallback(
    (items: NormalizedExchangeRateDataPoint[]) =>
      items.filter(item => {
        const value = getRateForCountry(item);
        return typeof value === 'number' && Number.isFinite(value) && value > 0;
      }),
    [getRateForCountry]
  );

  const filteredData = useMemo(
    () => filterValidData(normalizedData),
    [normalizedData, filterValidData]
  );

  const effectiveData = useMemo<NormalizedExchangeRateDataPoint[]>(() => {
    if (filteredData.length > 0) {
      return filteredData;
    }

    const fallbackNormalized = buildNormalizedData(fallbackParseRateValue);
    const fallbackFiltered = filterValidData(fallbackNormalized);

    return fallbackFiltered.length > 0 ? fallbackFiltered : fallbackNormalized;
  }, [filteredData, buildNormalizedData, filterValidData]);

  const chartValues = useMemo(
    () => effectiveData.map(item => getRateForCountry(item) as number),
    [effectiveData, getRateForCountry]
  );

  const currencyData = useMemo(
    () => ({
      values: chartValues,
      label: COUNTRY_LABELS[countryKey],
      color: COUNTRY_COLORS[countryKey],
    }),
    [chartValues, countryKey]
  );

  const handleFocus = useCallback((item: any, index: number) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setFocusedIndex(index);
    const newTimeoutId = setTimeout(() => {
      setFocusedIndex(null);
    }, 3000);
    setTimeoutId(newTimeoutId);
  }, [timeoutId]);

  // 유효한 데이터가 있는지 확인
  if (currencyData.values.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <ThemedText style={styles.noDataText}>표시할 데이터가 없습니다.</ThemedText>
      </View>
    );
  }

  const computeDefaultAxis = () => {
    const rawMin = Math.min(...chartValues);
    const rawMax = Math.max(...chartValues);

    const safeRange = rawMax - rawMin;
    const padding = Math.max(safeRange * 0.1, 1);

    let min = Math.floor(rawMin - padding);
    let max = Math.ceil(rawMax + padding);

    if (min === max) {
      min -= 1;
      max += 1;
    }

    const sections = 6;
    const step = Math.max(Math.round((max - min) / sections), 1);
    const labels = Array.from({ length: sections + 1 }, (_, idx) => {
      const value = max - step * idx;
      return value.toLocaleString('ko-KR');
    });

    return { min, max, step, sections, labels };
  };

  const defaultAxis = computeDefaultAxis();

  const activeAxis = useMemo(() => {
    const baseSections = customYAxis?.sections
      ? Math.max(customYAxis.sections, 2)
      : defaultAxis.sections;
    const axisMin = customYAxis?.min ?? defaultAxis.min;
    const axisMax = customYAxis?.max ?? defaultAxis.max;
    const axisStep =
      customYAxis?.step ?? defaultAxis.step ?? (axisMax - axisMin) / baseSections;

    const sections =
      customYAxis?.sections ??
      (axisStep > 0 ? Math.max(Math.round((axisMax - axisMin) / axisStep), 2) : baseSections);

    const boundedMax =
      axisMin + axisStep * sections < axisMax
        ? axisMax
        : axisMin + axisStep * sections;

    return {
      min: axisMin,
      max: boundedMax,
      step: axisStep,
      sections,
      labels: customYAxis?.labels ?? defaultAxis.labels,
    };
  }, [customYAxis, defaultAxis]);

  const yAxisOffset = activeAxis.min;
  const numberOfSections = activeAxis.sections;
  const yAxisStep = activeAxis.step;
  const yAxisMax = activeAxis.max;
  const valueOffset = yAxisOffset;
  const valueRange = Math.max(yAxisMax - valueOffset, 1);

  const chartData = useMemo(
    () =>
      effectiveData.map((item, index) => {
        const date = new Date(item.date);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const isFirstPoint = index === 0;

        let label = '';

        if (customLabels && customLabels[index]) {
          label = customLabels[index];
        } else if (showOnlyDay) {
          if (isFirstPoint) {
            label = `${FIRST_LABEL_PADDING}${month}.${day}`;
          } else {
            const prevDate = new Date(effectiveData[index - 1].date);
            label = date.getMonth() !== prevDate.getMonth() ? `${month}.${day}` : `${day}`;
          }
        } else {
          if (isFirstPoint) {
            label = `${FIRST_LABEL_PADDING}${month}.${day}`;
          } else {
            const prevDate = new Date(effectiveData[index - 1].date);
            label = date.getMonth() !== prevDate.getMonth() ? `${month}.${day}` : `${day}`;
          }
        }

        const absoluteValue = chartValues[index] ?? 0;
        const normalizedValue = Math.max(0, absoluteValue - valueOffset);

        return {
          value: normalizedValue,
          label,
          dataPointText: absoluteValue.toLocaleString('ko-KR'),
        };
      }),
    [effectiveData, chartValues, showOnlyDay, valueOffset, customLabels]
  );

  const chartConfig = useMemo(() => {
    const MAX_SPACING = 64;
    const MIN_SCROLLABLE_SPACING = 28;
    const MIN_FIT_SPACING = 12;
    const multiplier =
      typeof spacingMultiplier === 'number' && spacingMultiplier > 0
        ? spacingMultiplier
        : 1;

    if (showOnlyDay) {
      const referencePoints = Math.max(Math.min(effectiveData.length, 10), 1);
      const baseSpacing = Math.max(
        MIN_SCROLLABLE_SPACING,
        Math.min(MAX_SPACING, screenWidth / referencePoints)
      );
      const spacing = Math.max(
        MIN_SCROLLABLE_SPACING,
        Math.min(MAX_SPACING * multiplier, baseSpacing * multiplier)
      );
      const paddingCap = Math.max(24, Math.round(24 * multiplier));
      const padding = Math.max(
        16,
        Math.min(Math.round(spacing / 2), paddingCap)
      );

      return {
        spacing,
        initialSpacing: padding,
        endSpacing: padding,
      };
    }

    const referencePoints = Math.max(effectiveData.length - 1, 1);
    const FIT_MAX_SPACING = 44;
    const baseSpacing = (screenWidth - 40) / referencePoints;
    const effectiveMaxSpacing = FIT_MAX_SPACING * multiplier;
    const spacing = Math.max(
      MIN_FIT_SPACING,
      Math.min(effectiveMaxSpacing, baseSpacing * multiplier)
    );
    const initialSpacingCap = Math.max(30, Math.round(30 * multiplier));
    const initialSpacing = Math.max(
      22,
      Math.min(Math.round(spacing), initialSpacingCap)
    );
    const endSpacingCap = Math.max(34, Math.round(34 * multiplier));
    const endSpacing = Math.max(
      24,
      Math.min(Math.round(spacing * 1.08), endSpacingCap)
    );

    return {
      spacing,
      initialSpacing,
      endSpacing,
    };
  }, [showOnlyDay, screenWidth, effectiveData.length, spacingMultiplier]);
  const chartWidth = showOnlyDay
    ? Math.max(
        screenWidth,
        effectiveData.length * (chartConfig.spacing || 40) +
          (chartConfig.initialSpacing ?? 0) +
          (chartConfig.endSpacing ?? 0)
      )
    : screenWidth;

  const lineChartComponent = (
    <LineChart
      data={chartData}
      width={chartWidth}
      height={height}
      color={currencyData.color}
      thickness={3}
      dataPointsColor={currencyData.color}
      dataPointsRadius={effectiveData.length > 15 ? 3 : 4}
      focusEnabled
      onFocus={handleFocus}
      dataPointLabelComponent={(item: any, index: number) => {
        if (focusedIndex === index) {
          return (
            <View style={styles.tooltipContainer}>
              <Text style={styles.tooltipText}>{item.dataPointText}</Text>
            </View>
          );
        }
        return null;
      }}
      dataPointLabelShiftY={-20}
      showVerticalLines
      verticalLinesColor="#e2e8f0"
      rulesColor="#e2e8f0"
      rulesType="solid"
      spacing={chartConfig.spacing}
      initialSpacing={chartConfig.initialSpacing}
      endSpacing={chartConfig.endSpacing}
      disableScroll={!showOnlyDay}
      animateOnDataChange={effectiveData.length <= 15}
      animationDuration={1000}
      yAxisColor="#64748b"
      xAxisColor="#64748b"
      yAxisThickness={1}
      xAxisThickness={1}
      maxValue={valueRange}
      stepValue={yAxisStep}
      noOfSections={numberOfSections}
      formatYLabel={(value: string) => {
        const base = Number.parseFloat(value);
        const resolved = Number.isFinite(base) ? base + valueOffset : valueOffset;
        return resolved.toLocaleString('ko-KR', {
          minimumFractionDigits: customYAxis ? 2 : 0,
          maximumFractionDigits: customYAxis ? 2 : 0,
        });
      }}
      yAxisTextStyle={styles.defaultYAxisLabel}
      xAxisLabelTextStyle={{
        color: '#1f2937',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
      }}
      xAxisLabelShift={showOnlyDay ? 14 : 0}
      xAxisLabelOffset={12}
    />
  );

  return (
    <View style={styles.container}>
      <ThemedText style={styles.chartTitle}>{currencyData.label}</ThemedText>
      
      <View style={styles.chartContainer}>
        {showOnlyDay ? (
          <ScrollView horizontal showsHorizontalScrollIndicator persistentScrollbar={true}>
            {lineChartComponent}
          </ScrollView>
        ) : (
          lineChartComponent
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  defaultYAxisLabel: {
    color: '#1f2937',
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chartContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  tooltipContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    position: 'absolute',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tooltipText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 

const FIRST_LABEL_PADDING = '\u00a0\u00a0';








