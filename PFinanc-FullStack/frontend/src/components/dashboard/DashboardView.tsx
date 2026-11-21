import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatINR, formatINRCompact, formatDate, isCreditTransaction } from '../../lib/formatters';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Table2,
  BarChart3,
} from 'lucide-react';

export type DashboardQuickAction = 'add_expense' | 'add_income' | 'transfer' | 'add_account' | 'import_csv';

interface DashboardViewProps {
  onQuickAction?: (action: DashboardQuickAction) => void;
  onNavigateToTab: (tab: any) => void;
}

interface MonthFlow {
  month_key: string;
  month_label: string;
  income: number;
  spending: number;
  emi: number;
  invested: number;
  loansAndOther: number;
  sentToFamily: number;
  leftOver: number;
  savingsRatePct: number | null;
}

// Validated categorical pair (dataviz validator, dark mode, against the panel surface #0f1522).
const INCOME_COLOR = '#3987e5';
const SPENDING_COLOR = '#d95926';

const signed = (n: number) => `${n < 0 ? '−' : '+'}${formatINR(Math.abs(n), false)}`;

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const { currentHousehold, viewMode } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.getDashboard(viewMode);
        if (!cancelled && res.success && res.data) setData(res.data);
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentHousehold?.id, viewMode]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-sm">Loading your finances…</span>
      </div>
    );
  }
  if (!data) {
    return <div className="text-center py-24 text-slate-500 text-sm">Could not load the dashboard. Is the backend running?</div>;
  }

  const nw = data.netWorth;
  const b = nw.breakdown || {};
  const thisMonth: MonthFlow & { monthName?: string; asOf?: string } = data.thisMonth;
  const lastMonth: MonthFlow | undefined = data.lastMonth;
  const trend: MonthFlow[] = data.cashFlowTrend || [];
  const attention = data.attention || {};
  const categories: any[] = data.categoryBreakdown || [];
  const recent: any[] = data.recentTransactions || [];
  const asOfDay = thisMonth?.asOf ? Number(thisMonth.asOf.slice(8, 10)) : null;

  // Refetch keeps the frame: dim instead of swapping in a spinner.
  return (
    <div className={`space-y-6 pb-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Net worth ─────────────────────────────────────────────── */}
        <section className="glass-panel rounded-2xl p-6 border border-slate-800 lg:col-span-5 flex flex-col">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Net worth</h2>
            <span className="text-[11px] text-slate-500">
              {viewMode === 'personal' ? 'Accounts you own' : 'Whole household'}
            </span>
          </div>
          <p className="text-5xl font-semibold text-white tracking-tight mt-2">{formatINR(nw.netWorth, false)}</p>
          <p className="text-xs text-slate-500 mt-1">What you own minus what you owe</p>

          <dl className="mt-5 space-y-2.5 text-sm">
            <Row label="Cash & bank" value={formatINR(b.cashAndBank, false)} />
            {(b.investmentsAtMarket > 0 || b.investmentsPendingAtCost > 0) && (
              <Row
                label="Investments"
                value={formatINR((b.investmentsAtMarket || 0) + (b.investmentsPendingAtCost || 0), false)}
                hint={
                  b.investmentsPendingAtCost > 0
                    ? b.investmentsAtMarket > 0
                      ? `${formatINR(b.investmentsAtMarket, false)} at market + ${formatINR(b.investmentsPendingAtCost, false)} at cost (details pending)`
                      : 'At amount invested — units and prices not added yet'
                    : 'At current market prices'
                }
              />
            )}
            {b.moneyLent > 0 && <Row label="Money lent" value={formatINR(b.moneyLent, false)} />}
            {b.loans > 0 && (
              <Row
                label="Loans"
                value={`−${formatINR(b.loans, false)}`}
                hint={nw.loans?.length === 1 ? `EMI ${formatINR(nw.loans[0].emi, false)}/month` : `${nw.loans?.length || 0} active loans`}
              />
            )}
            {b.creditCardDue > 0 && <Row label="Credit card dues" value={`−${formatINR(b.creditCardDue, false)}`} />}
            {b.overdraft > 0 && <Row label="Overdrawn accounts" value={`−${formatINR(b.overdraft, false)}`} />}
          </dl>

          {nw.excludedAccounts?.length > 0 && (
            <div className="mt-auto pt-5">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Not counted: </span>
                {nw.excludedAccounts.map((a: any) => `${a.name} (${a.owner})`).join(', ')}
                <span className="block mt-1 text-slate-500">
                  Their statements aren&apos;t imported yet, so their balances would be misleading.{' '}
                  <button onClick={() => onNavigateToTab('accounts')} className="text-indigo-400 hover:text-indigo-300 font-medium">
                    Manage accounts
                  </button>
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ── This month ────────────────────────────────────────────── */}
        <section className="glass-panel rounded-2xl p-6 border border-slate-800 lg:col-span-7">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              This month <span className="text-slate-500 font-normal">· {asOfDay ? `1–${asOfDay} ` : ''}{thisMonth.month_label} {thisMonth.month_key?.slice(0, 4)}</span>
            </h2>
            <button onClick={() => onNavigateToTab('analytics')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
              Analytics →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-slate-500">
                    <th className="text-left font-normal pb-2"></th>
                    <th className="text-right font-normal pb-2">This month</th>
                    <th className="text-right font-normal pb-2 pl-3">{lastMonth?.month_label || 'Last'}</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:py-1.5">
                  <FlowRow label="Income" now={thisMonth.income} prev={lastMonth?.income} sign="+" />
                  {(thisMonth.loansAndOther !== 0 || (lastMonth?.loansAndOther ?? 0) !== 0) && (
                    <FlowRow label="Loans & other" now={thisMonth.loansAndOther} prev={lastMonth?.loansAndOther} sign="±" hint="Loan payouts, money lent or repaid" />
                  )}
                  <FlowRow label="Spending" now={thisMonth.spending} prev={lastMonth?.spending} sign="−" />
                  {(thisMonth.emi > 0 || (lastMonth?.emi ?? 0) > 0) && <FlowRow label="EMIs" now={thisMonth.emi} prev={lastMonth?.emi} sign="−" />}
                  {(thisMonth.invested !== 0 || (lastMonth?.invested ?? 0) !== 0) && (
                    <FlowRow label="Invested" now={thisMonth.invested} prev={lastMonth?.invested} sign="−" />
                  )}
                  {(thisMonth.sentToFamily !== 0 || (lastMonth?.sentToFamily ?? 0) !== 0) && (
                    <FlowRow
                      label="Transferred out"
                      now={thisMonth.sentToFamily}
                      prev={lastMonth?.sentToFamily}
                      sign="−"
                      hint="To family members or accounts not counted in net worth"
                    />
                  )}
                  <tr className="border-t border-slate-800 font-semibold">
                    <td className="pt-2.5 text-white">Left over</td>
                    <td className="pt-2.5 text-right text-white">{signed(thisMonth.leftOver)}</td>
                    <td className="pt-2.5 pl-3 text-right text-slate-400">{lastMonth ? signed(lastMonth.leftOver) : '—'}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-3">
                {thisMonth.income > 0
                  ? `You spent ${Math.round((thisMonth.spending / thisMonth.income) * 100)}% of this month's income.`
                  : 'No income recorded this month yet.'}{' '}
                Left over is the change in your counted bank & cash balances.
              </p>
            </div>

            <CashFlowTrend trend={trend} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Needs attention ───────────────────────────────────────── */}
        <section className="glass-panel rounded-2xl p-5 border border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Needs attention</h2>
          <AttentionList attention={attention} onNavigateToTab={onNavigateToTab} />
        </section>

        {/* ── Where money went ──────────────────────────────────────── */}
        <section className="glass-panel rounded-2xl p-5 border border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300">Where money went</h2>
          <p className="text-[11px] text-slate-500 mb-4">Spending by category this month</p>
          {categories.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No spending recorded this month.</p>
          ) : (
            <ul className="space-y-3">
              {categories.map((c) => {
                const max = categories[0].total_amount || 1;
                const share = thisMonth.spending > 0 ? Math.round((c.total_amount / thisMonth.spending) * 100) : 0;
                return (
                  <li key={c.category_name} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300">{c.category_name}</span>
                      <span className="text-slate-200 font-medium">
                        {formatINR(c.total_amount, false)} <span className="text-slate-500 font-normal">· {share}%</span>
                      </span>
                    </div>
                    <div className="h-2 w-full">
                      <div
                        className="h-2 rounded-r"
                        style={{ width: `${Math.max(2, (c.total_amount / max) * 100)}%`, backgroundColor: SPENDING_COLOR }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Recent transactions ───────────────────────────────────── */}
        <section className="glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">Recent transactions</h2>
            <button onClick={() => onNavigateToTab('transactions')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
              View all →
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {recent.slice(0, 6).map((tx) => {
                const isTransfer = tx.transaction_type === 'TRANSFER';
                const isCredit = isTransfer ? tx.source_account_id !== tx.account_id : isCreditTransaction(tx);
                const Icon = isTransfer ? ArrowLeftRight : isCredit ? ArrowUpRight : ArrowDownRight;
                return (
                  <li key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isTransfer ? 'text-slate-400' : isCredit ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <div className="min-w-0">
                        <p className="text-slate-200 truncate">{tx.description}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {formatDate(tx.transaction_date)} · {tx.category_name || tx.account_name}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 font-medium ${isCredit ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {isCredit ? '+' : '−'}{formatINR(tx.amount, false)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

// ─── Pieces ──────────────────────────────────────────────────────────────────

const Row: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="flex items-start justify-between gap-4">
    <dt className="text-slate-400">
      {label}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </dt>
    <dd className="text-slate-100 font-medium whitespace-nowrap">{value}</dd>
  </div>
);

const FlowRow: React.FC<{ label: string; now: number; prev?: number; sign: '+' | '−' | '±'; hint?: string }> = ({ label, now, prev, sign, hint }) => {
  const fmt = (v: number | undefined) => {
    if (v === undefined) return '—';
    if (v === 0) return '₹0';
    if (sign === '±') return signed(v);
    // Negative values in an outflow row (e.g. redemptions > purchases) are inflows.
    if (sign === '−') return v < 0 ? `+${formatINR(-v, false)}` : `−${formatINR(v, false)}`;
    return `+${formatINR(v, false)}`;
  };
  return (
    <tr>
      <td className="text-slate-400" title={hint}>
        {label}
      </td>
      <td className="text-right text-slate-100 whitespace-nowrap">{fmt(now)}</td>
      <td className="text-right text-slate-500 whitespace-nowrap pl-3">{fmt(prev)}</td>
    </tr>
  );
};

const AttentionList: React.FC<{ attention: any; onNavigateToTab: (tab: any) => void }> = ({ attention, onNavigateToTab }) => {
  const items = [
    attention.transactionsToReview > 0 && {
      text: `${attention.transactionsToReview} transaction${attention.transactionsToReview === 1 ? '' : 's'} flagged for review`,
      sub: 'Check their categories so reports stay accurate',
      tab: 'transactions',
    },
    attention.investmentsPendingDetails > 0 && {
      text: `${attention.investmentsPendingDetails} investment ${attention.investmentsPendingDetails === 1 ? 'entry needs' : 'entries need'} details`,
      sub: 'Add the fund/stock and units to track their real value',
      tab: 'investments',
    },
    attention.accountsNotInNetWorth > 0 && {
      text: `${attention.accountsNotInNetWorth} account${attention.accountsNotInNetWorth > 1 ? 's' : ''} not counted in net worth`,
      sub: 'Import their statements, then switch them on',
      tab: 'accounts',
    },
    attention.draftTransactions > 0 && {
      text: `${attention.draftTransactions} draft transaction${attention.draftTransactions === 1 ? '' : 's'} to confirm`,
      sub: 'Drafts do not affect balances until confirmed',
      tab: 'transactions',
    },
  ].filter(Boolean) as Array<{ text: string; sub: string; tab: string }>;

  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-400 py-4">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> All caught up.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.text}>
          <button
            onClick={() => onNavigateToTab(i.tab)}
            className="w-full text-left p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/70 border border-slate-800 flex items-center gap-3 transition-colors"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden />
            <span className="flex-1 min-w-0">
              <span className="block text-xs text-slate-200">{i.text}</span>
              <span className="block text-[11px] text-slate-500">{i.sub}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
};

/** Six-month income vs spending columns: one axis (₹), legend, per-month hover/focus tooltip, table view. */
const CashFlowTrend: React.FC<{ trend: MonthFlow[] }> = ({ trend }) => {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  if (trend.length === 0) return null;

  const rawMax = Math.max(1, ...trend.flatMap((m) => [m.income, m.spending]));
  const step = niceStep(rawMax / 2);
  const max = step * Math.ceil(rawMax / step);
  const ticks = [0, max / 2, max];
  const plotHeight = 120;
  const barWidth = 12;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: INCOME_COLOR }} />Income</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SPENDING_COLOR }} />Spending</span>
        </div>
        <button
          onClick={() => setAsTable((v) => !v)}
          className="text-slate-500 hover:text-slate-300 p-1 rounded"
          title={asTable ? 'Show chart' : 'Show as table'}
          aria-label={asTable ? 'Show chart' : 'Show as table'}
        >
          {asTable ? <BarChart3 className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
        </button>
      </div>

      {asTable ? (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left font-normal pb-1">Month</th>
              <th className="text-right font-normal pb-1">Income</th>
              <th className="text-right font-normal pb-1">Spending</th>
              <th className="text-right font-normal pb-1">Left over</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {trend.map((m) => (
              <tr key={m.month_key} className="text-slate-300">
                <td className="py-0.5">{m.month_label}</td>
                <td className="text-right">{formatINR(m.income, false)}</td>
                <td className="text-right">{formatINR(m.spending, false)}</td>
                <td className="text-right">{signed(m.leftOver)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative" onMouseLeave={() => setActive(null)}>
          <div className="flex">
            {/* y-axis ticks */}
            <div className="relative w-10 shrink-0 text-[10px] text-slate-500 tabular-nums" style={{ height: plotHeight }}>
              {ticks.map((t) => (
                <span key={t} className="absolute right-1.5 -translate-y-1/2" style={{ top: plotHeight - (t / max) * plotHeight }}>
                  {formatINRCompact(t)}
                </span>
              ))}
            </div>
            {/* plot */}
            <div className="relative flex-1" style={{ height: plotHeight }}>
              {ticks.map((t) => (
                <div key={t} className="absolute left-0 right-0 border-t" style={{ top: plotHeight - (t / max) * plotHeight, borderColor: t === 0 ? '#383835' : '#2c2c2a' }} />
              ))}
              <div className="absolute inset-0 flex">
                {trend.map((m, i) => (
                  <div
                    key={m.month_key}
                    tabIndex={0}
                    role="img"
                    aria-label={`${m.month_label}: income ${formatINR(m.income, false)}, spending ${formatINR(m.spending, false)}, left over ${signed(m.leftOver)}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className={`flex-1 flex items-end justify-center gap-[2px] outline-none rounded ${active === i ? 'bg-white/[0.04]' : ''}`}
                  >
                    {[{ v: m.income, c: INCOME_COLOR }, { v: m.spending, c: SPENDING_COLOR }].map((bar, j) => (
                      <div
                        key={j}
                        className="rounded-t"
                        style={{ width: barWidth, height: Math.max(bar.v > 0 ? 2 : 0, (bar.v / max) * plotHeight), backgroundColor: bar.c }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* x-axis labels (inside the container so they are never clipped) */}
          <div className="flex pl-10 mt-1.5">
            {trend.map((m) => (
              <span key={m.month_key} className="flex-1 text-center text-[10px] text-slate-500">{m.month_label}</span>
            ))}
          </div>

          {active !== null && (
            <div
              className="absolute z-10 top-1 pointer-events-none bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[11px] shadow-xl whitespace-nowrap"
              style={{
                // Beside the hovered month, inside the plot: right of it on the left half, left of it on the right half.
                left: `calc(2.5rem + (100% - 2.5rem) * ${(active + (active < trend.length / 2 ? 1 : 0)) / trend.length})`,
                transform: active < trend.length / 2 ? 'translateX(6px)' : 'translateX(calc(-100% - 6px))',
              }}
            >
              <p className="text-slate-400 mb-1">{trend[active].month_label}</p>
              <TooltipRow color={INCOME_COLOR} label="Income" value={formatINR(trend[active].income, false)} />
              <TooltipRow color={SPENDING_COLOR} label="Spending" value={formatINR(trend[active].spending, false)} />
              <p className="mt-1 pt-1 border-t border-slate-800 text-slate-400">
                Left over <span className="text-white font-semibold">{signed(trend[active].leftOver)}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TooltipRow: React.FC<{ color: string; label: string; value: string }> = ({ color, label, value }) => (
  <p className="flex items-center gap-2">
    <span className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
    <span className="text-white font-semibold">{value}</span>
    <span className="text-slate-500">{label}</span>
  </p>
);

/** Round an axis step to 1 / 2 / 5 × 10^n. */
function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
