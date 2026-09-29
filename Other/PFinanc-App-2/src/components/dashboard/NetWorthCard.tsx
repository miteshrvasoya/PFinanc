import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Typography } from '../ui/Typography';
import { Colors, Spacing } from '../../theme';
import { formatINR, formatPercent } from '../../utils/currency';

interface NetWorthCardProps {
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyChange?: number;
  monthlyChangePercent?: number;
  householdName?: string;
}

export function NetWorthCard({
  totalNetWorth,
  totalAssets,
  totalLiabilities,
  monthlyChange,
  monthlyChangePercent,
  householdName,
}: NetWorthCardProps) {
  const isPositiveChange = (monthlyChange ?? 0) >= 0;

  return (
    <View style={styles.container}>
      {/* Dark hero card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Typography variant="labelMd" color="onPrimary" style={styles.heroLabel}>
            {householdName ?? 'Net Worth'}
          </Typography>
          <View style={styles.changeBadge}>
            <Text style={[styles.changeText, { color: isPositiveChange ? Colors.success : Colors.danger }]}>
              {isPositiveChange ? '▲' : '▼'} {formatPercent(Math.abs(monthlyChangePercent ?? 0))} this month
            </Text>
          </View>
        </View>

        <Text style={styles.netWorthAmount}>{formatINR(totalNetWorth)}</Text>

        <View style={styles.assetRow}>
          <View style={styles.assetItem}>
            <Typography variant="labelSm" color="onPrimary" style={styles.dimLabel}>
              Assets
            </Typography>
            <Text style={[styles.assetAmount, { color: Colors.success }]}>
              {formatINR(totalAssets, { compact: true })}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.assetItem}>
            <Typography variant="labelSm" color="onPrimary" style={styles.dimLabel}>
              Liabilities
            </Typography>
            <Text style={[styles.assetAmount, { color: Colors.danger }]}>
              {formatINR(totalLiabilities, { compact: true })}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: Spacing.layoutMargin },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroLabel: { opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 },
  changeBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Spacing.pillRadius,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  changeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  netWorthAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.68,
    color: Colors.onPrimary,
    fontVariant: ['tabular-nums'],
    marginBottom: Spacing.base,
  },
  assetRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  assetItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  dimLabel: { opacity: 0.6, marginBottom: 2 },
  assetAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
});
