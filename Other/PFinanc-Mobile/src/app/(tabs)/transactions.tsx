/**
 * TransactionsScreen — Matches Stitch "Transactions Ledger" design.
 *
 * Sections:
 * - TopAppBar (compact: "Vasoya Family" / "Encrypted Vault")
 * - Page title + search/filter buttons
 * - Segmented filter tabs (All | Needs Review | Expenses | Income | Transfers)
 * - Search input field
 * - Quick filter chips (This Month | All Accounts | Category)
 * - Grouped date sections with transaction rows
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { TRANSACTIONS } from '../../services/financialService';
import type { Transaction } from '../../types/financial';

type FilterTab = 'all' | 'review' | 'expense' | 'income' | 'transfer';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'review', label: 'Needs Review' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfers' },
];

function formatSectionDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function TransactionsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const pendingCount = TRANSACTIONS.filter(t => t.status === 'pending_review').length;

  const filtered = useMemo(() => {
    let txns = TRANSACTIONS;
    if (activeFilter === 'review') txns = txns.filter(t => t.status === 'pending_review');
    else if (activeFilter === 'expense') txns = txns.filter(t => t.type === 'expense');
    else if (activeFilter === 'income') txns = txns.filter(t => t.type === 'income');
    else if (activeFilter === 'transfer') txns = txns.filter(t => t.type === 'transfer');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      txns = txns.filter(t =>
        t.merchant.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return txns;
  }, [activeFilter, searchQuery]);

  // Group by date
  const sections = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filtered.forEach(tx => {
      const key = formatSectionDate(tx.datetime);
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const renderTransaction = (tx: Transaction) => {
    const isIncome = tx.type === 'income';
    const isTransfer = tx.type === 'transfer';
    const iconBg = isIncome ? Colors.incomeGreenBg : isTransfer ? Colors.surfaceSubtle : Colors.surfaceSubtle;
    const iconBorder = isIncome ? '#A7F3D0' : Colors.borderSubtle;
    const iconColor = isIncome ? Colors.incomeGreen : isTransfer ? Colors.secondary : Colors.onSurface;
    const amtColor = isIncome ? Colors.tertiaryContainer : isTransfer ? Colors.secondary : Colors.onSurface;
    const absAmt = Math.abs(tx.amountPaise);

    return (
      <Pressable
        key={tx.id}
        style={[styles.txRow, isIncome && styles.txRowIncome]}
        onPress={() => tx.status === 'pending_review' && router.push('/sms-review')}
      >
        <View style={[styles.txIcon, { backgroundColor: iconBg, borderColor: iconBorder }]}>
          <Ionicons
            name={isIncome ? 'card-outline' : isTransfer ? 'swap-horizontal-outline' : 'bag-handle-outline'}
            size={20}
            color={iconColor}
          />
        </View>
        <View style={styles.txInfo}>
          <View style={styles.txTitleRow}>
            <Text style={styles.txMerchant}>{tx.merchant}</Text>
            {tx.smsDetected && (
              <View style={styles.autoBadge}>
                <Text style={styles.autoBadgeText}>Auto</Text>
              </View>
            )}
          </View>
          <View style={styles.txMetaRow}>
            <Text style={styles.txCategory}>{tx.category}</Text>
            <Text style={styles.txDot}>•</Text>
            <Text style={styles.txAccount}>HDFC ••••1234</Text>
          </View>
          {isTransfer && (
            <View style={styles.familyTransferTag}>
              <Ionicons name="people-outline" size={10} color={Colors.secondary} />
              <Text style={styles.familyTagText}>Family Transfer (Not an expense)</Text>
            </View>
          )}
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: amtColor }]}>
            {isIncome ? '+' : '-'}{formatINR(absAmt).replace('₹', '₹')}
          </Text>
          <Text style={styles.txTime}>{formatTime(tx.datetime)}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar compact title="Vasoya Family" subtitle="Encrypted Vault" notificationCount={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky search + filter area */}
        <View style={styles.stickyHeader}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.pageTitle}>Transactions</Text>
              <Text style={styles.pageSubtitle}>September 2026 Ledger</Text>
            </View>
            <View style={styles.titleActions}>
              <Pressable style={styles.iconBtn}>
                <Ionicons name="search-outline" size={20} color={Colors.onSurface} />
              </Pressable>
              <Pressable style={[styles.iconBtn, styles.iconBtnActive]}>
                <Ionicons name="options-outline" size={20} color={Colors.onSurface} />
                <View style={styles.filterDot} />
              </Pressable>
            </View>
          </View>

          {/* Filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
            <View style={styles.tabRow}>
              {FILTER_TABS.map(tab => (
                <Pressable
                  key={tab.id}
                  style={[styles.filterTab, activeFilter === tab.id && styles.filterTabActive]}
                  onPress={() => setActiveFilter(tab.id)}
                >
                  <Text style={[styles.filterTabText, activeFilter === tab.id && styles.filterTabTextActive]}>
                    {tab.label}
                  </Text>
                  {tab.id === 'review' && pendingCount > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{pendingCount}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Search input */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={Colors.secondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search merchant, account, or amount..."
              placeholderTextColor={Colors.secondary}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.secondary} />
              </Pressable>
            )}
          </View>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {['This Month', 'All Accounts', 'Category'].map(chip => (
                <Pressable key={chip} style={styles.chip}>
                  <Text style={styles.chipText}>{chip}</Text>
                  <Ionicons name="chevron-down" size={12} color={Colors.secondary} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Transaction groups */}
        <View style={styles.groups}>
          {sections.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={Colors.outlineVariant} />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          ) : (
            sections.map(section => {
              const netPaise = section.data.reduce((sum, t) => sum + t.amountPaise, 0);
              return (
                <View key={section.title} style={styles.group}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupLabel}>{section.title}</Text>
                    <Text style={styles.groupNet}>Net: {netPaise >= 0 ? '+' : ''}{formatINR(netPaise).replace('₹','₹')}</Text>
                  </View>
                  <View style={styles.groupCard}>
                    {section.data.map((tx, i) => (
                      <View key={tx.id}>
                        {renderTransaction(tx)}
                        {i < section.data.length - 1 && <View style={styles.rowDivider} />}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Bottom padding for nav bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceCanvas },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Sticky header area
  stickyHeader: {
    backgroundColor: Colors.surfaceCanvas,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingBottom: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 13, color: Colors.secondary, marginTop: 2 },
  titleActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBtnActive: {},
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryContainer,
  },

  // Filter tabs
  tabScroll: { flexGrow: 0 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: 4,
  },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radii.lg - 2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterTabActive: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabText: { fontSize: 13, color: Colors.secondary },
  filterTabTextActive: { color: Colors.primary, fontWeight: '600' },
  filterBadge: {
    backgroundColor: 'rgba(216,44,44,0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.signalRed },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, fontSize: 14, color: Colors.onSurface },

  // Chips
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chipText: { fontSize: 13, color: Colors.onSurface },

  // Groups
  groups: { padding: Spacing.marginMobile, gap: 24 },
  group: { gap: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  groupLabel: { fontSize: 13, fontWeight: '600', color: Colors.secondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  groupNet: { fontSize: 13, color: Colors.secondary },
  groupCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    ...Shadows.sm,
  },

  // Transaction row
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  txRowIncome: { backgroundColor: 'rgba(143,248,188,0.05)' },
  rowDivider: { height: 1, backgroundColor: Colors.borderSubtle, marginLeft: 14 },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txInfo: { flex: 1 },
  txTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txMerchant: { fontSize: 16, fontWeight: '700', color: Colors.onSurface },
  autoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(115,219,161,0.3)',
  },
  autoBadgeText: { fontSize: 10, color: Colors.tertiary, fontWeight: '700' },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  txCategory: { fontSize: 11, color: Colors.secondary },
  txDot: { fontSize: 10, color: Colors.secondary },
  txAccount: { fontSize: 11, color: Colors.secondary },
  familyTransferTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignSelf: 'flex-start',
  },
  familyTagText: { fontSize: 10, color: Colors.secondary },
  txRight: { alignItems: 'flex-end', flexShrink: 0 },
  txAmount: { fontSize: 18, fontWeight: '600' },
  txTime: { fontSize: 11, color: Colors.secondary, marginTop: 2 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.secondary },
});
