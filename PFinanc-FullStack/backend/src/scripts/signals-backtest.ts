/**
 * Backtest the signal ruleset over stored candles and print the metrics.
 *   npm run signals:backtest -- --household <id> [--symbols TCS,INFY] [--from 2023-01-01] [--to 2025-01-01]
 * Candles must already be stored (run `npm run signals:run` first). Past performance does not predict the future.
 */
import { pool } from '../database/db.js';
import { runBacktestFor } from '../modules/signals/backtest.service.js';

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };

(async () => {
  try {
    const household = arg('household') ?? null;
    const r = await runBacktestFor(household, null, { symbols: arg('symbols')?.split(','), from: arg('from'), to: arg('to') });
    const m = r.metrics;
    console.log(`Backtest of the default ruleset on ${r.symbols.length} symbols, ${m.startDate} to ${m.endDate} (${m.years} years)\n`);
    console.table({
      Trades: m.trades, 'Win rate %': m.winRatePct, 'Average R': m.avgR, 'Expectancy (R)': m.expectancyR, 'Avg win R': m.avgWinR, 'Avg loss R': m.avgLossR,
      'Profit factor': m.profitFactor, 'Total return %': m.totalReturnPct, 'CAGR %': m.cagrPct, 'Nifty 50 CAGR %': m.benchmarkCagrPct, 'Max drawdown %': m.maxDrawdownPct, 'Time invested %': m.exposurePct, 'Costs paid (INR)': m.totalCosts,
    });
    for (const n of r.notes) console.log(`note: ${n}`);
    for (const i of r.issues) console.log(`skipped ${i.symbol}: ${i.message}`);
    console.log(`\n${r.pastPerformanceNote}\n${r.disclaimer}`);
    await pool.end();
  } catch (e: any) {
    console.error(`Backtest failed: ${e.message}`);
    await pool.end();
    process.exit(1);
  }
})();
