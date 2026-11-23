import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Linking, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';

interface Status {
  configured: boolean;
  available: boolean;
  reason?: string;
  requiredEnv: string[];
  coverage: { stocksAndEtfs: string; mutualFunds: string };
  clientCode?: string;
  autoRefreshPrices?: boolean;
  priceRefreshMinutes?: number;
  instruments?: { count: number; loadedAt: string | null };
  lastSync?: Record<string, { status: string; at: string }>;
}
interface PreviewHolding {
  symbol: string; exchange: string; isin: string; quantity: number; averagePrice: number; ltp: number;
  currentValue: number; pnl: number; pnlPct: number; isNewSecurity: boolean;
}
interface Preview { totals: { holdingsCount: number; invested: number; currentValue: number; pnl: number; pnlPct: number }; holdings: PreviewHolding[] }
interface Quote { symbol: string; found: boolean; price?: number; changePct?: number | null }

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const inr2 = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never');

export const AngelOneScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [symbols, setSymbols] = useState('');
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/integrations/angelone/status');
      setStatus(res.data);
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || 'Could not load the Angel One status.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (key: string, call: () => Promise<any>, onOk: (d: any) => string | void) => {
    setBusy(key);
    setMessage(null);
    try {
      const res = await call();
      const text = onOk(res.data);
      if (text) setMessage({ ok: true, text });
      load();
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || 'Something went wrong.' });
    } finally {
      setBusy(null);
    }
  };

  const test = () => run('test', () => apiClient.post('/api/integrations/angelone/test', {}), (d) => `Connected as ${d.name} (${d.clientCode}).`);
  const prices = () => run('prices', () => apiClient.post('/api/integrations/angelone/prices/sync', {}), (d) =>
    `Prices refreshed: ${d.updated} of ${d.total} updated${d.stale ? `, ${d.stale} could not be priced` : ''}.`);
  const loadPreview = () => run('preview', () => apiClient.get('/api/integrations/angelone/holdings'), (d) => { setPreview(d); });
  const importHoldings = () => {
    Alert.alert('Import holdings?', 'They are saved on a separate "Angel One (Demat)" account. Running it again updates them and never creates duplicates.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import', onPress: () => run('sync', () => apiClient.post('/api/integrations/angelone/holdings/sync', {}), (d) => {
          setPreview(null);
          return `Imported ${d.snapshotsSaved} holdings${d.securitiesCreated ? `, ${d.securitiesCreated} new securities` : ''}${d.closedPositions ? `, ${d.closedPositions} sold positions closed` : ''}.`;
        }),
      },
    ]);
  };
  const lookup = () => {
    const list = symbols.split(/[ ,]+/).filter(Boolean);
    if (list.length) run('quotes', () => apiClient.get(`/api/integrations/angelone/quotes?symbols=${encodeURIComponent(list.join(','))}`), (d) => { setQuotes(d); });
  };

  const Button: React.FC<{ label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; k: string; onPress: () => void; ghost?: boolean }> = ({ label, icon, k, onPress, ghost }) => (
    <Pressable style={[styles.btn, ghost && styles.btnGhost, busy === k && { opacity: 0.7 }]} disabled={!!busy} onPress={onPress}>
      {busy === k ? <ActivityIndicator color={ghost ? colors.primary : colors.onPrimary} /> : (
        <>
          <MaterialIcons name={icon} size={18} color={ghost ? colors.primary : colors.onPrimary} />
          <Text style={[styles.btnText, ghost && { color: colors.primary }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerBtn} hitSlop={8}><MaterialIcons name="arrow-back" size={22} color={colors.primary} /></Pressable>
        <Text style={styles.headerTitle}>Angel One</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.hero}>
            <MaterialIcons name="electrical-services" size={24} color={colors.primaryFixed} />
            <Text style={styles.heroTitle}>Live prices and holdings</Text>
            <Text style={styles.heroText}>NSE/BSE prices for your stocks and ETFs, and your demat holdings, straight from Angel One SmartAPI.</Text>
          </View>

          {!!status && (
            <View style={styles.noteBox}>
              <MaterialIcons name="info-outline" size={18} color={colors.onSecondaryContainer} />
              <Text style={styles.noteText}>{status.coverage.mutualFunds}</Text>
            </View>
          )}

          {message && (
            <View style={[styles.msg, { backgroundColor: message.ok ? colors.primaryFixed : colors.errorContainer }]}>
              <MaterialIcons name={message.ok ? 'check-circle' : 'error-outline'} size={18} color={message.ok ? colors.onPrimaryFixed : colors.onErrorContainer} />
              <Text style={[styles.msgText, { color: message.ok ? colors.onPrimaryFixed : colors.onErrorContainer }]}>{message.text}</Text>
            </View>
          )}

          {status && !status.available ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Set up Angel One</Text>
              <Text style={styles.help}>{status.reason}</Text>
              {!status.configured && (
                <>
                  <Text style={styles.help}>
                    1. Create an app at smartapi.angelone.in to get an API key.{'\n'}
                    2. In your Angel One account enable TOTP and copy the secret shown beside the QR code.{'\n'}
                    3. Add these to backend/.env on your server and restart it:
                  </Text>
                  <View style={styles.code}><Text style={styles.codeText}>{status.requiredEnv.map((k) => `${k}=`).join('\n')}</Text></View>
                  <Text style={styles.warn}>These are secrets. They stay on your server, never in this app. Keep the file private and never commit it.</Text>
                  <Pressable onPress={() => Linking.openURL('https://smartapi.angelone.in')}><Text style={styles.link}>Open SmartAPI portal</Text></Pressable>
                </>
              )}
            </View>
          ) : status && (
            <>
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>Connection</Text>
                  <Text style={styles.help}>Client {status.clientCode}</Text>
                </View>
                <Button label="Test connection" icon="electrical-services" k="test" onPress={test} />
                <Button label="Refresh prices now" icon="refresh" k="prices" onPress={prices} ghost />
                <Text style={styles.help}>
                  {status.autoRefreshPrices ? `Prices refresh automatically every ${status.priceRefreshMinutes} minutes during market hours.` : 'Prices refresh only when you tap the button.'}
                  {'\n'}Last price refresh: {when(status.lastSync?.prices?.at)}{status.lastSync?.prices?.status === 'FAILED' ? ' (failed)' : ''}
                  {'\n'}Last holdings import: {when(status.lastSync?.holdings?.at)}{status.lastSync?.holdings?.status === 'FAILED' ? ' (failed)' : ''}
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Your Angel One holdings</Text>
                {!preview ? (
                  <>
                    <Text style={styles.help}>Preview reads your demat account without saving anything. Then import it in one tap.</Text>
                    <Button label="Preview holdings" icon="download" k="preview" onPress={loadPreview} ghost />
                  </>
                ) : preview.holdings.length === 0 ? (
                  <Text style={styles.help}>Angel One reports no holdings on this account.</Text>
                ) : (
                  <>
                    <View style={styles.totals}>
                      <View><Text style={styles.help}>Invested</Text><Text style={styles.tv}>{inr(preview.totals.invested)}</Text></View>
                      <View><Text style={styles.help}>Value</Text><Text style={styles.tv}>{inr(preview.totals.currentValue)}</Text></View>
                      <View><Text style={styles.help}>P&L</Text><Text style={[styles.tv, { color: preview.totals.pnl >= 0 ? colors.primaryContainer : colors.error }]}>{preview.totals.pnl >= 0 ? '+' : '-'}{inr(Math.abs(preview.totals.pnl))}</Text></View>
                    </View>
                    {preview.holdings.map((h) => (
                      <View key={h.isin} style={styles.hRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.hName}>{h.symbol}{h.isNewSecurity ? '  · new' : ''}</Text>
                          <Text style={styles.help}>{h.quantity} × {inr2(h.ltp)} (avg {inr2(h.averagePrice)})</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.hName}>{inr(h.currentValue)}</Text>
                          <Text style={[styles.help, { color: h.pnl >= 0 ? colors.primaryContainer : colors.error, fontFamily: 'Inter_700Bold' }]}>{h.pnl >= 0 ? '+' : '-'}{inr(Math.abs(h.pnl))} ({h.pnlPct}%)</Text>
                        </View>
                      </View>
                    ))}
                    <Button label="Import into PFinanc" icon="download" k="sync" onPress={importHoldings} />
                  </>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Look up live prices</Text>
                <TextInput style={styles.input} value={symbols} onChangeText={setSymbols} placeholder="e.g. RELIANCE, TCS" placeholderTextColor={colors.outline} autoCapitalize="characters" autoCorrect={false} onSubmitEditing={lookup} returnKeyType="search" />
                <Button label="Look up" icon="search" k="quotes" onPress={lookup} ghost />
                {quotes?.map((q) => (
                  <View key={q.symbol} style={styles.hRow}>
                    <Text style={styles.hName}>{q.symbol}</Text>
                    {q.found ? (
                      <Text style={styles.hName}>{inr2(q.price!)}{q.changePct != null ? <Text style={{ color: q.changePct >= 0 ? colors.primaryContainer : colors.error }}>  {q.changePct >= 0 ? '+' : ''}{q.changePct}%</Text> : null}</Text>
                    ) : <Text style={styles.help}>not found</Text>}
                  </View>
                ))}
                <Text style={styles.help}>NSE by default. Prices can be delayed; mutual funds are not covered.</Text>
              </View>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerLow },
  headerTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.primary },
  pad: { paddingHorizontal: 20, gap: 14 },
  hero: { backgroundColor: colors.primaryContainer, borderRadius: 22, padding: 20, gap: 8 },
  heroTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 19, color: colors.onPrimary },
  heroText: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, color: colors.onPrimaryContainer },
  noteBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.secondaryContainer },
  noteText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: colors.onSecondaryContainer },
  msg: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, alignItems: 'flex-start' },
  msgText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)' },
  cardTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.onSurface },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  help: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, color: colors.onSurfaceVariant },
  warn: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 18, color: '#92400e' },
  link: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.primaryContainer },
  code: { backgroundColor: colors.surfaceContainerLow, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.outlineVariant },
  codeText: { fontFamily: 'Menlo', fontSize: 12, lineHeight: 18, color: colors.onSurface },
  btn: { height: 48, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContainer },
  btnGhost: { backgroundColor: colors.surfaceContainer },
  btnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onPrimary },
  totals: { flexDirection: 'row', justifyContent: 'space-between' },
  tv: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.onSurface, marginTop: 2 },
  hRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(193,200,194,0.3)' },
  hName: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  input: { height: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant, fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.onSurface },
});
