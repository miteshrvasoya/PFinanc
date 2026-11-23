import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import { SignalChart } from '../components/SignalChart';

const DISCLAIMER = 'Educational/technical signals only. Not investment advice. Do your own research.';
const inr = (n?: number | null) => (n == null ? '–' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never');
const LABEL: Record<string, { bg: string; fg: string }> = {
  STRONG_BUY: { bg: '#bbf7d0', fg: '#14532d' }, BUY: { bg: '#d1fae5', fg: '#065f46' }, WATCH: { bg: '#e0f2fe', fg: '#075985' }, HOLD: { bg: '#e5e7eb', fg: '#374151' },
  REDUCE: { bg: '#fef3c7', fg: '#92400e' }, SELL: { bg: '#fecdd3', fg: '#9f1239' }, AVOID: { bg: '#ffe4e6', fg: '#be123c' },
};
type Tab = 'top' | 'holdings' | 'watchlist' | 'backtest';

const Badge: React.FC<{ label: string; text?: string }> = ({ label, text }) => {
  const c = LABEL[label] || LABEL.HOLD;
  return <View style={[s.badge, { backgroundColor: c.bg }]}><Text style={[s.badgeText, { color: c.fg }]}>{text || label.replace('_', ' ')}</Text></View>;
};
const Disclaimer = () => (
  <View style={s.disclaimer}>
    <MaterialIcons name="info-outline" size={16} color="#92400e" />
    <Text style={s.disclaimerText}><Text style={{ fontFamily: 'Inter_700Bold' }}>{DISCLAIMER}</Text> Signals come from fixed rules on past prices and can be wrong. Nothing here places orders.</Text>
  </View>
);
const Levels: React.FC<{ l: any; size?: any }> = ({ l, size }) => !l ? null : (
  <View style={{ gap: 6 }}>
    <View style={s.grid}>
      {[['Entry zone', `${inr(l.entryLow)} – ${inr(l.entryHigh)}`], ['Stop', inr(l.stop)], ['Target 1', inr(l.target1)], ['Target 2', inr(l.target2)], ['Risk : reward', l.riskReward ? `1 : ${l.riskReward}` : '–']].map(([k, v]) => (
        <View key={k} style={s.cell}><Text style={s.cellK}>{k}</Text><Text style={s.cellV}>{v}</Text></View>
      ))}
    </View>
    {l.extended && <Text style={s.warn}>Price is extended above its 20-day average, so the entry waits for a pullback.</Text>}
    {size && <Text style={s.muted}>Illustrative size: {size.quantity} shares (about {inr(size.capitalRequired)}), risking {inr(size.riskAmount)}.{size.cappedByConcentration ? ' Capped by the position-size limit.' : ''}</Text>}
  </View>
);

export const SignalsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('top');
  const [status, setStatus] = useState<any>(null);
  const [top, setTop] = useState<any>(null);
  const [holdings, setHoldings] = useState<any>(null);
  const [watch, setWatch] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sym, setSym] = useState('');
  const [bt, setBt] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const [st, tb, hd, wl, b] = await Promise.all([
        apiClient.get('/api/signals/status'), apiClient.get('/api/signals/top-buys?limit=10'), apiClient.get('/api/signals/holdings'),
        apiClient.get('/api/watchlist'), apiClient.get('/api/signals/backtest/latest'),
      ]);
      setStatus(st.data); setTop(tb.data); setHoldings(hd.data); setWatch(wl.data.items); if (b.data?.available) setBt(b.data);
      setError('');
      return st.data;
    } catch (e: any) { setError(e?.message || 'Could not load signals.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); return () => clearInterval(timer.current); }, [load]);

  const open = async (symbol: string) => {
    try { const r = await apiClient.get(`/api/signals/${encodeURIComponent(symbol)}`); setDetail(r.data); }
    catch (e: any) { Alert.alert('Could not open', e?.message || 'Try again.'); }
  };
  const runNow = async () => {
    try {
      await apiClient.post('/api/signals/run', {});
      setStatus((x: any) => ({ ...x, running: true }));
      clearInterval(timer.current);
      timer.current = setInterval(async () => { const st = await load(); if (st && !st.running) clearInterval(timer.current); }, 8000);
    } catch (e: any) { Alert.alert('Update failed', e?.message || 'Try again.'); }
  };
  const addSymbol = async () => {
    if (!sym.trim()) return;
    try { await apiClient.post('/api/watchlist', { symbol: sym.trim() }); setSym(''); load(); }
    catch (e: any) { Alert.alert('Could not add', e?.message || 'Try again.'); }
  };
  const runBacktest = async () => {
    setBusy(true);
    try { const r = await apiClient.post('/api/signals/backtest', {}); setBt(r.data); }
    catch (e: any) { Alert.alert('Backtest failed', e?.message || 'Try again.'); }
    finally { setBusy(false); }
  };

  const header = (title: string, back: () => void) => (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={back} hitSlop={10} accessibilityLabel="Back"><MaterialIcons name="arrow-back" size={24} color={colors.onSurface} /></Pressable>
      <Text style={s.title}>{title}</Text>
    </View>
  );

  if (detail) {
    const d = detail;
    return (
      <View style={s.screen}>
        {header(d.symbol, () => setDetail(null))}
        <ScrollView contentContainerStyle={s.body}>
          <View style={s.rowBetween}>
            <Text style={s.muted}>{d.asOfDate ? `As of ${d.asOfDate} close` : ''}{d.held ? ' · you hold this' : ''}</Text>
            {d.signal && <Badge label={d.signal.label} text={d.signal.labelText} />}
          </View>
          <Disclaimer />
          {d.dataUnreliable && <Text style={s.warnBox}>Data unreliable, so no signal is given: {d.note}</Text>}
          <View style={s.card}><SignalChart series={d.series} levels={d.levels} /></View>
          {d.signal && <>
            <Text style={s.muted}>Score {d.signal.score} · confidence {Math.round(d.signal.confidence * 100)}%</Text>
            <Levels l={d.levels} size={d.suggestedSize} />
            <View style={s.card}><Text style={s.h2}>Why</Text>{d.signal.reasons.map((r: string, i: number) => <Text key={i} style={s.bullet}>• {r}</Text>)}
              {d.signal.warnings?.length > 0 && <Text style={s.warn}>⚠ {d.signal.warnings.join(' · ')}</Text>}</View>
            {d.holding && <View style={s.card}><Text style={s.h2}>Your position</Text>
              <Text style={s.bullet}>{d.holding.quantity} shares at avg {inr(d.holding.averageCost)} · P&L {inr(d.holding.unrealizedPnl)} ({d.holding.unrealizedPnlPct}%) · trailing stop {inr(d.holding.trailingStop)}</Text>
              {d.holding.longTermNotes?.map((n: string, i: number) => <Text key={i} style={[s.bullet, { color: '#075985' }]}>{n}</Text>)}</View>}
          </>}
          <Text style={s.foot}>{DISCLAIMER}</Text>
        </ScrollView>
      </View>
    );
  }

  const tabs: Array<[Tab, string]> = [['top', 'Top buys'], ['holdings', 'Holdings'], ['watchlist', 'Watchlist'], ['backtest', 'Backtest']];
  const m = bt?.metrics;
  return (
    <View style={s.screen}>
      {header('Stock Signals', onBack)}
      <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={s.rowBetween}>
          <Text style={s.muted}>{status?.lastRun ? `Closing prices of ${status.lastRun.asOfDate} · updated ${when(status.lastRun.updatedAt)}` : 'No signals generated yet'}</Text>
          <Pressable onPress={runNow} disabled={status?.running || !status?.angelOneConfigured} style={[s.btn, (status?.running || !status?.angelOneConfigured) && { opacity: 0.5 }]}>
            <Text style={s.btnText}>{status?.running ? 'Updating…' : 'Update'}</Text>
          </Pressable>
        </View>
        <Disclaimer />
        {status && !status.angelOneConfigured && <Text style={s.warnBox}>Angel One is not configured on the server, so no new data can be fetched.</Text>}
        {status?.running && <Text style={s.infoBox}>Fetching price history. This takes a few minutes because Angel One limits request speed.</Text>}
        {!!error && <Text style={s.err}>{error}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {tabs.map(([id, label]) => <Pressable key={id} onPress={() => setTab(id)} style={[s.tab, tab === id && s.tabOn]}><Text style={[s.tabText, tab === id && { color: colors.onPrimary }]}>{label}</Text></Pressable>)}
        </ScrollView>
        {loading && <ActivityIndicator color={colors.primaryContainer} />}

        {tab === 'top' && top && (top.items.length === 0
          ? <Text style={s.empty}>{top.note || 'No stock currently passes all the buy rules and the minimum risk-reward. That is normal on many days.'}</Text>
          : top.items.map((it: any, i: number) => (
            <Pressable key={it.symbol} style={s.card} onPress={() => open(it.symbol)}>
              <View style={s.rowBetween}><Text style={s.sym}>{i + 1}. {it.symbol}</Text><Badge label={it.label} text={it.labelText} /></View>
              <Text style={s.muted}>Close {inr(it.price)} · RSI {it.rsi ?? '–'} · score {it.score} · confidence {Math.round((it.confidence || 0) * 100)}%</Text>
              <Levels l={it.levels} size={it.suggestedSize} />
              {it.reasons.slice(0, 3).map((r: string, k: number) => <Text key={k} style={s.bullet}>• {r}</Text>)}
              <Text style={s.link}>View chart and indicators →</Text>
            </Pressable>
          )))}

        {tab === 'holdings' && holdings && (holdings.items.length === 0
          ? <Text style={s.empty}>No stock or ETF holdings found.</Text>
          : holdings.items.map((h: any) => (
            <Pressable key={h.symbol} style={s.card} onPress={() => open(h.symbol)}>
              <View style={s.rowBetween}><Text style={s.sym}>{h.symbol}</Text>{h.signal ? <Badge label={h.signal.label} text={h.signal.labelText} /> : <Text style={s.muted}>No signal</Text>}</View>
              <Text style={s.muted}>{h.quantity} @ avg {inr(h.averageCost)} · now {inr(h.currentPrice)}</Text>
              {h.signal ? <>
                <Text style={s.bullet}>P&L {inr(h.unrealizedPnl)} ({h.unrealizedPnlPct}%) · trailing stop {inr(h.trailingStop)}{h.trailingStopHit ? ' (hit)' : ''}</Text>
                {h.signal.reasons.slice(0, 3).map((r: string, k: number) => <Text key={k} style={s.bullet}>• {r}</Text>)}
                {h.longTermNotes?.map((n: string, k: number) => <Text key={k} style={[s.bullet, { color: '#075985' }]}>{n}</Text>)}
              </> : <Text style={s.warn}>{h.note}</Text>}
            </Pressable>
          )))}

        {tab === 'watchlist' && <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={sym} onChangeText={(t) => setSym(t.toUpperCase())} placeholder="Symbol, e.g. RELIANCE" autoCapitalize="characters" style={s.input} onSubmitEditing={addSymbol} />
            <Pressable style={s.btn} onPress={addSymbol}><Text style={s.btnText}>Add</Text></Pressable>
          </View>
          {watch.length === 0 ? <Text style={s.empty}>Your watchlist is empty. Added symbols are scored on the next update.</Text> : watch.map((w) => (
            <View key={w.id} style={[s.card, s.rowBetween]}>
              <Pressable onPress={() => open(w.symbol)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Text style={s.sym}>{w.symbol}</Text>{w.label && <Badge label={w.label} />}</Pressable>
              <Pressable hitSlop={10} accessibilityLabel={`Remove ${w.symbol}`} onPress={async () => { try { await apiClient.delete(`/api/watchlist/${encodeURIComponent(w.symbol)}`); load(); } catch (e: any) { Alert.alert('Could not remove', e?.message || ''); } }}>
                <MaterialIcons name="delete-outline" size={22} color={colors.outline} />
              </Pressable>
            </View>
          ))}
        </>}

        {tab === 'backtest' && <>
          <View style={s.infoBox}><Text style={s.infoText}><Text style={{ fontFamily: 'Inter_700Bold' }}>Past performance. </Text>Replays the same rules over stored history with costs and slippage. It shows how the rules behaved before, not how they will behave. {DISCLAIMER}</Text></View>
          <Pressable style={[s.btn, busy && { opacity: 0.5 }, { alignSelf: 'flex-start' }]} disabled={busy} onPress={runBacktest}><Text style={s.btnText}>{busy ? 'Running…' : 'Run backtest on my universe'}</Text></Pressable>
          {m ? <>
            <Text style={s.muted}>{m.startDate} to {m.endDate} · generated {when(bt.createdAt)}</Text>
            <View style={s.grid}>
              {[['Trades', m.trades], ['Win rate', `${m.winRatePct}%`], ['Average R', m.avgR], ['Expectancy (R)', m.expectancyR], ['CAGR', `${m.cagrPct}%`], ['Nifty 50 CAGR', m.benchmarkCagrPct == null ? '–' : `${m.benchmarkCagrPct}%`], ['Max drawdown', `${m.maxDrawdownPct}%`], ['Profit factor', m.profitFactor ?? '–']].map(([k, v]) => (
                <View key={String(k)} style={s.cell}><Text style={s.cellK}>{k}</Text><Text style={s.cellV}>{String(v)}</Text></View>
              ))}
            </View>
          </> : <Text style={s.empty}>No backtest yet. Run the update first so price history is stored.</Text>}
        </>}
        <Text style={s.foot}>{DISCLAIMER}</Text>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  body: { padding: 16, gap: 12, paddingBottom: 60 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(193,200,194,0.5)' },
  h2: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  sym: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  muted: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.onSurfaceVariant, flexShrink: 1 },
  bullet: { fontSize: 12.5, fontFamily: 'Inter_400Regular', color: colors.onSurface, lineHeight: 18 },
  warn: { fontSize: 12, color: '#92400e', fontFamily: 'Inter_500Medium' },
  warnBox: { fontSize: 12.5, color: '#92400e', backgroundColor: '#fef3c7', padding: 10, borderRadius: 12 },
  infoBox: { backgroundColor: '#e0f2fe', padding: 10, borderRadius: 12 },
  infoText: { fontSize: 12, color: '#075985', lineHeight: 17 },
  err: { color: colors.error, fontSize: 13 },
  empty: { textAlign: 'center', color: colors.onSurfaceVariant, padding: 20, fontSize: 13 },
  link: { fontSize: 12, color: colors.primaryContainer, fontFamily: 'Inter_700Bold' },
  foot: { fontSize: 11, color: colors.outline, textAlign: 'center', marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  disclaimer: { flexDirection: 'row', gap: 8, backgroundColor: '#fef3c7', padding: 10, borderRadius: 12, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 11.5, color: '#92400e', lineHeight: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { backgroundColor: colors.surfaceContainerLow, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: '31%', flexGrow: 1 },
  cellK: { fontSize: 10.5, color: colors.onSurfaceVariant },
  cellV: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: colors.surfaceContainerHigh },
  tabOn: { backgroundColor: colors.primaryContainer },
  tabText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.onSurfaceVariant },
  btn: { backgroundColor: colors.primaryContainer, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
  btnText: { color: colors.onPrimary, fontFamily: 'Inter_700Bold', fontSize: 13 },
  input: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.outlineVariant ?? '#c1c8c2', fontSize: 14 },
});
