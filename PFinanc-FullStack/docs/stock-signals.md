# Stock Signals (advisory only)

> **Educational/technical signals only. Not investment advice. Do your own research.**

Stock Signals ranks NSE/BSE stocks with transparent technical rules and explains every result in plain language. It
covers three things: top buy candidates, signals for the stocks you already hold, and a backtest of the rules.

**It is read-only with respect to your broker.** Nothing in the signals code can place, modify or cancel an order: the
Angel One client has no order endpoints, and a test fails the build if any order API appears in `signals/` or
`angelone/`. The disclaimer above is included in every API response, alert and screen.

## What you get

| Screen / endpoint | Purpose |
|---|---|
| Top buys (`GET /api/signals/top-buys?limit=10`) | Highest scoring STRONG BUY / BUY names that are liquid and have a valid risk-reward, with entry zone, stop, targets, reasons and confidence |
| My holdings (`GET /api/signals/holdings`) | HOLD / REDUCE / SELL for what you own, with trailing stop, unrealised P&L and a 12-month prompt |
| Symbol detail (`GET /api/signals/:symbol`) | Chart series (price, SMA 20/50/200, Bollinger Bands, RSI, MACD), indicators, levels, reasons |
| Watchlist (`GET/POST/DELETE /api/watchlist`) | Extra symbols to score |
| Settings (`GET/PUT /api/signals/settings`) | Per-household overrides of the rules below (owner/admin to change) |
| Run (`POST /api/signals/run`, `GET /api/signals/status`) | Start an update in the background and poll it |
| Backtest (`POST /api/signals/backtest`, `GET /api/signals/backtest/latest`) | Replay the rules over stored history |

Web: **Stock Signals** in the sidebar. Mobile: **More > Stock Signals**.

## How a signal is made

1. **Universe**: your holdings, the watchlist, and an optional preset list (`universe.presetSymbols`, for example index
   constituents). Nothing is hardcoded. Import a list with `npm run signals:universe -- <householdId> <file>`.
2. **Data**: daily candles from Angel One SmartAPI, fetched incrementally (a 5-day overlap catches revisions), stored in
   the `candles` table, and chunked to stay inside the per-request day limit. The Nifty 50 index is fetched for
   relative strength. Symbol tokens come from the cached instrument master.
3. **Filters**: at least `universe.minCandles` (250) daily candles, and a 20-day average traded value of at least
   `universe.minAvgTradedValue` (default ₹5 crore). Illiquid names are scored but kept out of Top buys.
4. **Data quality**: a one-day move bigger than `rules.maxDailyMove` (35%) in the last ~260 bars, a suspended stock,
   invalid candles or too few candles marks the symbol **data unreliable**. It gets *no signal*, and the run records why.
   Angel One does not provide adjusted prices, so an unadjusted split or bonus looks like a crash; this is how it is caught.
5. **Indicators** (pure functions, unit tested): SMA/EMA 20/50/200, RSI 14, MACD 12/26/9, Bollinger 20/2, ATR 14,
   ADX 14, volume vs its 20-day average, distance to the 52-week high/low, swing support/resistance, and relative
   strength against Nifty 50. Wilder smoothing is used for RSI, ATR and ADX.
6. **Score** from -100 to +100: a weighted sum of seven components (trend, momentum, MACD, volume, breakout,
   strength, relative strength). Defaults: trend 0.30, momentum 0.15, MACD 0.15, relative strength 0.15, breakout 0.10,
   volume 0.08, strength 0.07.
7. **Trend gate**: a buy label requires price above a rising 200-day trend (price above the 200 SMA with a rising 50
   SMA) or a confirmed reversal; otherwise the label is capped at WATCH. Hard bearish triggers cap the label at REDUCE.
8. **Label** from thresholds: STRONG BUY ≥ 60, BUY ≥ 35, WATCH ≥ 15, HOLD ≥ -15, REDUCE ≥ -35, SELL ≥ -60, else AVOID
   (bearish labels on stocks you do not hold read AVOID).
9. **Confidence** (0-100%) rises with how many components agree and are available; it is reduced when the score is near zero or the history is short (under 300 candles).

### Trade levels (BUY / WATCH)

* **Entry zone**: from `trade.entryPullbackAtr` (0.5) x ATR below the last close up to the close. If price is more than
  `rules.extendedAtr` ATRs above the 20 EMA the zone moves down to the 20 EMA and the setup is flagged extended ("do not chase").
* **Stop**: top of the entry zone minus `trade.atrStopMultiple` x ATR (2), or just under the latest confirmed swing low when
  that is tighter but at least 0.75 ATR away. Never wider than `trade.maxStopAtr` ATRs, and always below the whole entry zone.
* **Target 1** at 1.5R, **Target 2** at 2.5R or the next resistance if it is closer.
* **Minimum risk-reward** `trade.minRiskReward` (1.5). Setups below it are marked invalid and left out of Top buys.
* **Illustrative size**: shares so that a stop-out loses `sizing.riskPct` (1%) of `sizing.capital`, capped at
  `sizing.maxPositionPct` (10%) of capital including what you already hold.

### Holdings

Trailing stop = highest close since your first buy (or the last 60 bars) minus `holdings.trailingAtrMultiple` (2.5) x ATR.
SELL / REDUCE come with reasons. Your average buy price and unrealised P&L are shown. If a lot is near 12 months old
the screen prompts you to check the long-term holding period; **this is a prompt to check, not tax advice**.

## Configuration

Defaults live in `backend/src/modules/signals/config.ts` (`DEFAULT_SIGNAL_CONFIG`). Per-household overrides are saved
in `signal_settings.config` (only the differences from defaults are stored). Unknown keys, wrong types, out-of-range
values and inconsistent thresholds are rejected with a 400. Environment: `SIGNALS_ENABLED=false` disables the scheduler.

## Running it

| What | How |
|---|---|
| Daily job | Scheduled 16:00 IST Mon-Fri (`signalsScheduler.ts`), for households with signals enabled. Idempotent per (household, trading day). |
| Intraday checks | Every 15 minutes 09:00-15:59 IST on weekdays: live LTP for the latest run's candidates and holdings, to raise stop / target / entry-zone alerts. Nothing is recomputed. |
| Manual (UI) | **Update now** (owner/admin) |
| CLI | `npm run signals:run [-- <householdId>]` |
| Backtest CLI | `npm run signals:backtest -- --household <id> [--symbols TCS,INFY] [--from 2023-01-01] [--to 2025-01-01]` |
| Preset universe | `npm run signals:universe -- <householdId> <file>` |

A first run backfills ~900 days per symbol. Angel One allows 40 candle requests a minute, so the run waits on the rate
window instead of failing; expect roughly 1.5 seconds per symbol. A failing symbol never fails the run: it is recorded
as an issue (`SYMBOL_NOT_FOUND`, `DATA_UNRELIABLE`, `FETCH_FAILED`) and the run is `PARTIAL`. Only a broker login
problem stops a run. Session expiry is handled by the client (token refresh, then re-login).

### Alerts

Alerts reuse the existing notifications and are de-duplicated by state (`signal_alerts` unique key): a stock newly rated
STRONG BUY, a holding newly rated SELL, a stop or target touched, or a candidate entering its entry zone. The same
state alerts once. Every alert body ends with the disclaimer.

## Backtest

Decisions use the close of day *d* and fill at the open of day *d+1*, so there is no look-ahead (this is tested: scrambling
future bars leaves earlier trades unchanged). It includes brokerage, STT, exchange charges, stamp duty, GST and
slippage (`backtest.costs`). A same-bar stop and target resolves as a stop; a gap through the stop fills at the open;
50% is sold at target 1 and the stop moves to breakeven; there is a time stop and a signal exit. Reported: trades, win
rate, average R, expectancy, profit factor, total return, CAGR vs Nifty 50 buy-and-hold, max drawdown and time invested.
It uses stored candles only, so run the signals job first. **Results are past performance of this ruleset.**

## Data model (migration `021_stock_signals.sql`)

`candles`, `candle_sync_state`, `watchlist`, `signal_settings`, `signal_runs`, `signals`, `signal_alerts`, `backtest_runs`;
and the notification type check gains `SIGNAL_*` types.

## Limitations

* **Unadjusted prices.** Angel One candles are not corrected for splits, bonuses or dividends. Gaps are detected and the
  symbol is withheld, but a symbol stays flagged until the old candles roll out of the window or are cleared.
* **No bundled index lists.** Constituents change, so none ship with the app. Import one with `signals:universe`.
* **Needs a long-running backend** for the scheduler (node-cron). On serverless hosting (for example Vercel) the
  scheduler does not run; trigger `npm run signals:run` from an external scheduler or use **Update now**.
* **Rate limits.** Large universes take a while on the first run (about 1.5 s per symbol).
* **Technical rules only.** No fundamentals, news or events (results, bonus dates). Indicators lag by nature and signals
  will be wrong at times.
* Stocks and ETFs only; mutual funds are not covered by the data source.
* Intraday alerts are polled every 15 minutes, not streamed.
* Tested against recorded response shapes with a stubbed network. The live Angel One API has not been called from this
  repository's tests.
