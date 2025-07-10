import { Text, type TextProps, StyleSheet } from 'react-native';

import { useThemeColor } from '../hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
