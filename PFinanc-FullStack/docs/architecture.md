# System Architecture — PFinanc

PFinanc is designed as a modular, high-integrity financial ledger and portfolio management system with a clean separation between frontend and backend concerns.

```
+-----------------------------------------------------------------------------------+
|                        FRONTEND (Next.js / React 18 / SPA)                        |
|                                                                                   |
|  [Dashboard] [Accounts] [Investments & Portfolio] [Transactions] [Transfers]      |
|  [Holdings]  [Fixed Deposits]  [Retirement EPF/PPF]  [Broker Statement Ingest]    |
|                                     |                                             |
|              Typed API Client Layer (Fetch API to Express REST API)               |
+-------------------------------------|---------------------------------------------+
                                      | (Direct HTTP/REST over CORS on :5000)
+-------------------------------------|---------------------------------------------+
|                      BACKEND (Node.js + Express + TypeScript)                     |
|                                     v                                             |
|  [Auth & JWT Middleware] -> [RBAC Household Guard] -> [Zod Input Validation]      |
|                                                                                   |
|  [Modular Domain Services: Accounts / Cash Ledger / Transfers / Ingestion]        |
|  [Investment Domain: Securities / Holdings / FIFO Engine / FDs / EPF / XIRR]      |
|  [Market Data Service: Indian Market EOD Provider / Fallback Stale Guard]         |
|                                     |                                             |
|        [Custom Data Access Layer (QueryHelper) + Parameterized SQL]               |
+-------------------------------------|---------------------------------------------+
                                      | (Native 'pg' Pool on :5432)
+-------------------------------------|---------------------------------------------+
|                            PostgreSQL 18 DATABASE                                 |
|                                                                                   |
|  [users] [households] [accounts] [transactions] [transfers] [securities]          |
|  [investment_transactions] [security_prices] [fixed_deposits] [retirement_accs]   |
+-----------------------------------------------------------------------------------+
```

---

## Key Design Patterns & Guarantees

### 1. Investment Invariant: Purchases are NOT Expenses
When a trade is executed, cash is debited from the funding bank account with `transaction_type = 'OTHER'` and linked to `investment_transactions`. This accurately reflects asset reallocation from Cash to Securities without falsely inflating monthly household expenses.

### 2. FIFO Cost Basis & Lot Depletion
Holdings are calculated on the fly by replaying transactions in chronological order. Sell orders deplete active buy lots in First-In First-Out (FIFO) sequence to produce exact realized gains, remaining cost basis, and accurate unrealized returns.

### 3. Market-Data Resiliency
The portfolio engine operates offline-first using prices recorded in PostgreSQL. When fetching updated quotes from market providers, any failed request retains the prior valid price with `is_stale: true`, preventing portfolio valuations from dropping to zero or inventing speculative prices.
