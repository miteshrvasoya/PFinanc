import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PriceChart } from '../components/PriceChart';

type SortKey = 'value' | 'gain' | 'name';

interface PortfolioProps {
  onNavigate?: (screen: string, params?: { filter?: string }) => void;
}

export const PortfolioScreen: React.FC<PortfolioProps> = ({ onNavigate }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);
  const [assetFilter, setAssetFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);

  const togglePrivacy = () => setIsPrivacyMasked(!isPrivacyMasked);

  const formatCurrency = (val: number) => `₹${Math.abs(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const formatPrice = (val: number) => `₹${(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const getAmount = (val: number) => isPrivacyMasked ? '••••••' : formatCurrency(val);
  const getPercent = (val: number) => isPrivacyMasked ? '•••' : `${val > 0 ? '+' : ''}${(val || 0).toFixed(2)}%`;
  const nameOf = (h: any) => h.name || h.security_name || h.symbol || 'Unknown';
  const idOf = (h: any, idx: number) => `${h.security_id || h.symbol || idx}-${h.account_id || ''}`;

  const fetchPortfolioData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [sumRes, holdRes] = await Promise.all([
        apiClient.get('/api/investments/portfolio'),
        apiClient.get('/api/investments/portfolio/holdings'),
      ]);
      if (sumRes.success) setSummaryData(sumRes.data);
      if (holdRes.success) setHoldings(Array.isArray(holdRes.data) ? holdRes.data : []);
      if (!sumRes.success && !holdRes.success) setError('Could not load your portfolio.');
    } catch (err) {
      console.error('Failed to fetch portfolio data', err);
      setError('Could not load your portfolio. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPortfolioData(); }, [fetchPortfolioData]);

  const totalValue = summaryData?.summary?.totalCurrentValue || 0;
  const totalInvested = summaryData?.summary?.totalInvested || 0;
  const totalGain = summaryData?.summary?.unrealizedPnL || 0;
  const gainPercent = summaryData?.summary?.unrealizedPnLPercent || 0;
  const xirr = summaryData?.summary?.xirr || 0;
  const positions = summaryData?.summary?.holdingsCount ?? holdings.length;
  const assetAllocation: any[] = summaryData?.assetAllocation || [];

  const assetClasses = useMemo(
    () => ['All', ...Array.from(new Set(holdings.map(h => h.asset_class).filter(Boolean)))] as string[],
    [holdings]
  );

  const visibleHoldings = useMemo(() => {
    const list = assetFilter === 'All' ? holdings : holdings.filter(h => h.asset_class === assetFilter);
    return [...list].sort((a, b) => {
      if (sortKey === 'gain') return (b.unrealized_pnl_percent || 0) - (a.unrealized_pnl_percent || 0);
      if (sortKey === 'name') return nameOf(a).localeCompare(nameOf(b));
      return (b.current_value || 0) - (a.current_value || 0);
    });
  }, [holdings, assetFilter, sortKey]);

  const { best, worst } = useMemo(() => {
    if (holdings.length < 2) return { best: null as any, worst: null as any };
    const byGain = [...holdings].sort((a, b) => (b.unrealized_pnl_percent || 0) - (a.unrealized_pnl_percent || 0));
    return { best: byGain[0], worst: byGain[byGain.length - 1] };
  }, [holdings]);

  const staleCount = holdings.filter(h => h.is_stale).length;

  const renderMover = (label: string, h: any, positive: boolean) => (
    <Pressable
      style={styles.moverCard}
      onPress={() => { setAssetFilter('All'); setExpandedId(idOf(h, holdings.indexOf(h))); }}
    >
      <View style={styles.moverTop}>
        <MaterialIcons name={positive ? 'north-east' : 'south-east'} size={14} color={positive ? colors.primaryContainer : colors.error} />
        <Text style={styles.moverLabel}>{label}</Text>
      </View>
      <Text style={styles.moverName} numberOfLines={1}>{nameOf(h)}</Text>
      <Text style={[styles.moverPct, { color: (h.unrealized_pnl_percent || 0) >= 0 ? colors.primaryContainer : colors.error }]}>
        {getPercent(h.unrealized_pnl_percent)}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.avatarContainer} onPress={() => onNavigate && onNavigate('more')}>
            <Image
              source={{ uri: user?.avatar_url || 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff' }}
              style={styles.avatar}
            />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Portfolio</Text>
            <Text style={styles.headerSubtitle}>FAMILY INVESTMENTS</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconButton} onPress={() => onNavigate && onNavigate('angelone')} accessibilityLabel="Angel One sync">
            <MaterialIcons name="sync" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => onNavigate && onNavigate('insights')}>
            <MaterialIcons name="insights" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={togglePrivacy}>
            <MaterialIcons name={isPrivacyMasked ? 'visibility-off' : 'visibility'} size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPortfolioData(true)} tintColor={colors.primary} />}
        >
          {error && (
            <Pressable style={styles.errorBanner} onPress={() => fetchPortfolioData()}>
              <MaterialIcons name="error-outline" size={18} color={colors.onErrorContainer} />
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.errorRetry}>Retry</Text>
            </Pressable>
          )}

          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroHeader}>
              <Text style={styles.heroLabel}>TOTAL PORTFOLIO VALUE</Text>
              <View style={styles.verifiedBadge}>
                <MaterialIcons name={totalGain >= 0 ? 'trending-up' : 'trending-down'} size={12} color={totalGain >= 0 ? colors.primaryFixed : colors.errorContainer} />
                <Text style={[styles.verifiedText, totalGain < 0 && { color: colors.errorContainer }]}>{getPercent(gainPercent)}</Text>
              </View>
            </View>

            <Text style={styles.heroBalance}>{isPrivacyMasked ? '••••••' : formatCurrency(totalValue)}</Text>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>INVESTED</Text>
                <Text style={styles.metricValue}>{getAmount(totalInvested)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>UNREALIZED GAIN</Text>
                <View style={styles.gainRow}>
                  <Text style={[styles.metricValue, { color: totalGain >= 0 ? colors.primaryFixed : colors.errorContainer }]}>
                    {isPrivacyMasked ? '••••••' : `${totalGain >= 0 ? '+' : '-'}${formatCurrency(totalGain)}`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.benchmarkRow}>
              <View style={styles.xirrRow}>
                <Text style={styles.benchmarkLabel}>XIRR</Text>
                <View style={styles.xirrBadge}>
                  <Text style={styles.xirrBadgeText}>{getPercent(xirr)}</Text>
                </View>
              </View>
              <Text style={styles.benchmarkMeta}>{positions} Active Positions</Text>
            </View>
          </View>

          {/* Quick actions */}
          <View style={styles.actionsRow}>
            <Pressable style={styles.actionTile} onPress={() => onNavigate && onNavigate('imports')}>
              <MaterialIcons name="upload-file" size={20} color={colors.primary} />
              <Text style={styles.actionTileText}>Import</Text>
            </Pressable>
            <Pressable style={styles.actionTile} onPress={() => onNavigate && onNavigate('insights')}>
              <MaterialIcons name="insights" size={20} color={colors.primary} />
              <Text style={styles.actionTileText}>Analytics</Text>
            </Pressable>
            <Pressable style={styles.actionTile} onPress={() => onNavigate && onNavigate('advisor')}>
              <MaterialIcons name="psychology" size={20} color={colors.primary} />
              <Text style={styles.actionTileText}>Ask AI</Text>
            </Pressable>
            <Pressable style={styles.actionTile} onPress={() => onNavigate && onNavigate('accounts')}>
              <MaterialIcons name="account-balance" size={20} color={colors.primary} />
              <Text style={styles.actionTileText}>Accounts</Text>
            </Pressable>
            <Pressable style={styles.actionTile} onPress={() => onNavigate && onNavigate('metals')} accessibilityLabel="Gold and silver">
              <MaterialIcons name="diamond" size={20} color={colors.primary} />
              <Text style={styles.actionTileText}>Gold</Text>
            </Pressable>
          </View>

          {/* Top / worst performer */}
          {best && worst && (
            <View style={styles.moversRow}>
              {renderMover('Top performer', best, true)}
              {renderMover('Needs attention', worst, false)}
            </View>
          )}

          {/* Allocation */}
          {assetAllocation.length > 0 && (
            <View style={styles.allocationSection}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Asset Allocation</Text>
                  <Text style={styles.sectionMeta}>Across {assetAllocation.length} asset classes</Text>
                </View>
                <Pressable onPress={() => onNavigate && onNavigate('advisor')} hitSlop={8}>
                  <Text style={styles.rebalanceLink}>Rebalance with AI</Text>
                </Pressable>
              </View>

              <View style={styles.progressBar}>
                {assetAllocation.map((alloc: any, idx: number) => (
                  <View key={idx} style={[styles.progressSegment, { width: `${alloc.percent}%`, backgroundColor: alloc.color || colors.primaryContainer }]} />
                ))}
              </View>

              <View style={styles.bentoGrid}>
                {assetAllocation.map((alloc: any, idx: number) => (
                  <Pressable
                    key={idx}
                    style={[styles.bentoCard, assetFilter === alloc.label && styles.bentoCardActive]}
                    onPress={() => setAssetFilter(assetClasses.includes(alloc.label) ? alloc.label : 'All')}
                  >
                    <View style={styles.bentoHeader}>
                      <View style={[styles.bentoDot, { backgroundColor: alloc.color || colors.primaryContainer }]} />
                      <Text style={styles.bentoLabel} numberOfLines={1}>{alloc.label}</Text>
                    </View>
                    <Text style={styles.bentoValue}>{getAmount(alloc.amount)}</Text>
                    <Text style={[styles.bentoPercent, { color: alloc.color || colors.surfaceTint }]}>{Number(alloc.percent || 0).toFixed(1)}% of portfolio</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Holdings */}
          <View style={styles.holdingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Holdings</Text>
              <Text style={styles.sectionMeta}>{visibleHoldings.length} of {holdings.length}</Text>
            </View>

            {holdings.length > 0 && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {assetClasses.map(c => (
                    <Pressable key={c} style={[styles.chip, assetFilter === c && styles.chipActive]} onPress={() => setAssetFilter(c)}>
                      <Text style={[styles.chipText, assetFilter === c && styles.chipTextActive]}>{c}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.sortRow}>
                  <Text style={styles.sortLabel}>Sort by</Text>
                  {([['value', 'Value'], ['gain', 'Returns'], ['name', 'Name']] as [SortKey, string][]).map(([k, label]) => (
                    <Pressable key={k} onPress={() => setSortKey(k)} style={[styles.sortChip, sortKey === k && styles.sortChipActive]}>
                      <Text style={[styles.sortChipText, sortKey === k && styles.sortChipTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {staleCount > 0 && (
              <View style={styles.staleNote}>
                <MaterialIcons name="schedule" size={14} color={colors.onSecondaryContainer} />
                <Text style={styles.staleText}>{staleCount} holding{staleCount > 1 ? 's' : ''} have outdated prices</Text>
              </View>
            )}

            {holdings.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="pie-chart-outline" size={40} color={colors.outline} />
                <Text style={styles.emptyTitle}>No investments yet</Text>
                <Text style={styles.emptyDesc}>Import a broker or mutual-fund statement to see your portfolio here.</Text>
                <Pressable style={styles.emptyBtn} onPress={() => onNavigate && onNavigate('imports')}>
                  <MaterialIcons name="upload-file" size={18} color={colors.onPrimary} />
                  <Text style={styles.emptyBtnText}>Import statement</Text>
                </Pressable>
              </View>
            ) : (
              visibleHoldings.map((holding: any, idx: number) => {
                const id = idOf(holding, idx);
                const open = expandedId === id;
                const up = (holding.unrealized_pnl || 0) >= 0;
                return (
                  <Pressable key={id} style={styles.holdingCard} onPress={() => setExpandedId(open ? null : id)}>
                    <View style={styles.holdingItem}>
                      <View style={styles.holdingLeft}>
                        <Text style={styles.holdingName} numberOfLines={1}>{nameOf(holding)}</Text>
                        <View style={styles.holdingMetaRow}>
                          <Text style={styles.holdingMetaText}>{holding.asset_class || 'Stock'}</Text>
                          <View style={styles.dotSeparator} />
                          <Text style={styles.holdingMetaText}>{holding.current_quantity} Qty</Text>
                        </View>
                      </View>
                      <View style={styles.holdingRight}>
                        <Text style={styles.holdingValue}>{getAmount(holding.current_value)}</Text>
                        <Text style={[styles.holdingGain, { color: up ? colors.primaryContainer : colors.error }]}>
                          {getPercent(holding.unrealized_pnl_percent)}
                        </Text>
                      </View>
                    </View>
                    {open && (
                      <View style={styles.holdingDetails}>
                        <View style={styles.detailCell}>
                          <Text style={styles.detailLabel}>Invested</Text>
                          <Text style={styles.detailValue}>{getAmount(holding.total_invested)}</Text>
                        </View>
                        <View style={styles.detailCell}>
                          <Text style={styles.detailLabel}>Avg. cost</Text>
                          <Text style={styles.detailValue}>{isPrivacyMasked ? '••••' : formatPrice(holding.average_cost)}</Text>
                        </View>
                        <View style={styles.detailCell}>
                          <Text style={styles.detailLabel}>Current price</Text>
                          <Text style={styles.detailValue}>{isPrivacyMasked ? '••••' : formatPrice(holding.current_price)}</Text>
                        </View>
                        <View style={styles.detailCell}>
                          <Text style={styles.detailLabel}>P&L</Text>
                          <Text style={[styles.detailValue, { color: up ? colors.primaryContainer : colors.error }]}>
                            {isPrivacyMasked ? '••••' : `${up ? '+' : '-'}${formatCurrency(holding.unrealized_pnl)}`}
                          </Text>
                        </View>
                        {holding.security_type !== 'OTHER' && (
                          <View style={{ width: '100%' }}><PriceChart symbol={holding.symbol} /></View>
                        )}
                        {(holding.account_name || holding.owner_name) && (
                          <Text style={styles.detailFoot}>
                            {[holding.owner_name, holding.account_name].filter(Boolean).join(' • ')}
                          </Text>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'rgba(244, 251, 247, 0.9)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarContainer: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: colors.primaryContainer },
  avatar: { width: '100%', height: '100%' },
  headerTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: colors.primary, lineHeight: 22 },
  headerSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceVariant, letterSpacing: 0.5 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainer },
  scrollContent: { paddingBottom: 20 },
  contextSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  contextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  contextTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 24, color: colors.onSurface, marginBottom: 4 },
  contextDesc: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  contextActions: { flexDirection: 'row', gap: 8 },
  analyticsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryContainer, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  analyticsText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.primary },
  heroCard: { backgroundColor: colors.primary, marginHorizontal: 20, borderRadius: 24, padding: 24, overflow: 'hidden', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8, marginBottom: 24 },
  headerRight: { flexDirection: 'row', gap: 8 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: colors.errorContainer },
  errorText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onErrorContainer },
  errorRetry: { fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.onErrorContainer },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  actionTile: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant },
  actionTileText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.onSurface },
  moversRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 24 },
  moverCard: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant },
  moverTop: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  moverLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: colors.onSurfaceVariant, letterSpacing: 0.4 },
  moverName: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: colors.onSurface, marginBottom: 2 },
  moverPct: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  bentoCardActive: { borderColor: colors.primaryContainer, borderWidth: 2 },
  chipRow: { gap: 8, paddingBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surfaceContainer },
  chipActive: { backgroundColor: colors.primaryContainer },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurfaceVariant },
  chipTextActive: { color: colors.onPrimary },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sortLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  sortChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sortChipActive: { backgroundColor: colors.primaryFixed },
  sortChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  sortChipTextActive: { fontFamily: 'Inter_700Bold', color: colors.onPrimaryFixed },
  staleNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, padding: 10, borderRadius: 10, backgroundColor: colors.secondaryContainer },
  staleText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSecondaryContainer },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: colors.onSurface },
  emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primaryContainer },
  emptyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onPrimary },
  holdingCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden' },
  holdingDetails: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(193,200,194,0.4)', rowGap: 12 },
  detailCell: { width: '50%' },
  detailLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 2 },
  detailValue: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: colors.onSurface },
  detailFoot: { width: '100%', fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  heroGlow: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, zIndex: 2 },
  heroLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.onPrimary, opacity: 0.8, letterSpacing: 0.5 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  verifiedText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: colors.primaryFixed },
  heroBalance: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 36, color: colors.onPrimary, marginBottom: 24, letterSpacing: -1, zIndex: 2 },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, zIndex: 2 },
  metricItem: { flex: 1 },
  metricLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: colors.onPrimary, opacity: 0.7, marginBottom: 4, letterSpacing: 0.5 },
  metricValue: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: colors.onPrimary, marginBottom: 4 },
  gainRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gainText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primaryFixed },
  benchmarkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', zIndex: 2 },
  xirrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benchmarkLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onPrimary, opacity: 0.9 },
  xirrBadge: { backgroundColor: colors.onPrimary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  xirrBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.primary },
  benchmarkMeta: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onPrimary, opacity: 0.7 },
  allocationSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: colors.onSurface, marginBottom: 2 },
  sectionMeta: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  rebalanceLink: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary },
  progressBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, marginBottom: 20 },
  progressSegment: { height: '100%' },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bentoCard: { width: '48%', backgroundColor: colors.surfaceContainerLowest, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.outlineVariant },
  bentoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bentoDot: { width: 8, height: 8, borderRadius: 4 },
  bentoLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  bentoValue: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: colors.onSurface, marginBottom: 4 },
  bentoPercent: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  holdingsSection: { paddingHorizontal: 20, marginBottom: 24 },
  holdingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  holdingLeft: { flex: 1, paddingRight: 12 },
  holdingName: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: colors.onSurface, marginBottom: 6 },
  holdingMetaRow: { flexDirection: 'row', alignItems: 'center' },
  holdingMetaText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, marginHorizontal: 8 },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: colors.onSurface, marginBottom: 4 },
  holdingGain: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
