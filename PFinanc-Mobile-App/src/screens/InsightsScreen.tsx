import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getMaterialIcon } from '../utils/iconMapper';

export const InsightsScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeDateFilter, setActiveDateFilter] = useState('This Month');
  const [isScopeMenuVisible, setIsScopeMenuVisible] = useState(false);
  const [activeScope, setActiveScope] = useState('Household');

  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const dateFilters = [
    'This Month',
    'Last Month',
    '3 Months',
    '6 Months',
    'YTD'
  ];

  const getDateRange = (filter: string) => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (filter) {
      case 'This Month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'Last Month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case '3 Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case '6 Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        break;
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return { 
      start: startDate.toISOString().split('T')[0], 
      end: endDate.toISOString().split('T')[0] 
    };
  };

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        const { start, end } = getDateRange(activeDateFilter);
        const headers = activeScope === 'Household' ? undefined : { 'x-household-id': 'personal' };

        // Fetch Trends (last 4 months to display in chart)
        const trendsRes = await apiClient.get('/api/analytics/trends?months=4', headers);
        if (trendsRes.success) setTrends(trendsRes.data);

        // Fetch Categories
        const incRes = await apiClient.get(`/api/analytics/categories?type=INCOME&start_date=${start}&end_date=${end}`, headers);
        if (incRes.success) {
          setIncomeCategories(incRes.data);
          setTotalIncome(incRes.data.reduce((acc: number, item: any) => acc + (item.total_amount || 0), 0));
        }

        const expRes = await apiClient.get(`/api/analytics/categories?type=EXPENSE&start_date=${start}&end_date=${end}`, headers);
        if (expRes.success) {
          setExpenseCategories(expRes.data);
          setTotalExpense(expRes.data.reduce((acc: number, item: any) => acc + (item.total_amount || 0), 0));
        }
      } catch (err) {
        console.error('Failed to fetch insights', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
  }, [activeDateFilter, activeScope]);

  const netCashFlow = totalIncome - totalExpense;
  const isSurplus = netCashFlow >= 0;
  
  const formatCurrency = (val: number) => `₹${Math.abs(val).toLocaleString('en-IN')}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Insights & Cash Flow</Text>
            <Text style={styles.headerSubtitle}>Fiscal Intelligence</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.scopeDropdownBtn}
            onPress={() => setIsScopeMenuVisible(!isScopeMenuVisible)}
          >
            <View style={styles.scopeDot} />
            <Text style={styles.scopeLabel} numberOfLines={1}>{activeScope}</Text>
            <MaterialIcons name="expand-more" size={16} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>

      {/* Scope Menu Dropdown */}
      {isScopeMenuVisible && (
        <View style={styles.scopeMenu}>
          <Text style={styles.scopeMenuTitle}>SWITCH SCOPE</Text>
          <Pressable
            style={styles.scopeMenuItem}
            onPress={() => { setActiveScope('Household'); setIsScopeMenuVisible(false); }}
          >
            <Text style={[styles.scopeMenuItemText, activeScope === 'Household' && styles.scopeMenuItemTextActive]}>
              Household (All)
            </Text>
            {activeScope === 'Household' && <MaterialIcons name="check" size={16} color={colors.primary} />}
          </Pressable>
          <Pressable
            style={styles.scopeMenuItem}
            onPress={() => { setActiveScope('Personal'); setIsScopeMenuVisible(false); }}
          >
            <Text style={[styles.scopeMenuItemText, activeScope === 'Personal' && styles.scopeMenuItemTextActive]}>
              Personal Only
            </Text>
            {activeScope === 'Personal' && <MaterialIcons name="check" size={16} color={colors.primary} />}
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Date Period Selector Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateTabsScroll}>
            {dateFilters.map(filter => {
              const isActive = activeDateFilter === filter;
              return (
                <Pressable
                  key={filter}
                  style={[styles.datePill, isActive && styles.datePillActive]}
                  onPress={() => setActiveDateFilter(filter)}
                >
                  <Text style={[styles.datePillText, isActive && styles.datePillTextActive]}>
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Executive Cash Flow Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryGlow} />
            <MaterialIcons name="account-balance-wallet" size={72} color="rgba(120, 162, 142, 0.3)" style={styles.summaryBgIcon} />

            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>NET CASH FLOW</Text>
              {totalIncome > 0 && (
                <View style={styles.savedBadge}>
                  <MaterialIcons name="trending-up" size={13} color={colors.primaryFixed} />
                  <Text style={styles.savedBadgeText}>{((netCashFlow / totalIncome) * 100).toFixed(1)}% Saved</Text>
                </View>
              )}
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>{isSurplus ? '+' : '-'}{formatCurrency(netCashFlow)}</Text>
              <Text style={styles.balanceSubtext}>{isSurplus ? '(Net Surplus)' : '(Net Deficit)'}</Text>
            </View>
            <Text style={styles.summaryMetaText}>Calculated for {activeDateFilter}</Text>

            <View style={styles.breakdownGrid}>
              <View style={styles.breakdownBox}>
                <View style={styles.breakdownBoxHeader}>
                  <View style={[styles.breakdownDot, { backgroundColor: colors.primaryFixed }]} />
                  <Text style={styles.breakdownBoxLabel}>Inflow (Received)</Text>
                </View>
                <Text style={styles.breakdownBoxValue}>{formatCurrency(totalIncome)}</Text>
                <Text style={styles.breakdownBoxSubtext} numberOfLines={1}>{incomeCategories.length} sources</Text>
              </View>

              <View style={styles.breakdownBox}>
                <View style={styles.breakdownBoxHeader}>
                  <View style={[styles.breakdownDot, { backgroundColor: colors.secondaryFixed }]} />
                  <Text style={styles.breakdownBoxLabel}>Outflow (Spent)</Text>
                </View>
                <Text style={styles.breakdownBoxValue}>{formatCurrency(totalExpense)}</Text>
                <Text style={styles.breakdownBoxSubtext} numberOfLines={1}>{expenseCategories.length} categories</Text>
              </View>
            </View>
          </View>

          {/* Interactive Cash Flow Trend Chart Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Inflow vs. Outflow</Text>
                <Text style={styles.cardSubtitle}>Monthly pace analysis</Text>
              </View>
            </View>

            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColorBox, { backgroundColor: colors.primaryContainer }]} />
                <Text style={styles.legendText}>Inflow</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColorBox, { backgroundColor: colors.surfaceVariant }]} />
                <Text style={styles.legendText}>Outflow</Text>
              </View>
            </View>

            <View style={styles.chartContainer}>
              {trends.length === 0 && <Text style={{color: colors.onSurfaceVariant, fontSize: 12, alignSelf: 'center', marginVertical: 30}}>No trend data available.</Text>}
              
              {trends.map((t, idx) => {
                const max = Math.max(...trends.map(x => Math.max(x.income, x.expense))) || 1;
                const inHeight = Math.max(5, (t.income / max) * 100);
                const outHeight = Math.max(5, (t.expense / max) * 100);
                const net = t.net_cash_flow;

                return (
                  <View style={styles.chartColumn} key={idx}>
                    <Text style={[styles.chartColValue, net < 0 && { color: colors.secondary, fontFamily: 'Inter_600SemiBold' }]}>
                      {net >= 0 ? '+' : '-'}{Math.abs(net / 1000).toFixed(1)}k
                    </Text>
                    <View style={styles.chartBars}>
                      <View style={[styles.chartBarInflow, { height: `${inHeight}%` }]} />
                      <View style={[styles.chartBarOutflow, { height: `${outHeight}%`, backgroundColor: net < 0 ? colors.secondary : colors.surfaceVariant }]} />
                    </View>
                    <Text style={styles.chartColLabel}>{t.month_key.split('-')[1]}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Expense Analysis Breakdown Section */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.headerIconBox, { backgroundColor: 'rgba(255, 222, 164, 0.5)' }]}>
                  <MaterialIcons name="north-east" size={18} color={colors.secondary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Expense Outflow</Text>
                  <Text style={styles.cardSubtitle}>{formatCurrency(totalExpense)} across {expenseCategories.length} categories</Text>
                </View>
              </View>
            </View>

            {totalExpense > 0 && (
              <View style={styles.progressBar}>
                {expenseCategories.slice(0, 5).map((cat, i) => {
                  const pct = (cat.total_amount / totalExpense) * 100;
                  const bgColors = [colors.primaryContainer, colors.secondary, colors.tertiaryContainer, colors.surfaceTint, colors.outline];
                  return <View key={cat.category_id} style={[styles.progressSegment, { width: `${pct}%`, backgroundColor: bgColors[i % bgColors.length] }]} />;
                })}
              </View>
            )}

            <View style={styles.dividerList}>
              {expenseCategories.length === 0 && <Text style={{color: colors.onSurfaceVariant, fontSize: 12, paddingVertical: 10, textAlign: 'center'}}>No expenses in this period.</Text>}
              {expenseCategories.map((cat, idx) => (
                <Pressable key={cat.category_id} style={styles.expenseItem}>
                  <View style={styles.expenseLeft}>
                    <View style={styles.expenseIconBox}>
                      <MaterialIcons name={getMaterialIcon(cat.category_icon)} size={18} color={cat.category_color || colors.primaryContainer} />
                    </View>
                    <View>
                      <View style={styles.expenseNameRow}>
                        <Text style={styles.expenseName}>{cat.category_name}</Text>
                      </View>
                      <Text style={styles.expenseDesc}>{cat.transaction_count} transactions</Text>
                    </View>
                  </View>
                  <View style={styles.expenseRight}>
                    <View style={styles.expenseValues}>
                      <Text style={styles.expenseValue}>{formatCurrency(cat.total_amount)}</Text>
                      <Text style={styles.expensePercent}>{((cat.total_amount / (totalExpense || 1)) * 100).toFixed(1)}%</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Income Analysis Breakdown Section */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.headerIconBox, { backgroundColor: 'rgba(192, 236, 214, 0.5)' }]}>
                  <MaterialIcons name="south-west" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Income Sources</Text>
                  <Text style={styles.cardSubtitle}>{formatCurrency(totalIncome)} across {incomeCategories.length} sources</Text>
                </View>
              </View>
            </View>

            <View style={styles.itemList}>
              {incomeCategories.length === 0 && <Text style={{color: colors.onSurfaceVariant, fontSize: 12, paddingVertical: 10, textAlign: 'center'}}>No income in this period.</Text>}
              {incomeCategories.map((cat) => (
                <View key={cat.category_id} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <View style={styles.itemIconText}>
                      <Text style={styles.itemIconTextLabel}>{cat.category_name.substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.itemName}>{cat.category_name}</Text>
                      <Text style={styles.itemDesc}>{cat.transaction_count} transactions</Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemValue}>{formatCurrency(cat.total_amount)}</Text>
                    <Text style={styles.itemPercent}>{((cat.total_amount / (totalIncome || 1)) * 100).toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)', backgroundColor: 'rgba(244, 251, 247, 0.9)', zIndex: 40,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: colors.primary, lineHeight: 22 },
  headerSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceVariant },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scopeDropdownBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  scopeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceTint },
  scopeLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurface, maxWidth: 90 },
  scopeMenu: {
    position: 'absolute', top: 56, right: 20, zIndex: 50, backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16, padding: 8, borderWidth: 1, borderColor: 'rgba(193, 200, 194, 0.3)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6, minWidth: 200,
  },
  scopeMenuTitle: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceVariant, paddingHorizontal: 12, paddingVertical: 6, letterSpacing: 0.5 },
  scopeMenuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  scopeMenuItemText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurface },
  scopeMenuItemTextActive: { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 16 },
  dateTabsScroll: { gap: 8, paddingVertical: 4 },
  datePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: 'rgba(193, 200, 194, 0.2)' },
  datePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  datePillText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  datePillTextActive: { color: colors.onPrimary },
  summaryCard: {
    backgroundColor: colors.primaryContainer, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4, overflow: 'hidden',
  },
  summaryGlow: { position: 'absolute', right: -40, bottom: -40, width: 176, height: 176, borderRadius: 88, backgroundColor: 'rgba(62, 102, 85, 0.1)' },
  summaryBgIcon: { position: 'absolute', right: 16, top: 16, zIndex: 0 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, zIndex: 10 },
  summaryLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#78a28e', letterSpacing: 0.5 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(62, 102, 85, 0.3)', borderWidth: 1, borderColor: 'rgba(192, 236, 214, 0.2)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 },
  savedBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.primaryFixed },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4, zIndex: 10 },
  balanceAmount: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, color: '#ffffff', letterSpacing: -0.5 },
  balanceSubtext: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.primaryFixedDim },
  summaryMetaText: { fontFamily: 'Inter_500Medium', fontSize: 10, color: 'rgba(120, 162, 142, 0.9)', marginBottom: 20, zIndex: 10 },
  breakdownGrid: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(120, 162, 142, 0.2)', zIndex: 10 },
  breakdownBox: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.15)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  breakdownBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  breakdownDot: { width: 6, height: 6, borderRadius: 3 },
  breakdownBoxLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#78a28e' },
  breakdownBoxValue: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: '#ffffff' },
  breakdownBoxSubtext: { fontFamily: 'Inter_500Medium', fontSize: 10, color: 'rgba(120, 162, 142, 0.8)', marginTop: 2 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(193, 200, 194, 0.2)', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: colors.onSurface, marginBottom: 2 },
  cardSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendColorBox: { width: 10, height: 10, borderRadius: 2 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, paddingHorizontal: 10, paddingBottom: 8 },
  chartColumn: { alignItems: 'center', width: 45 },
  chartColValue: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceVariant, marginBottom: 8 },
  chartBars: { width: 24, height: 90, justifyContent: 'flex-end', flexDirection: 'row', gap: 2, alignItems: 'flex-end', marginBottom: 8 },
  chartBarInflow: { width: 11, backgroundColor: colors.primaryContainer, borderRadius: 4 },
  chartBarOutflow: { width: 11, backgroundColor: colors.surfaceVariant, borderRadius: 4 },
  chartColLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.onSurfaceVariant },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  progressBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 16, gap: 2 },
  progressSegment: { height: '100%' },
  dividerList: { gap: 12 },
  expenseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 12 },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  expenseIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  expenseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  expenseName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurface },
  expenseDesc: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  expenseRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expenseValues: { alignItems: 'flex-end' },
  expenseValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurface },
  expensePercent: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  itemList: { gap: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  itemIconText: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  itemIconTextLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary },
  itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurface, marginBottom: 2 },
  itemDesc: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  itemRight: { alignItems: 'flex-end' },
  itemValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurface },
  itemPercent: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
});
