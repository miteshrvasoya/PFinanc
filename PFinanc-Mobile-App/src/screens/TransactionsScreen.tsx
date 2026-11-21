import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FilterModal } from '../components/FilterModal';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';
import { QuickAddModal } from '../components/QuickAddModal';
import { apiClient } from '../api/client';
import { getMaterialIcon } from '../utils/iconMapper';
import { Alert } from 'react-native';

export const TransactionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<any>(null);
  const [editTxn, setEditTxn] = useState<any>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      const res = await apiClient.get('/api/transactions?limit=50');
      if (res.success) {
        setTransactions(res.data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Transaction', 'Are you sure you want to permanently delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await apiClient.delete(`/api/transactions/${id}`);
          if (res.success) {
            setSelectedTxn(null);
            fetchTransactions();
          } else {
            Alert.alert('Error', res.message || 'Failed to delete transaction');
          }
        } catch (error) {
          Alert.alert('Error', 'An unexpected error occurred while deleting.');
        }
      }}
    ]);
  };

  const getGroupedTransactions = () => {
    const groups: { [key: string]: any[] } = {};
    let filtered = transactions;
    if (activeFilter === 'Expenses') filtered = transactions.filter(t => t.transaction_type === 'EXPENSE');
    else if (activeFilter === 'Income') filtered = transactions.filter(t => t.transaction_type === 'INCOME');
    else if (activeFilter === 'Transfers') filtered = transactions.filter(t => t.transaction_type === 'TRANSFER');
    
    filtered.forEach(txn => {
      const date = new Date(txn.transaction_date).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(txn);
    });
    return groups;
  };

  const groupedTxns = getGroupedTransactions();

  const togglePrivacy = () => setIsPrivacyMasked(!isPrivacyMasked);
  
  const getAmount = (val: string) => isPrivacyMasked ? '••••' : val;

  const filters = [
    'All',
    'Needs Review',
    'Expenses',
    'Income',
    'Transfers'
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMMLoNemMH9tSe8gpHrr3vy-IfxVRhO-5qWibjufd4drHkX1Pr4Q4qqgV6Ebx3jj9lFhizUoQi-y_QTnm4Klkwa1wlc85ZIxhKrVIEQaR5qsUpwC96f-eOLzhFv97m6kTyR6qHpPCbwOjmYq7gXQck7ru6HwSFAmxuI1NRaa-WwwgQV2AFihcW-bZ2MRf8RUaENY3HD7BQgzN1iWAWzSRoIxQrONSbTTV-Lsdz2wYwFtQhsZ9N9XvGTQ' }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.headerTitle}>PFinanc</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={togglePrivacy}>
          <MaterialIcons 
            name={isPrivacyMasked ? "visibility-off" : "visibility"} 
            size={20} 
            color={colors.onSurfaceVariant} 
          />
        </Pressable>
      </View>

      {/* Context Header & Controls */}
      <View style={styles.contextSection}>
        <View style={styles.contextHeader}>
          <View>
            <Text style={styles.contextSubtitle}>AUDIT LEDGER</Text>
            <Text style={styles.contextTitle}>Transactions</Text>
          </View>
          <Pressable style={styles.scopeSelector}>
            <View style={styles.scopeDot} />
            <Text style={styles.scopeText}>Vasoya Family</Text>
            <MaterialIcons name="expand-more" size={16} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={19} color={colors.outline} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search merchants, categories, accounts..."
              placeholderTextColor={colors.outline}
            />
          </View>
          <Pressable style={styles.filterButton} onPress={() => setIsFilterVisible(true)}>
            <MaterialIcons name="tune" size={18} color={colors.primary} />
            <Text style={styles.filterButtonText}>Filter</Text>
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>2</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Sticky Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsScroll}
        >
          {filters.map(filter => {
            const isActive = activeFilter === filter;
            const isReview = filter.includes('Review');
            return (
              <Pressable 
                key={filter}
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                  isReview && styles.filterPillReview
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                {isReview && <View style={styles.reviewDot} />}
                <Text style={[
                  styles.filterPillText,
                  isActive && styles.filterPillTextActive,
                  isReview && styles.filterPillTextReview
                ]}>
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Needs Review Banner */}
        <View style={styles.reviewCard}>
          <View style={styles.reviewGlow} />
          <View style={styles.reviewHeader}>
            <View style={styles.reviewHeaderLeft}>
              <View style={styles.reviewIconBox}>
                <MaterialIcons name="auto-awesome" size={20} color={colors.onPrimaryFixed} />
              </View>
              <View>
                <View style={styles.reviewEngineRow}>
                  <Text style={styles.reviewEngineText}>INSTITUTIONAL ENGINE</Text>
                  <View style={styles.accuracyBadge}>
                    <Text style={styles.accuracyBadgeText}>98% Accuracy</Text>
                  </View>
                </View>
                <Text style={styles.reviewTitle}>Confidence Detection</Text>
              </View>
            </View>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>3 Pending</Text>
            </View>
          </View>
          <Text style={styles.reviewDesc}>
            3 automatic detections ready for confirmation across HDFC and ICICI Family accounts.
          </Text>
          <View style={styles.reviewFooter}>
            <View style={styles.avatarGroup}>
              <View style={[styles.miniAvatar, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={[styles.miniAvatarText, { color: colors.primary }]}>S</Text>
              </View>
              <View style={[styles.miniAvatar, { backgroundColor: colors.primaryFixedDim }]}>
                <Text style={[styles.miniAvatarText, { color: colors.primary }]}>A</Text>
              </View>
              <View style={[styles.miniAvatar, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.miniAvatarText, { color: colors.secondary }]}>Z</Text>
              </View>
            </View>
            <Pressable style={styles.reviewFlowBtn}>
              <Text style={styles.reviewFlowText}>Quick Review Flow</Text>
              <MaterialIcons name="arrow-forward" size={16} color={colors.primaryContainer} />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : Object.keys(groupedTxns).length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: colors.onSurfaceVariant }}>No transactions found.</Text>
        ) : (
          Object.keys(groupedTxns).map(dateKey => (
            <View key={dateKey} style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{dateKey.toUpperCase()}</Text>
                <Text style={styles.groupMeta}>{groupedTxns[dateKey].length} Transactions</Text>
              </View>
              <View style={styles.txnList}>
                {groupedTxns[dateKey].map((txn: any, index: number) => (
                  <React.Fragment key={txn.id}>
                    <Pressable 
                      style={styles.txnItem}
                      onPress={() => setSelectedTxn({
                        id: txn.id,
                        merchant: txn.merchant_name || txn.description,
                        amount: getAmount((txn.transaction_type === 'EXPENSE' ? '-₹' : '+₹') + txn.amount),
                        date: new Date(txn.transaction_date).toLocaleString(),
                        category: txn.category?.name || 'Uncategorized',
                        account: txn.account?.name || 'Account',
                        source: txn.source_type,
                        owner: txn.user?.name,
                        icon: getMaterialIcon(txn.category?.icon),
                        raw: txn
                      })}
                    >
                      <View style={styles.txnItemLeft}>
                        <View style={[styles.txnIcon, { backgroundColor: txn.category?.color || colors.surfaceContainerLow }]}>
                          <MaterialIcons name={getMaterialIcon(txn.category?.icon)} size={20} color={colors.primary} />
                        </View>
                        <View style={styles.txnContent}>
                          <View style={styles.txnTitleRow}>
                            <Text style={styles.txnName} numberOfLines={1}>{txn.merchant_name || txn.description}</Text>
                          </View>
                          <Text style={styles.txnDesc} numberOfLines={1}>
                            {txn.category?.name || 'Uncategorized'} • {txn.account?.name}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.txnItemRight}>
                        <Text style={txn.transaction_type === 'EXPENSE' ? styles.txnAmountNeg : styles.txnAmountPos}>
                          {txn.transaction_type === 'EXPENSE' ? '-' : '+'}₹{txn.amount}
                        </Text>
                      </View>
                    </Pressable>
                    {index < groupedTxns[dateKey].length - 1 && <View style={styles.txnDivider} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Bottom padding for Nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FilterModal visible={isFilterVisible} onClose={() => setIsFilterVisible(false)} />
      <TransactionDetailsModal 
        visible={!!selectedTxn} 
        data={selectedTxn} 
        onClose={() => setSelectedTxn(null)} 
        onDelete={handleDelete}
        onEdit={(data) => {
          setEditTxn(data);
          setSelectedTxn(null); // Close details modal
          setIsEditModalVisible(true); // Open edit modal
        }}
      />
      <QuickAddModal 
        visible={isEditModalVisible} 
        onClose={() => {
          setIsEditModalVisible(false);
          setEditTxn(null);
          fetchTransactions(); // Refresh after edit
        }} 
        initialData={editTxn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)', // outline-variant/20
    backgroundColor: colors.surface, // surface/90
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20, // headline-md
    color: colors.primary,
    letterSpacing: -0.2,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  contextSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  contextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextSubtitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  contextTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 24, // headline-lg-mobile
    color: colors.primary,
    letterSpacing: -0.3,
  },
  scopeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    shadowColor: 'rgba(13, 56, 41, 0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  scopeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryContainer,
  },
  scopeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    shadowColor: 'rgba(13, 56, 41, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurface,
    height: '100%',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.5)',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    gap: 6,
  },
  filterButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  filterBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onPrimary,
  },
  filterTabsContainer: {
    backgroundColor: 'rgba(244, 251, 247, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.15)',
    paddingVertical: 8,
    zIndex: 20,
  },
  filterTabsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  filterPillReview: {
    backgroundColor: colors.secondaryFixed,
    borderColor: 'rgba(117, 90, 36, 0.2)', // secondary/20
  },
  reviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  filterPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: colors.onPrimary,
    fontFamily: 'Inter_600SemiBold',
  },
  filterPillTextReview: {
    color: colors.onSecondaryFixed,
    fontFamily: 'Inter_600SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 16,
  },
  reviewCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(13, 56, 41, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  reviewGlow: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(192, 236, 214, 0.2)', // primary-fixed/20
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewEngineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewEngineText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  accuracyBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  accuracyBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onPrimaryFixed,
  },
  reviewTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.primary,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSecondaryFixed,
  },
  reviewDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 10,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6, // account for negative margin
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  miniAvatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  reviewFlowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewFlowText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.primaryContainer,
  },
  groupContainer: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  groupTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  groupMeta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
  },
  txnList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    overflow: 'hidden',
    shadowColor: 'rgba(13, 56, 41, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  txnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  txnItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnContent: {
    flex: 1,
  },
  txnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txnName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16, // body-lg
    color: colors.primary,
    flexShrink: 1,
  },
  autoTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    gap: 2,
  },
  autoTagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onPrimaryFixed,
  },
  grayBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  grayBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  neutralBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4,
  },
  neutralBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  lightGreenBadge: {
    backgroundColor: 'rgba(192, 236, 214, 0.6)', // primary-fixed/60
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  lightGreenBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.primary,
  },
  txnDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  txnItemRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  txnAmountNeg: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 22,
    color: colors.primary,
  },
  txnAmountPos: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 22,
    color: colors.primaryContainer,
  },
  txnAmountNeutral: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 22,
    color: colors.onSurfaceVariant,
  },
  txnTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.outline,
  },
  txnTimePos: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.primaryContainer,
  },
  txnDivider: {
    height: 1,
    backgroundColor: 'rgba(193, 200, 194, 0.15)', // outline-variant/15
  },
});
