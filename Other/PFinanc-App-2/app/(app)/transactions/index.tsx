import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { transactionsApi } from '../../../src/api/transactions';
import apiClient from '../../../src/api/client';
import { TransactionRow, Transaction } from '../../../src/components/transactions/TransactionRow';
import { FilterBar, TYPE_FILTERS } from '../../../src/components/transactions/FilterBar';
import { FilterBottomSheet } from '../../../src/components/transactions/FilterBottomSheet';
import { SkeletonRow } from '../../../src/components/ui/Skeleton';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatRelativeDate } from '../../../src/utils/date';
import Animated, { FadeInDown } from 'react-native-reanimated';

const PAGE_SIZE = 25;

interface Section {
  title: string;
  data: any[];
}

export default function TransactionsScreen() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // 1. Fetch transactions
  const {
    data: txData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: txLoading,
    refetch: refetchTx,
    isRefetching: isRefetchingTx,
  } = useInfiniteQuery({
    queryKey: ['transactions', typeFilter],
    queryFn: ({ pageParam = 1 }) =>
      transactionsApi.getAll({
        page: pageParam,
        limit: PAGE_SIZE,
        ...(typeFilter !== 'all' && typeFilter !== 'NEEDS_REVIEW' ? { type: typeFilter } : {}),
      }),
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.pagination?.total ?? 0;
      const fetched = allPages.flatMap((p) => p?.data?.transactions ?? []).length;
      return fetched < total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: typeFilter !== 'NEEDS_REVIEW',
  });

  // 2. Fetch automation candidates
  const { 
    data: candidatesRes, 
    isLoading: candidatesLoading,
    refetch: refetchCandidates,
    isRefetching: isRefetchingCandidates,
  } = useQuery({
    queryKey: ['automation-candidates'],
    queryFn: async () => {
      const res = await apiClient.get('/automation/candidates');
      return res.data;
    },
  });

  const candidates = candidatesRes ?? [];
  const candidatesCount = candidates.length;

  // 3. Inject candidates count into FilterBar tabs
  const filtersWithBadge = useMemo(() => {
    return TYPE_FILTERS.map(f => {
      if (f.key === 'NEEDS_REVIEW') return { ...f, badge: candidatesCount };
      return f;
    });
  }, [candidatesCount]);

  // 4. Build data lists
  const allTxs: Transaction[] = useMemo(() => {
    if (typeFilter === 'NEEDS_REVIEW') return [];
    return (txData?.pages ?? []).flatMap(p => p?.data?.transactions ?? []);
  }, [txData, typeFilter]);

  const sections: Section[] = useMemo(() => {
    if (typeFilter === 'NEEDS_REVIEW') {
      return [{ title: 'Pending Review', data: candidates }];
    }

    let filteredTxs = allTxs;
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      filteredTxs = filteredTxs.filter(tx => 
        tx.description.toLowerCase().includes(lowerQ) ||
        tx.category_name?.toLowerCase().includes(lowerQ) ||
        tx.account_name?.toLowerCase().includes(lowerQ)
      );
    }

    const grouped = filteredTxs.reduce((acc, tx) => {
      const title = formatRelativeDate(tx.transaction_date);
      if (!acc[title]) acc[title] = [];
      acc[title].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);

    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [allTxs, searchQuery, typeFilter, candidates]);

  const isLoading = typeFilter === 'NEEDS_REVIEW' ? candidatesLoading : txLoading;
  const isRefetching = typeFilter === 'NEEDS_REVIEW' ? isRefetchingCandidates : isRefetchingTx;
  const refetch = typeFilter === 'NEEDS_REVIEW' ? refetchCandidates : refetchTx;

  // Renderers
  const renderItem = useCallback(
    ({ item, index, section }: { item: any; index: number; section: Section }) => {
      const isFirst = index === 0;
      const isLast = index === section.data.length - 1;

      if (typeFilter === 'NEEDS_REVIEW') {
        const isCredit = item.direction === 'CREDIT';
        return (
          <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
            <TouchableOpacity 
              style={[
                styles.candidateCard,
                isFirst && styles.groupTopRadius,
                isLast && styles.groupBottomRadius,
                !isLast && styles.groupBorderBottom
              ]}
              onPress={() => router.push({ pathname: '/(app)/automation/review', params: { id: item.id } })}
              activeOpacity={0.7}
            >
              <View style={styles.candidateHeader}>
                <View style={styles.candidateMerchantWrap}>
                  <View style={[styles.candidateIcon, { backgroundColor: isCredit ? Colors.successBg : Colors.warningBg }]}>
                    <MaterialCommunityIcons 
                      name={isCredit ? "arrow-down-circle" : "auto-fix"} 
                      size={20} 
                      color={isCredit ? Colors.success : Colors.warning} 
                    />
                  </View>
                  <Text style={styles.candidateMerchant}>{item.merchant || 'Unknown Merchant'}</Text>
                </View>
                <Text style={[styles.candidateAmount, { color: isCredit ? Colors.success : Colors.onSurface }]}>
                  {isCredit ? '+' : '-'}₹{item.amount}
                </Text>
              </View>
              <View style={styles.candidateFooter}>
                <Text style={styles.candidateDetails}>
                  {formatRelativeDate(item.transaction_date)} • SMS
                </Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Needs Review</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      }

      return (
        <Animated.View entering={FadeInDown.delay(index * 20).duration(200)}>
          <View style={[
            styles.transactionRowWrap,
            isFirst && styles.groupTopRadius,
            isLast && styles.groupBottomRadius,
            !isLast && styles.groupBorderBottom
          ]}>
            <TransactionRow
              transaction={item as Transaction}
              onPress={() => router.push(`/(app)/transactions/${item.id}`)}
            />
          </View>
        </Animated.View>
      );
    },
    [router, typeFilter]
  );

  const renderSectionHeader = ({ section: { title } }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return (
      <View style={{ paddingTop: 20, paddingHorizontal: Spacing.layoutMargin }}>
        {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
      </View>
    );
    
    let emptyMsg = 'No transactions found';
    let emptySubMsg = '';
    let iconName: any = 'text-box-search-outline';

    if (typeFilter === 'NEEDS_REVIEW') {
      emptyMsg = "You're all caught up";
      emptySubMsg = 'No transactions need review.';
      iconName = 'check-decagram-outline';
    } else if (searchQuery) {
      emptyMsg = 'No results found';
      emptySubMsg = `We couldn't find anything matching "${searchQuery}"`;
    } else if (typeFilter !== 'all') {
      emptyMsg = `No ${typeFilter.toLowerCase()}s yet`;
      emptySubMsg = `No ${typeFilter.toLowerCase()} transactions match your criteria.`;
    } else {
      emptyMsg = 'No transactions yet';
      emptySubMsg = 'Add your first transaction using the + button.';
    }

    return (
      <View style={styles.emptyBox}>
        <View style={[styles.emptyIconBg, typeFilter === 'NEEDS_REVIEW' && { backgroundColor: Colors.successBg }]}>
          <MaterialCommunityIcons 
            name={iconName} 
            size={48} 
            color={typeFilter === 'NEEDS_REVIEW' ? Colors.success : Colors.primary} 
          />
        </View>
        <Text style={styles.emptyTitle}>{emptyMsg}</Text>
        <Text style={styles.emptySubText}>{emptySubMsg}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Premium Gradient Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Transactions</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => setShowFilters(true)}>
                <MaterialCommunityIcons name="filter-variant" size={24} color={Colors.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Overlapping Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.onSurfaceMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search merchants, amounts..."
              placeholderTextColor={Colors.onSurfaceSubtle}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={Colors.onSurfaceSubtle} />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterBarContainer}>
        <FilterBar filters={filtersWithBadge} selectedKey={typeFilter} onSelect={setTypeFilter} />
      </View>

      {/* Transaction List */}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={() => (!isFetchingNextPage ? <View style={{ height: 100 }} /> : <View style={{ padding: 16 }}><SkeletonRow /></View>)}
        onEndReached={() => typeFilter !== 'NEEDS_REVIEW' && hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
        contentContainerStyle={sections.length === 0 ? styles.emptyContent : styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />

      <FilterBottomSheet 
        visible={showFilters} 
        onClose={() => setShowFilters(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceDim },
  gradientHeader: {
    paddingBottom: Spacing.layoutMargin,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerSafe: {
    paddingHorizontal: Spacing.layoutMargin,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.headlineLg, color: Colors.onPrimary },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 16,
    marginTop: Spacing.sm,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.onSurface,
    height: '100%',
  },
  filterBarContainer: {
    marginTop: Spacing.sm,
  },
  listContent: { 
    paddingHorizontal: Spacing.layoutMargin, 
    paddingBottom: 100 
  },
  emptyContent: { flex: 1 },
  sectionHeader: {
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    ...Typography.labelMd,
    fontFamily: 'Inter_700Bold',
    color: Colors.onSurfaceMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transactionRowWrap: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 0, 
  },
  groupTopRadius: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  groupBottomRadius: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  groupBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  
  // Empty State
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, marginTop: 40 },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold' },
  emptySubText: { ...Typography.bodyMd, color: Colors.onSurfaceMuted, textAlign: 'center', lineHeight: 22 },
  
  // Needs Review Cards
  candidateCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.layoutMargin,
  },
  candidateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  candidateMerchantWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  candidateIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  candidateMerchant: { ...Typography.bodyLg, fontFamily: 'Inter_600SemiBold', color: Colors.onSurface },
  candidateAmount: { ...Typography.numericData, fontVariant: ['tabular-nums'] },
  candidateFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  candidateDetails: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  statusBadge: { 
    backgroundColor: Colors.warningBg, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  statusText: { color: Colors.warning, ...Typography.labelSm, fontFamily: 'Inter_700Bold' },
});
