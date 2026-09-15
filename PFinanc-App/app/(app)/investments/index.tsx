import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { investmentsApi } from '../../../src/api/investments';
import { PortfolioCard } from '../../../src/components/investments/PortfolioCard';
import { SkeletonCard, SkeletonRow } from '../../../src/components/ui/Skeleton';
import { Badge } from '../../../src/components/ui';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { formatINR, formatPercent, formatXIRR } from '../../../src/utils/currency';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ASSET_CLASS_COLORS: Record<string, string> = {
  STOCK: '#3B82F6', MUTUAL_FUND: '#6366F1', ETF: '#10B981',
  GOLD: '#F59E0B', SGB: '#F97316', FIXED_DEPOSIT: '#64748B',
  PPF: '#8B5CF6', NPS: '#EC4899', EPF: '#14B8A6',
};
const ASSET_CLASS_ICONS: Record<string, string> = {
  STOCK: 'trending-up', MUTUAL_FUND: 'chart-donut', ETF: 'chart-bar',
  GOLD: 'gold', SGB: 'file-document', FIXED_DEPOSIT: 'bank',
  PPF: 'piggy-bank', NPS: 'umbrella', EPF: 'account-hard-hat',
};

export default function InvestmentsScreen() {
  const [view, setView] = useState<'household' | 'personal'>('household');

  const { data: portfolioData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['portfolio', view],
    queryFn: () => investmentsApi.getPortfolioSummary(view),
  });
  const { data: holdingsData, isLoading: holdingsLoading } = useQuery({
    queryKey: ['holdings', view],
    queryFn: () => investmentsApi.getHoldings(),
  });
  const { data: fdData } = useQuery({
    queryKey: ['fixed-deposits'],
    queryFn: investmentsApi.getFixedDeposits,
  });
  const { data: paData } = useQuery({
    queryKey: ['physical-assets'],
    queryFn: investmentsApi.getPhysicalAssets,
  });

  const portfolio = portfolioData?.data;
  const holdings = holdingsData?.data?.holdings ?? [];
  const fds = fdData?.data ?? [];
  const physicalAssets = paData?.data ?? [];

  // Group holdings by asset class
  const byClass: Record<string, any[]> = {};
  holdings.forEach((h: any) => {
    const cls = h.security?.asset_class ?? 'STOCK';
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push(h);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Investments</Text>
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setView(v => v === 'household' ? 'personal' : 'household')}
        >
          <MaterialCommunityIcons
            name={view === 'household' ? 'home-city' : 'account'}
            size={14} color={Colors.onSurface}
          />
          <Text style={styles.viewToggleText}>{view === 'household' ? 'Household' : 'Personal'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.secondary} />
        }
      >
        {/* Portfolio Summary Card */}
        {isLoading ? (
          <SkeletonCard style={{ height: 180 }} />
        ) : portfolio ? (
          <PortfolioCard
            totalValue={parseFloat(portfolio.total_current_value ?? '0')}
            investedValue={parseFloat(portfolio.total_invested_value ?? '0')}
            totalGain={parseFloat(portfolio.total_gain ?? '0')}
            totalGainPercent={parseFloat(portfolio.total_gain_percent ?? '0')}
            xirr={portfolio.xirr ? parseFloat(portfolio.xirr) : undefined}
            dayGain={portfolio.day_gain ? parseFloat(portfolio.day_gain) : undefined}
            dayGainPercent={portfolio.day_gain_percent ? parseFloat(portfolio.day_gain_percent) : undefined}
          />
        ) : (
          <View style={styles.emptyPortfolio}>
            <MaterialCommunityIcons name="chart-line" size={56} color={Colors.onSurfaceSubtle} />
            <Text style={styles.emptyTitle}>No investments tracked</Text>
            <Text style={styles.emptyText}>Add investment accounts to track your portfolio</Text>
          </View>
        )}

        {/* Asset Class Breakdown */}
        {Object.keys(byClass).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Asset Class</Text>
            <View style={styles.assetClassGrid}>
              {Object.entries(byClass).map(([cls, items]) => {
                const totalVal = items.reduce((s, h) => s + parseFloat(h.current_value ?? '0'), 0);
                const totalInv = items.reduce((s, h) => s + parseFloat(h.invested_value ?? '0'), 0);
                const gain = totalVal - totalInv;
                const gainPct = totalInv > 0 ? (gain / totalInv) * 100 : 0;
                const color = ASSET_CLASS_COLORS[cls] ?? Colors.secondary;
                const icon = ASSET_CLASS_ICONS[cls] ?? 'chart-line';
                return (
                  <View key={cls} style={styles.assetClassCard}>
                    <View style={[styles.assetIcon, { backgroundColor: color + '18' }]}>
                      <MaterialCommunityIcons name={icon as any} size={18} color={color} />
                    </View>
                    <Text style={styles.assetClassName}>{cls.replace('_', ' ')}</Text>
                    <Text style={styles.assetClassValue}>{formatINR(totalVal, { compact: true })}</Text>
                    <Text style={[styles.assetClassGain, { color: gain >= 0 ? Colors.success : Colors.danger }]}>
                      {gain >= 0 ? '+' : ''}{formatPercent(gainPct)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Holdings List */}
        {holdingsLoading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Holdings</Text>
            {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </View>
        ) : holdings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Holdings ({holdings.length})</Text>
            <View style={styles.holdingsList}>
              {holdings.map((h: any) => {
                const currentVal = parseFloat(h.current_value ?? '0');
                const investedVal = parseFloat(h.invested_value ?? '0');
                const gain = currentVal - investedVal;
                const gainPct = investedVal > 0 ? (gain / investedVal) * 100 : 0;
                return (
                  <View key={h.id} style={styles.holdingRow}>
                    <View style={styles.holdingLeft}>
                      <Text style={styles.holdingSymbol}>{h.security?.ticker_symbol ?? h.security?.name?.slice(0, 4).toUpperCase()}</Text>
                      <Text style={styles.holdingName} numberOfLines={1}>{h.security?.name}</Text>
                    </View>
                    <View style={styles.holdingRight}>
                      <Text style={styles.holdingValue}>{formatINR(currentVal)}</Text>
                      <Text style={[styles.holdingGain, { color: gain >= 0 ? Colors.success : Colors.danger }]}>
                        {gain >= 0 ? '+' : ''}{formatPercent(gainPct)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Fixed Deposits */}
        {fds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fixed Deposits ({fds.length})</Text>
            <View style={styles.holdingsList}>
              {fds.map((fd: any) => (
                <View key={fd.id} style={styles.holdingRow}>
                  <View style={styles.holdingLeft}>
                    <View style={[styles.fdIcon, { backgroundColor: '#64748B18' }]}>
                      <MaterialCommunityIcons name="bank" size={16} color={Colors.transfer} />
                    </View>
                    <View>
                      <Text style={styles.holdingName}>{fd.bank_name}</Text>
                      <Text style={styles.holdingMeta}>{fd.interest_rate}% · Matures {fd.maturity_date}</Text>
                    </View>
                  </View>
                  <Text style={styles.holdingValue}>{formatINR(fd.principal_amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Physical Assets */}
        {physicalAssets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Physical Assets ({physicalAssets.length})</Text>
            <View style={styles.holdingsList}>
              {physicalAssets.map((pa: any) => (
                <View key={pa.id} style={styles.holdingRow}>
                  <View style={styles.holdingLeft}>
                    <View style={[styles.fdIcon, { backgroundColor: '#F59E0B18' }]}>
                      <MaterialCommunityIcons name="gold" size={16} color={Colors.warning} />
                    </View>
                    <View>
                      <Text style={styles.holdingName}>{pa.name}</Text>
                      <Text style={styles.holdingMeta}>{pa.asset_type?.replace('_', ' ')}</Text>
                    </View>
                  </View>
                  <Text style={styles.holdingValue}>{formatINR(pa.current_value ?? pa.purchase_value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.layoutMargin, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  viewToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceDim, borderRadius: Spacing.pillRadius,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  viewToggleText: { ...Typography.labelMd, color: Colors.onSurface },
  scroll: { flex: 1 },
  content: { padding: Spacing.layoutMargin, gap: Spacing.xl, paddingBottom: 40 },
  emptyPortfolio: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  emptyTitle: { ...Typography.headlineMd, color: Colors.onSurface },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceMuted, textAlign: 'center', maxWidth: 260 },
  section: { gap: Spacing.md },
  sectionTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  assetClassGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  assetClassCard: {
    width: '47%', backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: 4,
  },
  assetIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  assetClassName: { ...Typography.labelMd, color: Colors.onSurfaceMuted },
  assetClassValue: { ...Typography.numericData, color: Colors.onSurface, fontVariant: ['tabular-nums'] },
  assetClassGain: { ...Typography.labelSm },
  holdingsList: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  holdingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8,
  },
  holdingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  holdingSymbol: {
    fontFamily: 'Inter_700Bold', fontSize: 12, color: Colors.secondary,
    backgroundColor: Colors.surfaceDim, paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6, overflow: 'hidden',
  },
  holdingName: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1 },
  holdingMeta: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  holdingRight: { alignItems: 'flex-end', gap: 2 },
  holdingValue: { ...Typography.numericData, color: Colors.onSurface, fontVariant: ['tabular-nums'] },
  holdingGain: { ...Typography.labelSm },
  fdIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
