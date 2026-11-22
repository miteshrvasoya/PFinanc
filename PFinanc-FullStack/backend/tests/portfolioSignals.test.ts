/** Pure-logic tests for the rule-based portfolio signals (no database). */
import { PortfolioSignalsService } from '../src/modules/ai-advisor/portfolioSignals.service.js';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

const holding = (over: any) => ({
  security_id: over.symbol, symbol: over.symbol, isin: null, name: over.symbol + ' Ltd', security_type: 'STOCK', asset_class: 'EQUITY',
  exchange: 'NSE', current_quantity: 10, average_cost: 100, total_invested: 1000, current_price: 100, price_date: daysAgo(0), is_stale: false,
  current_value: 1000, unrealized_pnl: 0, unrealized_pnl_percent: 0, realized_pnl: 0, total_dividends: 0, lots: [], ...over,
});

const summary = (total: number, stablePct = 0) => ({
  summary: { totalCurrentValue: total, totalInvested: total, unrealizedPnL: 0, unrealizedPnLPercent: 0, xirr: 12.3 },
  assetAllocation: [
    { label: 'Direct Equity (Stocks)', type: 'STOCK', amount: total, percent: 100 - stablePct },
    { label: 'Fixed Deposits', type: 'FIXED_INCOME', amount: 0, percent: stablePct },
  ],
});

describe('PortfolioSignalsService.fromData', () => {
  it('flags an overweight stock and top-3 concentration', () => {
    const holdings = [
      holding({ symbol: 'AAA', current_value: 60000 }),
      holding({ symbol: 'BBB', current_value: 20000 }),
      holding({ symbol: 'CCC', current_value: 10000 }),
      holding({ symbol: 'DDD', current_value: 10000 }),
    ];
    const s = PortfolioSignalsService.fromData(holdings as any, summary(100000), 'personal');
    expect(s.concentration.largestPosition).toEqual({ symbol: 'AAA', weightPct: 60 });
    expect(s.flags.some((f) => f.type === 'OVERWEIGHT_POSITION' && f.symbol === 'AAA')).toBe(true);
    expect(s.flags.some((f) => f.type === 'TOP3_CONCENTRATION')).toBe(true);
    expect(s.reviewForReducing.find((r) => r.symbol === 'AAA')).toBeTruthy();
  });

  it('flags deep losses and suggests reviewing, not selling', () => {
    const s = PortfolioSignalsService.fromData(
      [holding({ symbol: 'LOSS', current_value: 7000, total_invested: 10000, unrealized_pnl: -3000, unrealized_pnl_percent: -30 }), holding({ symbol: 'OK', current_value: 93000 })] as any,
      summary(100000), 'personal'
    );
    const f = s.flags.find((x) => x.type === 'DEEP_LOSS');
    expect(f?.symbol).toBe('LOSS');
    expect(f?.evidence).toMatch(/30%/);
    expect(s.caveats.join(' ')).toMatch(/Not investment advice/);
  });

  it('detects lots that turn long-term soon and splits units by holding period', () => {
    const s = PortfolioSignalsService.fromData(
      [holding({ symbol: 'LT', current_quantity: 15, lots: [
        { date: daysAgo(400), quantity: 5, unitCost: 90, totalCost: 450 },
        { date: daysAgo(340), quantity: 10, unitCost: 95, totalCost: 950 },
      ] }), holding({ symbol: 'X', current_value: 500 })] as any,
      summary(1500), 'personal'
    );
    const p = s.positions.find((x) => x.symbol === 'LT')!;
    expect(p.longTermQuantity).toBe(5);
    expect(p.shortTermQuantity).toBe(10);
    expect(s.flags.some((f) => f.type === 'LONG_TERM_SOON' && f.symbol === 'LT')).toBe(true);
  });

  it('suggests structural gaps when there are no funds or stable assets', () => {
    const s = PortfolioSignalsService.fromData([holding({ symbol: 'ONLY' })] as any, summary(1000, 0), 'personal');
    expect(s.flags.some((f) => f.type === 'NO_DIVERSIFIED_FUND')).toBe(true);
    expect(s.flags.some((f) => f.type === 'NO_DEBT_OR_STABLE_ASSET')).toBe(true);
    expect(s.reviewForAdding.length).toBeGreaterThan(0);
  });

  it('does not call a single fund overweight and handles an empty portfolio', () => {
    const fund = PortfolioSignalsService.fromData([holding({ symbol: 'IDX', security_type: 'MUTUAL_FUND', current_value: 90000 }), holding({ symbol: 'S', current_value: 10000 })] as any, summary(100000, 20), 'personal');
    expect(fund.flags.some((f) => f.type === 'OVERWEIGHT_POSITION' && f.symbol === 'IDX')).toBe(false);
    const empty = PortfolioSignalsService.fromData([], summary(0), 'personal');
    expect(empty.positions).toEqual([]);
    expect(empty.totals.holdingsCount).toBe(0);
    expect(empty.concentration.largestPosition).toBeNull();
  });
});
