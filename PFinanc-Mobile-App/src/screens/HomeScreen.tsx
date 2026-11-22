import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { getMaterialIcon } from '../utils/iconMapper';

type AddType = 'expense' | 'income' | 'transfer';

type HomeProps = {
  onNavigate?: (screen: string, params?: { filter?: string }) => void;
  onAddEntry?: (type: AddType) => void;
  refreshKey?: number;
};

const greetingForHour = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const friendlyDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const HomeScreen: React.FC<HomeProps> = ({ onNavigate, onAddEntry, refreshKey }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const go = (screen: string, params?: { filter?: string }) => onNavigate && onNavigate(screen, params);

  const [hidden, setHidden] = useState(false);
  const [scope, setScope] = useState<'Household' | 'Personal'>('Household');
  const [scopeOpen, setScopeOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setFailed(false);
    try {
      const res = await apiClient.get(`/api/dashboard?view=${scope === 'Personal' ? 'personal' : 'household'}`);
      if (res.success) setData(res.data); else setFailed(true);
    } catch (err) {
      console.error('Failed to fetch dashboard', err);
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const money = (v: number) => (hidden ? '₹ ••••' : `₹${Math.abs(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);

  const income = data?.thisMonth?.income || 0;
  const spent = data?.thisMonth?.expenses || 0;
  const net = income - spent;
  const totalMoney = data?.netWorth?.netWorth || 0;
  const invested = data?.portfolio?.totalCurrentValue || 0;
  const accounts: any[] = data?.cashPosition?.accounts || [];
  const recent: any[] = (data?.recentTransactions || []).slice(0, 5);
  const firstName = (user?.name || 'there').split(' ')[0];

  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' });
  const summary = net >= 0
    ? `You saved ${money(net)} so far in ${monthName}. 👍`
    : `You spent ${money(net)} more than you earned in ${monthName}.`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ zIndex: 20 }}>
          <Text style={styles.greeting}>{greetingForHour()}, {firstName}</Text>
          <Pressable style={styles.scopeBtn} onPress={() => setScopeOpen(v => !v)} hitSlop={6}>
            <Text style={styles.scopeText}>{scope === 'Household' ? 'Whole family' : 'Only me'}</Text>
            <MaterialIcons name="arrow-drop-down" size={18} color={colors.onSurfaceVariant} />
          </Pressable>
          {scopeOpen && (
            <View style={styles.scopeMenu}>
              {([['Household', 'Whole family'], ['Personal', 'Only me']] as const).map(([key, label]) => (
                <Pressable key={key} style={styles.scopeItem} onPress={() => { setScope(key); setScopeOpen(false); }}>
                  <Text style={[styles.scopeItemText, scope === key && { fontFamily: 'Inter_700Bold', color: colors.primary }]}>{label}</Text>
                  {scope === key && <MaterialIcons name="check" size={16} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => setHidden(v => !v)} accessibilityLabel="Hide or show amounts">
            <MaterialIcons name={hidden ? 'visibility-off' : 'visibility'} size={22} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => go('notifications')} accessibilityLabel="Notifications">
            <MaterialIcons name="notifications-none" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {failed && (
          <Pressable style={styles.errorBox} onPress={() => load()}>
            <MaterialIcons name="wifi-off" size={18} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>Couldn't load the latest data. Tap to try again.</Text>
          </Pressable>
        )}

        {/* 1. Total money */}
        <Pressable onPress={() => go('insights')}>
          <LinearGradient colors={[colors.primaryContainer, '#04150f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroLabel}>Your total money</Text>
            {loading ? <ActivityIndicator color={colors.onPrimary} style={{ alignSelf: 'flex-start', marginTop: 12 }} /> : (
              <Text style={styles.heroValue}>{hidden ? '₹ ••••••' : `${totalMoney < 0 ? '-' : ''}₹${Math.abs(totalMoney).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</Text>
            )}
            <Text style={styles.heroHint}>Savings + investments − loans</Text>
            <View style={styles.heroLink}>
              <Text style={styles.heroLinkText}>See full report</Text>
              <MaterialIcons name="arrow-forward" size={16} color={colors.primaryFixed} />
            </View>
          </LinearGradient>
        </Pressable>

        {/* 2. Big, obvious actions */}
        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => onAddEntry && onAddEntry('expense')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.errorContainer }]}>
              <MaterialIcons name="arrow-upward" size={24} color={colors.error} />
            </View>
            <Text style={styles.actionText}>Money Out</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => onAddEntry && onAddEntry('income')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="arrow-downward" size={24} color={colors.primaryContainer} />
            </View>
            <Text style={styles.actionText}>Money In</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => onAddEntry && onAddEntry('transfer')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.secondaryFixed }]}>
              <MaterialIcons name="swap-horiz" size={24} color={colors.onSecondaryFixed} />
            </View>
            <Text style={styles.actionText}>Move Money</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => go('advisor')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.tertiaryFixed }]}>
              <MaterialIcons name="chat-bubble-outline" size={22} color={colors.tertiaryContainer} />
            </View>
            <Text style={styles.actionText}>Ask Help</Text>
          </Pressable>
        </View>

        {/* 3. This month — two numbers and one sentence */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{monthName} so far</Text>
          <View style={styles.pair}>
            <Pressable style={[styles.pairBox, { backgroundColor: colors.primaryFixed }]} onPress={() => go('history', { filter: 'Income' })}>
              <Text style={styles.pairLabel}>Money In</Text>
              <Text style={[styles.pairValue, { color: colors.primaryContainer }]}>{money(income)}</Text>
            </Pressable>
            <Pressable style={[styles.pairBox, { backgroundColor: colors.errorContainer }]} onPress={() => go('history', { filter: 'Expenses' })}>
              <Text style={styles.pairLabel}>Money Out</Text>
              <Text style={[styles.pairValue, { color: colors.onErrorContainer }]}>{money(spent)}</Text>
            </Pressable>
          </View>
          {!loading && <Text style={styles.summary}>{summary}</Text>}
        </View>

        {/* 4. Accounts */}
        <View style={styles.rowHead}>
          <Text style={styles.sectionTitle}>Your accounts</Text>
          <Pressable onPress={() => go('accounts')} hitSlop={8}><Text style={styles.link}>See all</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {accounts.length === 0 && !loading ? (
            <Pressable style={[styles.account, styles.addAccount]} onPress={() => go('accounts')}>
              <MaterialIcons name="add-circle-outline" size={26} color={colors.primary} />
              <Text style={styles.addAccountText}>Add your first account</Text>
            </Pressable>
          ) : accounts.map(acc => (
            <Pressable key={acc.id} style={styles.account} onPress={() => go('accounts')}>
              <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} />
              <Text style={styles.accountName} numberOfLines={1}>{acc.name}</Text>
              <Text style={styles.accountBalance}>{money(acc.current_balance)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 5. Latest entries */}
        <View style={styles.rowHead}>
          <Text style={styles.sectionTitle}>Latest entries</Text>
          <Pressable onPress={() => go('history')} hitSlop={8}><Text style={styles.link}>See all</Text></Pressable>
        </View>
        <View style={styles.list}>
          {loading ? <ActivityIndicator color={colors.primary} style={{ margin: 20 }} /> : recent.length === 0 ? (
            <Pressable style={styles.empty} onPress={() => onAddEntry && onAddEntry('expense')}>
              <Text style={styles.emptyText}>Nothing here yet. Tap to add your first entry.</Text>
            </Pressable>
          ) : recent.map((t, i) => {
            const out = t.transaction_type === 'EXPENSE';
            return (
              <React.Fragment key={t.id}>
                <Pressable style={styles.txn} onPress={() => go('history')}>
                  <View style={[styles.txnIcon, { backgroundColor: t.category_color || colors.surfaceContainer }]}>
                    <MaterialIcons name={getMaterialIcon(t.category_icon)} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnName} numberOfLines={1}>{t.merchant_name || t.description || t.category_name || 'Entry'}</Text>
                    <Text style={styles.txnSub}>{t.category_name || 'Other'} · {friendlyDate(t.transaction_date)}</Text>
                  </View>
                  <Text style={[styles.txnAmount, { color: out ? colors.onSurface : colors.primaryContainer }]}>
                    {hidden ? '••••' : `${out ? '-' : '+'}₹${Number(t.amount || 0).toLocaleString('en-IN')}`}
                  </Text>
                </Pressable>
                {i < recent.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* 6. Go deeper — details live elsewhere */}
        <Pressable style={styles.deepRow} onPress={() => go('portfolio')}>
          <View style={[styles.deepIcon, { backgroundColor: colors.primaryFixed }]}>
            <MaterialIcons name="show-chart" size={22} color={colors.primaryContainer} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deepTitle}>Investments</Text>
            <Text style={styles.deepSub}>{loading ? ' ' : `Worth ${money(invested)}`} · see profit & loss</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.outline} />
        </Pressable>
        <Pressable style={styles.deepRow} onPress={() => go('insights')}>
          <View style={[styles.deepIcon, { backgroundColor: colors.tertiaryFixed }]}>
            <MaterialIcons name="pie-chart-outline" size={22} color={colors.tertiaryContainer} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deepTitle}>Reports & analysis</Text>
            <Text style={styles.deepSub}>Where your money goes, cash flow, trends</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.outline} />
        </Pressable>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { zIndex: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  greeting: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: colors.primary },
  scopeBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  scopeText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  scopeMenu: { position: 'absolute', top: 54, left: 0, minWidth: 160, backgroundColor: colors.surfaceContainerLowest, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant, paddingVertical: 4, elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  scopeItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  scopeItemText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurface },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.errorContainer },
  errorText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onErrorContainer },
  hero: { borderRadius: 24, padding: 22 },
  heroLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onPrimaryContainer },
  heroValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 38, color: colors.onPrimary, marginTop: 6, letterSpacing: -1 },
  heroHint: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onPrimaryContainer, marginTop: 4 },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16, alignSelf: 'flex-start' },
  heroLinkText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primaryFixed },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { flex: 1, alignItems: 'center', gap: 8 },
  actionIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurface, textAlign: 'center' },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)' },
  cardTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: colors.onSurface, marginBottom: 12 },
  pair: { flexDirection: 'row', gap: 12 },
  pairBox: { flex: 1, borderRadius: 16, padding: 14 },
  pairLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurfaceVariant },
  pairValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, marginTop: 4 },
  summary: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onSurface, marginTop: 14 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: colors.onSurface },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.primaryContainer },
  account: { width: 160, backgroundColor: colors.surfaceContainerLowest, borderRadius: 18, padding: 14, gap: 4, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)' },
  accountName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onSurface, marginTop: 6 },
  accountBalance: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.primary },
  addAccount: { alignItems: 'center', justifyContent: 'center', width: 220, paddingVertical: 20, borderStyle: 'dashed' },
  addAccountText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary },
  list: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)', overflow: 'hidden' },
  txn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  txnIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txnName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.onSurface },
  txnSub: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  txnAmount: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  divider: { height: 1, backgroundColor: 'rgba(193,200,194,0.3)', marginLeft: 68 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.primary, textAlign: 'center' },
  deepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceContainerLowest, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)' },
  deepIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deepTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.onSurface },
  deepSub: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
});
