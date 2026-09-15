import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { dashboardApi } from '../../src/api/dashboard';
import { householdsApi } from '../../src/api/misc';
import { NetWorthCard } from '../../src/components/dashboard/NetWorthCard';
import { FamilyMemberChips } from '../../src/components/dashboard/FamilyMemberChips';
import { TransactionRow, Transaction } from '../../src/components/transactions/TransactionRow';
import { AccountCard } from '../../src/components/accounts/AccountCard';
import { SkeletonCard, SkeletonRow } from '../../src/components/ui/Skeleton';
import { useAuthStore } from '../../src/store/authStore';
import { Colors, Spacing, Typography } from '../../src/theme';
import { formatINR } from '../../src/utils/currency';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const { user, household } = useAuthStore();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [view, setView] = useState<'household' | 'personal'>('household');

  const {
    data: dashData,
    isLoading: dashLoading,
    refetch: refetchDash,
    isRefetching,
  } = useQuery({
    queryKey: ['dashboard', view],
    queryFn: () => dashboardApi.getSummary(view),
    enabled: true,
  });

  const { data: membersData } = useQuery({
    queryKey: ['household-members', household?.id],
    queryFn: () => householdsApi.getById(household!.id),
    enabled: !!household?.id,
  });

  const dash = dashData?.data;
  const members = membersData?.data?.members ?? [];
  const recentTxs: Transaction[] = dash?.recent_transactions ?? [];
  const accounts = dash?.accounts ?? [];

  const handleRefresh = () => refetchDash();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={Colors.secondary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] ?? 'User'} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.viewToggle}
              onPress={() => setView(v => v === 'household' ? 'personal' : 'household')}
            >
              <MaterialCommunityIcons
                name={view === 'household' ? 'home-city' : 'account'}
                size={16}
                color={Colors.onSurface}
              />
              <Text style={styles.viewToggleText}>{view === 'household' ? 'Household' : 'Personal'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Net Worth Card */}
        {dashLoading ? (
          <View style={styles.sectionPadding}>
            <SkeletonCard />
          </View>
        ) : (
          <NetWorthCard
            totalNetWorth={dash?.net_worth ?? 0}
            totalAssets={dash?.total_assets ?? 0}
            totalLiabilities={dash?.total_liabilities ?? 0}
            monthlyChange={dash?.monthly_change}
            monthlyChangePercent={dash?.monthly_change_percent}
            householdName={view === 'household' ? household?.name : user?.name}
          />
        )}

        {/* This Month Summary */}
        <View style={styles.section}>
          <View style={styles.monthRow}>
            <View style={styles.monthCard}>
              <MaterialCommunityIcons name="arrow-down-circle" size={18} color={Colors.success} />
              <Text style={styles.monthLabel}>Income</Text>
              <Text style={[styles.monthValue, { color: Colors.success }]}>
                {formatINR(dash?.this_month?.income ?? 0, { compact: true })}
              </Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthCard}>
              <MaterialCommunityIcons name="arrow-up-circle" size={18} color={Colors.danger} />
              <Text style={styles.monthLabel}>Expense</Text>
              <Text style={[styles.monthValue, { color: Colors.danger }]}>
                {formatINR(dash?.this_month?.expenses ?? 0, { compact: true })}
              </Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthCard}>
              <MaterialCommunityIcons name="swap-horizontal" size={18} color={Colors.transfer} />
              <Text style={styles.monthLabel}>Savings</Text>
              <Text style={[styles.monthValue, { color: Colors.secondary }]}>
                {formatINR((dash?.this_month?.income ?? 0) - (dash?.this_month?.expenses ?? 0), { compact: true })}
              </Text>
            </View>
          </View>
        </View>

        {/* Family Member Filter */}
        {members.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Family Members</Text>
            <FamilyMemberChips
              members={members}
              selectedId={selectedMemberId}
              onSelect={setSelectedMemberId}
            />
          </View>
        )}

        {/* Accounts Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Accounts</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/accounts/')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountsScroll}
          >
            {dashLoading
              ? [1, 2].map((i) => <SkeletonCard key={i} style={{ width: 170 }} />)
              : accounts.slice(0, 6).map((acc: any) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    onPress={() => router.push(`/(app)/accounts/${acc.id}`)}
                  />
                ))
            }
          </ScrollView>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/transactions/')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.txList}>
            {dashLoading
              ? [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)
              : recentTxs.length === 0
              ? (
                <View style={styles.emptyBox}>
                  <MaterialCommunityIcons name="bank-transfer" size={40} color={Colors.onSurfaceSubtle} />
                  <Text style={styles.emptyText}>No recent transactions</Text>
                  <Text style={styles.emptySubText}>Add your first transaction to get started</Text>
                </View>
              )
              : recentTxs.slice(0, 8).map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    onPress={() => router.push(`/(app)/transactions/${tx.id}`)}
                  />
                ))
            }
          </View>
        </View>
      </ScrollView>

      {/* FAB — Quick Add Transaction */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/transactions/')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={28} color={Colors.onPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 100, gap: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.layoutMargin,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  greeting: { ...Typography.bodySm, color: Colors.onSurfaceMuted },
  userName: { ...Typography.headlineMd, color: Colors.onSurface, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Spacing.pillRadius,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewToggleText: { ...Typography.labelMd, color: Colors.onSurface },
  sectionPadding: { paddingHorizontal: Spacing.layoutMargin },
  section: { marginTop: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.layoutMargin,
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  seeAll: { ...Typography.labelMd, color: Colors.secondary },
  monthRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.layoutMargin,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  monthCard: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: 3 },
  monthDivider: { width: 1, backgroundColor: Colors.border },
  monthLabel: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  monthValue: { ...Typography.numericData, fontVariant: ['tabular-nums'] },
  accountsScroll: { paddingHorizontal: Spacing.layoutMargin, gap: Spacing.md },
  txList: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.layoutMargin,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { ...Typography.headlineSm, color: Colors.onSurfaceMuted },
  emptySubText: { ...Typography.bodySm, color: Colors.onSurfaceSubtle, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: Spacing.layoutMargin,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
