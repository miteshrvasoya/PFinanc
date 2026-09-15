import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Typography } from '../../theme';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'secondary' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: Colors.successBg, text: Colors.success },
  danger: { bg: Colors.dangerBg, text: Colors.danger },
  warning: { bg: Colors.warningBg, text: Colors.warning },
  secondary: { bg: 'rgba(59, 130, 246, 0.1)', text: Colors.secondary },
  neutral: { bg: Colors.surfaceDim, text: Colors.onSurfaceMuted },
  primary: { bg: Colors.primary, text: Colors.onPrimary },
};

export function Badge({ label, variant = 'neutral', style, size = 'md' }: BadgeProps) {
  const vs = variantStyles[variant];
  const isSm = size === 'sm';
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: vs.bg, paddingHorizontal: isSm ? 6 : 8, paddingVertical: isSm ? 2 : 4 },
        style,
      ]}
    >
      <Text style={[isSm ? Typography.labelSm : Typography.labelMd, { color: vs.text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Spacing.pillRadius,
    alignSelf: 'flex-start',
  },
});
