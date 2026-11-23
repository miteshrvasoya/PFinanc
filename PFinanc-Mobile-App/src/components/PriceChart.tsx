import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, PanResponder, LayoutChangeEvent, Platform } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';

interface Point { t: string; o: number | null; h: number | null; l: number | null; c: number; v: number | null }
interface ChartData {
  range: string; interval: string; source: 'ANGEL_ONE' | 'STORED_PRICES'; from: string; to: string;
  points: Point[];
  summary: { start: number; end: number; change: number; changePct: number; high: number; low: number } | null;
  position: { quantity: number; averageCost: number; currentPrice: number; unrealizedPnl: number; unrealizedPnlPct: number } | null;
  buys: Array<{ date: string; quantity: number; price: number }>;
  firstBuyDate: string | null; buyDateSource: 'TRADES' | 'SAVED' | null; sinceBuyAvailable: boolean; notes: string[];
}

const RANGES = [
  { id: '1D', label: '1D' }, { id: '1W', label: '1W' }, { id: '1M', label: '1M' }, { id: '3M', label: '3M' },
  { id: '6M', label: '6M' }, { id: '1Y', label: '1Y' }, { id: 'SINCE_BUY', label: 'Since I bought' },
];

const H = 190;
const PAD = { l: 4, r: 54, t: 10, b: 22 };
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Kolkata' });
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const PriceChart: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [range, setRange] = useState('1D'); // one day by default
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsBuyDate, setNeedsBuyDate] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const load = useCallback(async (r: string) => {
    setLoading(true);
    setError(null);
    setNeedsBuyDate(false);
    try {
      const res = await apiClient.get(`/api/investments/chart/${encodeURIComponent(symbol)}?range=${r}&view=household`);
      setData(res.data);
    } catch (e: any) {
      if (/know when you bought|buy date/i.test(e?.message || '')) setNeedsBuyDate(true);
      else setError(e?.message || 'Could not load the chart.');
    } finally {
      setLoading(false);
    }
  }, [symbol]);
  useEffect(() => { load(range); setHover(null); }, [load, range]);

  const saveBuyDate = async () => {
    if (!pickedDate) return;
    try {
      await apiClient.put(`/api/investments/holdings/${encodeURIComponent(symbol)}/buy-date`, { date: toYmd(pickedDate) });
      setNeedsBuyDate(false);
      load('SINCE_BUY');
    } catch (e: any) {
      setError(e?.message || 'Could not save the date.');
    }
  };

  const geom = useMemo(() => {
    if (!data || data.points.length < 2 || width <= 0) return null;
    const pts = data.points;
    const ys = pts.map((p) => p.c);
    let lo = Math.min(...ys);
    let hi = Math.max(...ys);
    if (hi === lo) { hi += 1; lo -= 1; }
    const span = hi - lo;
    const rawAvg = data.position?.averageCost;
    const avg = rawAvg && rawAvg >= lo - 0.35 * span && rawAvg <= hi + 0.35 * span ? rawAvg : undefined; // far-away lines would flatten the chart
    if (avg) { lo = Math.min(lo, avg); hi = Math.max(hi, avg); }
    const pad = (hi - lo) * 0.08;
    lo -= pad; hi += pad;
    const x = (i: number) => PAD.l + (i / (pts.length - 1)) * (width - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(' ');
    const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`;
    const markers = data.buys.map((b) => {
      const idx = pts.findIndex((p) => p.t.slice(0, 10) >= b.date);
      return idx >= 0 ? { cx: x(idx), cy: y(pts[idx].c) } : null;
    }).filter(Boolean) as Array<{ cx: number; cy: number }>;
    const ticks = [0, 0.5, 1].map((f) => ({ v: lo + (hi - lo) * (1 - f), y: PAD.t + f * (H - PAD.t - PAD.b) }));
    return { pts, x, y, line, area, markers, ticks, avg, avgY: avg ? y(avg) : null };
  }, [data, width]);

  // Touch and drag across the chart to read the price at any moment.
  const geomRef = useRef(geom);
  geomRef.current = geom;
  const widthRef = useRef(width);
  widthRef.current = width;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false, // keep the gesture so the page does not scroll while you scrub
    onPanResponderGrant: (e) => setHover(indexAt(e.nativeEvent.locationX)),
    onPanResponderMove: (e) => setHover(indexAt(e.nativeEvent.locationX)),
    onPanResponderRelease: () => setHover(null),
    onPanResponderTerminate: () => setHover(null),
  }), []);
  function indexAt(px: number) {
    const g = geomRef.current;
    if (!g) return null;
    const i = Math.round(((px - PAD.l) / (widthRef.current - PAD.l - PAD.r)) * (g.pts.length - 1));
    return Math.max(0, Math.min(g.pts.length - 1, i));
  }

  const up = (data?.summary?.change ?? 0) >= 0;
  const lineColor = up ? '#128A58' : colors.error;
  const intraday = !!data && data.interval !== 'ONE_DAY';
  const labelFor = (p: Point) => (intraday ? `${day(p.t)}, ${time(p.t)}` : day(p.t));
  const shown = hover != null && geom ? geom.pts[hover] : null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {RANGES.map((r) => (
          <Pressable key={r.id} style={[styles.chip, range === r.id && styles.chipOn]} onPress={() => setRange(r.id)}>
            {r.id === 'SINCE_BUY' && <MaterialIcons name="event" size={13} color={range === r.id ? colors.onPrimary : colors.onSurfaceVariant} />}
            <Text style={[styles.chipText, range === r.id && styles.chipTextOn]}>{r.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {needsBuyDate ? (
        <View style={styles.askBox}>
          <Text style={styles.askTitle}>When did you buy {symbol}?</Text>
          <Text style={styles.help}>This holding has no trade history (for example it was imported from your broker). Pick the date once and PFinanc will chart the price from then on.</Text>
          <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
            <MaterialIcons name="event" size={18} color={colors.primary} />
            <Text style={styles.dateText}>{pickedDate ? day(pickedDate.toISOString()) : 'Pick the buy date'}</Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={pickedDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, d) => { if (Platform.OS === 'android') setShowPicker(false); if (d) setPickedDate(d); }}
            />
          )}
          <Pressable style={[styles.primary, !pickedDate && { opacity: 0.5 }]} disabled={!pickedDate} onPress={saveBuyDate}>
            <Text style={styles.primaryText}>Show chart</Text>
          </Pressable>
        </View>
      ) : (
        <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
          {error && <Text style={styles.error}>{error}</Text>}
          {loading && !data ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : data ? (
            <>
              <View style={styles.head}>
                <View>
                  <Text style={styles.price}>{inr(shown ? shown.c : data.summary?.end ?? 0)}</Text>
                  <Text style={styles.help}>{shown ? labelFor(shown) : `${data.from} to ${data.to}`}</Text>
                </View>
                {data.summary && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.change, { color: lineColor }]}>{up ? '+' : ''}{inr(data.summary.change)} ({up ? '+' : ''}{data.summary.changePct}%)</Text>
                    <Text style={styles.help}>High {inr(data.summary.high)} · Low {inr(data.summary.low)}</Text>
                  </View>
                )}
              </View>

              {geom ? (
                <View {...pan.panHandlers}>
                  <Svg width={width} height={H}>
                    <Defs>
                      <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={lineColor} stopOpacity="0.25" />
                        <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
                      </LinearGradient>
                    </Defs>
                    {geom.ticks.map((t, i) => (
                      <React.Fragment key={i}>
                        <Line x1={PAD.l} x2={width - PAD.r} y1={t.y} y2={t.y} stroke="rgba(193,200,194,0.45)" strokeWidth={1} />
                        <SvgText x={width - PAD.r + 4} y={t.y + 4} fontSize={10} fill={colors.outline}>{t.v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</SvgText>
                      </React.Fragment>
                    ))}
                    <Path d={geom.area} fill="url(#fill)" />
                    <Path d={geom.line} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    {geom.avgY != null && (
                      <>
                        <Line x1={PAD.l} x2={width - PAD.r} y1={geom.avgY} y2={geom.avgY} stroke="#d97706" strokeWidth={1.2} strokeDasharray="5,4" />
                        <SvgText x={width - PAD.r + 4} y={geom.avgY - 3} fontSize={9} fill="#b45309">avg {Math.round(geom.avg!).toLocaleString('en-IN')}</SvgText>
                      </>
                    )}
                    {geom.markers.map((m, i) => <Circle key={i} cx={m.cx} cy={m.cy} r={5} fill="#4f46e5" stroke="#fff" strokeWidth={1.5} />)}
                    {hover != null && (
                      <>
                        <Line x1={geom.x(hover)} x2={geom.x(hover)} y1={PAD.t} y2={H - PAD.b} stroke={colors.outline} strokeWidth={1} strokeDasharray="3,3" />
                        <Circle cx={geom.x(hover)} cy={geom.y(geom.pts[hover].c)} r={4} fill={lineColor} stroke="#fff" strokeWidth={2} />
                      </>
                    )}
                    <SvgText x={PAD.l} y={H - 6} fontSize={10} fill={colors.outline}>{labelFor(geom.pts[0])}</SvgText>
                    <SvgText x={width - PAD.r} y={H - 6} fontSize={10} fill={colors.outline} textAnchor="end">{labelFor(geom.pts[geom.pts.length - 1])}</SvgText>
                  </Svg>
                </View>
              ) : (
                <View style={styles.center}><Text style={styles.help}>{data.points.length === 1 ? 'Only one price point so far.' : 'No price history for this range yet.'}</Text></View>
              )}

              {data.range === 'SINCE_BUY' && data.position && (
                <View style={styles.statRow}>
                  <View style={styles.stat}><Text style={styles.help}>Bought</Text><Text style={styles.statV}>{data.firstBuyDate ? day(`${data.firstBuyDate}T00:00:00+05:30`) : ''}{data.buyDateSource === 'SAVED' ? ' *' : ''}</Text></View>
                  <View style={styles.stat}><Text style={styles.help}>Avg cost</Text><Text style={styles.statV}>{inr(data.position.averageCost)}</Text></View>
                  <View style={styles.stat}><Text style={styles.help}>Your return</Text><Text style={[styles.statV, { color: data.position.unrealizedPnl >= 0 ? '#128A58' : colors.error }]}>{data.position.unrealizedPnl >= 0 ? '+' : ''}{data.position.unrealizedPnlPct}%</Text></View>
                </View>
              )}
              {data.range === 'SINCE_BUY' && data.buyDateSource === 'SAVED' && (
                <Pressable onPress={async () => { try { await apiClient.delete(`/api/investments/holdings/${encodeURIComponent(symbol)}/buy-date`); } catch {} setRange('1D'); }}>
                  <Text style={styles.link}>* Buy date entered by you. Remove it</Text>
                </Pressable>
              )}

              <View style={styles.legend}>
                <View style={[styles.badge, { backgroundColor: data.source === 'ANGEL_ONE' ? colors.primaryFixed : colors.surfaceContainerHigh }]}>
                  <Text style={[styles.badgeText, { color: data.source === 'ANGEL_ONE' ? colors.onPrimaryFixed : colors.onSurfaceVariant }]}>{data.source === 'ANGEL_ONE' ? 'Live via Angel One' : 'Stored prices'}</Text>
                </View>
                {data.buys.length > 0 && <Text style={styles.help}>● your buys</Text>}
                {loading && <ActivityIndicator size="small" color={colors.outline} />}
              </View>
              {data.notes.map((n, i) => <Text key={i} style={styles.note}>{n}</Text>)}
            </>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 10 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surfaceContainer },
  chipOn: { backgroundColor: colors.primaryContainer },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurfaceVariant },
  chipTextOn: { color: colors.onPrimary },
  center: { height: 120, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  price: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.onSurface },
  change: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  help: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, color: colors.onSurfaceVariant },
  error: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.error },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  stat: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceContainerLow },
  statV: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onSurface, marginTop: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  note: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, color: '#92400e' },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.outline, textDecorationLine: 'underline' },
  askBox: { padding: 14, borderRadius: 16, backgroundColor: colors.surfaceContainerLow, gap: 10 },
  askTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant },
  dateText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onSurface },
  primary: { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContainer },
  primaryText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onPrimary },
});
