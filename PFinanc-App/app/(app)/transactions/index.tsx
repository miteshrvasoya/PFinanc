import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { transactionsApi } from '../../../src/api/transactions';
import apiClient from '../../../src/api/client';
import { TransactionRow, Transaction } from '../../../src/components/transactions/TransactionRow';
import { FilterBar, TYPE_FILTERS } from '../../../src/components/transactions/FilterBar';
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
    ({ item, index }: { item: any; index: number }) => {
      if (typeFilter === 'NEEDS_REVIEW') {
        const isCredit = item.direction === 'CREDIT';
        return (
          <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
            <TouchableOpacity 
              style={styles.candidateCard}
              onPress={() => router.push({ pathname: '/(app)/automation/review', params: { id: item.id } })}
              activeOpacity={0.7}
            >
              <View style={styles.candidateHeader}>
                <Text style={styles.candidateMerchant}>{item.merchant || 'Unknown Merchant'}</Text>
                <Text style={[styles.candidateAmount, { color: isCredit ? Colors.success : Colors.danger }]}>
                  {isCredit ? '+' : '-'}₹{item.amount}
                </Text>
              </View>
              <Text style={styles.candidateDetails}>
                {formatRelativeDate(item.transaction_date)} • {item.confidence * 100}% Confidence • Detected from SMS
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Review Needed</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      }

      return (
        <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
          <TransactionRow
            transaction={item as Transaction}
            onPress={() => router.push(`/(app)/transactions/${item.id}`)}
          />
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

  const renderFooter = () => {
    if (!isFetchingNextPage) return <View style={{ height: 100 }} />;
    return <View style={{ paddingVertical: 16 }}><SkeletonRow /></View>;
  };

  const renderEmpty = () => {
    if (isLoading) return (
      <View style={{ paddingTop: 20 }}>
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
            color={typeFilter === 'NEEDS_REVIEW' ? Colors.success : Colors.onSurfaceSubtle} 
          />
        </View>
        <Text style={styles.emptyTitle}>{emptyMsg}</Text>
        <Text style={styles.emptySubText}>{emptySubMsg}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Modern Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="filter-variant" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.onSurfaceMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions, categories..."
            placeholderTextColor={Colors.onSurfaceSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter Bar with Needs Review Badge */}
      <FilterBar filters={filtersWithBadge} selectedKey={typeFilter} onSelect={setTypeFilter} />

      {/* Transaction List */}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={() => typeFilter !== 'NEEDS_REVIEW' && hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
        contentContainerStyle={sections.length === 0 ? styles.emptyContent : styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { ...Typography.headlineMd, fontFamily: 'Inter_700Bold', color: Colors.onSurface },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchContainer: {
    paddingHorizontal: Spacing.layoutMargin,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.onSurface,
    height: '100%',
  },
  listContent: { paddingTop: Spacing.sm, paddingBottom: 100 },
  emptyContent: { flex: 1 },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.layoutMargin,
    backgroundColor: Colors.background,
    marginTop: 8,
  },
  sectionTitle: {
    ...Typography.labelMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, marginTop: 40 },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold' },
  emptySubText: { ...Typography.bodyMd, color: Colors.onSurfaceMuted, textAlign: 'center', lineHeight: 22 },
  
  // Needs Review Cards
  candidateCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.layoutMargin,
    marginBottom: Spacing.md,
    padding: Spacing.base,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  candidateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  candidateMerchant: { ...Typography.bodyMd, fontFamily: 'Inter_600SemiBold', color: Colors.onSurface },
  candidateAmount: { ...Typography.numericData, fontVariant: ['tabular-nums'] },
  candidateDetails: { ...Typography.labelSm, color: Colors.onSurfaceMuted, marginBottom: 12 },
  statusBadge: { 
    alignSelf: 'flex-start', 
    backgroundColor: Colors.warningBg, 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  statusText: { color: Colors.warning, ...Typography.labelSm, fontFamily: 'Inter_600SemiBold' },
});
