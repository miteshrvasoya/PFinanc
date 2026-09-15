import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { transactionsApi } from '../../../src/api/transactions';
import { accountsApi } from '../../../src/api/accounts';
import { TransactionRow } from '../../../src/components/transactions/TransactionRow';
import { SkeletonRow, SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Badge } from '../../../src/components/ui';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { formatINR } from '../../../src/utils/currency';
import { formatDate } from '../../../src/utils/date';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionsApi.getAll({ id }),
    enabled: !!id,
  });

  const tx = data?.data?.transactions?.[0] ?? data?.data;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonCard />
          {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!tx) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.onSurfaceSubtle} />
          <Text style={styles.emptyText}>Transaction not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isIncome = tx.type === 'INCOME';
  const isTransfer = tx.type === 'TRANSFER';
  const amountColor = isIncome ? Colors.success : isTransfer ? Colors.transfer : Colors.onSurface;

  const statusVariant: any = {
    CONFIRMED: 'success',
    PENDING: 'warning',
    REJECTED: 'danger',
    VOID: 'neutral',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount Hero */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>{isIncome ? 'Credit' : isTransfer ? 'Transfer' : 'Debit'}</Text>
          <Text style={[styles.amount, { color: amountColor }]}>
            {isIncome ? '+' : isTransfer ? '' : '-'}{formatINR(Math.abs(tx.amount ?? 0))}
          </Text>
          <Text style={styles.description}>{tx.description}</Text>
          <Badge
            label={tx.status ?? 'CONFIRMED'}
            variant={statusVariant[tx.status] ?? 'neutral'}
            style={{ alignSelf: 'center', marginTop: 8 }}
          />
        </View>

        {/* Details Grid */}
        <View style={styles.detailsCard}>
          {[
            { label: 'Date', value: formatDate(tx.transaction_date, 'long') },
            { label: 'Type', value: tx.type },
            { label: 'Account', value: tx.account_name ?? '—' },
            { label: 'Category', value: tx.category_name ?? '—' },
            { label: 'Member', value: tx.member_name ?? '—' },
            { label: 'Notes', value: tx.notes ?? '—' },
          ].map(({ label, value }) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
            </View>
          ))}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  content: { padding: Spacing.layoutMargin, gap: Spacing.base },
  amountCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  amountLabel: { ...Typography.labelMd, color: Colors.onSurfaceMuted, textTransform: 'uppercase', letterSpacing: 1 },
  amount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.72,
    fontVariant: ['tabular-nums'],
  },
  description: { ...Typography.bodyLg, color: Colors.onSurface, textAlign: 'center' },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.base,
  },
  detailLabel: { ...Typography.labelMd, color: Colors.onSurfaceMuted, flex: 1 },
  detailValue: { ...Typography.bodyMd, color: Colors.onSurface, flex: 2, textAlign: 'right' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { ...Typography.headlineSm, color: Colors.onSurfaceMuted },
});
