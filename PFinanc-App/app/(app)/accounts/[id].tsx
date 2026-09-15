import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { accountsApi } from '../../../src/api/accounts';
import { transactionsApi } from '../../../src/api/transactions';
import { TransactionRow } from '../../../src/components/transactions/TransactionRow';
import { SkeletonCard, SkeletonRow } from '../../../src/components/ui/Skeleton';
import { Badge } from '../../../src/components/ui';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { formatINR } from '../../../src/utils/currency';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  SAVINGS: 'bank', CURRENT: 'bank-outline', CREDIT_CARD: 'credit-card',
  INVESTMENT: 'chart-line', CASH: 'cash', WALLET: 'wallet',
};
const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  SAVINGS: '#3B82F6', CURRENT: '#6366F1', CREDIT_CARD: '#EF4444',
  INVESTMENT: '#10B981', CASH: '#F59E0B', WALLET: '#8B5CF6',
};

export default function AccountDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: accData, isLoading: accLoading } = useQuery({
    queryKey: ['account', id],
    queryFn: () => accountsApi.getById(id!),
    enabled: !!id,
  });

  const { data: txData, isLoading: txLoading, refetch, isRefetching } = useQuery({
    queryKey: ['account-transactions', id],
    queryFn: () => transactionsApi.getAll({ account_id: id, limit: 50 }),
    enabled: !!id,
  });

  const account = accData?.data;
  const transactions = txData?.data?.transactions ?? [];
  const icon = account ? (ACCOUNT_TYPE_ICONS[account.account_type] ?? 'bank') : 'bank';
  const iconColor = account ? (ACCOUNT_TYPE_COLORS[account.account_type] ?? Colors.secondary) : Colors.secondary;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {accLoading ? 'Account' : account?.name ?? 'Account'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.secondary} />
        }
      >
        {/* Account Card */}
        {accLoading ? (
          <SkeletonCard style={{ height: 160 }} />
        ) : account ? (
          <View style={styles.acctCard}>
            <View style={styles.acctCardTop}>
              <View style={[styles.acctIcon, { backgroundColor: iconColor + '22' }]}>
                <MaterialCommunityIcons name={icon as any} size={26} color={iconColor} />
              </View>
              <View style={styles.acctCardInfo}>
                <Text style={styles.acctName}>{account.name}</Text>
                <Text style={styles.acctMeta}>
                  {account.account_type.replace('_', ' ')}
                  {account.institution_name ? ` · ${account.institution_name}` : ''}
                  {account.account_number_last4 ? ` ····${account.account_number_last4}` : ''}
                </Text>
                {account.member_name ? (
                  <Badge label={account.member_name} variant="neutral" size="sm" style={{ marginTop: 4 }} />
                ) : null}
              </View>
            </View>

            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={[
                  styles.balanceValue,
                  { color: parseFloat(account.balance) < 0 ? Colors.danger : Colors.onSurface }
                ]}>
                  {formatINR(account.balance)}
                </Text>
              </View>
              {account.credit_limit ? (
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Credit Limit</Text>
                  <Text style={styles.balanceValue}>{formatINR(account.credit_limit)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Transactions Section */}
        <Text style={styles.sectionTitle}>Statement</Text>
        <View style={styles.txList}>
          {txLoading
            ? [1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)
            : transactions.length === 0
            ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="bank-transfer" size={40} color={Colors.onSurfaceSubtle} />
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            )
            : transactions.map((tx: any) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                onPress={() => router.push(`/(app)/transactions/${tx.id}`)}
              />
            ))
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.layoutMargin,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { ...Typography.headlineSm, color: Colors.onPrimary, flex: 1, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { padding: Spacing.layoutMargin, gap: Spacing.base, paddingBottom: 32 },
  acctCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.base,
  },
  acctCardTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  acctIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  acctCardInfo: { flex: 1, gap: 3 },
  acctName: { ...Typography.headlineSm, color: Colors.onSurface },
  acctMeta: { ...Typography.bodySm, color: Colors.onSurfaceMuted },
  balanceRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  balanceItem: { gap: 3 },
  balanceLabel: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  balanceValue: {
    fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.44,
    fontVariant: ['tabular-nums'], color: Colors.onSurface,
  },
  sectionTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  txList: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceMuted },
});
