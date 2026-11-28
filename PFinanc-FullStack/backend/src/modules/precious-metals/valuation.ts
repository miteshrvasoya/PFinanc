/**
 * Pure maths for precious metals: no I/O, so it is unit tested directly.
 *
 * Rates are per gram of the reference purity (999: "24K" gold, fine silver). A piece of lower purity is
 * worth rate x fineness/999 per gram. Jewellery is valued as melt value (metal only): making charges, stone
 * charges and GST are paid at purchase but are not recovered on resale, so they show as a gap against cost.
 */

export const METALS = ['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM'] as const;
export type Metal = (typeof METALS)[number];
export const FORMS = ['RAW', 'JEWELLERY'] as const;
export type Form = (typeof FORMS)[number];

export const REFERENCE_FINENESS = 999;

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

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Metal weight: gross minus stones and other non-metal parts. */
export function netWeight(gross: number, stone = 0): number {
  return r3(Math.max(0, gross - Math.max(0, stone)));
}

/** Grams of pure metal (fineness is parts per 1000). */
export function pureWeight(net: number, fineness: number): number {
  return r3((net * fineness) / 1000);
}

/** Melt value of `net` grams at `fineness` for a reference-purity rate. */
export function metalValue(net: number, fineness: number, ratePerGram: number): number {
  return r2(net * Math.min(fineness / REFERENCE_FINENESS, 1) * ratePerGram);
}

/** Label for a fineness, e.g. 916 gold is "22K". Falls back to "<n> fineness". */
export function purityLabel(metal: Metal, fineness: number): string {
  const hit = PURITY_PRESETS[metal].find((p) => Math.abs(p.fineness - fineness) < 0.5);
  return hit ? hit.label : `${fineness} fineness`;
}

export type MakingType = 'PER_GRAM' | 'PERCENT' | 'FLAT';

/** Making charges implied by a chosen method, so the app can prefill the amount. */
export function makingChargeAmount(type: MakingType, value: number, net: number, metalCost: number): number {
  if (type === 'PER_GRAM') return r2(value * net);
  if (type === 'PERCENT') return r2((value / 100) * metalCost);
  return r2(value);
}

export interface CostParts {
  metalCost?: number | null; makingCharges?: number | null; stoneCharges?: number | null; gstAmount?: number | null; otherCharges?: number | null;
}

export function sumCost(p: CostParts): number {
  return r2((p.metalCost ?? 0) + (p.makingCharges ?? 0) + (p.stoneCharges ?? 0) + (p.gstAmount ?? 0) + (p.otherCharges ?? 0));
}

export interface ValuationInput {
  netWeightG: number; fineness: number; totalCost: number; metalCost: number | null; status: 'HELD' | 'SOLD'; saleAmount: number | null;
}
export interface Valuation {
  pureWeightG: number;
  ratePerGram: number | null;
  /** Melt value at today's rate; null when no rate has been entered for the metal. */
  currentValue: number | null;
  /** Unrealised P&L against everything paid (making charges and GST included). */
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  /** P&L of the metal alone: current melt value against the metal cost. */
  metalPnl: number | null;
  /** Paid above metal value today: making + stone + GST + other, or a rate fall. */
  premiumPaid: number | null;
  realizedPnl: number | null;
  realizedPnlPct: number | null;
}

export function valuate(i: ValuationInput, ratePerGram: number | null): Valuation {
  const pure = pureWeight(i.netWeightG, i.fineness);
  if (i.status === 'SOLD') {
    const realized = i.saleAmount === null ? null : r2(i.saleAmount - i.totalCost);
    return {
      pureWeightG: pure, ratePerGram, currentValue: null, unrealizedPnl: null, unrealizedPnlPct: null, metalPnl: null, premiumPaid: null,
      realizedPnl: realized, realizedPnlPct: realized !== null && i.totalCost > 0 ? r2((realized / i.totalCost) * 100) : null,
    };
  }
  if (ratePerGram === null) {
    return { pureWeightG: pure, ratePerGram, currentValue: null, unrealizedPnl: null, unrealizedPnlPct: null, metalPnl: null, premiumPaid: null, realizedPnl: null, realizedPnlPct: null };
  }
  const value = metalValue(i.netWeightG, i.fineness, ratePerGram);
  const pnl = r2(value - i.totalCost);
  return {
    pureWeightG: pure, ratePerGram, currentValue: value, unrealizedPnl: pnl,
    unrealizedPnlPct: i.totalCost > 0 ? r2((pnl / i.totalCost) * 100) : null,
    metalPnl: i.metalCost !== null ? r2(value - i.metalCost) : null,
    premiumPaid: r2(i.totalCost - value), realizedPnl: null, realizedPnlPct: null,
  };
}
