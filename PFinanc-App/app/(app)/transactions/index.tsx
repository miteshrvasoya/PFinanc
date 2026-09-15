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
import { Button, Input } from '../../../src/components/ui';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { toISODateString } from '../../../src/utils/date';

const PAGE_SIZE = 25;

export default function TransactionsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add transaction form state
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    account_id: '',
    category_id: '',
    date: toISODateString(),
    notes: '',
  });

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

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => Alert.alert('Error', err.displayMessage ?? 'Failed to add transaction'),
  });

  const resetForm = () =>
    setForm({ description: '', amount: '', type: 'EXPENSE', account_id: '', category_id: '', date: toISODateString(), notes: '' });

  const handleAddTransaction = () => {
    if (!form.description.trim() || !form.amount || !form.account_id) {
      Alert.alert('Required Fields', 'Please fill in description, amount, and account.');
      return;
    }
    createMutation.mutate({
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      type: form.type,
      account_id: form.account_id,
      category_id: form.category_id || undefined,
      transaction_date: form.date,
      notes: form.notes.trim() || undefined,
      status: 'CONFIRMED',
    });
  };

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
        <Text style={styles.title}>Ledger</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <MaterialCommunityIcons name="plus" size={20} color={Colors.onPrimary} />
        </TouchableOpacity>
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

      {/* Add Transaction Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Transaction</Text>
            <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Type Toggle */}
              <View style={styles.typeToggle}>
                {(['EXPENSE', 'INCOME'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, form.type === t && (t === 'INCOME' ? styles.typeBtnIncome : styles.typeBtnExpense)]}
                    onPress={() => setForm((f) => ({ ...f, type: t }))}
                  >
                    <Text style={[styles.typeBtnLabel, form.type === t && styles.typeBtnLabelActive]}>
                      {t === 'INCOME' ? '+ Income' : '- Expense'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Description *"
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="e.g. Grocery shopping"
              />
              <Input
                label="Amount (₹) *"
                value={form.amount}
                onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                keyboardType="decimal-pad"
                prefix="₹"
                placeholder="0.00"
              />
              <Input
                label="Date"
                value={form.date}
                onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
                placeholder="YYYY-MM-DD"
              />

              {/* Account Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Account *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                  {accounts.map((acc: any) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[styles.selPill, form.account_id === acc.id && styles.selPillActive]}
                      onPress={() => setForm((f) => ({ ...f, account_id: acc.id }))}
                    >
                      <Text style={[styles.selPillText, form.account_id === acc.id && styles.selPillTextActive]}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Category Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                  {categories.filter((c: any) => !c.parent_id).map((cat: any) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.selPill, form.category_id === cat.id && styles.selPillActive]}
                      onPress={() => setForm((f) => ({ ...f, category_id: f.category_id === cat.id ? '' : cat.id }))}
                    >
                      <Text style={[styles.selPillText, form.category_id === cat.id && styles.selPillTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Input
                label="Notes"
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                placeholder="Optional note..."
                multiline
              />

              <Button
                label={createMutation.isPending ? 'Saving...' : 'Save Transaction'}
                fullWidth
                loading={createMutation.isPending}
                onPress={handleAddTransaction}
                style={styles.saveBtn}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
