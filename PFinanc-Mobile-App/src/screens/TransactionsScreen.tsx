import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';
import { QuickAddModal } from '../components/QuickAddModal';
import { apiClient } from '../api/client';
import { getMaterialIcon } from '../utils/iconMapper';

interface TransactionsScreenProps {
  onNavigate?: (screen: string, params?: { filter?: string }) => void;
  initialFilter?: { value: string; nonce: number };
  onAddEntry?: (type: 'expense' | 'income' | 'transfer') => void;
  refreshKey?: number;
}

// internal filter value → label shown to the user
const FILTERS: { value: string; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Income', label: 'Money In' },
  { value: 'Expenses', label: 'Money Out' },
  { value: 'Transfers', label: 'Moved' },
  { value: 'Needs Review', label: 'To check' },
];

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return 'Today';
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ onNavigate, initialFilter, onAddEntry, refreshKey }) => {
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);
  const [activeFilter, setActiveFilter] = useState(initialFilter?.value ?? 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxn, setSelectedTxn] = useState<any>(null);
  const [editTxn, setEditTxn] = useState<any>(null);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  // Re-apply the filter whenever another screen deep-links here (e.g. Home → Money In)
  useEffect(() => {
    if (initialFilter) setActiveFilter(initialFilter.value);
  }, [initialFilter?.nonce]);

  const fetchTransactions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setFailed(false);
    try {
      const res = await apiClient.get('/api/transactions?limit=100');
      if (res.success) setTransactions(res.data.items || []); else setFailed(true);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions, refreshKey]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete this entry?', 'This cannot be undone.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await apiClient.delete(`/api/transactions/${id}`);
          if (res.success) { setSelectedTxn(null); fetchTransactions(); }
          else Alert.alert('Could not delete', res.message || 'Please try again.');
        } catch {
          Alert.alert('Could not delete', 'Something went wrong. Please try again.');
        }
      } },
    ]);
  };

  const filtered = useMemo(() => {
    let list = transactions;
    if (activeFilter === 'Expenses') list = list.filter(t => t.transaction_type === 'EXPENSE');
    else if (activeFilter === 'Income') list = list.filter(t => t.transaction_type === 'INCOME');
    else if (activeFilter === 'Transfers') list = list.filter(t => t.transaction_type === 'TRANSFER');
    else if (activeFilter === 'Needs Review') list = list.filter(t => t.needs_review || t.is_reviewed === false || t.status === 'PENDING' || t.status === 'NEEDS_REVIEW');
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(t => [t.merchant_name, t.description, t.category?.name, t.account?.name]
        .some(v => typeof v === 'string' && v.toLowerCase().includes(q)));
    }
    return list;
  }, [transactions, activeFilter, searchQuery]);

  const groups = useMemo(() => {
    const g: { label: string; items: any[] }[] = [];
    filtered.forEach(t => {
      const label = dayLabel(t.transaction_date);
      const last = g[g.length - 1];
      if (last && last.label === label) last.items.push(t); else g.push({ label, items: [t] });
    });
    return g;
  }, [filtered]);

  const totalIn = filtered.filter(t => t.transaction_type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalOut = filtered.filter(t => t.transaction_type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
  const fmt = (v: number) => (hidden ? '••••' : `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn} onPress={() => setHidden(v => !v)} accessibilityLabel="Hide or show amounts">
            <MaterialIcons name={hidden ? 'visibility-off' : 'visibility'} size={22} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.addBtn} onPress={() => onAddEntry && onAddEntry('expense')}>
            <MaterialIcons name="add" size={20} color={colors.onPrimary} />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={20} color={colors.outline} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or category"
          placeholderTextColor={colors.outline}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <MaterialIcons name="close" size={20} color={colors.outline} />
          </Pressable>
        )}
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map(f => {
            const on = activeFilter === f.value;
            return (
              <Pressable key={f.value} style={[styles.chip, on && styles.chipOn]} onPress={() => setActiveFilter(f.value)}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTransactions(true)} tintColor={colors.primary} />}
      >
        {failed && (
          <Pressable style={styles.errorBox} onPress={() => fetchTransactions()}>
            <MaterialIcons name="wifi-off" size={18} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>Couldn't load entries. Tap to try again.</Text>
          </Pressable>
        )}

        {!loading && filtered.length > 0 && activeFilter !== 'Transfers' && (
          <View style={styles.totals}>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Money In</Text>
              <Text style={[styles.totalValue, { color: colors.primaryContainer }]}>{fmt(totalIn)}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Money Out</Text>
              <Text style={[styles.totalValue, { color: colors.error }]}>{fmt(totalOut)}</Text>
            </View>
          </View>
        )}

        {activeFilter === 'All' && (
          <Pressable style={styles.checkRow} onPress={() => onNavigate && onNavigate('smsReview')}>
            <MaterialIcons name="fact-check" size={20} color={colors.onSecondaryContainer} />
            <Text style={styles.checkText}>Check entries found from SMS & statements</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.onSecondaryContainer} />
          </Pressable>
        )}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialIcons name="receipt-long" size={44} color={colors.outline} />
            <Text style={styles.emptyTitle}>{transactions.length === 0 ? 'No entries yet' : 'Nothing matches'}</Text>
            <Text style={styles.emptyDesc}>
              {transactions.length === 0 ? 'Add your first entry to start tracking.' : 'Try a different filter or search.'}
            </Text>
            {transactions.length === 0 ? (
              <Pressable style={styles.emptyBtn} onPress={() => onAddEntry && onAddEntry('expense')}>
                <Text style={styles.emptyBtnText}>Add an entry</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => { setActiveFilter('All'); setSearchQuery(''); }}>
                <Text style={styles.clear}>Show everything</Text>
              </Pressable>
            )}
          </View>
        ) : groups.map(g => (
          <View key={g.label}>
            <Text style={styles.dayLabel}>{g.label}</Text>
            <View style={styles.list}>
              {g.items.map((txn, i) => {
                const out = txn.transaction_type === 'EXPENSE';
                const transfer = txn.transaction_type === 'TRANSFER';
                const sign = transfer ? '' : out ? '-' : '+';
                return (
                  <React.Fragment key={txn.id}>
                    <Pressable
                      style={styles.txn}
                      onPress={() => setSelectedTxn({
                        id: txn.id,
                        merchant: txn.merchant_name || txn.description,
                        amount: (hidden ? '••••' : `${out ? '-' : '+'}₹${txn.amount}`),
                        date: new Date(txn.transaction_date).toLocaleString(),
                        category: txn.category?.name || 'Uncategorized',
                        account: txn.account?.name || 'Account',
                        source: txn.source_type,
                        owner: txn.user?.name,
                        icon: getMaterialIcon(txn.category?.icon),
                        raw: txn,
                      })}
                    >
                      <View style={[styles.txnIcon, { backgroundColor: txn.category?.color || colors.surfaceContainer }]}>
                        <MaterialIcons name={getMaterialIcon(txn.category?.icon)} size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txnName} numberOfLines={1}>{txn.merchant_name || txn.description || txn.category?.name || 'Entry'}</Text>
                        <Text style={styles.txnSub} numberOfLines={1}>{txn.category?.name || 'Other'}{txn.account?.name ? ` · ${txn.account.name}` : ''}</Text>
                      </View>
                      <Text style={[styles.txnAmount, { color: out ? colors.onSurface : colors.primaryContainer }]}>
                        {hidden ? '••••' : `${sign}₹${Number(txn.amount || 0).toLocaleString('en-IN')}`}
                      </Text>
                    </Pressable>
                    {i < g.items.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>

      <TransactionDetailsModal
        visible={!!selectedTxn}
        data={selectedTxn}
        onClose={() => setSelectedTxn(null)}
        onDelete={handleDelete}
        onDuplicate={(data) => { setEditTxn({ ...data, raw: { ...data.raw, id: undefined, transaction_date: new Date().toISOString() } }); setSelectedTxn(null); setIsEditVisible(true); }}
        onEdit={(data) => { setEditTxn(data); setSelectedTxn(null); setIsEditVisible(true); }}
      />
      <QuickAddModal
        visible={isEditVisible}
        onClose={() => { setIsEditVisible(false); setEditTxn(null); }}
        onSaved={() => fetchTransactions()}
        initialData={editTxn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer },
  addBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onPrimary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, paddingHorizontal: 14, height: 48, borderRadius: 14, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant },
  searchInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.onSurface },
  chips: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.surfaceContainer },
  chipOn: { backgroundColor: colors.primaryContainer },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onSurface },
  chipTextOn: { color: colors.onPrimary },
  content: { paddingHorizontal: 20, gap: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.errorContainer },
  errorText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onErrorContainer },
  totals: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)' },
  totalBox: { flex: 1, alignItems: 'center' },
  totalDivider: { width: 1, height: 32, backgroundColor: colors.outlineVariant },
  totalLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  totalValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, marginTop: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.secondaryContainer },
  checkText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSecondaryContainer },
  dayLabel: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onSurfaceVariant, marginBottom: 8, marginLeft: 4 },
  list: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)', overflow: 'hidden' },
  txn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  txnIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txnName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.onSurface },
  txnSub: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  txnAmount: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  divider: { height: 1, backgroundColor: 'rgba(193,200,194,0.3)', marginLeft: 68 },
  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: colors.onSurface },
  emptyDesc: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center' },
  emptyBtn: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.primaryContainer },
  emptyBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.onPrimary },
  clear: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.primaryContainer, marginTop: 4 },
});
