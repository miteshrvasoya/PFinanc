/**
 * InvestmentsScreen — Matches Stitch "Investments & Portfolio" design.
 *
 * Sections:
 * - TopAppBar compact ("Vasoya Family" / "Household Portfolio")
 * - Page title + Add button
 * - Portfolio Summary Card (total value, gain badge, Total Invested / Unrealized Gain)
 * - Asset Allocation segmented bar with legend chips
 * - Holdings & Envelopes (Stocks, Mutual Funds SIP, EPF & PPF)
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, Shadows } from '../../theme';
import TopAppBar from '../../components/navigation/TopAppBar';
import { formatINR } from '../../utils/currency';
import { INVESTMENTS } from '../../services/financialService';

const ALLOCATION_COLORS = ['#0033a0', '#128A58', '#5f5e5e'];

export default function InvestmentsScreen() {
  const totalValue = INVESTMENTS.reduce((s, i) => s + i.totalValuePaise, 0);
  const totalInvested = INVESTMENTS.reduce((s, i) => s + i.totalInvestedPaise, 0);
  const totalGain = totalValue - totalInvested;
  const gainPercent = ((totalGain / totalInvested) * 100).toFixed(1);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar compact title="Vasoya Family" subtitle="Household Portfolio" notificationCount={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title + Add Button */}
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.pageTitle}>Investments</Text>
            <Text style={styles.pageSub}>Discipline over speculation • Updated today</Text>
          </View>
          <Pressable style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {/* Portfolio Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TOTAL PORTFOLIO VALUE</Text>
          <View style={styles.portfolioValueRow}>
            <Text style={styles.portfolioAmount}>{formatINR(totalValue)}</Text>
            <View style={styles.gainBadge}>
              <Ionicons name="trending-up" size={14} color={Colors.incomeGreen} />
              <Text style={styles.gainBadgeText}>
                +{formatINR(totalGain)} (+{gainPercent}%)
              </Text>
            </View>
          </View>

          {/* Secondary metrics */}
          <View style={styles.metricsRow}>
            <View>
              <Text style={styles.metricLabel}>Total Invested</Text>
              <Text style={styles.metricValue}>{formatINR(totalInvested)}</Text>
            </View>
            <View>
              <Text style={styles.metricLabel}>Unrealized Gain</Text>
              <Text style={[styles.metricValue, { color: Colors.incomeGreen }]}>+{formatINR(totalGain)}</Text>
            </View>
          </View>

          {/* Asset Allocation Bar */}
          <View style={styles.allocationSection}>
            <View style={styles.allocationHeader}>
              <Text style={styles.allocationLabel}>Asset Allocation</Text>
              <Text style={styles.allocationLabel}>Target Balanced</Text>
            </View>
            <View style={styles.allocationBar}>
              {INVESTMENTS.map((inv, i) => (
                <View
                  key={inv.id}
                  style={[
                    styles.allocationSegment,
                    { width: `${inv.allocationPercent}%`, backgroundColor: ALLOCATION_COLORS[i] },
                    i > 0 && { marginLeft: 2 },
                  ]}
                />
              ))}
            </View>
            <View style={styles.legendRow}>
              {INVESTMENTS.map((inv, i) => (
                <View key={inv.id} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: ALLOCATION_COLORS[i] }]} />
                  <Text style={styles.legendText}>
                    {inv.name.split(' ')[0]}{' '}
                    <Text style={styles.legendPercent}>{inv.allocationPercent}%</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Holdings & Envelopes */}
        <View style={styles.holdingsSection}>
          <View style={styles.holdingsHeader}>
            <Text style={styles.holdingsTitle}>Holdings & Envelopes</Text>
            <Text style={styles.holdingsSub}>3 active classes</Text>
          </View>

          {INVESTMENTS.map((inv, idx) => (
            <View key={inv.id} style={styles.holdingCard}>
              {/* Card Header */}
              <View style={styles.holdingCardHeader}>
                <View style={styles.holdingLeft}>
                  <View style={[styles.holdingIconWrap, { backgroundColor: inv.iconBg }]}>
                    <Ionicons name="bar-chart-outline" size={20} color={inv.iconColor} />
                  </View>
                  <View>
                    <Text style={styles.holdingName}>{inv.name}</Text>
                    <Text style={styles.holdingDesc}>{inv.description}</Text>
                  </View>
                </View>
                <View style={styles.holdingRight}>
                  <Text style={styles.holdingValue}>{formatINR(inv.totalValuePaise)}</Text>
                  {inv.gainPercent > 0 ? (
                    <View style={styles.holdingGainBadge}>
                      <Text style={styles.holdingGainText}>+{inv.gainPercent.toFixed(1)}%</Text>
                    </View>
                  ) : (
                    <View style={[styles.holdingGainBadge, { backgroundColor: Colors.surfaceSubtle }]}>
                      <Text style={[styles.holdingGainText, { color: Colors.secondary }]}>Safe, Guaranteed Return</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Holdings sub-rows */}
              {inv.holdings.length > 0 && (
                <View style={styles.holdingSubList}>
                  {inv.holdings.map((h, i) => (
                    <View key={h.id} style={[styles.holdingSub, i > 0 && styles.holdingSubBorder]}>
                      <View style={styles.holdingSubLeft}>
                        <Text style={styles.holdingSubName}>{h.name}</Text>
                        {h.quantity ? (
                          <Text style={styles.holdingSubMeta}>{h.quantity} {h.unit}</Text>
                        ) : (
                          <View style={styles.sipMetaRow}>
                            <Text style={styles.holdingSubMeta}>{formatINR(h.sipAmountPaise!)}/mo</Text>
                            <View style={styles.sipBadge}>
                              <Text style={styles.sipBadgeText}>{h.nextDate}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                      <View style={styles.holdingSubRight}>
                        {h.quantity ? (
                          <>
                            <Text style={styles.holdingSubValue}>{formatINR(h.currentValuePaise)}</Text>
                            <Text style={styles.holdingSubGain}>+{h.gainPercent.toFixed(1)}%</Text>
                          </>
                        ) : (
                          <View style={styles.activeRow}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activeText}>Active</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* EPF note */}
              {inv.id === 'epf-ppf' && (
                <View style={styles.epfNote}>
                  <Ionicons name="lock-closed" size={14} color={Colors.incomeGreen} />
                  <Text style={styles.epfNoteText}>
                    Sovereign guarantee with annual tax exemption compounding.
                  </Text>
                </View>
              )}

              {/* Card footer */}
              <View style={styles.cardFooter}>
                <Pressable style={styles.cardFooterLink}>
                  <Text style={styles.cardFooterText}>
                    {inv.id === 'stocks' ? 'View all stocks' : inv.id === 'mutual-funds' ? 'Manage SIPs' : 'View details'}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceCanvas },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.marginMobile, gap: Spacing.md },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, fontWeight: '700', color: Colors.primary, letterSpacing: -0.4 },
  pageSub: { fontSize: 13, color: Colors.secondary, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.lg,
    ...Shadows.sm,
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },

  // Portfolio card
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardLabel: { fontSize: 11, color: Colors.secondary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  portfolioValueRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  portfolioAmount: { fontSize: 32, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.6 },
  gainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: Colors.incomeGreenBg,
  },
  gainBadgeText: { fontSize: 13, fontWeight: '600', color: Colors.incomeGreen },
  metricsRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceSubtle,
  },
  metricLabel: { fontSize: 11, color: Colors.secondary, marginBottom: 2 },
  metricValue: { fontSize: 18, fontWeight: '600', color: Colors.onSurface },

  // Allocation
  allocationSection: { marginTop: Spacing.lg },
  allocationHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  allocationLabel: { fontSize: 11, color: Colors.secondary },
  allocationBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSubtle,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  allocationSegment: { height: '100%' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.onSurface },
  legendPercent: { fontWeight: '600' },

  // Holdings
  holdingsSection: { gap: 12 },
  holdingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  holdingsTitle: { fontSize: 20, fontWeight: '600', color: Colors.onSurface },
  holdingsSub: { fontSize: 11, color: Colors.secondary },

  holdingCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  holdingCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  holdingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  holdingIconWrap: { width: 36, height: 36, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  holdingName: { fontSize: 20, fontWeight: '600', color: Colors.onSurface },
  holdingDesc: { fontSize: 13, color: Colors.secondary, marginTop: 1 },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { fontSize: 18, fontWeight: '600', color: Colors.onSurface },
  holdingGainBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.incomeGreenBg,
  },
  holdingGainText: { fontSize: 11, fontWeight: '600', color: Colors.incomeGreen },

  holdingSubList: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceSubtle,
    gap: 12,
  },
  holdingSub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  holdingSubBorder: { paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.surfaceSubtle },
  holdingSubLeft: { flex: 1 },
  holdingSubName: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  holdingSubMeta: { fontSize: 11, color: Colors.secondary, marginTop: 2 },
  sipMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  sipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surfaceSubtle,
  },
  sipBadgeText: { fontSize: 10, color: Colors.secondary },
  holdingSubRight: { alignItems: 'flex-end' },
  holdingSubValue: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  holdingSubGain: { fontSize: 11, color: Colors.incomeGreen, marginTop: 1 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.incomeGreen },
  activeText: { fontSize: 11, color: Colors.incomeGreen, fontWeight: '500' },

  epfNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceSubtle,
  },
  epfNoteText: { flex: 1, fontSize: 11, color: Colors.secondary, lineHeight: 16 },

  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    alignItems: 'flex-end',
  },
  cardFooterLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardFooterText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
