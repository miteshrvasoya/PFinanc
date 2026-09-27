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
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { transactionsApi } from '../../../src/api/transactions';
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
  data: Transaction[];
}

export default function TransactionsScreen() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const allTxs: Transaction[] = useMemo(() => {
    return (data?.pages ?? []).flatMap(p => p?.data?.transactions ?? []);
  }, [data]);

  // Group transactions by relative date (e.g., Today, Yesterday, 12 Oct)
  const sections: Section[] = useMemo(() => {
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
  }, [allTxs, searchQuery]);

  const renderItem = useCallback(
    ({ item, index }: { item: Transaction; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <TransactionRow
          transaction={item}
          onPress={() => router.push(`/(app)/transactions/${item.id}`)}
        />
      </Animated.View>
    ),
    [router]
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
    return (
      <View style={styles.emptyBox}>
        <View style={styles.emptyIconBg}>
          <MaterialCommunityIcons name="text-box-search-outline" size={48} color={Colors.onSurfaceSubtle} />
        </View>
        <Text style={styles.emptyTitle}>No transactions found</Text>
        <Text style={styles.emptySubText}>
          {searchQuery
            ? `We couldn't find anything matching "${searchQuery}"`
            : typeFilter !== 'all'
              ? `No ${typeFilter.toLowerCase().replace('_', ' ')} transactions match your criteria.`
              : 'Add your first transaction using the + button.'}
        </Text>
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

      {/* Filter Bar */}
      <FilterBar filters={TYPE_FILTERS} selectedKey={typeFilter} onSelect={setTypeFilter} />

      {/* Transaction List */}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
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
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold' },
  emptySubText: { ...Typography.bodyMd, color: Colors.onSurfaceMuted, textAlign: 'center', lineHeight: 22 },
});
