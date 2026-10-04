-- Migration 011: Finance Evolution

-- 1. Create Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    loan_type VARCHAR(50) NOT NULL CHECK (loan_type IN ('BORROWED_FROM_BANK', 'BORROWED_FROM_PERSON', 'LENT_TO_PERSON', 'OTHER_DEBT')),
    counterparty VARCHAR(255),
    principal_amount NUMERIC(18, 2) NOT NULL,
    outstanding_amount NUMERIC(18, 2) NOT NULL,
    interest_rate NUMERIC(10, 4),
    tenure_months INT,
    emi_amount NUMERIC(18, 2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'DEFAULTED')),
    linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Rent Agreements Table
CREATE TABLE IF NOT EXISTS rent_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rent_type VARCHAR(50) NOT NULL CHECK (rent_type IN ('PAID', 'RECEIVED')),
    property_name VARCHAR(255),
    counterparty VARCHAR(255),
    amount NUMERIC(18, 2) NOT NULL,
    frequency VARCHAR(50) NOT NULL DEFAULT 'MONTHLY',
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    amount NUMERIC(18, 2) NOT NULL,
    period VARCHAR(50) NOT NULL DEFAULT 'MONTHLY' CHECK (period IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_household_category_budget UNIQUE(household_id, category_id, period)
);

-- 4. Update Transactions Table
-- First remove the strict check constraint on transaction_type
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- Add polymorphic link for financial context
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS linked_entity_type VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS linked_entity_id UUID;

-- Add split transactions support
CREATE TABLE IF NOT EXISTS transaction_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(500),
    transaction_type VARCHAR(50) NOT NULL,
    linked_entity_type VARCHAR(50),
    linked_entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Re-apply a broader check constraint for transaction types
ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check 
    CHECK (transaction_type IN (
        'INCOME', 'EXPENSE', 'TRANSFER', 'REFUND', 'FEE', 
        'LOAN_DISBURSEMENT', 'EMI_PAYMENT',
        'LENT_AMOUNT', 'LENT_PRINCIPAL_RECEIVED', 'LENT_INTEREST_RECEIVED',
        'BORROWED_AMOUNT', 'BORROWED_PRINCIPAL_REPAID', 'BORROWED_INTEREST_PAID',
        'RENT_PAID', 'RENT_RECEIVED',
        'INVESTMENT_PURCHASE', 'INVESTMENT_REDEMPTION', 'INVESTMENT_INCOME',
        'SPLIT', 'OTHER'
    ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_linked_entity ON transactions(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_parent ON transaction_splits(parent_transaction_id);
CREATE INDEX IF NOT EXISTS idx_loans_household ON loans(household_id);
CREATE INDEX IF NOT EXISTS idx_rent_agreements_household ON rent_agreements(household_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household ON budgets(household_id);
