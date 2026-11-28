export type Metal = 'GOLD' | 'SILVER' | 'PLATINUM' | 'PALLADIUM';
export type Form = 'RAW' | 'JEWELLERY';

export interface Valuation {
  pure_weight_g: number; rate_per_gram: number | null; rate_date: string | null; current_value: number | null;
  unrealized_pnl: number | null; unrealized_pnl_pct: number | null; metal_pnl: number | null; premium_paid: number | null;
  realized_pnl: number | null; realized_pnl_pct: number | null; rate_missing: boolean;
}
export interface MetalItem {
  id: string; owner_name: string; name: string; metal: Metal; form: Form; item_type: string; purity_label: string | null; fineness: number; pieces: number;
  gross_weight_g: number; stone_weight_g: number; net_weight_g: number;
  acquired_via: string; purchase_date: string | null; purchase_rate_per_g: number | null; metal_cost: number | null;
  making_charge_type: 'PER_GRAM' | 'PERCENT' | 'FLAT' | null; making_charge_value: number | null; making_charges: number; wastage_percent: number | null;
  stone_charges: number; gst_amount: number; other_charges: number; total_cost: number; seller_name: string | null; invoice_number: string | null;
  hallmarked: boolean; huid: string | null; storage_location: string; storage_details: string | null; insured: boolean; insurance_details: string | null; notes: string | null;
  status: 'HELD' | 'SOLD'; sale_date: string | null; sale_amount: number | null; sale_notes: string | null; valuation: Valuation;
}
export interface Bucket { count: number; net_weight_g: number; pure_weight_g: number; total_cost: number; current_value: number; pnl: number; unvalued_count: number; unvalued_cost: number }
export interface Summary {
  total: Bucket & { pnl_pct: number | null }; by_metal: Partial<Record<Metal, Bucket>>; by_form: Partial<Record<Form, Bucket>>;
  realized: { count: number; pnl: number; proceeds: number };
  rates: Record<Metal, { rate_per_gram: number; rate_date: string; stale: boolean } | null>;
  warnings: string[]; insured_value: number; at_home_value: number;
}

export const METALS: Metal[] = ['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM'];
export const METAL_STYLE: Record<Metal, { label: string; fg: string; bg: string; ring: string }> = {
  GOLD: { label: 'Gold', fg: '#8a6508', bg: '#fbf0cc', ring: '#e3b93c' },
  SILVER: { label: 'Silver', fg: '#4b5563', bg: '#e8ecef', ring: '#aab4bd' },
  PLATINUM: { label: 'Platinum', fg: '#35566f', bg: '#e1edf5', ring: '#8fb2cb' },
  PALLADIUM: { label: 'Palladium', fg: '#5d4f86', bg: '#ebe6f6', ring: '#a99bd0' },
};
export const PURITY_PRESETS: Record<Metal, Array<{ label: string; fineness: number }>> = {
  GOLD: [{ label: '24K', fineness: 999 }, { label: '22K', fineness: 916 }, { label: '20K', fineness: 833 }, { label: '18K', fineness: 750 }, { label: '14K', fineness: 585 }],
  SILVER: [{ label: '999 Fine', fineness: 999 }, { label: '925 Sterling', fineness: 925 }, { label: '800', fineness: 800 }],
  PLATINUM: [{ label: '999', fineness: 999 }, { label: '950', fineness: 950 }],
  PALLADIUM: [{ label: '999', fineness: 999 }, { label: '950', fineness: 950 }],
};
export const ITEM_TYPES: Record<Form, string[]> = {
  RAW: ['BAR', 'COIN', 'BISCUIT', 'WIRE', 'GRANULES', 'OTHER'],
  JEWELLERY: ['RING', 'NECKLACE', 'CHAIN', 'BANGLE', 'BRACELET', 'EARRING', 'PENDANT', 'ANKLET', 'SET', 'UTENSIL', 'IDOL', 'OTHER'],
};
export const STORAGE: Array<[string, string]> = [['HOME', 'At home'], ['BANK_LOCKER', 'Bank locker'], ['JEWELLER', 'With jeweller'], ['FAMILY', 'With family'], ['OTHER', 'Other']];
export const ACQUIRED: Array<[string, string]> = [['PURCHASE', 'Bought'], ['GIFT', 'Gift'], ['INHERITANCE', 'Inherited'], ['OTHER', 'Other']];

export const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');
export const inr = (n: number | null | undefined, decimals = 0) =>
  n === null || n === undefined ? '–' : `${n < 0 ? '-' : ''}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
export const signedInr = (n: number | null | undefined) => (n === null || n === undefined ? '–' : `${n >= 0 ? '+' : '-'}${inr(Math.abs(n))}`);
export const grams = (n: number | null | undefined) => (n === null || n === undefined ? '–' : `${Number(n.toFixed(3)).toLocaleString('en-IN')} g`);
export const dateText = (d: string | null | undefined) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
export const todayYmd = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Live helpers used by the form so the user sees weights and value before saving. */
export const netOf = (gross: number, stone: number) => Math.max(0, Math.round((gross - stone) * 1000) / 1000);
export const pureOf = (net: number, fineness: number) => Math.round(((net * fineness) / 1000) * 1000) / 1000;
export const valueOf = (net: number, fineness: number, rate: number) => Math.round(net * Math.min(fineness / 999, 1) * rate * 100) / 100;
export const makingFrom = (type: 'PER_GRAM' | 'PERCENT' | 'FLAT', value: number, net: number, metalCost: number) =>
  Math.round((type === 'PER_GRAM' ? value * net : type === 'PERCENT' ? (value / 100) * metalCost : value) * 100) / 100;

/** Gold is quoted per 10 g and silver per kg in India; the API stores per gram. */
export const RATE_UNIT: Record<Metal, { label: string; grams: number }> = {
  GOLD: { label: 'per 10 g', grams: 10 }, SILVER: { label: 'per kg', grams: 1000 }, PLATINUM: { label: 'per g', grams: 1 }, PALLADIUM: { label: 'per g', grams: 1 },
};
