import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { transactionsApi } from '../../../src/api/transactions';
import { accountsApi } from '../../../src/api/accounts';
import { categoriesApi } from '../../../src/api/misc';
import { TransactionRow, Transaction } from '../../../src/components/transactions/TransactionRow';
import { FilterBar, TYPE_FILTERS } from '../../../src/components/transactions/FilterBar';
import { SkeletonRow } from '../../../src/components/ui/Skeleton';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { toISODateString } from '../../../src/utils/date';

const PAGE_SIZE = 25;

export default function TransactionsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['transactions', typeFilter],
    queryFn: ({ pageParam = 1 }) =>
      transactionsApi.getAll({
        page: pageParam,
        limit: PAGE_SIZE,
        ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
      }),
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.pagination?.total ?? 0;
      const fetched = allPages.flatMap((p) => p?.data?.transactions ?? []).length;
      return fetched < total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const { data: accountsData } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.getAll });
  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.getAll });

  // Form removed to Quick Add route

  const allTxs: Transaction[] = (data?.pages ?? []).flatMap(
    (p) => p?.data?.transactions ?? []
  );

  const accounts = accountsData?.data ?? [];
  const categories = categoriesData?.data ?? [];

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        transaction={item}
        onPress={() => router.push(`/(app)/transactions/${item.id}`)}
      />
    ),
    [router]
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return <SkeletonRow />;
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyBox}>
        <MaterialCommunityIcons name="format-list-bulleted" size={48} color={Colors.onSurfaceSubtle} />
        <Text style={styles.emptyTitle}>No transactions</Text>
        <Text style={styles.emptySubText}>
          {typeFilter !== 'all' ? `No ${typeFilter.toLowerCase()} transactions found` : 'Add your first transaction'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>

      {/* Filter Bar */}
      <FilterBar filters={TYPE_FILTERS} selectedKey={typeFilter} onSelect={setTypeFilter} />

      {/* Transaction List */}
      <FlatList
        data={allTxs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.secondary} />
        }
        contentContainerStyle={allTxs.length === 0 ? styles.emptyContent : undefined}
        ItemSeparatorComponent={() => null}
        style={styles.list}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.layoutMargin,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  emptyContent: { flex: 1 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyTitle: { ...Typography.headlineSm, color: Colors.onSurfaceMuted },
  emptySubText: { ...Typography.bodySm, color: Colors.onSurfaceSubtle, textAlign: 'center' },

  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.surface },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.layoutMargin,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { ...Typography.headlineMd, color: Colors.onSurface },
  modalContent: { padding: Spacing.layoutMargin, gap: Spacing.md, paddingBottom: 40 },
  typeToggle: { flexDirection: 'row', gap: Spacing.sm },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Spacing.buttonRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeBtnExpense: { backgroundColor: Colors.dangerBg, borderColor: Colors.danger },
  typeBtnIncome: { backgroundColor: Colors.successBg, borderColor: Colors.success },
  typeBtnLabel: { ...Typography.labelMd, color: Colors.onSurfaceMuted },
  typeBtnLabelActive: { color: Colors.onSurface, fontFamily: 'Inter_700Bold' },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: { ...Typography.labelMd, color: Colors.onSurface },
  pillRow: { gap: Spacing.sm, paddingVertical: 4 },
  selPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Spacing.pillRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  selPillText: { ...Typography.labelMd, color: Colors.onSurfaceMuted },
  selPillTextActive: { color: Colors.onPrimary },
  saveBtn: { marginTop: Spacing.sm },
});
