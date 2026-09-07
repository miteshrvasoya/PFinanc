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
