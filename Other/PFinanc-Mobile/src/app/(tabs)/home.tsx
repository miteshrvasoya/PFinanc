/**
 * HomeScreen — Matches Stitch "Home - Animated Floating Navigation" design.
 *
 * Sections:
 * 1. TopAppBar (avatar, greeting, household selector, notifications badge)
 * 2. Net Worth Card (₹12,45,000 + badge + Assets/Liabilities grid)
 * 3. Cash Flow Card (Income / Expense / Saved 3-column)
 * 4. SMS Alert Banner (3 transactions need review → Review Now)
 * 5. Accounts section
 * 6. Recent Activity section
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, Shadows } from '../../theme';
import TopAppBar from '../../components/navigation/TopAppBar';
import { formatINR } from '../../utils/currency';
import {
  NET_WORTH,
  CASH_FLOW,
  ACCOUNTS,
  TRANSACTIONS,
} from '../../services/financialService';

export default function HomeScreen() {
  const router = useRouter();
  const pendingCount = TRANSACTIONS.filter(t => t.status === 'pending_review').length;
  const recentTx = TRANSACTIONS.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sticky Header */}
      <TopAppBar
        greeting="Good morning 👋"
        householdName="Vasoya Family"
        notificationCount={3}
        onNotificationsPress={() => router.push('/(tabs)/more')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section 1: Net Worth ── */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.sectionLabel}>NET WORTH</Text>
            <View style={styles.changeBadge}>
              <Ionicons name="trending-up" size={13} color="#00492c" />
              <Text style={styles.changeBadgeText}>+{NET_WORTH.changePercent}%</Text>
            </View>
          </View>
          <Text style={styles.netWorthAmount}>{formatINR(NET_WORTH.totalNetWorthPaise)}</Text>
          <Text style={styles.netWorthSub}>Updated {NET_WORTH.updatedMinutesAgo} minutes ago</Text>

          <View style={styles.divider} />
          <View style={styles.metricsGrid}>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Assets</Text>
              <Text style={styles.metricValue}>{formatINR(NET_WORTH.assetsPaise)}</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Liabilities</Text>
              <Text style={[styles.metricValue, { color: Colors.signalRed }]}>
                {formatINR(NET_WORTH.liabilitiesPaise)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Section 2: Cash Flow ── */}
        <View style={[styles.card, { padding: Spacing.md }]}>
          <View style={styles.cashFlowHeader}>
            <View style={styles.cashFlowTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.cashFlowTitle}>Cash Flow</Text>
            </View>
            <Text style={styles.cashFlowPeriod}>This Month</Text>
          </View>
          <View style={styles.cashFlowGrid}>
            <View style={styles.cashMetric}>
              <Text style={styles.cashMetricLabel}>Money received</Text>
              <Text style={[styles.cashMetricValue, { color: Colors.incomeGreen }]}>
                {formatINR(CASH_FLOW.incomePaise, true)}
              </Text>
            </View>
            <View style={styles.cashMetric}>
              <Text style={styles.cashMetricLabel}>Money spent</Text>
              <Text style={styles.cashMetricValue}>{formatINR(CASH_FLOW.expensePaise)}</Text>
            </View>
            <View style={styles.cashMetric}>
              <Text style={styles.cashMetricLabel}>Saved</Text>
              <Text style={[styles.cashMetricValue, { color: Colors.primary }]}>
                {formatINR(CASH_FLOW.savedPaise)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Section 3: SMS Alert Banner ── */}
        {pendingCount > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertStripe} />
            <View style={styles.alertContent}>
              <View style={styles.alertIconWrap}>
                <Ionicons name="chatbubble" size={20} color={Colors.primary} />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>{pendingCount} transactions need review</Text>
                <Text style={styles.alertSub}>Detected automatically from SMS alerts</Text>
                <Pressable
                  style={styles.reviewBtn}
                  onPress={() => router.push('/sms-review')}
                >
                  <Text style={styles.reviewBtnText}>Review Now</Text>
                  <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ── Section 4: Accounts ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Accounts</Text>
            <Pressable
              style={styles.viewAllBtn}
              onPress={() => router.push('/(tabs)/transactions')}
            >
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
            </Pressable>
          </View>

          <View style={styles.accountsList}>
            {ACCOUNTS.map((acc) => (
              <Pressable key={acc.id} style={styles.accountItem}>
                <View style={styles.accountIconWrap}>
                  <Ionicons name="business-outline" size={20} color={Colors.primary} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{acc.name}</Text>
                  <Text style={styles.accountMeta}>
                    {acc.maskedNumber ?? acc.institution}
                  </Text>
                </View>
                <View style={styles.accountBalance}>
                  <Text style={styles.accountAmount}>{formatINR(acc.balancePaise)}</Text>
                  <Text style={styles.accountType}>{acc.type === 'salary' ? 'Salary Acct' : acc.type === 'cash' ? 'Household' : 'Savings'}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Section 5: Recent Activity ── */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable
              style={styles.viewAllBtn}
              onPress={() => router.push('/(tabs)/transactions')}
            >
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
            </Pressable>
          </View>

          <View style={styles.activityCard}>
            {recentTx.map((tx, idx) => {
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              const iconBg = isIncome ? Colors.incomeGreenBg : isTransfer ? '#EFF6FF' : '#FFF7ED';
              const iconColor = isIncome ? Colors.incomeGreen : isTransfer ? Colors.primaryContainer : '#EA580C';
              const amtColor = isIncome ? Colors.incomeGreen : Colors.onSurface;
              const amtStr = isIncome
                ? formatINR(Math.abs(tx.amountPaise), true)
                : formatINR(tx.amountPaise);

              return (
                <Pressable
                  key={tx.id}
                  style={[styles.activityRow, idx < recentTx.length - 1 && styles.activityRowBorder]}
                >
                  <View style={[styles.activityIcon, { backgroundColor: iconBg }]}>
                    <Ionicons name={
                      isIncome ? 'briefcase-outline' :
                      isTransfer ? 'swap-horizontal' :
                      'restaurant-outline'
                    } size={20} color={iconColor} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityMerchant}>{tx.merchant}</Text>
                    <Text style={styles.activityMeta}>
                      {tx.category} • {isIncome ? 'Yesterday' : 'Today'}
                    </Text>
                  </View>
                  <Text style={[styles.activityAmount, { color: amtColor }]}>{amtStr}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceCanvas },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.marginMobile, gap: Spacing.md },

  // Cards
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionLabel: { fontSize: 11, color: Colors.secondary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    backgroundColor: '#E7F5EE',
  },
  changeBadgeText: { fontSize: 11, fontWeight: '600', color: '#00492c' },
  netWorthAmount: { fontSize: 32, fontWeight: '700', color: Colors.primary, letterSpacing: -0.6, marginTop: 4 },
  netWorthSub: { fontSize: 13, color: Colors.secondary, marginTop: 2, marginBottom: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.surfaceSubtle, marginBottom: Spacing.md },
  metricsGrid: { flexDirection: 'row', gap: Spacing.sm },
  metricCell: {
    flex: 1,
    backgroundColor: 'rgba(242,244,245,0.7)',
    borderRadius: Radii.lg,
    padding: Spacing.sm,
  },
  metricLabel: { fontSize: 11, color: Colors.secondary, marginBottom: 2 },
  metricValue: { fontSize: 18, fontWeight: '600', color: Colors.onSurface, letterSpacing: -0.2 },

  // Cash flow
  cashFlowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceSubtle,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cashFlowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cashFlowTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurface },
  cashFlowPeriod: { fontSize: 13, color: Colors.secondary },
  cashFlowGrid: { flexDirection: 'row', gap: 8 },
  cashMetric: {
    flex: 1,
    padding: 8,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: 'rgba(248,250,251,0.5)',
  },
  cashMetricLabel: { fontSize: 10, color: Colors.secondary, marginBottom: 4 },
  cashMetricValue: { fontSize: 13, fontWeight: '700', color: Colors.onSurface },

  // Alert
  alertCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,33,110,0.2)',
    overflow: 'hidden',
    ...Shadows.sm,
  },
  alertStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: Colors.primary },
  alertContent: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, paddingLeft: Spacing.md + 6 },
  alertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  alertText: { flex: 1 },
  alertTitle: { fontSize: 16, fontWeight: '700', color: Colors.onSurface },
  alertSub: { fontSize: 13, color: Colors.secondary, marginTop: 2 },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.lg,
  },
  reviewBtnText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },

  // Sections
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurface },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Accounts
  accountsList: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceSubtle,
    gap: 12,
  },
  accountIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '600', color: Colors.onSurface },
  accountMeta: { fontSize: 11, color: Colors.secondary, marginTop: 2 },
  accountBalance: { alignItems: 'flex-end' },
  accountAmount: { fontSize: 18, fontWeight: '600', color: Colors.onSurface },
  accountType: { fontSize: 11, color: Colors.secondary, marginTop: 1 },

  // Activity
  activityCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceSubtle,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityInfo: { flex: 1 },
  activityMerchant: { fontSize: 16, fontWeight: '600', color: Colors.onSurface },
  activityMeta: { fontSize: 13, color: Colors.secondary, marginTop: 1 },
  activityAmount: { fontSize: 18, fontWeight: '600' },
});
