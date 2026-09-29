import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { Colors, Spacing } from '../../theme';

type ElevationLevel = 0 | 1 | 2 | 3;

interface CardProps extends ViewProps {
  children: React.ReactNode;
  elevation?: ElevationLevel;
  style?: ViewStyle;
  padding?: number;
}

export function Card({ children, elevation = 1, style, padding = Spacing.cardPadding, ...rest }: CardProps) {
  return (
    <View
      style={[styles.base, styles[`elevation${elevation}`], { padding }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  elevation0: {},
  elevation1: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  elevation2: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  elevation3: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
});
