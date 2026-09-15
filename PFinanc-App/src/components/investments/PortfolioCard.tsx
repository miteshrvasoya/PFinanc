import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';
import { Colors, Spacing, Typography } from '../../theme';
import { formatINR, formatXIRR, formatPercent } from '../../utils/currency';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PortfolioCardProps {
  totalValue: number;
  investedValue: number;
  totalGain: number;
  totalGainPercent: number;
  xirr?: number;
  dayGain?: number;
  dayGainPercent?: number;
  onPress?: () => void;
}

export function PortfolioCard({
  totalValue,
  investedValue,
  totalGain,
  totalGainPercent,
  xirr,
  dayGain,
  dayGainPercent,
  onPress,
}: PortfolioCardProps) {
  const isPositive = totalGain >= 0;
  const dayPositive = (dayGain ?? 0) >= 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.wrapper}>
      {/* Dark gradient card */}
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Portfolio Value</Text>
          {xirr !== undefined && (
            <View style={styles.xirrBadge}>
              <MaterialCommunityIcons name="chart-line" size={12} color={Colors.tertiary} />
              <Text style={styles.xirrText}>XIRR {formatXIRR(xirr)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.totalValue}>{formatINR(totalValue)}</Text>

        <View style={styles.gainRow}>
          <MaterialCommunityIcons
            name={isPositive ? 'trending-up' : 'trending-down'}
            size={16}
            color={isPositive ? Colors.success : Colors.danger}
          />
          <Text style={[styles.gainAmount, { color: isPositive ? Colors.success : Colors.danger }]}>
            {isPositive ? '+' : ''}{formatINR(totalGain, { compact: true })} ({formatPercent(totalGainPercent)})
          </Text>
          <Text style={styles.gainLabel}> overall</Text>
        </View>

        <View style={styles.dividerLine} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Invested</Text>
            <Text style={styles.metaValue}>{formatINR(investedValue, { compact: true })}</Text>
          </View>
          {dayGain !== undefined && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Today</Text>
              <Text style={[styles.metaValue, { color: dayPositive ? Colors.success : Colors.danger }]}>
                {dayPositive ? '+' : ''}{formatINR(dayGain, { compact: true })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: Spacing.layoutMargin },
  card: {
    backgroundColor: Colors.primary,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLabel: { ...Typography.labelMd, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  xirrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderRadius: Spacing.pillRadius,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  xirrText: { ...Typography.labelSm, color: '#A5B4FC' },
  totalValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.64,
    color: Colors.onPrimary,
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  gainRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  gainAmount: { ...Typography.numericData, fontVariant: ['tabular-nums'] },
  gainLabel: { ...Typography.bodySm, color: 'rgba(255,255,255,0.5)' },
  dividerLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: Spacing.xl },
  metaItem: { gap: 2 },
  metaLabel: { ...Typography.labelSm, color: 'rgba(255,255,255,0.5)' },
  metaValue: { ...Typography.numericData, color: Colors.onPrimary, fontVariant: ['tabular-nums'] },
});
