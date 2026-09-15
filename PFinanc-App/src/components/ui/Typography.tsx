import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Colors, Typography as Typo } from '../../theme';

type Variant =
  | 'displayCurrency'
  | 'displayCurrencyMobile'
  | 'headlineLg'
  | 'headlineMd'
  | 'headlineSm'
  | 'bodyLg'
  | 'bodyMd'
  | 'bodySm'
  | 'numericData'
  | 'labelMd'
  | 'labelSm';

type ColorProp = 'primary' | 'muted' | 'subtle' | 'success' | 'danger' | 'warning' | 'secondary' | 'onPrimary';

interface TypographyProps extends TextProps {
  variant?: Variant;
  color?: ColorProp;
  children: React.ReactNode;
}

const colorMap: Record<ColorProp, string> = {
  primary: Colors.onSurface,
  muted: Colors.onSurfaceMuted,
  subtle: Colors.onSurfaceSubtle,
  success: Colors.success,
  danger: Colors.danger,
  warning: Colors.warning,
  secondary: Colors.secondary,
  onPrimary: Colors.onPrimary,
};

export function Typography({ variant = 'bodyMd', color = 'primary', style, children, ...rest }: TypographyProps) {
  return (
    <Text style={[Typo[variant], { color: colorMap[color] }, style]} {...rest}>
      {children}
    </Text>
  );
}
