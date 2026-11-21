import { QueryHelper } from '../../../database/queryHelper.js';
import { HoldingsService } from '../holdings/holdings.service.js';
import { FixedDepositsService } from '../fixed-deposits/fixedDeposits.service.js';
import { RetirementService } from '../retirement/retirement.service.js';

export interface CashFlow {
  amount: number;
  date: Date;
}

export class PortfolioService {
  /**
   * Newton-Raphson method for exact XIRR calculation
   */
  static calculateXIRR(cashFlows: CashFlow[]): number | null {
    if (cashFlows.length < 2) return null;

    // Must have at least one positive and one negative cash flow
    const hasPos = cashFlows.some((c) => c.amount > 0);
    const hasNeg = cashFlows.some((c) => c.amount < 0);
    if (!hasPos || !hasNeg) return null;

    const startDate = cashFlows.reduce((min, c) => (c.date < min ? c.date : min), cashFlows[0].date);

    // Objective function: NPV(r)
    const npv = (r: number): number => {
      return cashFlows.reduce((sum, c) => {
        const days = (c.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return sum + c.amount / Math.pow(1 + r, days / 365.25);
      }, 0);
    };

    // Derivative of NPV with respect to r
    const dnpv = (r: number): number => {
      return cashFlows.reduce((sum, c) => {
        const days = (c.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return sum - (days / 365.25) * c.amount / Math.pow(1 + r, (days / 365.25) + 1);
      }, 0);
    };

    const toPercent = (r: number) => Math.round(r * 10000) / 100; // e.g. 0.1542 -> 15.42

    // 1. Newton-Raphson from a 10% guess, kept inside the valid domain (r > -100%).
    let rate = 0.1;
    const tolerance = 1e-7;
    for (let i = 0; i < 100; i++) {
      const fValue = npv(rate);
      const fPrime = dnpv(rate);
      if (!Number.isFinite(fValue) || !Number.isFinite(fPrime) || Math.abs(fPrime) < 1e-10) break;
      let nextRate = rate - fValue / fPrime;
      if (nextRate <= -0.9999) nextRate = (rate - 0.9999) / 2; // halve the step instead of leaving the domain
      if (Math.abs(nextRate - rate) < tolerance) return toPercent(nextRate);
      rate = nextRate;
    }

    // 2. Fallback: bisection over a wide bracket (NPV is monotonic for conventional cash flows).
    let lo = -0.9999;
    let hi = 10;
    let fLo = npv(lo);
    const fHi = npv(hi);
    if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      const fMid = npv(mid);
      if (Math.abs(fMid) < 1e-6 || hi - lo < tolerance) return toPercent(mid);
      if (fLo * fMid < 0) {
        hi = mid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }
    return null;
  }

  /**
   * Comprehensive portfolio valuation, asset allocation & XIRR
   */
  static async getPortfolioSummary(householdId: string, userId?: string) {
    const physicalSql = `
      SELECT 
        asset_type,
        SUM(purchase_cost)::float as total_cost,
        SUM(current_value)::float as total_value
      FROM physical_assets
      WHERE household_id = $1 ${userId ? 'AND owner_user_id = $2' : ''}
      GROUP BY asset_type
    `;
    const physicalParams = userId ? [householdId, userId] : [householdId];

    const [holdings, fds, retirementAccounts, rawTxns, physicalSummary] = await Promise.all([
      HoldingsService.calculateHoldings({ householdId, userId }),
      FixedDepositsService.list(householdId, userId),
      RetirementService.listAccounts(householdId, userId),
      QueryHelper.query<{ transaction_type: string; transaction_date: string; net_amount: string }>(
        `SELECT it.transaction_type, it.transaction_date, CAST(it.net_amount AS FLOAT) AS net_amount
         FROM investment_transactions it
         JOIN accounts a ON a.id = it.investment_account_id
         WHERE it.household_id = $1 AND it.status = 'CONFIRMED' AND it.security_id IS NOT NULL
           ${userId ? 'AND a.owner_user_id = $2' : ''}
         ORDER BY it.transaction_date ASC`,
        userId ? [householdId, userId] : [householdId]
      ),
      QueryHelper.query<{ asset_type: string; total_cost: number; total_value: number }>(
        physicalSql,
        physicalParams
      ),
    ]);

    // 1. Asset Breakdown
    let stockInvested = 0, stockValue = 0, stockRealized = 0;
    let mfInvested = 0, mfValue = 0, mfRealized = 0;
    let etfInvested = 0, etfValue = 0, etfRealized = 0;
    let totalDividends = 0;

    holdings.forEach((h) => {
      totalDividends += h.total_dividends;
      if (h.security_type === 'STOCK') {
        stockInvested += h.total_invested;
        stockValue += h.current_value;
        stockRealized += h.realized_pnl;
      } else if (h.security_type === 'MUTUAL_FUND') {
        mfInvested += h.total_invested;
        mfValue += h.current_value;
        mfRealized += h.realized_pnl;
      } else if (h.security_type === 'ETF') {
        etfInvested += h.total_invested;
        etfValue += h.current_value;
        etfRealized += h.realized_pnl;
      }
    });

    const fdPrincipal = fds.reduce((sum, f) => sum + (f.status === 'ACTIVE' ? f.principal_amount : 0), 0);
    const fdCurrentValue = fds.reduce((sum, f) => sum + (f.status === 'ACTIVE' ? f.current_value : 0), 0);

    const retirementTotal = retirementAccounts.reduce((sum, r) => sum + r.current_balance, 0);

    // Physical Assets (Gold, SGB, Tangible assets)
    let physicalInvested = 0;
    let physicalValue = 0;
    let goldValue = 0;
    let otherTangibleValue = 0;

    physicalSummary.forEach((p) => {
      physicalInvested += p.total_cost || 0;
      physicalValue += p.total_value || 0;
      if (['PHYSICAL_GOLD', 'DIGITAL_GOLD', 'SGB'].includes(p.asset_type)) {
        goldValue += p.total_value || 0;
      } else {
        otherTangibleValue += p.total_value || 0;
      }
    });

    const totalInvested = stockInvested + mfInvested + etfInvested + fdPrincipal + retirementTotal + physicalInvested;
    const totalCurrentValue = stockValue + mfValue + etfValue + fdCurrentValue + retirementTotal + physicalValue;
    const unrealizedPnL = totalCurrentValue - totalInvested;
    const unrealizedPnLPercent = totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;
    const totalRealizedPnL = stockRealized + mfRealized + etfRealized;

    // 2. Asset Allocation Breakdown
    const totalAllocationBase = totalCurrentValue > 0 ? totalCurrentValue : 1;
    const assetAllocation = [
      {
        label: 'Direct Equity (Stocks)',
        type: 'STOCK',
        amount: stockValue,
        percent: Math.round((stockValue / totalAllocationBase) * 100),
        color: '#6366f1',
      },
      {
        label: 'Mutual Funds',
        type: 'MUTUAL_FUND',
        amount: mfValue,
        percent: Math.round((mfValue / totalAllocationBase) * 100),
        color: '#10b981',
      },
      {
        label: 'Exchange Traded Funds (ETFs)',
        type: 'ETF',
        amount: etfValue,
        percent: Math.round((etfValue / totalAllocationBase) * 100),
        color: '#06b6d4',
      },
      {
        label: 'Fixed Deposits',
        type: 'FIXED_INCOME',
        amount: fdCurrentValue,
        percent: Math.round((fdCurrentValue / totalAllocationBase) * 100),
        color: '#f59e0b',
      },
      {
        label: 'Retirement (EPF / PPF / NPS)',
        type: 'RETIREMENT',
        amount: retirementTotal,
        percent: Math.round((retirementTotal / totalAllocationBase) * 100),
        color: '#ec4899',
      },
      {
        label: 'Gold & Precious Metals',
        type: 'GOLD',
        amount: goldValue,
        percent: Math.round((goldValue / totalAllocationBase) * 100),
        color: '#eab308',
      },
      {
        label: 'Other Physical Assets',
        type: 'OTHER_PHYSICAL',
        amount: otherTangibleValue,
        percent: Math.round((otherTangibleValue / totalAllocationBase) * 100),
        color: '#8b5cf6',
      },
    ].filter((a) => a.amount > 0);

    // 3. XIRR Calculation
    const cashFlows: CashFlow[] = [];
    rawTxns.forEach((tx) => {
      const net = parseFloat(String(tx.net_amount));
      const dt = new Date(tx.transaction_date);

      if (tx.transaction_type === 'BUY' || tx.transaction_type === 'SIP' || tx.transaction_type === 'INITIAL') {
        cashFlows.push({ amount: -net, date: dt });
      } else if (tx.transaction_type === 'SELL' || tx.transaction_type === 'REDEMPTION') {
        cashFlows.push({ amount: net, date: dt });
      } else if (tx.transaction_type === 'DIVIDEND' || tx.transaction_type === 'INTEREST') {
        cashFlows.push({ amount: net, date: dt });
      }
    });

    // Terminal value must cover only the assets whose cash flows are in the series (market securities);
    // FDs, retirement and physical assets have no flows here and would inflate the XIRR.
    const securitiesValue = stockValue + mfValue + etfValue;
    if (securitiesValue > 0) {
      cashFlows.push({ amount: securitiesValue, date: new Date() });
    }

    const xirr = this.calculateXIRR(cashFlows);

    return {
      summary: {
        totalInvested,
        totalCurrentValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        totalRealizedPnL,
        totalDividends,
        xirr,
        holdingsCount: holdings.filter((h) => h.current_quantity > 0).length,
        fdCount: fds.filter((f) => f.status === 'ACTIVE').length,
        retirementCount: retirementAccounts.length,
        physicalAssetsCount: physicalSummary.length,
      },
      breakdown: {
        stocks: { invested: stockInvested, value: stockValue, pnl: stockValue - stockInvested },
        mutualFunds: { invested: mfInvested, value: mfValue, pnl: mfValue - mfInvested },
        etfs: { invested: etfInvested, value: etfValue, pnl: etfValue - etfInvested },
        fixedDeposits: { principal: fdPrincipal, value: fdCurrentValue, interest: fdCurrentValue - fdPrincipal },
        retirement: { total: retirementTotal },
        physicalAssets: { invested: physicalInvested, value: physicalValue, goldValue, otherTangibleValue },
      },
      assetAllocation,
      topHoldings: holdings.filter((h) => h.current_quantity > 0).slice(0, 6),
    };
  }

  /**
   * Return historical performance snapshots
   */
  static async getSnapshots(householdId: string, range = '6M') {
    return QueryHelper.query(
      `SELECT snapshot_date, CAST(invested_value AS FLOAT) as invested_value, CAST(market_value AS FLOAT) as market_value
       FROM portfolio_snapshots
       WHERE household_id = $1
       ORDER BY snapshot_date ASC`,
      [householdId]
    );
  }
}
