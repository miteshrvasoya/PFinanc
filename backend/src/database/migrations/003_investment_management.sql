-- Migration: 003_investment_management.sql
-- Description: Schema extensions for Phase 2: Investment & Portfolio Management

-- 1. Securities Table (Canonical instruments for Stocks, Mutual Funds, ETFs)
CREATE TABLE IF NOT EXISTS securities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(100) NOT NULL,
    isin VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    security_type VARCHAR(50) NOT NULL CHECK (security_type IN ('STOCK', 'MUTUAL_FUND', 'ETF', 'OTHER')),
    exchange VARCHAR(50) NOT NULL DEFAULT 'NSE' CHECK (exchange IN ('NSE', 'BSE', 'AMFI', 'OTHER')),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    sector VARCHAR(100),
    fund_house VARCHAR(255),
    asset_class VARCHAR(50) NOT NULL DEFAULT 'EQUITY' CHECK (asset_class IN (
        'EQUITY', 'MUTUAL_FUND', 'ETF', 'FIXED_INCOME', 'RETIREMENT', 'OTHER'
    )),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Security Price History (EOD prices, NAVs)
CREATE TABLE IF NOT EXISTS security_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
    price_date DATE NOT NULL DEFAULT CURRENT_DATE,
    open NUMERIC(18, 4),
    high NUMERIC(18, 4),
    low NUMERIC(18, 4),
    close NUMERIC(18, 4) NOT NULL CHECK (close >= 0),
    adjusted_close NUMERIC(18, 4),
    volume BIGINT,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    source VARCHAR(100) DEFAULT 'MARKET_PROVIDER',
    is_stale BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_security_price_date UNIQUE (security_id, price_date)
);

-- 3. Investment Transactions
CREATE TABLE IF NOT EXISTS investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    investment_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    security_id UUID REFERENCES securities(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'BUY', 'SELL', 'DIVIDEND', 'BONUS', 'SPLIT', 'INTEREST', 'SIP', 'REDEMPTION', 'FEE', 'TAX', 'OTHER'
    )),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity NUMERIC(24, 8) CHECK (quantity IS NULL OR quantity >= 0),
    price_per_unit NUMERIC(18, 4) CHECK (price_per_unit IS NULL OR price_per_unit >= 0),
    gross_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (gross_amount >= 0),
    fees NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (fees >= 0),
    taxes NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (taxes >= 0),
    net_amount NUMERIC(18, 2) NOT NULL CHECK (net_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    linked_cash_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    reference VARCHAR(255),
    notes TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'CSV_IMPORT', 'SYSTEM', 'BROKER_API')),
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('DRAFT', 'CONFIRMED', 'VOID')),
    external_reference VARCHAR(255),
    import_hash VARCHAR(64),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Fixed Deposits
CREATE TABLE IF NOT EXISTS fixed_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    institution_name VARCHAR(255) NOT NULL,
    fd_number_masked VARCHAR(50),
    principal_amount NUMERIC(18, 2) NOT NULL CHECK (principal_amount > 0),
    interest_rate NUMERIC(6, 3) NOT NULL CHECK (interest_rate >= 0),
    compounding_frequency VARCHAR(50) NOT NULL DEFAULT 'QUARTERLY' CHECK (compounding_frequency IN (
        'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY', 'AT_MATURITY'
    )),
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    maturity_amount NUMERIC(18, 2) NOT NULL CHECK (maturity_amount >= principal_amount),
    current_value NUMERIC(18, 2) NOT NULL CHECK (current_value >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MATURED', 'CLOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Retirement Accounts (EPF, PPF, NPS)
CREATE TABLE IF NOT EXISTS retirement_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('EPF', 'PPF', 'NPS', 'OTHER')),
    institution_name VARCHAR(255) NOT NULL,
    account_number_masked VARCHAR(50),
    opening_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Retirement Contributions (Monthly/Periodic logs)
CREATE TABLE IF NOT EXISTS retirement_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retirement_account_id UUID NOT NULL REFERENCES retirement_accounts(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    contribution_date DATE NOT NULL,
    employee_contribution NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (employee_contribution >= 0),
    employer_contribution NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (employer_contribution >= 0),
    interest_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (interest_amount >= 0),
    withdrawal_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (withdrawal_amount >= 0),
    total_closing_balance NUMERIC(18, 2) NOT NULL CHECK (total_closing_balance >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Portfolio Snapshots (For fast historical charts)
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    investment_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invested_value NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    market_value NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    realized_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    unrealized_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    cash_value NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_portfolio_snapshot UNIQUE (household_id, user_id, investment_account_id, snapshot_date)
);

-- 8. Investment Import Batches & Rows
CREATE TABLE IF NOT EXISTS investment_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    investment_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    broker_format VARCHAR(50) NOT NULL DEFAULT 'GENERIC_CSV',
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    duplicate_rows INT NOT NULL DEFAULT 0,
    invalid_rows INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PREVIEW' CHECK (status IN ('PREVIEW', 'COMMITTED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investment_import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES investment_import_batches(id) ON DELETE CASCADE,
    row_index INT NOT NULL,
    raw_data JSONB NOT NULL,
    parsed_data JSONB,
    matched_security_id UUID REFERENCES securities(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'DUPLICATE', 'INVALID', 'UNMATCHED_SECURITY')),
    duplicate_reason VARCHAR(255),
    matched_investment_transaction_id UUID REFERENCES investment_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-performance portfolio querying
CREATE INDEX IF NOT EXISTS idx_securities_symbol ON securities (symbol);
CREATE INDEX IF NOT EXISTS idx_securities_isin ON securities (isin);
CREATE INDEX IF NOT EXISTS idx_securities_type ON securities (security_type);
CREATE INDEX IF NOT EXISTS idx_security_prices_sec_date ON security_prices (security_id, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_tx_account_date ON investment_transactions (investment_account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_tx_household_date ON investment_transactions (household_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_tx_security ON investment_transactions (security_id);
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_household ON fixed_deposits (household_id);
CREATE INDEX IF NOT EXISTS idx_retirement_acc_household ON retirement_accounts (household_id);
CREATE INDEX IF NOT EXISTS idx_retirement_contrib_acc ON retirement_contributions (retirement_account_id, contribution_date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_household ON portfolio_snapshots (household_id, snapshot_date DESC);
