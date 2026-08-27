# PFinanc — Self-Hosted Personal & Family Finance & Portfolio Manager

A self-hosted personal and family finance management application engineered for correctness, strict ledger auditability, zero double-counting, multi-asset portfolio management, and production-ready onboarding.

---

## Features (Phase 1, Phase 2, & Phase 2.5)

* **Canonical Financial Ledger**: Deterministic cash balance derivation (`Opening Balance + Confirmed Credits - Confirmed Debits`).
* **First-Class Transfers**: Inter-account and inter-family transfers are executed atomically and strictly excluded from income/expense metrics to prevent double counting.
* **Production Onboarding & Clean Initialization (Phase 2.5)**:
  - **Fresh Installation Detection**: Automated setup wizard on first launch for master administrator registration and household creation.
  - **Opening Balance Invariant**: Starting balances set initial ledger baseline **without generating artificial income or expense records**.
  - **Clean Production Seeding**: `npm run seed:system` seeds standard categories only with zero sample users or fake transactions.
  - **Per-User Resumable Onboarding**: Database-backed multi-step onboarding state machine with skip and resume capabilities.
  - **Multi-Tier Classification Engine**: Auto-categorization using User Learned Rules -> System Deterministic Rules -> Inter-Account Transfers -> Review.
  - **Adaptive Rule Learning**: Prompts to save learned classification patterns for future statement imports.
  - **Physical Gold & Precious Metals**: Direct tracking of Physical Gold, Digital Gold, SGBs, and tangible assets integrated into Net Worth.
  - **Family Invitations**: Token-based household invitation and onboarding workflow.
* **Investment Portfolio Manager (Phase 2)**:
  - **Equity & Stocks**: Support for Indian listed stocks (NSE / BSE) with buy/sell/dividend tracking.
  - **Mutual Funds & SIPs**: Accurate `NUMERIC(24,8)` precision for fractional mutual fund units and SIPs.
  - **ETFs**: Direct tracking of broad market index and gold ETFs.
  - **FIFO Cost-Basis Engine**: First-In First-Out lot depletion for exact realized & unrealized capital gains.
  - **Guaranteed Invariant**: Investment purchases reallocate assets from Cash to Investments and are **never** classified as expenses.
  - **Annualized XIRR**: Newton-Raphson cash-flow internal rate of return calculation.
* **Fixed Income & Retirement Suite**:
  - **Fixed Deposits**: Term deposit tracking with compounding interest accrual.
  - **Retirement Accounts**: EPF (Employee & Employer monthly logs), PPF, and NPS corpus management.
* **Resilient Market Data**: Offline-first daily price storage with automated stale-data preservation on network failures.
* **Broker & Statement Ingestion**: Automated column mapping and deterministic SHA256 duplicate fingerprinting for bank statements and tradebook CSVs.
* **Multi-Tenant Household Isolation**: Role-based access control (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) and account-level private vs. shared visibility.
* **Zero 3rd-Party ORMs**: Custom raw SQL Data Access Layer with parameterized queries and transactional atomicity.

---

## Project Structure

```text
PFinanc/
├── backend/                  # Node.js + Express + TypeScript + PostgreSQL
│   ├── src/
│   │   ├── database/         # QueryHelper, migrations (001-004), seed:system & seed:dev
│   │   ├── middleware/       # JWT Auth, RBAC guards, error handlers
│   │   ├── modules/
│   │   │   ├── auth/         # JWT Authentication, Registration & System Status
│   │   │   ├── households/   # Multi-tenancy & family role management
│   │   │   ├── onboarding/   # Per-user resumable onboarding state machine
│   │   │   ├── classification/# Multi-tier pattern classifier & learned rules
│   │   │   ├── physical-assets/# Physical Gold, Digital Gold, SGB & tangible assets
│   │   │   ├── invitations/  # Family invitation tokens & acceptance
│   │   │   ├── accounts/     # Bank, cash, and brokerage accounts
│   │   │   ├── transactions/ # Canonical cash ledger
│   │   │   ├── transfers/    # Dual-leg inter-account transfers
│   │   │   ├── dashboard/    # Net worth & monthly cash flow
│   │   │   ├── analytics/    # 6-month trends & category breakdown
│   │   │   └── investments/  # Phase 2 Investment Domain:
│   │   │       ├── securities/        # Instrument search & CRUD
│   │   │       ├── holdings/          # FIFO lot-depletion engine
│   │   │       ├── transactions/      # Buy, Sell, SIP, Dividend trades
│   │   │       ├── prices/            # Market data provider & refresh
│   │   │       ├── fixed-deposits/    # FD interest accrual
│   │   │       ├── retirement/        # EPF, PPF, NPS tracker
│   │   │       ├── portfolio/         # Asset allocation & XIRR engine
│   │   │       └── imports/           # Tradebook statement parser
│   │   └── app.ts
│   └── tests/                # Onboarding, accounting, permissions, CSV, and investment test suites
├── frontend/                 # Next.js + React + Tailwind CSS SPA (Direct REST client)
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/         # Login & FirstInstallSetup
│   │   │   ├── onboarding/   # Guided Onboarding Wizard & Ingestion Review
│   │   │   ├── dashboard/    # Integrated Net Worth & cash flow
│   │   │   ├── investments/  # Portfolio, Holdings, Trades, FDs, EPF
│   │   │   ├── accounts/     # Bank & brokerage accounts
│   │   │   ├── transactions/ # Cash ledger entries
│   │   │   ├── transfers/    # Family transfer wizard
│   │   │   ├── family/       # Member permissions, invitations & roles
│   │   │   └── imports/      # Bank statement CSV uploader
│   │   ├── context/          # Auth & active household context
│   │   └── pages/            # Client-rendered SPA views
├── docs/                     # Comprehensive engineering documentation
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── accounting-rules.md
│   ├── csv-import.md
│   └── permissions.md
├── examples/                 # Sample CSV fixtures for bank statements, tradebooks, and MFs
│   ├── sample_bank_statement.csv
│   ├── sample_broker_tradebook.csv
│   └── sample_mutual_fund_statement.csv
├── package.json
└── README.md
```

---

## Quick Start & Local Setup

### 1. Prerequisites
* **Node.js** v18+ (v20+ recommended)
* **PostgreSQL** v14+ running locally on port 5432

### 2. Configure Environment
Verify `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:root@localhost:5432/pfinanc
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pfinanc
DB_USER=postgres
DB_PASSWORD=root
JWT_SECRET=super_secure_pfinanc_family_secret_key_2026_jwt
CORS_ORIGIN=http://localhost:3000
```

### 3. Initialize Database

#### Clean Production Mode (Zero fake data)
```bash
npm run migrate
npm run seed:system
```

#### Development & Demo Mode
```bash
npm run migrate
npm run seed:dev
```

### 4. Run Automated Test Suite (All 5 Suites, 23 Tests)
```bash
npm test
```

### 5. Start Development Servers
```bash
# Terminal 1: Start Express Backend API (port 5000)
npm run dev:backend

# Terminal 2: Start Next.js Frontend (port 3000)
npm run dev:frontend
```

Open **http://localhost:3000** in your browser.
