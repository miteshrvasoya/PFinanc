-- Migration: 001_initial_schema.sql
-- Description: Core Schema for Personal & Family Finance Management (Phase 1)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(512),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Households
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    default_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Household Members
CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_household_user UNIQUE (household_id, user_id)
);

-- 4. Financial Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
        'BANK', 'CASH', 'WALLET', 'CREDIT_CARD', 
        'BROKERAGE', 'MUTUAL_FUND', 'FD', 'EPF', 'PPF', 'NPS', 'OTHER'
    )),
    institution_name VARCHAR(255),
    account_number_masked VARCHAR(50),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    opening_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    opening_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_shared BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Account Explicit Access (for fine-grained sharing)
CREATE TABLE IF NOT EXISTS account_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL CHECK (permission IN ('READ', 'WRITE', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_account_user UNIQUE (account_id, user_id)
);

-- 6. Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE, -- NULL for system defaults
    parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'BOTH')),
    icon VARCHAR(100),
    color VARCHAR(50),
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Transfers (First-class transfer entity)
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    source_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    destination_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('DRAFT', 'CONFIRMED', 'REJECTED', 'VOID')),
    description VARCHAR(500),
    reference VARCHAR(255),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_different_accounts CHECK (source_account_id <> destination_account_id)
);

-- 8. Transactions (Canonical financial ledger entries)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    transfer_id UUID REFERENCES transfers(id) ON DELETE CASCADE,
    related_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'INCOME', 'EXPENSE', 'TRANSFER', 'REFUND', 'FEE', 'OTHER'
    )),
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description VARCHAR(500) NOT NULL,
    merchant_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('DRAFT', 'CONFIRMED', 'REJECTED', 'VOID')),
    source_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL' CHECK (source_type IN (
        'MANUAL', 'CSV_IMPORT', 'SYSTEM', 'SMS', 'EMAIL', 'BANK_API', 'AI'
    )),
    source_reference VARCHAR(255),
    external_reference VARCHAR(255),
    import_hash VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Import Batches
CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    duplicate_rows INT NOT NULL DEFAULT 0,
    invalid_rows INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PREVIEW' CHECK (status IN ('PREVIEW', 'COMMITTED', 'CANCELLED')),
    column_mapping JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Import Rows
CREATE TABLE IF NOT EXISTS import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    row_index INT NOT NULL,
    raw_data JSONB NOT NULL,
    parsed_data JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'DUPLICATE', 'INVALID', 'SKIPPED')),
    duplicate_reason VARCHAR(255),
    matched_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'CREATE', 'UPDATE', 'DELETE', 'CONFIRM', 'REJECT', 'VOID', 'IMPORT', 'TRANSFER'
    )),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-performance ledger filtering & reporting
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions (account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON transactions (household_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_household_status ON transactions (household_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id ON transactions (transfer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_import_hash ON transactions (import_hash);
CREATE INDEX IF NOT EXISTS idx_transfers_household ON transfers (household_id);
CREATE INDEX IF NOT EXISTS idx_categories_household ON categories (household_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_household ON audit_logs (household_id, created_at DESC);
