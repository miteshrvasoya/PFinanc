import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, PanResponder } from 'react-native';
import Svg, { Path, Line, Rect, Text as SvgText } from 'react-native-svg';

export interface SeriesPoint {
  date: string; close: number; low: number; high: number;
  sma20: number | null; sma50: number | null; sma200: number | null;
  bbUpper: number | null; bbLower: number | null;
  rsi: number | null; macd: number | null; macdSignal: number | null; macdHist: number | null;
}
export interface Levels { entryLow?: number; stop?: number; target1?: number; target2?: number; valid?: boolean }

const PR = 46, PL = 4, P_H = 190, R_H = 70, M_H = 80;
const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Price + SMA 20/50/200 + Bollinger Bands + trade levels, with RSI and MACD panels below. Touch to inspect a day. */
export const SignalChart: React.FC<{ series: SeriesPoint[]; levels?: Levels | null }> = ({ series, levels }) => {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const n = series.length;

  const g = useMemo(() => {
    if (w <= 0 || n < 2) return null;
    const x = (i: number) => PL + (i / (n - 1)) * (w - PL - PR);
    const vals: number[] = [];
    for (const p of series) for (const v of [p.low, p.high, p.bbUpper, p.bbLower, p.sma200]) if (v != null) vals.push(v);
    if (levels?.valid) for (const v of [levels.stop, levels.target1]) if (v) vals.push(v);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = (hi - lo) * 0.05; lo -= pad; hi += pad;
    const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (P_H - 12);
    const ry = (v: number) => 4 + (1 - v / 100) * (R_H - 8);
    const mv = series.flatMap((p) => [p.macd, p.macdSignal, p.macdHist]).filter((v): v is number => v != null);
    const mm = Math.max(0.0001, ...mv.map(Math.abs)) * 1.1;
    const my = (v: number) => M_H / 2 - (v / mm) * (M_H / 2 - 4);
    const path = (key: keyof SeriesPoint, f: (v: number) => number) => {
      let d = ''; let pen = false;
      series.forEach((p, i) => { const v = p[key] as number | null; if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${f(v).toFixed(1)} `; pen = true; });
      return d;
    };
    return { x, y, ry, my, bw: Math.max(1, ((w - PL - PR) / n) * 0.7), close: path('close', y), sma20: path('sma20', y), sma50: path('sma50', y), sma200: path('sma200', y),
      bbU: path('bbUpper', y), bbL: path('bbLower', y), rsi: path('rsi', ry), macd: path('macd', my), sig: path('macdSignal', my),
      ticks: [0, 0.5, 1].map((f) => ({ v: hi - (hi - lo) * f, y: 6 + f * (P_H - 12) })) };
  }, [series, levels, n, w]);

  const pan = useMemo(() => {
    const at = (px: number) => { if (w <= 0) return; setSel(Math.max(0, Math.min(n - 1, Math.round(((px - PL) / (w - PL - PR)) * (n - 1))))); };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => at(e.nativeEvent.locationX), onPanResponderMove: (e) => at(e.nativeEvent.locationX),
    });
  }, [w, n]);

  const p = series[sel ?? n - 1];
  const total = P_H + R_H + M_H + 20;
  const lvl = (v: number | undefined, c: string, t: string) => v && g ? (
    <React.Fragment key={t}><Line x1={PL} x2={w - PR} y1={g.y(v)} y2={g.y(v)} stroke={c} strokeWidth={1} strokeDasharray="4 4" /><SvgText x={w - PR + 3} y={g.y(v) + 3} fill={c} fontSize={9}>{t}</SvgText></React.Fragment>
  ) : null;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      {p && (
        <View style={s.legend}>
          <Text style={s.legendMain}>{p.date} · close {fmt(p.close)}</Text>
          <Text style={[s.legendItem, { color: '#0284c7' }]}>SMA20 {p.sma20 != null ? fmt(p.sma20) : '–'}</Text>
          <Text style={[s.legendItem, { color: '#b45309' }]}>SMA50 {p.sma50 != null ? fmt(p.sma50) : '–'}</Text>
          <Text style={[s.legendItem, { color: '#be185d' }]}>SMA200 {p.sma200 != null ? fmt(p.sma200) : '–'}</Text>
          <Text style={s.legendItem}>RSI {p.rsi != null ? p.rsi.toFixed(1) : '–'}</Text>
        </View>
      )}
      {g ? (
        <View {...pan.panHandlers}>
          <Svg width={w} height={total}>
            {g.ticks.map((t, i) => <React.Fragment key={i}><Line x1={PL} x2={w - PR} y1={t.y} y2={t.y} stroke="#e2e8e5" /><SvgText x={w - PR + 3} y={t.y + 3} fill="#717974" fontSize={9}>{fmt(t.v)}</SvgText></React.Fragment>)}
            <Path d={g.bbU} stroke="#94a3a0" strokeWidth={0.8} strokeDasharray="2 3" fill="none" />
            <Path d={g.bbL} stroke="#94a3a0" strokeWidth={0.8} strokeDasharray="2 3" fill="none" />
            <Path d={g.sma200} stroke="#be185d" strokeWidth={1.2} fill="none" />
            <Path d={g.sma50} stroke="#b45309" strokeWidth={1.2} fill="none" />
            <Path d={g.sma20} stroke="#0284c7" strokeWidth={1.2} fill="none" />
            <Path d={g.close} stroke="#161d1b" strokeWidth={1.7} fill="none" />
            {levels?.valid && <>{lvl(levels.stop, '#dc2626', 'Stop')}{lvl(levels.entryLow, '#059669', 'Entry')}{lvl(levels.target1, '#7c3aed', 'T1')}{lvl(levels.target2, '#6d28d9', 'T2')}</>}

            <Rect x={0} y={P_H + 8} width={0} height={0} />
            {[30, 70].map((v) => <Line key={v} x1={PL} x2={w - PR} y1={P_H + 8 + g.ry(v)} y2={P_H + 8 + g.ry(v)} stroke="#c8cfcb" strokeDasharray="3 3" />)}
            <Path d={g.rsi} transform={`translate(0 ${P_H + 8})`} stroke="#7c3aed" strokeWidth={1.3} fill="none" />
            <SvgText x={PL + 2} y={P_H + 18} fill="#717974" fontSize={9}>RSI 14</SvgText>

            <Line x1={PL} x2={w - PR} y1={P_H + R_H + 16 + g.my(0)} y2={P_H + R_H + 16 + g.my(0)} stroke="#c8cfcb" />
            {series.map((q, i) => q.macdHist == null ? null : (
              <Rect key={i} x={g.x(i) - g.bw / 2} width={g.bw} y={P_H + R_H + 16 + Math.min(g.my(0), g.my(q.macdHist))} height={Math.abs(g.my(q.macdHist) - g.my(0))} fill={q.macdHist >= 0 ? '#10b981' : '#f43f5e'} opacity={0.55} />
            ))}
            <Path d={g.macd} transform={`translate(0 ${P_H + R_H + 16})`} stroke="#0284c7" strokeWidth={1.2} fill="none" />
            <Path d={g.sig} transform={`translate(0 ${P_H + R_H + 16})`} stroke="#b45309" strokeWidth={1.2} fill="none" />
            <SvgText x={PL + 2} y={P_H + R_H + 26} fill="#717974" fontSize={9}>MACD 12,26,9</SvgText>
            {sel != null && <Line x1={g.x(sel)} x2={g.x(sel)} y1={0} y2={total} stroke="#717974" strokeDasharray="3 3" />}
          </Svg>
        </View>
      ) : <View style={{ height: total }} />}
    </View>
  );
};

const s = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  legendMain: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#161d1b' },
  legendItem: { fontSize: 10.5, fontFamily: 'Inter_500Medium', color: '#414844' },
});
