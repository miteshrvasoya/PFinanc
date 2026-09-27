import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { dashboardApi } from '../../src/api/dashboard';
import { householdsApi } from '../../src/api/misc';
import { FamilyMemberChips } from '../../src/components/dashboard/FamilyMemberChips';
import { TransactionRow, Transaction } from '../../src/components/transactions/TransactionRow';
import { AccountCard } from '../../src/components/accounts/AccountCard';
import { SkeletonCard, SkeletonRow } from '../../src/components/ui/Skeleton';
import { useAuthStore } from '../../src/store/authStore';
import { Colors, Spacing, Typography } from '../../src/theme';
import { formatINR, formatPercent } from '../../src/utils/currency';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

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

  const netWorth = dash?.net_worth ?? 0;
  const assets = dash?.total_assets ?? 0;
  const liabilities = dash?.total_liabilities ?? 0;
  const isPositiveChange = (dash?.monthly_change ?? 0) >= 0;

  const income = dash?.this_month?.income ?? 0;
  const expenses = dash?.this_month?.expenses ?? 0;
  const savings = income - expenses;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Animated Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] ?? 'User'} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(app)/more/')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="menu" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Hero Section: Net Worth */}
        {dashLoading ? (
          <View style={styles.sectionPadding}>
            <SkeletonCard style={{ height: 200 }} />
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.sectionPadding}>
            <LinearGradient
              colors={['#1E3A8A', '#312E81']} // Deep Blue to Indigo gradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroTop}>
                <Text style={styles.heroLabel}>{view === 'household' ? household?.name : 'Personal'}</Text>
                <TouchableOpacity
                  style={styles.heroToggle}
                  onPress={() => setView(v => v === 'household' ? 'personal' : 'household')}
                >
                  <MaterialCommunityIcons
                    name={view === 'household' ? 'home-city' : 'account'}
                    size={14}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.netWorthAmount}>{formatINR(netWorth)}</Text>

              <View style={styles.heroBottomRow}>
                <View style={styles.changeBadge}>
                  <MaterialCommunityIcons
                    name={isPositiveChange ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={isPositiveChange ? '#34D399' : '#F87171'} // emerald-400 : red-400
                  />
                  <Text style={[styles.changeText, { color: isPositiveChange ? '#34D399' : '#F87171' }]}>
                    {formatPercent(Math.abs(dash?.monthly_change_percent ?? 0))}
                  </Text>
                </View>
                <Text style={styles.heroSubText}>vs last month</Text>
              </View>

              <View style={styles.assetRow}>
                <View style={styles.assetCol}>
                  <Text style={styles.assetLabel}>Assets</Text>
                  <Text style={styles.assetValuePos}>{formatINR(assets, { compact: true })}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.assetCol}>
                  <Text style={styles.assetLabel}>Liabilities</Text>
                  <Text style={styles.assetValueNeg}>{formatINR(liabilities, { compact: true })}</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Cash Flow */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionPadding]}>This Month</Text>
          <View style={styles.cashFlowCard}>
            <View style={styles.cfRow}>
              <View style={styles.cfItem}>
                <View style={[styles.cfDot, { backgroundColor: Colors.success }]} />
                <View>
                  <Text style={styles.cfLabel}>Income</Text>
                  <Text style={styles.cfValue}>{formatINR(income, { compact: true })}</Text>
                </View>
              </View>
              <View style={styles.cfItem}>
                <View style={[styles.cfDot, { backgroundColor: Colors.danger }]} />
                <View>
                  <Text style={styles.cfLabel}>Expenses</Text>
                  <Text style={styles.cfValue}>{formatINR(expenses, { compact: true })}</Text>
                </View>
              </View>
              <View style={styles.cfItem}>
                <View style={[styles.cfDot, { backgroundColor: Colors.secondary }]} />
                <View>
                  <Text style={styles.cfLabel}>Savings</Text>
                  <Text style={styles.cfValue}>{formatINR(savings, { compact: true })}</Text>
                </View>
              </View>
            </View>
            {/* Simple progress bar representation */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min((expenses / (income || 1)) * 100, 100)}%` }]} />
            </View>
          </View>
        </Animated.View>

        {/* Family Member Filter */}
        {members.length > 1 && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionPadding]}>Family</Text>
            <FamilyMemberChips
              members={members}
              selectedId={selectedMemberId}
              onSelect={setSelectedMemberId}
            />
          </Animated.View>
        )}

        {/* Accounts Overview */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Accounts</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/accounts/')}>
              <Text style={styles.seeAll}>View all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountsScroll}
          >
            {dashLoading
              ? [1, 2].map((i) => <SkeletonCard key={i} style={{ width: 160 }} />)
              : accounts.slice(0, 6).map((acc: any) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    onPress={() => router.push(`/(app)/accounts/${acc.id}`)}
                  />
                ))
            }
          </ScrollView>
        </Animated.View>

        {/* Investments Placeholder */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Investments</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/investments/')}>
              <Text style={styles.seeAll}>Portfolio</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.invCard}>
            <View style={styles.invRow}>
              <View style={styles.invCol}>
                <Text style={styles.invLabel}>Total Portfolio</Text>
                <Text style={styles.invValue}>₹0</Text>
              </View>
              <View style={styles.invColRight}>
                <Text style={styles.invLabel}>Today</Text>
                <Text style={styles.invSubValue}>--</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Recent Transactions */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/transactions/')}>
              <Text style={styles.seeAll}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.txList}>
            {dashLoading
              ? [1, 2, 3].map((i) => <SkeletonRow key={i} />)
              : recentTxs.length === 0
              ? (
                <View style={styles.emptyBox}>
                  <MaterialCommunityIcons name="text-box-search-outline" size={40} color={Colors.onSurfaceSubtle} />
                  <Text style={styles.emptyText}>No recent activity</Text>
                </View>
              )
              : recentTxs.slice(0, 5).map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    onPress={() => router.push(`/(app)/transactions/${tx.id}`)}
                  />
                ))
            }
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 120, gap: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.layoutMargin,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  greeting: { ...Typography.bodySm, color: Colors.onSurfaceMuted },
  userName: { ...Typography.headlineMd, color: Colors.onSurface, marginTop: 2, fontFamily: 'Inter_700Bold' },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionPadding: { paddingHorizontal: Spacing.layoutMargin },
  section: { marginTop: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.layoutMargin,
    marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold' },
  seeAll: { ...Typography.labelMd, color: Colors.secondary },
  
  // Hero
  heroCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: { ...Typography.labelMd, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  heroToggle: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 6,
    borderRadius: 8,
  },
  netWorthAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 38,
    color: '#FFF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  changeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  heroSubText: { ...Typography.labelSm, color: 'rgba(255,255,255,0.6)', marginLeft: 8 },
  assetRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 12,
  },
  assetCol: { flex: 1, alignItems: 'center', gap: 2 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  assetLabel: { ...Typography.labelSm, color: 'rgba(255,255,255,0.6)' },
  assetValuePos: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#34D399' },
  assetValueNeg: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#F87171' },

  // Cash Flow
  cashFlowCard: {
    marginHorizontal: Spacing.layoutMargin,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cfRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  cfItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cfDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  cfLabel: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  cfValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.onSurface, marginTop: 2 },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.successBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.danger,
    borderRadius: 3,
  },

  // Accounts
  accountsScroll: { paddingHorizontal: Spacing.layoutMargin, gap: Spacing.md },
  
  // Investments
  invCard: {
    marginHorizontal: Spacing.layoutMargin,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  invRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invCol: { gap: 4 },
  invColRight: { alignItems: 'flex-end', gap: 4 },
  invLabel: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  invValue: { fontFamily: 'Inter_600SemiBold', fontSize: 20, color: Colors.onSurface },
  invSubValue: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.onSurfaceSubtle },

  // Transactions
  txList: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.layoutMargin,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceMuted },
});
