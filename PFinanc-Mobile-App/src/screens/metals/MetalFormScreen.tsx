import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { apiClient } from '../../api/client';
import {
  MetalItem, Metal, Form, Summary, METALS, METAL_STYLE, PURITY_PRESETS, ITEM_TYPES, STORAGE, ACQUIRED, titleCase, inr, grams, netOf, pureOf, valueOf, makingFrom, todayYmd,
} from './metalsShared';

const num = (t: string) => (t.trim() === '' || isNaN(Number(t)) ? null : Number(t));
const str = (v: any) => (v === null || v === undefined ? '' : String(v));

const Chips: React.FC<{ options: Array<[string, string]>; value: string | null; onChange: (v: string) => void; tint?: (k: string) => { bg: string; fg: string } | undefined }> = ({ options, value, onChange, tint }) => (
  <View style={f.chips}>
    {options.map(([k, label]) => {
      const on = value === k; const t = tint?.(k);
      return (
        <Pressable key={k} onPress={() => onChange(k)} style={[f.chip, on && { backgroundColor: t?.bg ?? colors.primaryContainer, borderColor: t?.fg ?? colors.primaryContainer }]}>
          <Text style={[f.chipText, on && { color: t?.fg ?? colors.onPrimary }]}>{label}</Text>
        </Pressable>
      );
    })}
  </View>
);
const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <View style={{ gap: 5 }}><Text style={f.label}>{label}</Text>{children}{hint ? <Text style={f.hint}>{hint}</Text> : null}</View>
);
const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <View style={f.card}><Text style={f.h2}>{title}</Text>{children}</View>;
const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <View style={f.toggle}><Text style={f.toggleText}>{label}</Text><Switch value={value} onValueChange={onChange} /></View>
);

export const MetalFormScreen: React.FC<{ item: MetalItem | null; rates?: Summary['rates']; onCancel: () => void; onSaved: (saved?: MetalItem) => void }> = ({ item, rates, onCancel, onSaved }) => {
  const insets = useSafeAreaInsets();
  const editing = !!item;
  const [metal, setMetal] = useState<Metal>(item?.metal ?? 'GOLD');
  const [form, setForm] = useState<Form>(item?.form ?? 'JEWELLERY');
  const [itemType, setItemType] = useState(item?.item_type ?? 'RING');
  const [name, setName] = useState(item?.name ?? '');
  const [fineness, setFineness] = useState(str(item?.fineness ?? 916));
  const [gross, setGross] = useState(str(item?.gross_weight_g));
  const [stone, setStone] = useState(item && item.stone_weight_g > 0 ? str(item.stone_weight_g) : '');
  const [pieces, setPieces] = useState(str(item?.pieces ?? 1));
  const [acquired, setAcquired] = useState(item?.acquired_via ?? 'PURCHASE');
  const [date, setDate] = useState(item?.purchase_date ?? '');
  const [rate, setRate] = useState(str(item?.purchase_rate_per_g));
  const [metalCost, setMetalCost] = useState(str(item?.metal_cost));
  const [metalCostEdited, setMetalCostEdited] = useState(!!item?.metal_cost);
  const [mkType, setMkType] = useState<'PER_GRAM' | 'PERCENT' | 'FLAT'>(item?.making_charge_type ?? 'PERCENT');
  const [mkValue, setMkValue] = useState(str(item?.making_charge_value));
  const [making, setMaking] = useState(item && item.making_charges > 0 ? str(item.making_charges) : '');
  const [makingEdited, setMakingEdited] = useState(!!item && item.making_charges > 0);
  const [wastage, setWastage] = useState(str(item?.wastage_percent));
  const [stoneCharges, setStoneCharges] = useState(item && item.stone_charges > 0 ? str(item.stone_charges) : '');
  const [gst, setGst] = useState(item && item.gst_amount > 0 ? str(item.gst_amount) : '');
  const [other, setOther] = useState(item && item.other_charges > 0 ? str(item.other_charges) : '');
  const [totalOverride, setTotalOverride] = useState('');
  const [seller, setSeller] = useState(item?.seller_name ?? '');
  const [invoice, setInvoice] = useState(item?.invoice_number ?? '');
  const [hallmarked, setHallmarked] = useState(item?.hallmarked ?? false);
  const [huid, setHuid] = useState(item?.huid ?? '');
  const [storage, setStorage] = useState(item?.storage_location ?? 'HOME');
  const [storageDetails, setStorageDetails] = useState(item?.storage_details ?? '');
  const [insured, setInsured] = useState(item?.insured ?? false);
  const [insuranceDetails, setInsuranceDetails] = useState(item?.insurance_details ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fin = num(fineness) ?? 0;
  const g = num(gross) ?? 0, st = form === 'JEWELLERY' ? num(stone) ?? 0 : 0;
  const net = netOf(g, st);
  const pure = pureOf(net, fin);
  const autoMetalCost = num(rate) && net > 0 ? valueOf(net, fin, num(rate)!) : null;
  const mc = metalCostEdited ? num(metalCost) : autoMetalCost;
  const autoMaking = form === 'JEWELLERY' && num(mkValue) !== null ? makingFrom(mkType, num(mkValue)!, net, mc ?? 0) : null;
  const makingAmt = makingEdited ? num(making) ?? 0 : autoMaking ?? 0;
  const sum = Math.round(((mc ?? 0) + makingAmt + (num(stoneCharges) ?? 0) + (num(gst) ?? 0) + (num(other) ?? 0)) * 100) / 100;
  const total = totalOverride.trim() !== '' ? num(totalOverride) ?? sum : sum;
  const todayRate = rates?.[metal]?.rate_per_gram ?? null;
  const estValue = todayRate && net > 0 ? valueOf(net, fin, todayRate) : null;

  const purity = PURITY_PRESETS[metal];
  const presetHit = purity.find((p) => p.fineness === fin);
  const changeMetal = (m: Metal) => { setMetal(m); setFineness(String(PURITY_PRESETS[m][m === 'GOLD' ? 1 : 0].fineness)); };
  const changeForm = (fm: Form) => { setForm(fm); setItemType(fm === 'RAW' ? 'BAR' : 'RING'); if (fm === 'RAW') setStone(''); };

  const fail = (title: string, msg: string) => { setError(msg); Alert.alert(title, msg); };
  const save = async () => {
    setError('');
    if (!name.trim()) return fail('Name needed', 'Give this item a short name, like "Wedding ring" or "50 g bar".');
    if (g <= 0) return fail('Weight needed', 'Enter the gross weight in grams.');
    if (st >= g) return fail('Check stone weight', 'Stone weight must be less than the gross weight.');
    if (!(fin >= 100 && fin <= 1000)) return fail('Check purity', 'Purity must be between 100 and 1000 (for example 916 for 22K gold).');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Check the date', 'Use the format 2025-03-15.');
    const body: any = {
      name: name.trim(), metal, form, item_type: itemType, fineness: fin, purity_label: presetHit?.label, pieces: Math.max(1, Math.round(num(pieces) ?? 1)),
      gross_weight_g: g, stone_weight_g: st, acquired_via: acquired, purchase_date: date || null, purchase_rate_per_g: num(rate),
      metal_cost: mc, making_charge_type: form === 'JEWELLERY' && num(mkValue) !== null ? mkType : null, making_charge_value: form === 'JEWELLERY' ? num(mkValue) : null,
      making_charges: form === 'JEWELLERY' ? makingAmt : 0, wastage_percent: form === 'JEWELLERY' ? num(wastage) : null,
      stone_charges: num(stoneCharges) ?? 0, gst_amount: num(gst) ?? 0, other_charges: num(other) ?? 0,
      seller_name: seller || null, invoice_number: invoice || null, hallmarked, huid: hallmarked && huid ? huid.toUpperCase() : null,
      storage_location: storage, storage_details: storageDetails || null, insured, insurance_details: insured ? insuranceDetails || null : null, notes: notes || null,
    };
    if (totalOverride.trim() !== '' && num(totalOverride) !== null) body.total_cost = num(totalOverride);
    else if (acquired !== 'PURCHASE' && sum === 0) body.total_cost = 0;
    setBusy(true);
    try {
      const r = editing ? await apiClient.patch(`/api/precious-metals/items/${item!.id}`, body) : await apiClient.post('/api/precious-metals/items', body);
      onSaved(r?.data);
    } catch (e: any) { fail('Could not save', e?.message || 'Check the details and try again.'); }
    finally { setBusy(false); }
  };

  const typeOptions = useMemo(() => ITEM_TYPES[form].map((t) => [t, titleCase(t)] as [string, string]), [form]);

  return (
    <View style={f.screen}>
      <View style={[f.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onCancel} hitSlop={10}><MaterialIcons name="close" size={24} color={colors.onSurface} /></Pressable>
        <Text style={f.title}>{editing ? 'Edit item' : 'Add gold, silver or other metal'}</Text>
      </View>
      <ScrollView contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
        <Card title="What is it?">
          <Field label="Metal"><Chips options={METALS.map((m) => [m, METAL_STYLE[m].label])} value={metal} onChange={(v) => changeMetal(v as Metal)} tint={(k) => ({ bg: METAL_STYLE[k as Metal].bg, fg: METAL_STYLE[k as Metal].fg })} /></Field>
          <Field label="Form"><Chips options={[['RAW', 'Raw metal (bar, coin)'], ['JEWELLERY', 'Jewellery']]} value={form} onChange={(v) => changeForm(v as Form)} /></Field>
          <Field label="Type"><Chips options={typeOptions} value={itemType} onChange={setItemType} /></Field>
          <Field label="Name"><TextInput value={name} onChangeText={setName} placeholder={form === 'RAW' ? 'e.g. 50 g gold bar' : 'e.g. Wedding ring'} style={f.input} /></Field>
        </Card>

        <Card title="Purity and weight">
          <Field label="Purity">
            <Chips options={purity.map((p) => [String(p.fineness), p.label])} value={presetHit ? String(presetHit.fineness) : null} onChange={setFineness} />
            <TextInput value={fineness} onChangeText={setFineness} keyboardType="decimal-pad" placeholder="Fineness, e.g. 916" style={[f.input, { marginTop: 6 }]} />
          </Field>
          <View style={f.two}>
            <View style={{ flex: 1 }}><Field label="Gross weight (g)"><TextInput value={gross} onChangeText={setGross} keyboardType="decimal-pad" placeholder="0.000" style={f.input} /></Field></View>
            {form === 'JEWELLERY' && <View style={{ flex: 1 }}><Field label="Stone weight (g)"><TextInput value={stone} onChangeText={setStone} keyboardType="decimal-pad" placeholder="0.000" style={f.input} /></Field></View>}
            <View style={{ width: 80 }}><Field label="Pieces"><TextInput value={pieces} onChangeText={setPieces} keyboardType="number-pad" style={f.input} /></Field></View>
          </View>
          <View style={f.live}>
            <View style={f.liveCell}><Text style={f.liveK}>Net metal</Text><Text style={f.liveV}>{grams(net)}</Text></View>
            <View style={f.liveCell}><Text style={f.liveK}>Pure metal</Text><Text style={f.liveV}>{grams(pure)}</Text></View>
            <View style={f.liveCell}><Text style={f.liveK}>Melt value today</Text><Text style={f.liveV}>{estValue === null ? 'Set rate' : inr(estValue)}</Text></View>
          </View>
        </Card>

        <Card title="Purchase">
          <Field label="How did you get it?"><Chips options={ACQUIRED} value={acquired} onChange={setAcquired} /></Field>
          <View style={f.two}>
            <View style={{ flex: 1 }}><Field label="Date (YYYY-MM-DD)"><TextInput value={date} onChangeText={setDate} placeholder="2025-03-15" style={f.input} /></Field></View>
            <Pressable onPress={() => setDate(todayYmd())} style={f.todayBtn}><Text style={f.todayText}>Today</Text></Pressable>
          </View>
          <Field label="Rate per gram that day (₹, 999 purity)" hint="Used to work out the metal cost. Check your invoice."><TextInput value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="e.g. 6000" style={f.input} /></Field>
          <Field label="Metal cost (₹)" hint={metalCostEdited ? undefined : autoMetalCost ? 'Calculated from weight, purity and rate. Edit to override.' : undefined}>
            <TextInput value={metalCostEdited ? metalCost : autoMetalCost !== null ? String(autoMetalCost) : ''} onChangeText={(t) => { setMetalCost(t); setMetalCostEdited(true); }} keyboardType="decimal-pad" placeholder="0" style={f.input} />
          </Field>
          {form === 'JEWELLERY' && (<>
            <Field label="Making charges"><Chips options={[['PERCENT', '% of metal'], ['PER_GRAM', '₹ per gram'], ['FLAT', 'Flat ₹']]} value={mkType} onChange={(v) => { setMkType(v as any); setMakingEdited(false); }} /></Field>
            <View style={f.two}>
              <View style={{ flex: 1 }}><Field label={mkType === 'PERCENT' ? 'Making (%)' : mkType === 'PER_GRAM' ? 'Making (₹/g)' : 'Making (₹)'}><TextInput value={mkValue} onChangeText={(t) => { setMkValue(t); setMakingEdited(false); }} keyboardType="decimal-pad" style={f.input} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Making amount (₹)"><TextInput value={makingEdited ? making : autoMaking !== null ? String(autoMaking) : ''} onChangeText={(t) => { setMaking(t); setMakingEdited(true); }} keyboardType="decimal-pad" style={f.input} /></Field></View>
            </View>
            <View style={f.two}>
              <View style={{ flex: 1 }}><Field label="Wastage (%)"><TextInput value={wastage} onChangeText={setWastage} keyboardType="decimal-pad" style={f.input} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Stone charges (₹)"><TextInput value={stoneCharges} onChangeText={setStoneCharges} keyboardType="decimal-pad" style={f.input} /></Field></View>
            </View>
          </>)}
          <View style={f.two}>
            <View style={{ flex: 1 }}><Field label="GST (₹)"><TextInput value={gst} onChangeText={setGst} keyboardType="decimal-pad" style={f.input} /></Field></View>
            <View style={{ flex: 1 }}><Field label="Other charges (₹)"><TextInput value={other} onChangeText={setOther} keyboardType="decimal-pad" style={f.input} /></Field></View>
          </View>
          <Field label="Total paid (₹)" hint={totalOverride ? 'Using the amount you typed.' : `Sum of the above: ${inr(sum, 2)}. Type here only if your bill total differs.`}>
            <TextInput value={totalOverride} onChangeText={setTotalOverride} keyboardType="decimal-pad" placeholder={String(sum)} style={f.input} />
          </Field>
          <View style={f.two}>
            <View style={{ flex: 1 }}><Field label="Seller / jeweller"><TextInput value={seller} onChangeText={setSeller} style={f.input} /></Field></View>
            <View style={{ flex: 1 }}><Field label="Invoice no."><TextInput value={invoice} onChangeText={setInvoice} style={f.input} /></Field></View>
          </View>
        </Card>

        <Card title="Hallmark">
          <Toggle label="BIS hallmarked" value={hallmarked} onChange={setHallmarked} />
          {hallmarked && <Field label="HUID (6 letters / digits)"><TextInput value={huid} onChangeText={(t) => setHuid(t.toUpperCase())} maxLength={6} autoCapitalize="characters" placeholder="AB12CD" style={f.input} /></Field>}
        </Card>

        <Card title="Where is it kept?">
          <Chips options={STORAGE} value={storage} onChange={setStorage} />
          <Field label="Details (optional)"><TextInput value={storageDetails} onChangeText={setStorageDetails} placeholder="Bank, branch, locker no." style={f.input} /></Field>
          <Toggle label="Insured" value={insured} onChange={setInsured} />
          {insured && <Field label="Insurance details"><TextInput value={insuranceDetails} onChangeText={setInsuranceDetails} placeholder="Insurer and policy no." style={f.input} /></Field>}
        </Card>

        <Card title="Notes">
          <TextInput value={notes} onChangeText={setNotes} multiline placeholder="Occasion, who it belongs to, anything to remember" style={[f.input, { minHeight: 80, textAlignVertical: 'top' }]} />
        </Card>

        <View style={f.summary}><Text style={f.summaryK}>Total paid</Text><Text style={f.summaryV}>{inr(total, 2)}</Text></View>
        {!!error && <View style={f.errBox}><MaterialIcons name="error-outline" size={18} color="#b3261e" /><Text style={f.errText}>{error}</Text></View>}
        <Pressable style={[f.save, busy && { opacity: 0.6 }]} disabled={busy} onPress={save}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={f.saveText}>{editing ? 'Save changes' : 'Add to my metals'}</Text>}</Pressable>
      </ScrollView>
    </View>
  );
};

const f = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  title: { flex: 1, fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  body: { padding: 16, gap: 14, paddingBottom: 150 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 18, padding: 14, gap: 12, borderWidth: 1, borderColor: 'rgba(193,200,194,0.5)' },
  h2: { fontSize: 14.5, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.onSurfaceVariant },
  hint: { fontSize: 11, color: colors.outline, lineHeight: 15 },
  input: { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#c1c8c2', fontSize: 14, color: colors.onSurface },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.surfaceContainerHigh, borderWidth: 1.5, borderColor: 'transparent' },
  chipText: { fontSize: 12.5, fontFamily: 'Inter_700Bold', color: colors.onSurfaceVariant },
  two: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  live: { flexDirection: 'row', gap: 8 },
  liveCell: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: 12, padding: 10 },
  liveK: { fontSize: 10.5, color: colors.onSurfaceVariant },
  liveV: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  todayBtn: { backgroundColor: colors.surfaceContainerHigh, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 1 },
  todayText: { fontSize: 12.5, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleText: { fontSize: 14, color: colors.onSurface, fontFamily: 'Inter_500Medium' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.primaryContainer, borderRadius: 16, padding: 16 },
  summaryK: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'Inter_500Medium' },
  summaryV: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  errBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#ffdad6', padding: 12, borderRadius: 12 },
  errText: { flex: 1, color: '#93000a', fontSize: 13, lineHeight: 18 },
  save: { backgroundColor: colors.primaryContainer, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: colors.onPrimary, fontSize: 16, fontFamily: 'Inter_700Bold' },
});
