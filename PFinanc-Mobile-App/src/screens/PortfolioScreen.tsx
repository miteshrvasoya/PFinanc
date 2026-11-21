import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const PortfolioScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);
  const [activeTimeframe, setActiveTimeframe] = useState('1Y');
  
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);

  const togglePrivacy = () => setIsPrivacyMasked(!isPrivacyMasked);
  
  const formatCurrency = (val: number) => `₹${Math.abs(val || 0).toLocaleString('en-IN')}`;
  const getAmount = (val: number) => isPrivacyMasked ? '••••••' : formatCurrency(val);
  const getPercent = (val: number) => isPrivacyMasked ? '•••' : `${val > 0 ? '+' : ''}${(val || 0).toFixed(2)}%`;

  const timeframes = ['1M', '3M', '6M', '1Y', '3Y', 'ALL'];

  useEffect(() => {
    const fetchPortfolioData = async () => {
      setLoading(true);
      try {
        const [sumRes, holdRes] = await Promise.all([
          apiClient.get('/api/investments/portfolio'),
          apiClient.get('/api/investments/portfolio/holdings')
        ]);
        
        if (sumRes.success) {
          setSummaryData(sumRes.data);
        }
        if (holdRes.success) {
          setHoldings(holdRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch portfolio data', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPortfolioData();
  }, []);

  const totalValue = summaryData?.summary?.totalCurrentValue || 0;
  const totalInvested = summaryData?.summary?.totalInvested || 0;
  const totalGain = summaryData?.summary?.unrealizedPnL || 0;
  const gainPercent = summaryData?.summary?.unrealizedPnLPercent || 0;
  const xirr = summaryData?.summary?.xirr || 0;
  
  const assetAllocation = summaryData?.assetAllocation || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: user?.avatar_url || 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff' }}
              style={styles.avatar}
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>PFinanc</Text>
            <Text style={styles.headerSubtitle}>SOVEREIGN WEALTH</Text>
          </View>
        </View>
        <Pressable style={styles.iconButton} onPress={togglePrivacy}>
          <MaterialIcons 
            name={isPrivacyMasked ? "visibility-off" : "visibility"} 
            size={20} 
            color={colors.onSurfaceVariant} 
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Sub-Header Context & Scope Switcher */}
          <View style={styles.contextSection}>
            <View style={styles.contextRow}>
              <View>
                <Text style={styles.contextTitle}>Investments</Text>
                <Text style={styles.contextDesc}>Family Portfolio</Text>
              </View>
              <View style={styles.contextActions}>
                <Pressable style={styles.analyticsBtn}>
                  <MaterialIcons name="insights" size={16} color={colors.primary} />
                  <Text style={styles.analyticsText}>Analytics</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Portfolio Hero Summary Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroHeader}>
              <Text style={styles.heroLabel}>TOTAL PORTFOLIO VALUE</Text>
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified-user" size={12} color={colors.primaryFixed} />
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            </View>
            
            <Text style={styles.heroBalance}>{isPrivacyMasked ? '••••••' : (totalValue >= 0 ? formatCurrency(totalValue) : `-${formatCurrency(totalValue)}`)}</Text>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>INVESTED VALUE</Text>
                <Text style={styles.metricValue}>{getAmount(totalInvested)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>TOTAL GAIN</Text>
                <View style={styles.gainRow}>
                  <MaterialIcons name={totalGain >= 0 ? "trending-up" : "trending-down"} size={14} color={totalGain >= 0 ? colors.primaryFixed : colors.error} />
                  <Text style={[styles.gainText, { color: totalGain >= 0 ? colors.primaryFixed : colors.error }]}>
                    {totalGain > 0 ? '+' : ''}{getAmount(totalGain)} ({getPercent(gainPercent)})
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.benchmarkRow}>
              <View style={styles.xirrRow}>
                <Text style={styles.benchmarkLabel}>XIRR:</Text>
                <View style={styles.xirrBadge}>
                  <Text style={styles.xirrBadgeText}>{getPercent(xirr)}</Text>
                </View>
              </View>
              <Text style={styles.benchmarkMeta}>{summaryData?.summary?.holdingsCount} Active Positions</Text>
            </View>
          </View>

          {/* Asset Allocation Breakdown */}
          {assetAllocation.length > 0 && (
            <View style={styles.allocationSection}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Asset Allocation</Text>
                  <Text style={styles.sectionMeta}>Diversified across {assetAllocation.length} pillars</Text>
                </View>
                <Pressable>
                  <Text style={styles.rebalanceLink}>Rebalance</Text>
                </Pressable>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressBar}>
                {assetAllocation.map((alloc: any, idx: number) => (
                  <View key={idx} style={[styles.progressSegment, { width: `${alloc.percent}%`, backgroundColor: alloc.color || colors.primaryContainer }]} />
                ))}
              </View>

              {/* Bento Cards */}
              <View style={styles.bentoGrid}>
                {assetAllocation.map((alloc: any, idx: number) => (
                  <View key={idx} style={styles.bentoCard}>
                    <View style={styles.bentoHeader}>
                      <View style={[styles.bentoDot, { backgroundColor: alloc.color || colors.primaryContainer }]} />
                      <Text style={styles.bentoLabel} numberOfLines={1}>{alloc.label}</Text>
                    </View>
                    <View>
                      <Text style={styles.bentoValue}>{getAmount(alloc.amount)}</Text>
                      <Text style={[styles.bentoPercent, { color: alloc.color || colors.surfaceTint }]}>{alloc.percent}% Allocation</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Investment Holdings List Grouped */}
          <View style={styles.holdingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Holdings</Text>
              <Text style={styles.sectionMeta}>{holdings.length} Active Positions</Text>
            </View>

            {holdings.length === 0 ? (
               <Text style={{color: colors.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginVertical: 30}}>No holdings found.</Text>
            ) : (
              holdings.map((holding: any, idx: number) => (
                <Pressable key={idx} style={styles.holdingItem}>
                  <View style={styles.holdingLeft}>
                    <Text style={styles.holdingName}>{holding.security_name || holding.symbol}</Text>
                    <View style={styles.holdingMetaRow}>
                      <Text style={styles.holdingMetaText}>{holding.asset_class || 'Stock'}</Text>
                      <View style={styles.dotSeparator} />
                      <Text style={styles.holdingMetaText}>{holding.current_quantity} Qty</Text>
                    </View>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={styles.holdingValue}>{getAmount(holding.current_value)}</Text>
                    <Text style={[styles.holdingGain, { color: holding.unrealized_pnl >= 0 ? colors.primary : colors.error }]}>
                      {holding.unrealized_pnl > 0 ? '+' : ''}{getPercent(holding.unrealized_pnl_percent)}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
          
          <View style={{ height: 100 }} />
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
  holdingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.outlineVariant },
  holdingLeft: { flex: 1, paddingRight: 12 },
  holdingName: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: colors.onSurface, marginBottom: 6 },
  holdingMetaRow: { flexDirection: 'row', alignItems: 'center' },
  holdingMetaText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, marginHorizontal: 8 },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: colors.onSurface, marginBottom: 4 },
  holdingGain: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
