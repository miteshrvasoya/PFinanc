import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl, Alert, Switch } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
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
type Tab = 'top' | 'all' | 'holdings' | 'watchlist' | 'backtest' | 'history' | 'settings';

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


const LineChart: React.FC<{ values: number[]; height?: number; color?: string; zero?: number; min?: number; max?: number }> = ({ values, height = 90, color = '#4f46e5', zero, min, max }) => {
  const [w, setW] = useState(0);
  const lo = min ?? Math.min(...values), hi = max ?? Math.max(...values);
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo || 1)) * (height - 12);
  const d = w > 0 && values.length > 1 ? values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`).join(' ') : '';
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={height}>
        {zero !== undefined && <Line x1={0} x2={w} y1={y(zero)} y2={y(zero)} stroke="#c8cfcb" strokeDasharray="3 3" />}
        <Path d={d} stroke={color} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
};

const SignalHistory: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { apiClient.get(`/api/signals/${encodeURIComponent(symbol)}/history`).then((r) => setItems(r.data.items)).catch(() => undefined); }, [symbol]);
  if (items.length < 2) return null;
  return (
    <View style={s.card}>
      <Text style={s.h2}>Score history <Text style={s.muted}>({items.length} stored daily runs)</Text></Text>
      <LineChart values={items.map((p) => p.score)} min={-100} max={100} zero={0} />
      {[...items].reverse().slice(0, 15).map((p) => (
        <View key={p.date} style={s.rowBetween}><Text style={s.muted}>{p.date}</Text><Text style={s.muted}>score {p.score}</Text><Badge label={p.label} text={p.labelText} /></View>
      ))}
    </View>
  );
};

const Stats: React.FC<{ rows: Array<[string, any]> }> = ({ rows }) => (
  <View style={s.grid}>{rows.map(([k, v]) => <View key={k} style={s.cell}><Text style={s.cellK}>{k}</Text><Text style={s.cellV}>{v == null ? '–' : String(v)}</Text></View>)}</View>
);

const BacktestView: React.FC<{ bt: any }> = ({ bt }) => {
  const m = bt.metrics;
  const eq: number[] = (bt.equityCurve || []).map((p: any) => (typeof p === 'number' ? p : p.equity));
  const [showAll, setShowAll] = useState(false);
  const trades = [...(bt.trades || [])].reverse();
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.muted}>{m.startDate} to {m.endDate} ({m.years} years) · {bt.symbols?.length ?? bt.symbolsCount} symbols · generated {when(bt.createdAt)}</Text>
      <Stats rows={[['Trades', m.trades], ['Win rate', `${m.winRatePct}%`], ['Average R', m.avgR], ['Expectancy (R)', m.expectancyR], ['Avg win (R)', m.avgWinR], ['Avg loss (R)', m.avgLossR], ['Profit factor', m.profitFactor],
        ['Total return', `${m.totalReturnPct}%`], ['CAGR', `${m.cagrPct}%`], ['Nifty 50 CAGR', m.benchmarkCagrPct == null ? null : `${m.benchmarkCagrPct}%`], ['Nifty 50 return', m.benchmarkTotalReturnPct == null ? null : `${m.benchmarkTotalReturnPct}%`],
        ['Max drawdown', `${m.maxDrawdownPct}%`], ['Time invested', `${m.exposurePct}%`], ['Costs paid', inr(m.totalCosts)], ['Wins / losses', `${m.wins} / ${m.losses}`]]} />
      {eq.length > 2 && <View style={s.card}><Text style={s.muted}>Equity curve (past performance)</Text><LineChart values={eq} height={120} /></View>}
      {bt.symbols?.length > 0 && <Text style={s.muted}>Symbols: {bt.symbols.join(', ')}</Text>}
      {bt.costs?.costs && <Text style={s.muted}>Costs modelled: brokerage {(bt.costs.costs.brokeragePct * 100).toFixed(3)}% (cap ₹{bt.costs.costs.brokerageCapInr}), STT {(bt.costs.costs.sttPct * 100).toFixed(2)}%, slippage {(bt.costs.costs.slippagePct * 100).toFixed(2)}%.</Text>}
      {bt.notes?.map((n: string, i: number) => <Text key={i} style={s.warn}>{n}</Text>)}
      {bt.issues?.length > 0 && <View style={s.card}><Text style={s.h2}>Skipped symbols ({bt.issues.length})</Text>{bt.issues.map((x: any, i: number) => <Text key={i} style={s.muted}>{x.symbol}: {x.message}</Text>)}</View>}
      {trades.length > 0 && (
        <View style={s.card}>
          <Text style={s.h2}>All trades ({bt.tradesTotal ?? trades.length}), newest first</Text>
          {(showAll ? trades : trades.slice(0, 25)).map((t: any, i: number) => (
            <View key={i} style={s.tradeRow}>
              <View style={s.rowBetween}><Text style={s.sym}>{t.symbol}</Text><Text style={[s.bullet, { color: t.pnl >= 0 ? '#059669' : '#dc2626', fontFamily: 'Inter_700Bold' }]}>{inr(t.pnl)} · {t.rMultiple}R</Text></View>
              <Text style={s.muted}>{t.entryDate} @ {t.entryPrice} → {t.exitDate} @ {t.exitPrice} · {String(t.reason).replace('_', ' ')} · {t.barsHeld} days · qty {t.quantity}</Text>
            </View>
          ))}
          {trades.length > 25 && <Pressable onPress={() => setShowAll(!showAll)}><Text style={s.link}>{showAll ? 'Show fewer' : `Show all ${trades.length} trades`}</Text></Pressable>}
        </View>
      )}
    </View>
  );
};

const SETTING_FIELDS: Array<[string, string, string]> = [
  ['sizing.capital', 'Capital for position sizing (₹)', 'Used only to illustrate share counts.'], ['sizing.riskPct', 'Risk per trade (%)', 'Share of capital lost if the stop is hit.'],
  ['sizing.maxPositionPct', 'Max position size (% of capital)', 'Concentration cap.'], ['trade.minRiskReward', 'Minimum risk : reward', 'Setups below this are not shown.'],
  ['trade.atrStopMultiple', 'Stop distance (× ATR)', ''], ['holdings.trailingAtrMultiple', 'Trailing stop (× ATR)', 'For stocks you hold.'],
  ['universe.minAvgTradedValue', 'Min 20-day avg traded value (₹)', 'Liquidity filter.'], ['universe.minCandles', 'Min daily candles', 'History needed before scoring.'],
];
const getPath = (o: any, p: string) => p.split('.').reduce((a, k) => a?.[k], o);

const SettingsPanel: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [preset, setPreset] = useState('');
  useEffect(() => {
    apiClient.get('/api/signals/settings').then((r) => {
      setData(r.data);
      setForm(Object.fromEntries(SETTING_FIELDS.map(([p]) => [p, String(getPath(r.data.config, p))])));
      setPreset((r.data.config.universe.presetSymbols || []).join(', '));
    }).catch((e) => Alert.alert('Could not load settings', e?.message || ''));
  }, []);
  if (!data) return <ActivityIndicator color={colors.primaryContainer} />;
  const save = async (extra: any = {}) => {
    const config: any = {};
    for (const [p] of SETTING_FIELDS) { const [a, b] = p.split('.'); (config[a] ||= {})[b] = Number(form[p]); }
    config.universe.presetSymbols = preset.split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
    try { const r = await apiClient.put('/api/signals/settings', { config, ...extra }); setData(r.data); Alert.alert('Saved', 'Settings updated.'); onSaved(); }
    catch (e: any) { Alert.alert('Could not save', e?.message || 'Only the household owner or an admin can change these settings.'); }
  };
  return (
    <View style={{ gap: 12 }}>
      <View style={[s.card, s.rowBetween]}>
        <Text style={[s.bullet, { flex: 1 }]}>Run the daily update automatically (about 4 PM IST on trading days)</Text>
        <Switch value={!!data.enabled} onValueChange={(v) => save({ enabled: v })} />
      </View>
      {SETTING_FIELDS.map(([p, label, help]) => (
        <View key={p} style={{ gap: 4 }}>
          <Text style={s.muted}>{label}</Text>
          <TextInput value={form[p] ?? ''} onChangeText={(t) => setForm({ ...form, [p]: t })} keyboardType="decimal-pad" style={s.input} />
          {!!help && <Text style={s.hint}>{help}</Text>}
        </View>
      ))}
      <View style={{ gap: 4 }}>
        <Text style={s.muted}>Preset universe symbols (optional, e.g. index constituents)</Text>
        <TextInput value={preset} onChangeText={setPreset} multiline autoCapitalize="characters" placeholder="RELIANCE, TCS, INFY…" style={[s.input, { minHeight: 70, textAlignVertical: 'top', paddingTop: 10 }]} />
        <Text style={s.hint}>Scored together with your holdings and watchlist. Large lists take longer to update because of Angel One rate limits.</Text>
      </View>
      <Pressable style={[s.btn, { alignSelf: 'flex-start' }]} onPress={() => save()}><Text style={s.btnText}>Save settings</Text></Pressable>
    </View>
  );
};

const AllSignals: React.FC<{ onOpen: (s: string) => void }> = ({ onOpen }) => {
  const [data, setData] = useState<any>(null);
  const [label, setLabel] = useState('');
  useEffect(() => { apiClient.get(`/api/signals/all${label ? `?label=${label}` : ''}`).then((r) => setData(r.data)).catch(() => undefined); }, [label]);
  if (!data) return <ActivityIndicator color={colors.primaryContainer} />;
  const labels = ['STRONG_BUY', 'BUY', 'WATCH', 'HOLD', 'REDUCE', 'SELL', 'AVOID'];
  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Pressable onPress={() => setLabel('')} style={[s.chip, !label && s.chipOn]}><Text style={[s.chipText, !label && { color: colors.onPrimary }]}>All</Text></Pressable>
        {labels.map((l) => <Pressable key={l} onPress={() => setLabel(l)} style={[s.chip, label === l && s.chipOn]}><Text style={[s.chipText, label === l && { color: colors.onPrimary }]}>{l.replace('_', ' ')} ({data.counts?.[l] ?? 0})</Text></Pressable>)}
      </ScrollView>
      {data.items.length === 0 ? <Text style={s.empty}>No signals{label ? ' with this label' : ''} yet.</Text> : data.items.map((it: any) => (
        <Pressable key={it.symbol} style={[s.card, s.rowBetween]} onPress={() => onOpen(it.symbol)}>
          <View style={{ flex: 1 }}><Text style={s.sym}>{it.symbol}</Text><Text style={s.muted}>Close {inr(it.price)} · RSI {it.rsi ?? '–'}{it.liquid === false ? ' · thinly traded' : ''}</Text></View>
          <Text style={s.muted}>{it.score}</Text><Badge label={it.label} text={it.labelText} />
        </Pressable>
      ))}
    </View>
  );
};

const HistoryTab: React.FC<{ onOpenBacktest: (b: any) => void }> = ({ onOpenBacktest }) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [bts, setBts] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    apiClient.get('/api/signals/runs').then((r) => setRuns(r.data.items)).catch(() => undefined);
    apiClient.get('/api/signals/backtest/history').then((r) => setBts(r.data.items)).catch(() => undefined);
  }, []);
  return (
    <View style={{ gap: 14 }}>
      <Text style={s.h2}>Daily runs</Text>
      {runs.length === 0 ? <Text style={s.empty}>No runs stored yet.</Text> : runs.map((r) => (
        <Pressable key={r.id} style={s.card} onPress={() => setOpen(open === r.id ? null : r.id)}>
          <View style={s.rowBetween}><Text style={s.sym}>{r.asOfDate}</Text><Text style={[s.badgeText, { color: r.status === 'COMPLETED' ? '#059669' : '#b45309' }]}>{r.status}</Text></View>
          <Text style={s.muted}>{r.scored}/{r.universe} scored · {r.skipped} skipped · {r.trigger} · finished {when(r.completedAt)}</Text>
          {open === r.id && (r.issues || []).map((x: any, i: number) => <Text key={i} style={s.muted}>{x.symbol}: {x.message}</Text>)}
        </Pressable>
      ))}
      <Text style={s.h2}>Saved backtests <Text style={s.muted}>(past performance)</Text></Text>
      {bts.length === 0 ? <Text style={s.empty}>No backtests saved yet.</Text> : bts.map((b) => (
        <Pressable key={b.id} style={s.card} onPress={() => onOpenBacktest(b)}>
          <Text style={s.sym}>{when(b.createdAt)}</Text>
          <Text style={s.muted}>{b.symbolsCount} symbols · {b.metrics.trades} trades · win {b.metrics.winRatePct}% · CAGR {b.metrics.cagrPct}% · drawdown {b.metrics.maxDrawdownPct}%</Text>
        </Pressable>
      ))}
    </View>
  );
};

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
            {d.signal.components && <View style={s.grid}>{Object.entries(d.signal.components).map(([k, v]: any) => <View key={k} style={s.cell}><Text style={s.cellK}>{k.replace(/([A-Z])/g, ' $1')}</Text><Text style={[s.cellV, { color: v >= 0 ? '#059669' : '#dc2626' }]}>{Math.round(v)}</Text></View>)}</View>}
            {d.holding && <View style={s.card}><Text style={s.h2}>Your position</Text>
              <Text style={s.bullet}>{d.holding.quantity} shares at avg {inr(d.holding.averageCost)} · P&L {inr(d.holding.unrealizedPnl)} ({d.holding.unrealizedPnlPct}%) · trailing stop {inr(d.holding.trailingStop)}</Text>
              {d.holding.longTermNotes?.map((n: string, i: number) => <Text key={i} style={[s.bullet, { color: '#075985' }]}>{n}</Text>)}</View>}
          </>}
          <SignalHistory symbol={d.symbol} />
          {d.dataNotes?.length > 0 && !d.dataUnreliable && <Text style={s.muted}>Data notes: {d.dataNotes.join('; ')}</Text>}
          <Text style={s.foot}>{DISCLAIMER}</Text>
        </ScrollView>
      </View>
    );
  }

  const tabs: Array<[Tab, string]> = [['top', 'Top buys'], ['all', 'All signals'], ['holdings', 'Holdings'], ['watchlist', 'Watchlist'], ['backtest', 'Backtest'], ['history', 'History'], ['settings', 'Settings']];
  const stale = status?.lastRun && Date.now() - new Date(status.lastRun.updatedAt).getTime() > 4 * 86_400_000;
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
        {stale && <Text style={s.warnBox}>These signals are more than 4 days old. The daily job may not be running.</Text>}
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

        {tab === 'all' && <AllSignals onOpen={open} />}
        {tab === 'history' && <HistoryTab onOpenBacktest={async (b) => { try { const r = await apiClient.get(`/api/signals/backtest/${b.id}`); setBt(r.data); setTab('backtest'); } catch (e: any) { Alert.alert('Could not open', e?.message || ''); } }} />}
        {tab === 'settings' && <SettingsPanel onSaved={load} />}
        {tab === 'holdings' && holdings && (holdings.items.length === 0
          ? <Text style={s.empty}>No stock or ETF holdings found.</Text>
          : holdings.items.map((h: any) => (
            <Pressable key={h.symbol} style={s.card} onPress={() => open(h.symbol)}>
              <View style={s.rowBetween}><Text style={s.sym}>{h.symbol}</Text>{h.signal ? <Badge label={h.signal.label} text={h.signal.labelText} /> : <Text style={s.muted}>No signal</Text>}</View>
              <Text style={s.muted}>{h.quantity} @ avg {inr(h.averageCost)} · now {inr(h.currentPrice)}</Text>
              {h.signal ? <>
                <Stats rows={[['Score', h.signal.score], ['Confidence', `${Math.round(h.signal.confidence * 100)}%`], ['Highest close', inr(h.highestClose)]]} />
                <Text style={s.bullet}>P&L {inr(h.unrealizedPnl)} ({h.unrealizedPnlPct}%) · trailing stop {inr(h.trailingStop)}{h.trailingStopHit ? ' (hit)' : ''}</Text>
                {h.signal.reasons.slice(0, 3).map((r: string, k: number) => <Text key={k} style={s.bullet}>• {r}</Text>)}
                {h.longTermNotes?.map((n: string, k: number) => <Text key={k} style={[s.bullet, { color: '#075985' }]}>{n}</Text>)}
              </> : <Text style={s.warn}>{h.note}</Text>}
            </Pressable>
          )))}
        {tab === 'holdings' && holdings?.notCovered?.length > 0 && <Text style={s.muted}>Not covered: {holdings.notCovered.map((n: any) => n.symbol).join(', ')} (technical signals cover stocks and ETFs only).</Text>}

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
            <BacktestView bt={bt} />
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
  hint: { fontSize: 11, color: colors.outline },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: colors.surfaceContainerHigh },
  chipOn: { backgroundColor: colors.primaryContainer },
  chipText: { fontSize: 11.5, fontFamily: 'Inter_700Bold', color: colors.onSurfaceVariant },
  tradeRow: { borderTopWidth: 1, borderTopColor: 'rgba(193,200,194,0.5)', paddingTop: 6, gap: 2 },
  input: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.outlineVariant ?? '#c1c8c2', fontSize: 14 },
});
