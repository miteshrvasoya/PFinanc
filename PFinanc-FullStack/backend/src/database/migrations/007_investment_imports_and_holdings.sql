-- Migration: 007_investment_imports_and_holdings.sql
-- Description: Enhanced schema for Stock & Mutual Fund CSV Import pipeline

-- 1. Extend securities for mutual funds
ALTER TABLE securities ADD COLUMN IF NOT EXISTS scheme_code VARCHAR(100);
ALTER TABLE securities ADD COLUMN IF NOT EXISTS amfi_code VARCHAR(100);

-- 2. Drop existing stub import tables if they exist to replace with robust schema
DROP TABLE IF EXISTS investment_import_rows CASCADE;
DROP TABLE IF EXISTS investment_import_batches CASCADE;

-- 3. Create rigorous investment_imports table
CREATE TABLE investment_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    investment_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    investment_type VARCHAR(50) NOT NULL CHECK (investment_type IN ('STOCK', 'MUTUAL_FUND')),
    import_mode VARCHAR(50) NOT NULL CHECK (import_mode IN ('TRANSACTIONS', 'HOLDINGS')),
    
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    parser_version VARCHAR(50) DEFAULT '1.0.0',
    format_identifier VARCHAR(100),
    
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED' CHECK (status IN (
        'UPLOADED', 'VALIDATING', 'PARSING', 'PARSED', 'VALIDATING_RECORDS', 
        'READY_FOR_REVIEW', 'IMPORTING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED', 'CANCELLED'
    )),
    
    total_source_rows INT NOT NULL DEFAULT 0,
    parsed_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    invalid_rows INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. Create investment_import_rows for full traceability
CREATE TABLE investment_import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES investment_imports(id) ON DELETE CASCADE,
    
    source_row_number INT NOT NULL,
    raw_data JSONB NOT NULL,
    
    row_type VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
    parse_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (parse_status IN ('PENDING', 'SUCCESS', 'FAILED')),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (validation_status IN ('PENDING', 'VALID', 'INVALID', 'DUPLICATE', 'WARNING')),
    
    normalized_data JSONB,
    matched_security_id UUID REFERENCES securities(id) ON DELETE SET NULL,
    
    error_code VARCHAR(100),
    error_message TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create investment_holdings to store current portfolio snapshots
CREATE TABLE investment_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    investment_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES securities(id) ON DELETE RESTRICT,
    
    quantity NUMERIC(24, 8) NOT NULL,
    average_cost NUMERIC(18, 4),
    invested_amount NUMERIC(18, 2),
    current_price NUMERIC(18, 4),
    current_value NUMERIC(18, 2),
    
    as_of_date DATE NOT NULL,
    
    source_import_id UUID REFERENCES investment_imports(id) ON DELETE SET NULL,
    source_import_row_id UUID REFERENCES investment_import_rows(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- An account can only have one holding snapshot per instrument per day
    CONSTRAINT uq_holding_snapshot UNIQUE (investment_account_id, instrument_id, as_of_date)
);

-- Allow investment_transactions to trace back to new import row structure
ALTER TABLE investment_transactions ADD COLUMN IF NOT EXISTS source_import_id UUID REFERENCES investment_imports(id) ON DELETE SET NULL;
ALTER TABLE investment_transactions ADD COLUMN IF NOT EXISTS source_import_row_id UUID REFERENCES investment_import_rows(id) ON DELETE SET NULL;

-- 6. Indexes for performance
CREATE INDEX idx_inv_import_rows_import ON investment_import_rows(import_id);
CREATE INDEX idx_inv_holdings_account ON investment_holdings(investment_account_id);
CREATE INDEX idx_inv_holdings_family_date ON investment_holdings(family_id, as_of_date DESC);
