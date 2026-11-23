# REST API Reference — PFinanc

All API endpoints return standard JSON responses with HTTP status codes and unified error bodies:

```json
{
  "success": true,
  "data": { ... }
}
```

---

## 1. Authentication & Users
* `POST /api/auth/register` — Register a new user and create default household
* `POST /api/auth/login` — Sign in and receive JWT token
* `GET /api/auth/me` — Get current user profile and active households

## 2. Households & Access Control
* `GET /api/households/:householdId` — Get household details and members list
* `POST /api/households/:householdId/members` — Add family member
* `PATCH /api/households/:householdId/members/:memberId` — Change member role

## 3. Financial Accounts & Cash Ledger
* `GET /api/accounts` — List accounts with deterministic cash balances
* `POST /api/accounts` — Create financial account (Bank, Cash, Brokerage, etc.)
* `GET /api/transactions` — Query cash transactions with filters
* `POST /api/transactions` — Record new transaction
* `POST /api/transfers` — Execute atomic transfer between two cash accounts

## 4. Investments & Portfolio (Phase 2)
* `GET /api/investments/portfolio` — Get comprehensive portfolio summary (Invested, Market Value, Realized P&L, Unrealized P&L, Asset Allocation, XIRR)
* `GET /api/investments/portfolio/holdings` — List calculated holdings with FIFO average costs, current prices, and tax lot breakdown
* `GET /api/investments/portfolio/snapshots?range=6M` — Get historical portfolio trend snapshots
* `GET /api/investments/securities/search?q=RELIANCE` — Search stocks, mutual funds, and ETFs by symbol, ISIN, or name
* `GET /api/investments/securities/:id` — Get security details with price history
* `POST /api/investments/securities` — Create custom security instrument
* `GET /api/investments/transactions` — Query investment transactions (Buy, Sell, SIP, Dividend, Split, etc.)
* `POST /api/investments/transactions` — Record investment trade (with optional cash funding linkage)
* `POST /api/investments/transactions/:id/void` — Atomically void an investment transaction and its linked cash debit
* `POST /api/investments/prices/refresh` — Batch refresh market prices for active portfolio holdings
* `POST /api/investments/prices/set` — Manually set closing price for a security

## 5. Fixed Income & Retirement Assets
* `GET /api/investments/fixed-deposits` — List active, matured, and closed Fixed Deposits with current accrued interest valuation
* `POST /api/investments/fixed-deposits` — Create term deposit
* `PATCH /api/investments/fixed-deposits/:id` — Update Fixed Deposit
* `GET /api/investments/retirement` — List EPF, PPF, and NPS corpus accounts
* `POST /api/investments/retirement` — Create retirement account
* `GET /api/investments/retirement/:id/contributions` — Get monthly contribution logs
* `POST /api/investments/retirement/contributions` — Log monthly contribution (Employee + Employer share + Interest)

## 6. Broker Statement Ingestion
* `POST /api/investments/imports/preview` — Upload broker tradebook CSV, match securities, detect duplicates, and preview trades
* `POST /api/investments/imports/:id/commit` — Commit validated investment trades to the ledger atomically


## AI advisor chat

All under `/api/ai-advisor`, authenticated like the rest of the API.

| Method and path | Purpose |
| --- | --- |
| `GET /chat/sessions` | List your chats |
| `POST /chat/message` | `{ content, sessionId?, focus? }`. Without `sessionId` a new chat is started. `focus` is `general`, `investments` or `spending` |
| `GET /chat/sessions/:id` | A chat with its messages |
| `PATCH /chat/sessions/:id` | Rename `{ title }` |
| `POST /chat/sessions/:id/regenerate` | Replace the last answer |
| `DELETE /chat/sessions/:id` | Delete a chat |

## MCP

See [mcp.md](mcp.md) for the MCP endpoint (`POST /mcp`) and the connection management API (`/api/mcp/*`).

## Angel One

See [angelone.md](angelone.md) for the `/api/integrations/angelone/*` endpoints.

## Stock Signals (advisory only)

Every response includes `disclaimer`: "Educational/technical signals only. Not investment advice. Do your own research."
See [stock-signals.md](stock-signals.md) for the rules.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/signals/top-buys?limit=10` | Ranked buy candidates with levels and reasons |
| GET | `/api/signals/holdings` | Signals, trailing stop, P&L for held stocks |
| GET | `/api/signals/status` | Last run, whether a run is in progress |
| GET | `/api/signals/settings` | Effective config and defaults |
| PUT | `/api/signals/settings` | Owner/admin. `{ enabled?, config? }`, validated |
| POST | `/api/signals/run` | Owner/admin. Starts a background update |
| POST | `/api/signals/backtest` | Owner/admin. `{ symbols?, from?, to?, config? }` |
| GET | `/api/signals/backtest/latest` | Most recent saved backtest |
| GET | `/api/signals/all?label=` | Every signal from the latest run, with label counts |
| GET | `/api/signals/runs` | History of daily runs and the issues recorded |
| GET | `/api/signals/backtest/history` | All saved backtests (headline metrics) |
| GET | `/api/signals/backtest/:id` | One saved backtest with every trade, equity curve, costs, skipped symbols |
| GET | `/api/signals/:symbol/history` | Stored daily score/label/levels for one symbol |
| GET | `/api/signals/:symbol` | Detail with chart series |
| GET / POST | `/api/watchlist` | List / add `{ symbol }` |
| DELETE | `/api/watchlist/:symbolOrId` | Remove |
