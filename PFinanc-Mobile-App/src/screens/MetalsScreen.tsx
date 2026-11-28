import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import { MetalFormScreen } from './metals/MetalFormScreen';
import {
  MetalItem, Summary, Metal, METALS, METAL_STYLE, RATE_UNIT, STORAGE, ACQUIRED, inr, signedInr, grams, dateText, titleCase, todayYmd,
} from './metals/metalsShared';

type Filter = 'ALL' | 'RAW' | 'JEWELLERY' | 'SOLD';
const FILTERS: Array<[Filter, string]> = [['ALL', 'All'], ['RAW', 'Raw metal'], ['JEWELLERY', 'Jewellery'], ['SOLD', 'Sold']];
const TYPE_ICON: Record<string, string> = { RING: 'ring', NECKLACE: 'necklace', CHAIN: 'link-variant', BANGLE: 'circle-outline', BRACELET: 'circle-double', EARRING: 'diamond-stone', PENDANT: 'rhombus-outline', ANKLET: 'circle-multiple-outline', SET: 'diamond-stone', UTENSIL: 'bowl-mix-outline', IDOL: 'human-handsup', BAR: 'gold', BISCUIT: 'gold', COIN: 'circle-multiple', WIRE: 'gesture', GRANULES: 'dots-hexagon', OTHER: 'diamond-outline' };
const pnlColor = (n: number | null | undefined) => (n === null || n === undefined ? colors.onSurfaceVariant : n >= 0 ? '#0f7a4f' : '#b3261e');

const MetalChip: React.FC<{ metal: Metal; small?: boolean }> = ({ metal, small }) => {
  const m = METAL_STYLE[metal];
  return <View style={[s.chipBase, { backgroundColor: m.bg }, small && { paddingVertical: 2 }]}><Text style={[s.chipText, { color: m.fg }]}>{m.label}</Text></View>;
};

export const MetalsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<MetalItem[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [metalFilter, setMetalFilter] = useState<Metal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [selected, setSelected] = useState<MetalItem | null>(null);
  const [editing, setEditing] = useState<MetalItem | null>(null);
  const [showRates, setShowRates] = useState(false);
  const [selling, setSelling] = useState<MetalItem | null>(null);

  const load = useCallback(async () => {
    try {
      const [sm, it] = await Promise.all([apiClient.get('/api/precious-metals/summary'), apiClient.get('/api/precious-metals/items')]);
      setSummary(sm.data); setItems(it.data); setError('');
      setSelected((cur) => (cur ? (it.data as MetalItem[]).find((x) => x.id === cur.id) ?? null : null));
    } catch (e: any) { setError(e?.message || 'Could not load your metals.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = items.filter((i) => {
    if (filter === 'SOLD') return i.status === 'SOLD';
    if (i.status === 'SOLD') return false;
    if (filter === 'RAW' || filter === 'JEWELLERY') { if (i.form !== filter) return false; }
    return !metalFilter || i.metal === metalFilter;
  });

  const header = (title: string, back: () => void, right?: React.ReactNode) => (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={back} hitSlop={10} accessibilityLabel="Back"><MaterialIcons name="arrow-back" size={24} color={colors.onSurface} /></Pressable>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      {right}
    </View>
  );

  if (view === 'form') {
    return <MetalFormScreen item={editing} rates={summary?.rates} onCancel={() => setView('list')} onSaved={(saved) => { setView('list'); setEditing(null); load(); if (saved) setSelected(saved); }} />;
  }

  if (selected) {
    return (
      <Detail item={selected} header={header} onBack={() => setSelected(null)}
        onEdit={() => { setEditing(selected); setView('form'); }} onSell={() => setSelling(selected)}
        onChanged={async (gone) => { if (gone) setSelected(null); await load(); }}
        sellModal={selling && <SellModal item={selling} onClose={() => setSelling(null)} onDone={() => { setSelling(null); load(); }} />} />
    );
  }

  const t = summary?.total;
  const heldCount = t?.count ?? 0;
  return (
    <View style={s.screen}>
      {header('Gold & Silver', onBack)}
      <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {loading && <ActivityIndicator color={colors.primaryContainer} />}
        {!!error && <Text style={s.err}>{error}</Text>}

        {summary && (
          <View style={s.hero}>
            <Text style={s.heroLabel}>Total value of your precious metals</Text>
            <Text style={s.heroValue}>{inr(t!.current_value + t!.unvalued_cost)}</Text>
            <View style={s.heroRow}>
              <View><Text style={s.heroSub}>Invested</Text><Text style={s.heroSubV}>{inr(t!.total_cost)}</Text></View>
              <View><Text style={s.heroSub}>Gain / loss</Text><Text style={[s.heroSubV, { color: t!.unvalued_count ? '#ffffff' : t!.pnl >= 0 ? '#9be3bf' : '#ffb4ab' }]}>{t!.unvalued_count ? '–' : `${signedInr(t!.pnl)}${t!.pnl_pct !== null ? ` (${t!.pnl_pct}%)` : ''}`}</Text></View>
              <View><Text style={s.heroSub}>Items</Text><Text style={s.heroSubV}>{heldCount}</Text></View>
            </View>
            <Text style={s.heroNote}>Valued at melt value (metal only). Making charges and GST are not recovered when you sell.</Text>
          </View>
        )}

        {summary?.warnings.map((w, i) => <View key={i} style={s.warnBox}><MaterialIcons name="info-outline" size={16} color="#92400e" /><Text style={s.warnText}>{w}</Text></View>)}

        {summary && (
          <View style={s.card}>
            <View style={s.rowBetween}><Text style={s.h2}>Today's rates</Text><Pressable onPress={() => setShowRates(true)} style={s.smallBtn}><MaterialIcons name="edit" size={14} color={colors.onPrimary} /><Text style={s.smallBtnText}>Update rates</Text></Pressable></View>
            <View style={s.rateGrid}>
              {METALS.map((m) => {
                const r = summary.rates[m]; const u = RATE_UNIT[m];
                return (
                  <View key={m} style={[s.rateCell, { backgroundColor: METAL_STYLE[m].bg }]}>
                    <Text style={[s.rateMetal, { color: METAL_STYLE[m].fg }]}>{METAL_STYLE[m].label}</Text>
                    <Text style={s.rateValue}>{r ? inr(r.rate_per_gram * u.grams) : 'Not set'}</Text>
                    <Text style={s.rateUnit}>{u.label}{r ? ` · ${dateText(r.rate_date)}` : ''}{r?.stale ? ' · old' : ''}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={s.hint}>Rates are per 999 purity and are entered by you. No live price feed is connected.</Text>
          </View>
        )}

        {summary && Object.keys(summary.by_metal).length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={s.h2}>Holdings by metal</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {METALS.filter((m) => summary.by_metal[m]).map((m) => {
                const b = summary.by_metal[m]!; const st = METAL_STYLE[m];
                return (
                  <Pressable key={m} onPress={() => { setMetalFilter(metalFilter === m ? null : m); setFilter('ALL'); }} style={[s.metalCard, { borderColor: metalFilter === m ? st.ring : 'rgba(193,200,194,0.5)' }]}>
                    <View style={s.rowBetween}><MetalChip metal={m} /><Text style={s.muted}>{b.count} item{b.count > 1 ? 's' : ''}</Text></View>
                    <Text style={s.metalValue}>{inr(b.current_value + b.unvalued_cost)}</Text>
                    <Text style={s.muted}>{grams(b.net_weight_g)} · pure {grams(b.pure_weight_g)}</Text>
                    <Text style={[s.metalPnl, { color: b.unvalued_count ? colors.onSurfaceVariant : pnlColor(b.pnl) }]}>{b.unvalued_count ? 'Set a rate to value' : `${signedInr(b.pnl)} vs cost`}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {summary && (summary.total.count > 0) && (
          <View style={s.statRow}>
            <View style={s.stat}><MaterialCommunityIcons name="safe-square-outline" size={18} color={colors.primaryContainer} /><Text style={s.statV}>{inr(summary.total.current_value - summary.at_home_value)}</Text><Text style={s.statK}>outside home</Text></View>
            <View style={s.stat}><MaterialCommunityIcons name="home-outline" size={18} color={colors.primaryContainer} /><Text style={s.statV}>{inr(summary.at_home_value)}</Text><Text style={s.statK}>kept at home</Text></View>
            <View style={s.stat}><MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.primaryContainer} /><Text style={s.statV}>{inr(summary.insured_value)}</Text><Text style={s.statK}>insured</Text></View>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map(([id, label]) => <Pressable key={id} onPress={() => setFilter(id)} style={[s.tab, filter === id && s.tabOn]}><Text style={[s.tabText, filter === id && { color: colors.onPrimary }]}>{label}</Text></Pressable>)}
          {metalFilter && <Pressable onPress={() => setMetalFilter(null)} style={[s.tab, { backgroundColor: METAL_STYLE[metalFilter].bg }]}><Text style={[s.tabText, { color: METAL_STYLE[metalFilter].fg }]}>{METAL_STYLE[metalFilter].label} ✕</Text></Pressable>}
        </ScrollView>

        {!loading && visible.length === 0 && (
          <View style={s.empty}>
            <MaterialCommunityIcons name="gold" size={44} color={colors.outline} />
            <Text style={s.emptyTitle}>{filter === 'SOLD' ? 'Nothing sold yet' : items.length === 0 ? 'Add your first gold or silver' : 'No items here'}</Text>
            <Text style={s.emptyText}>{items.length === 0 ? 'Track bars, coins and jewellery with weight, purity, making charges, hallmark and where you keep them.' : 'Try another filter.'}</Text>
          </View>
        )}

        {visible.map((i) => <ItemCard key={i.id} item={i} onPress={() => setSelected(i)} />)}
        <Text style={s.foot}>Values are estimates from the rates you enter. Not investment advice.</Text>
      </ScrollView>

      <Pressable style={[s.fab, { bottom: insets.bottom + 104 }]} onPress={() => { setEditing(null); setView('form'); }} accessibilityLabel="Add item">
        <MaterialIcons name="add" size={26} color={colors.onPrimary} /><Text style={s.fabText}>Add</Text>
      </Pressable>

      {showRates && summary && <RatesModal rates={summary.rates} onClose={() => setShowRates(false)} onSaved={() => { setShowRates(false); load(); }} />}
    </View>
  );
};

const ItemCard: React.FC<{ item: MetalItem; onPress: () => void }> = ({ item: i, onPress }) => {
  const v = i.valuation; const st = METAL_STYLE[i.metal]; const sold = i.status === 'SOLD';
  return (
    <Pressable style={s.item} onPress={onPress}>
      <View style={[s.itemIcon, { backgroundColor: st.bg }]}><MaterialCommunityIcons name={(TYPE_ICON[i.item_type] || 'diamond-outline') as any} size={24} color={st.fg} /></View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={s.rowBetween}><Text style={s.itemName} numberOfLines={1}>{i.name}</Text>{sold ? <Text style={s.soldTag}>SOLD</Text> : null}</View>
        <Text style={s.muted} numberOfLines={1}>{titleCase(i.form === 'RAW' ? 'Raw ' + i.item_type : i.item_type)} · {i.purity_label} · {grams(i.net_weight_g)}{i.pieces > 1 ? ` · ${i.pieces} pcs` : ''}</Text>
        <View style={s.rowBetween}>
          <Text style={s.muted}>{sold ? `Sold ${dateText(i.sale_date)}` : `Cost ${inr(i.total_cost)}`}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.itemValue}>{sold ? inr(i.sale_amount) : v.current_value === null ? 'Set rate' : inr(v.current_value)}</Text>
            <Text style={{ fontSize: 11.5, fontFamily: 'Inter_700Bold', color: pnlColor(sold ? v.realized_pnl : v.unrealized_pnl) }}>{sold ? signedInr(v.realized_pnl) : v.unrealized_pnl === null ? '' : `${signedInr(v.unrealized_pnl)}${v.unrealized_pnl_pct !== null ? ` (${v.unrealized_pnl_pct}%)` : ''}`}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <MetalChip metal={i.metal} small />
          {i.hallmarked && <View style={s.tag}><MaterialIcons name="verified" size={11} color="#0f7a4f" /><Text style={s.tagText}>Hallmarked</Text></View>}
          {i.insured && <View style={s.tag}><MaterialCommunityIcons name="shield-check" size={11} color="#0f7a4f" /><Text style={s.tagText}>Insured</Text></View>}
          <View style={s.tag}><Text style={s.tagText}>{STORAGE.find(([k]) => k === i.storage_location)?.[1]}</Text></View>
        </View>
      </View>
    </Pressable>
  );
};

const Row: React.FC<{ k: string; v?: React.ReactNode; strong?: boolean; color?: string }> = ({ k, v, strong, color }) => (
  <View style={s.kv}><Text style={s.kvK}>{k}</Text><Text style={[s.kvV, strong && { fontFamily: 'Inter_700Bold' }, color ? { color } : null]}>{v ?? '–'}</Text></View>
);
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <View style={s.card}><Text style={s.h2}>{title}</Text>{children}</View>;

const Detail: React.FC<{ item: MetalItem; header: any; onBack: () => void; onEdit: () => void; onSell: () => void; onChanged: (gone?: boolean) => void; sellModal: React.ReactNode }> = ({ item: i, header, onBack, onEdit, onSell, onChanged, sellModal }) => {
  const v = i.valuation; const st = METAL_STYLE[i.metal]; const sold = i.status === 'SOLD';
  const confirm = (title: string, msg: string, action: () => Promise<void>, destructive = false) =>
    Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: destructive ? 'Delete' : 'Confirm', style: destructive ? 'destructive' : 'default', onPress: () => action().catch((e: any) => Alert.alert('Failed', e?.message || 'Try again.')) }]);
  const makingText = i.making_charges > 0 ? `${inr(i.making_charges, 2)}${i.making_charge_type ? ` (${i.making_charge_type === 'PER_GRAM' ? `${inr(i.making_charge_value)} per g` : i.making_charge_type === 'PERCENT' ? `${i.making_charge_value}% of metal` : 'flat'})` : ''}` : '–';
  return (
    <View style={s.screen}>
      {header(i.name, onBack, sold ? undefined : <Pressable onPress={onEdit} hitSlop={10} accessibilityLabel="Edit"><MaterialIcons name="edit" size={22} color={colors.onSurface} /></Pressable>)}
      <ScrollView contentContainerStyle={s.body}>
        <View style={[s.hero, { backgroundColor: '#14352a' }]}>
          <View style={s.rowBetween}><MetalChip metal={i.metal} /><Text style={s.heroSub}>{i.form === 'RAW' ? 'Raw metal' : 'Jewellery'} · {titleCase(i.item_type)}</Text></View>
          <Text style={s.heroLabel}>{sold ? 'Sold for' : 'Melt value today'}</Text>
          <Text style={s.heroValue}>{sold ? inr(i.sale_amount) : v.current_value === null ? 'Set a rate' : inr(v.current_value)}</Text>
          <Text style={[s.heroSubV, { color: (sold ? v.realized_pnl : v.unrealized_pnl) === null ? '#fff' : (sold ? v.realized_pnl! : v.unrealized_pnl!) >= 0 ? '#9be3bf' : '#ffb4ab' }]}>
            {sold ? `${signedInr(v.realized_pnl)}${v.realized_pnl_pct !== null ? ` (${v.realized_pnl_pct}%)` : ''} realised` : v.unrealized_pnl === null ? 'Enter today\'s rate on the previous screen to value this' : `${signedInr(v.unrealized_pnl)}${v.unrealized_pnl_pct !== null ? ` (${v.unrealized_pnl_pct}%)` : ''} vs total paid`}
          </Text>
        </View>

        <Section title="Weight and purity">
          <Row k="Purity" v={`${i.purity_label} (${i.fineness}/1000)`} strong />
          <Row k="Gross weight" v={grams(i.gross_weight_g)} />
          {i.stone_weight_g > 0 && <Row k="Stone / other weight" v={`- ${grams(i.stone_weight_g)}`} />}
          <Row k="Net metal weight" v={grams(i.net_weight_g)} strong />
          <Row k="Pure metal content" v={grams(v.pure_weight_g)} />
          {i.pieces > 1 && <Row k="Pieces" v={String(i.pieces)} />}
        </Section>

        {!sold && (
          <Section title="Valuation today">
            <Row k={`${st.label} rate (999)`} v={v.rate_per_gram ? `${inr(v.rate_per_gram, 2)} / g · ${dateText(v.rate_date)}` : 'Not set'} />
            <Row k="Melt value" v={inr(v.current_value)} strong />
            <Row k="Total paid" v={inr(i.total_cost, 2)} />
            <Row k="Gain / loss on total paid" v={signedInr(v.unrealized_pnl)} color={pnlColor(v.unrealized_pnl)} strong />
            {v.metal_pnl !== null && <Row k="Gain / loss on the metal alone" v={signedInr(v.metal_pnl)} color={pnlColor(v.metal_pnl)} />}
            {v.premium_paid !== null && v.premium_paid > 0 && <Text style={s.hint}>You paid {inr(v.premium_paid)} above today's melt value (making charges, stones, GST and rate movement). That part is not recovered when selling to a jeweller by weight.</Text>}
          </Section>
        )}

        <Section title="Purchase">
          <Row k="Acquired" v={ACQUIRED.find(([k]) => k === i.acquired_via)?.[1]} />
          <Row k="Date" v={dateText(i.purchase_date)} />
          <Row k="Rate per g at purchase" v={i.purchase_rate_per_g ? inr(i.purchase_rate_per_g, 2) : '–'} />
          <Row k="Metal cost" v={i.metal_cost !== null ? inr(i.metal_cost, 2) : '–'} />
          {i.form === 'JEWELLERY' && <Row k="Making charges" v={makingText} />}
          {i.wastage_percent !== null && <Row k="Wastage" v={`${i.wastage_percent}%`} />}
          {i.stone_charges > 0 && <Row k="Stone charges" v={inr(i.stone_charges, 2)} />}
          <Row k="GST" v={i.gst_amount > 0 ? inr(i.gst_amount, 2) : '–'} />
          {i.other_charges > 0 && <Row k="Other charges" v={inr(i.other_charges, 2)} />}
          <Row k="Total paid" v={inr(i.total_cost, 2)} strong />
          <Row k="Seller" v={i.seller_name} />
          <Row k="Invoice no." v={i.invoice_number} />
        </Section>

        <Section title="Hallmark, storage and insurance">
          <Row k="BIS hallmarked" v={i.hallmarked ? 'Yes' : 'No'} />
          {i.huid && <Row k="HUID" v={i.huid} />}
          <Row k="Kept" v={`${STORAGE.find(([k]) => k === i.storage_location)?.[1]}${i.storage_details ? ` · ${i.storage_details}` : ''}`} />
          <Row k="Insured" v={i.insured ? `Yes${i.insurance_details ? ` · ${i.insurance_details}` : ''}` : 'No'} />
          <Row k="Owner" v={i.owner_name} />
        </Section>

        {sold && <Section title="Sale"><Row k="Sold on" v={dateText(i.sale_date)} /><Row k="Amount received" v={inr(i.sale_amount, 2)} strong /><Row k="Total paid" v={inr(i.total_cost, 2)} /><Row k="Realised gain / loss" v={signedInr(v.realized_pnl)} color={pnlColor(v.realized_pnl)} strong />{i.sale_notes && <Row k="Notes" v={i.sale_notes} />}</Section>}
        {i.notes && <Section title="Notes"><Text style={s.bullet}>{i.notes}</Text></Section>}

        <View style={{ gap: 10 }}>
          {!sold && <Pressable style={s.primary} onPress={onSell}><Text style={s.primaryText}>Mark as sold</Text></Pressable>}
          {sold && <Pressable style={s.secondary} onPress={() => confirm('Reopen this item?', 'It will count as held again and the sale details will be cleared.', async () => { await apiClient.post(`/api/precious-metals/items/${i.id}/reopen`, {}); onChanged(); })}><Text style={s.secondaryText}>Reopen (undo sale)</Text></Pressable>}
          <Pressable style={s.dangerBtn} onPress={() => confirm('Delete this item?', 'This removes it and its history from your totals. This cannot be undone.', async () => { await apiClient.delete(`/api/precious-metals/items/${i.id}`); onChanged(true); }, true)}><Text style={s.dangerText}>Delete item</Text></Pressable>
        </View>
        <Text style={s.foot}>Values are estimates from the rates you enter. Not investment advice.</Text>
      </ScrollView>
      {sellModal}
    </View>
  );
};

const Sheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <Modal transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetWrap}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.rowBetween}><Text style={s.h1}>{title}</Text><Pressable onPress={onClose} hitSlop={10}><MaterialIcons name="close" size={22} color={colors.outline} /></Pressable></View>
        {children}
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const RatesModal: React.FC<{ rates: Summary['rates']; onClose: () => void; onSaved: () => void }> = ({ rates, onClose, onSaved }) => {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(METALS.map((m) => [m, rates[m] ? String(Math.round(rates[m]!.rate_per_gram * RATE_UNIT[m].grams * 100) / 100) : ''])));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const entries = METALS.filter((m) => vals[m] && Number(vals[m]) > 0).map((m) => ({ metal: m, rate_per_gram: Math.round((Number(vals[m]) / RATE_UNIT[m].grams) * 100) / 100 }));
    if (entries.length === 0) return Alert.alert('Enter a rate', 'Fill in at least one rate.');
    setBusy(true);
    try { await apiClient.post('/api/precious-metals/rates', { rates: entries }); onSaved(); }
    catch (e: any) { Alert.alert('Could not save', e?.message || 'Try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Update today's rates" onClose={onClose}>
      <Text style={s.hint}>Enter the 999-purity market rate in the unit you usually see. Lower purities (22K, 925) are priced from it automatically.</Text>
      {METALS.map((m) => (
        <View key={m} style={s.rateInputRow}>
          <View style={{ flex: 1 }}><Text style={[s.rateMetal, { color: METAL_STYLE[m].fg }]}>{METAL_STYLE[m].label}</Text><Text style={s.hint}>₹ {RATE_UNIT[m].label}</Text></View>
          <TextInput value={vals[m]} onChangeText={(t) => setVals({ ...vals, [m]: t })} keyboardType="decimal-pad" placeholder="–" style={[s.input, { width: 140, textAlign: 'right' }]} />
        </View>
      ))}
      <Pressable style={[s.primary, busy && { opacity: 0.6 }]} disabled={busy} onPress={save}><Text style={s.primaryText}>{busy ? 'Saving…' : 'Save rates'}</Text></Pressable>
    </Sheet>
  );
};

const SellModal: React.FC<{ item: MetalItem; onClose: () => void; onDone: () => void }> = ({ item, onClose, onDone }) => {
  const [date, setDate] = useState(todayYmd());
  const [amount, setAmount] = useState(item.valuation.current_value ? String(Math.round(item.valuation.current_value)) : '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const pnl = amount ? Number(amount) - item.total_cost : null;
  const save = async () => {
    setBusy(true);
    try { await apiClient.post(`/api/precious-metals/items/${item.id}/sell`, { sale_date: date, sale_amount: Number(amount), sale_notes: notes || undefined }); onDone(); }
    catch (e: any) { Alert.alert('Could not save', e?.message || 'Check the date and amount.'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Mark as sold" onClose={onClose}>
      <Text style={s.hint}>{item.name} · {grams(item.net_weight_g)} of {item.purity_label}</Text>
      <Text style={s.label}>Sale date (YYYY-MM-DD)</Text>
      <TextInput value={date} onChangeText={setDate} style={s.input} placeholder="2025-06-01" />
      <Text style={s.label}>Amount received (₹)</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={s.input} placeholder="0" />
      <Text style={s.label}>Notes (optional)</Text>
      <TextInput value={notes} onChangeText={setNotes} style={s.input} placeholder="Buyer, deductions…" />
      {pnl !== null && <Text style={[s.bullet, { color: pnlColor(pnl), fontFamily: 'Inter_700Bold' }]}>{signedInr(pnl)} compared with the {inr(item.total_cost)} you paid</Text>}
      <Pressable style={[s.primary, (busy || !amount) && { opacity: 0.6 }]} disabled={busy || !amount} onPress={save}><Text style={s.primaryText}>{busy ? 'Saving…' : 'Confirm sale'}</Text></Pressable>
    </Sheet>
  );
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  title: { flex: 1, fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  body: { padding: 16, gap: 14, paddingBottom: 170 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hero: { backgroundColor: colors.primaryContainer, borderRadius: 22, padding: 18, gap: 6 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, fontFamily: 'Inter_500Medium' },
  heroValue: { color: '#fff', fontSize: 32, fontFamily: 'Inter_700Bold' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontFamily: 'Inter_500Medium' },
  heroSubV: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  heroNote: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 6 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 18, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(193,200,194,0.5)' },
  h1: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  h2: { fontSize: 14.5, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  muted: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.onSurfaceVariant, flexShrink: 1 },
  hint: { fontSize: 11.5, color: colors.outline, lineHeight: 16 },
  bullet: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.onSurface, lineHeight: 19 },
  err: { color: colors.error, fontSize: 13 },
  foot: { fontSize: 11, color: colors.outline, textAlign: 'center', marginTop: 4 },
  warnBox: { flexDirection: 'row', gap: 8, backgroundColor: '#fef3c7', padding: 10, borderRadius: 12, alignItems: 'flex-start' },
  warnText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 17 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  smallBtnText: { color: colors.onPrimary, fontSize: 12, fontFamily: 'Inter_700Bold' },
  rateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rateCell: { flexGrow: 1, minWidth: '47%', borderRadius: 14, padding: 10, gap: 1 },
  rateMetal: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  rateValue: { fontSize: 17, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  rateUnit: { fontSize: 10.5, color: colors.onSurfaceVariant },
  rateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metalCard: { width: 205, backgroundColor: colors.surfaceContainerLowest, borderRadius: 18, padding: 12, gap: 4, borderWidth: 1.5 },
  metalValue: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.onSurface, marginTop: 4 },
  metalPnl: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  statRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surfaceContainerLowest, borderRadius: 14, padding: 10, gap: 2, borderWidth: 1, borderColor: 'rgba(193,200,194,0.5)' },
  statV: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  statK: { fontSize: 10.5, color: colors.onSurfaceVariant },
  chipBase: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  chipText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: colors.surfaceContainerHigh },
  tabOn: { backgroundColor: colors.primaryContainer },
  tabText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.onSurfaceVariant },
  item: { flexDirection: 'row', gap: 12, backgroundColor: colors.surfaceContainerLowest, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: 'rgba(193,200,194,0.5)' },
  itemIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemName: { flex: 1, fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  itemValue: { fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  soldTag: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#6b7280', backgroundColor: '#e5e7eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceContainerLow, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 10.5, color: colors.onSurfaceVariant, fontFamily: 'Inter_500Medium' },
  empty: { alignItems: 'center', gap: 8, padding: 28 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  emptyText: { fontSize: 12.5, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 18 },
  fab: { position: 'absolute', right: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryContainer, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 28, elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabText: { color: colors.onPrimary, fontFamily: 'Inter_700Bold', fontSize: 15 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  kvK: { fontSize: 12.5, color: colors.onSurfaceVariant, flexShrink: 1 },
  kvV: { fontSize: 13, color: colors.onSurface, fontFamily: 'Inter_500Medium', textAlign: 'right', flex: 1 },
  primary: { backgroundColor: colors.primaryContainer, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: colors.onPrimary, fontFamily: 'Inter_700Bold', fontSize: 15 },
  secondary: { backgroundColor: colors.surfaceContainerHigh, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { color: colors.onSurface, fontFamily: 'Inter_700Bold', fontSize: 14 },
  dangerBtn: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f3b8b3' },
  dangerText: { color: '#b3261e', fontFamily: 'Inter_700Bold', fontSize: 14 },
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 12, paddingBottom: 30 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.onSurfaceVariant, marginBottom: -6 },
  input: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#c1c8c2', fontSize: 14, color: colors.onSurface },
});
