import { HoldingsService, SecurityHolding } from '../investments/holdings/holdings.service.js';
import { PortfolioService } from '../investments/portfolio/portfolio.service.js';

/**
 * Deterministic, rule-based portfolio observations. They are computed from the user's own confirmed data
 * and are shared by the AI report, the AI chat and the MCP tools, so every consumer reasons from the same
 * facts. They are signals to review, never instructions to trade.
 */

export interface PositionView {
  symbol: string;
  name: string;
  securityType: string;
  assetClass: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  priceDate: string | null;
  priceIsStale: boolean;
  currentValue: number;
  invested: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  weightPct: number;
  /** Oldest buy lot, in days. Null when lot history is unavailable (e.g. imported snapshots). */
  oldestLotDays: number | null;
  /** Quantity already past the 12-month mark (equity-style long-term threshold). */
  longTermQuantity: number | null;
  shortTermQuantity: number | null;
}

export interface SignalFlag {
  type:
    | 'OVERWEIGHT_POSITION'
    | 'TOP3_CONCENTRATION'
    | 'DEEP_LOSS'
    | 'LARGE_GAIN_OVERWEIGHT'
    | 'LONG_TERM_SOON'
    | 'STALE_PRICE'
    | 'NO_DEBT_OR_STABLE_ASSET'
    | 'NO_DIVERSIFIED_FUND'
    | 'SINGLE_STOCK_HEAVY';
  severity: 'info' | 'warning';
  symbol?: string;
  message: string;
  evidence: string;
}

export interface PortfolioSignals {
  asOf: string;
  scope: 'personal' | 'household';
  totals: {
    currentValue: number;
    invested: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
    xirrPct: number | null;
    holdingsCount: number;
  };
  allocation: Array<{ label: string; amount: number; percent: number }>;
  concentration: {
    largestPosition: { symbol: string; weightPct: number } | null;
    top3WeightPct: number;
    directStocksWeightPct: number;
  };
  positions: PositionView[];
  /** Positions worth reviewing for a possible trim/exit, and why. Not a recommendation to sell. */
  reviewForReducing: Array<{ symbol: string; reasons: string[] }>;
  /** Structural gaps that a new purchase could address (asset classes, not specific stocks). */
  reviewForAdding: string[];
  flags: SignalFlag[];
  caveats: string[];
}

const DAY_MS = 86_400_000;
const LONG_TERM_DAYS = 365; // equity / equity mutual fund threshold in India
const OVERWEIGHT_PCT = 20;
const TOP3_PCT = 55;
const DEEP_LOSS_PCT = -15;
const BIG_GAIN_PCT = 50;
const LONG_TERM_SOON_DAYS = 60;

const round = (n: number, d = 2) => Number((Number.isFinite(n) ? n : 0).toFixed(d));

function lotPeriods(h: SecurityHolding, now: number) {
  const lots = (h.lots || []).filter((l) => l.quantity > 0 && l.date);
  if (lots.length === 0) return { oldestLotDays: null, longTerm: null, shortTerm: null, soonQty: 0, soonDays: null as number | null };
  let longTerm = 0;
  let shortTerm = 0;
  let oldest = 0;
  let soonQty = 0;
  let soonDays: number | null = null;
  for (const l of lots) {
    const age = Math.floor((now - new Date(l.date).getTime()) / DAY_MS);
    oldest = Math.max(oldest, age);
    if (age >= LONG_TERM_DAYS) longTerm += l.quantity;
    else {
      shortTerm += l.quantity;
      const left = LONG_TERM_DAYS - age;
      if (left <= LONG_TERM_SOON_DAYS) {
        soonQty += l.quantity;
        soonDays = soonDays === null ? left : Math.min(soonDays, left);
      }
    }
  }
  return { oldestLotDays: oldest, longTerm, shortTerm, soonQty, soonDays };
}

export class PortfolioSignalsService {
  static async compute(householdId: string, userId: string, scope: 'personal' | 'household' = 'personal'): Promise<PortfolioSignals> {
    const personal = scope === 'personal';
    const [holdings, summary] = await Promise.all([
      HoldingsService.calculateHoldings({ householdId, userId: personal ? userId : undefined }),
      PortfolioService.getPortfolioSummary(householdId, personal ? userId : undefined),
    ]);
    return this.fromData(holdings, summary, scope);
  }

  /** Pure function over already-loaded data (unit-testable without a database). */
  static fromData(holdings: SecurityHolding[], summary: any, scope: 'personal' | 'household'): PortfolioSignals {
    const now = Date.now();
    const active = holdings.filter((h) => h.current_quantity > 0);
    const holdingsValue = active.reduce((s, h) => s + (h.current_value || 0), 0);
    const flags: SignalFlag[] = [];
    const reducing = new Map<string, string[]>();
    const addReason = (symbol: string, reason: string) => reducing.set(symbol, [...(reducing.get(symbol) || []), reason]);

    const positions: PositionView[] = active
      .map((h) => {
        const p = lotPeriods(h, now);
        const weight = holdingsValue > 0 ? ((h.current_value || 0) / holdingsValue) * 100 : 0;
        return {
          symbol: h.symbol,
          name: h.name,
          securityType: h.security_type,
          assetClass: h.asset_class,
          quantity: round(h.current_quantity, 4),
          averageCost: round(h.average_cost),
          currentPrice: round(h.current_price),
          priceDate: h.price_date,
          priceIsStale: !!h.is_stale,
          currentValue: Math.round(h.current_value || 0),
          invested: Math.round(h.total_invested || 0),
          unrealizedPnl: Math.round(h.unrealized_pnl || 0),
          unrealizedPnlPct: round(h.unrealized_pnl_percent || 0),
          weightPct: round(weight),
          oldestLotDays: p.oldestLotDays,
          longTermQuantity: p.longTerm === null ? null : round(p.longTerm, 4),
          shortTermQuantity: p.shortTerm === null ? null : round(p.shortTerm, 4),
          _soonQty: p.soonQty,
          _soonDays: p.soonDays,
        } as PositionView & { _soonQty: number; _soonDays: number | null };
      })
      .sort((a, b) => b.currentValue - a.currentValue);

    const top3 = positions.slice(0, 3).reduce((s, p) => s + p.weightPct, 0);
    const directStocks = positions.filter((p) => p.securityType === 'STOCK').reduce((s, p) => s + p.weightPct, 0);

    for (const p of positions as Array<PositionView & { _soonQty: number; _soonDays: number | null }>) {
      const isFund = p.securityType === 'MUTUAL_FUND' || p.securityType === 'ETF';
      if (p.weightPct >= OVERWEIGHT_PCT && !isFund && positions.length > 1) {
        flags.push({
          type: 'OVERWEIGHT_POSITION', severity: 'warning', symbol: p.symbol,
          message: `${p.symbol} is a large share of your holdings.`,
          evidence: `${p.symbol} is ${p.weightPct}% of the portfolio (review threshold ${OVERWEIGHT_PCT}%).`,
        });
        addReason(p.symbol, `Overweight: ${p.weightPct}% of the portfolio`);
      }
      if (p.unrealizedPnlPct <= DEEP_LOSS_PCT && p.invested > 0) {
        flags.push({
          type: 'DEEP_LOSS', severity: 'info', symbol: p.symbol,
          message: `${p.symbol} is well below your cost.`,
          evidence: `Down ${Math.abs(p.unrealizedPnlPct)}% (avg cost ₹${p.averageCost} vs price ₹${p.currentPrice}). Review whether the original reason still holds; a realised loss may offset gains for tax.`,
        });
        addReason(p.symbol, `Down ${Math.abs(p.unrealizedPnlPct)}% from cost`);
      }
      if (p.unrealizedPnlPct >= BIG_GAIN_PCT && p.weightPct >= 12 && !isFund) {
        flags.push({
          type: 'LARGE_GAIN_OVERWEIGHT', severity: 'info', symbol: p.symbol,
          message: `${p.symbol} has grown into a big part of the portfolio.`,
          evidence: `Up ${p.unrealizedPnlPct}% and now ${p.weightPct}% of holdings. Trimming locks in gains and restores balance.`,
        });
        addReason(p.symbol, `Up ${p.unrealizedPnlPct}% and ${p.weightPct}% of the portfolio`);
      }
      if (p._soonQty > 0 && p._soonDays !== null && (p.securityType === 'STOCK' || p.securityType === 'ETF' || p.securityType === 'MUTUAL_FUND')) {
        flags.push({
          type: 'LONG_TERM_SOON', severity: 'info', symbol: p.symbol,
          message: `Part of ${p.symbol} turns long-term soon.`,
          evidence: `${round(p._soonQty, 2)} units cross 12 months in about ${p._soonDays} days; selling after that date is usually taxed at the lower long-term rate.`,
        });
      }
      if (p.priceIsStale) {
        flags.push({
          type: 'STALE_PRICE', severity: 'info', symbol: p.symbol,
          message: `The price for ${p.symbol} may be out of date.`,
          evidence: `Last price date: ${p.priceDate || 'unknown'}. Refresh prices before acting.`,
        });
      }
    }

    if (positions.length >= 3 && top3 >= TOP3_PCT) {
      flags.push({
        type: 'TOP3_CONCENTRATION', severity: 'warning',
        message: 'A few holdings make up most of your portfolio.',
        evidence: `Top 3 holdings are ${round(top3, 1)}% of holdings (review threshold ${TOP3_PCT}%).`,
      });
    }
    if (directStocks >= 60 && positions.filter((p) => p.securityType === 'STOCK').length > 0) {
      flags.push({
        type: 'SINGLE_STOCK_HEAVY', severity: 'info',
        message: 'Most of your holdings are individual stocks.',
        evidence: `Direct stocks are ${round(directStocks, 1)}% of holdings. Funds spread risk across many companies.`,
      });
    }

    const reviewForAdding: string[] = [];
    const alloc: Array<{ label: string; amount: number; percent: number; type?: string }> = (summary?.assetAllocation || []).map((a: any) => ({
      label: a.label, amount: Math.round(a.amount || 0), percent: a.percent || 0, type: a.type,
    }));
    const totalValue = summary?.summary?.totalCurrentValue || 0;
    const stable = alloc.filter((a) => ['FIXED_INCOME', 'RETIREMENT', 'GOLD'].includes(a.type || '')).reduce((s, a) => s + a.percent, 0);
    if (totalValue > 0 && stable < 10) {
      flags.push({
        type: 'NO_DEBT_OR_STABLE_ASSET', severity: 'info',
        message: 'There is very little in stable assets (deposits, debt, gold, retirement).',
        evidence: `Stable assets are about ${stable}% of the total. They cushion falls in equity.`,
      });
      reviewForAdding.push('Stable / debt assets (fixed deposits, debt funds, PPF/EPF) to cushion equity swings');
    }
    const hasFund = positions.some((p) => p.securityType === 'MUTUAL_FUND' || p.securityType === 'ETF');
    if (positions.length > 0 && !hasFund) {
      flags.push({
        type: 'NO_DIVERSIFIED_FUND', severity: 'info',
        message: 'No mutual funds or ETFs found.',
        evidence: 'A broad index fund or ETF gives instant diversification alongside individual stocks.',
      });
      reviewForAdding.push('A diversified index fund or ETF (broad market exposure)');
    }
    if (top3 >= TOP3_PCT && positions.length >= 3) reviewForAdding.push('New positions in under-represented sectors or asset classes to dilute concentration');

    const caveats = [
      'Signals are rule-based and use only the data in this app; they do not know your goals, tax slab, or fundamentals of any company.',
      'Long-term/short-term split uses a 12-month rule that applies to equity and equity funds; debt funds, gold and others are taxed differently.',
      'Prices come from free market-data sources and can be delayed or stale; check the price date.',
      'Not investment advice. Verify with a qualified advisor before buying or selling.',
    ];
    if (positions.some((p) => p.oldestLotDays === null)) caveats.push('Some holdings were imported as snapshots, so their holding period is unknown.');

    return {
      asOf: new Date().toISOString(),
      scope,
      totals: {
        currentValue: Math.round(summary?.summary?.totalCurrentValue || 0),
        invested: Math.round(summary?.summary?.totalInvested || 0),
        unrealizedPnl: Math.round(summary?.summary?.unrealizedPnL || 0),
        unrealizedPnlPct: round(summary?.summary?.unrealizedPnLPercent || 0),
        xirrPct: summary?.summary?.xirr != null ? round(summary.summary.xirr) : null,
        holdingsCount: active.length,
      },
      allocation: alloc.map(({ label, amount, percent }) => ({ label, amount, percent })),
      concentration: {
        largestPosition: positions[0] ? { symbol: positions[0].symbol, weightPct: positions[0].weightPct } : null,
        top3WeightPct: round(top3, 1),
        directStocksWeightPct: round(directStocks, 1),
      },
      positions: positions.map(({ ...p }) => {
        delete (p as any)._soonQty;
        delete (p as any)._soonDays;
        return p;
      }),
      reviewForReducing: Array.from(reducing.entries()).map(([symbol, reasons]) => ({ symbol, reasons })),
      reviewForAdding,
      flags,
      caveats,
    };
  }
}
