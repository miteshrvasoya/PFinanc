-- ==========================================================
-- Migration 005: AI Statement Parsing & Ingestion Pipeline
-- Dedicated tables for source data preservation and AI analysis
-- ==========================================================

-- 1. Statement Imports (Master Import Lifecycle)
CREATE TABLE IF NOT EXISTS statement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    filename VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    file_size_bytes INTEGER,
    parser_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED' CHECK (status IN (
        'UPLOADED',
        'VALIDATING',
        'PARSING',
        'PARSED',
        'PARSED_WITH_WARNING',
        'AI_QUEUED',
        'AI_PROCESSING',
        'AI_PARTIAL_FAILURE',
        'AI_COMPLETED',
        'READY_FOR_REVIEW',
        'REVIEWED',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    )),
    expected_row_count INTEGER DEFAULT 0,
    parsed_row_count INTEGER DEFAULT 0,
    non_transaction_count INTEGER DEFAULT 0,
    warning_message TEXT,
    column_mapping JSONB,
    reconciliation_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statement_imports_household ON statement_imports(household_id);
CREATE INDEX IF NOT EXISTS idx_statement_imports_account ON statement_imports(account_id);
CREATE INDEX IF NOT EXISTS idx_statement_imports_file_hash ON statement_imports(file_hash);
CREATE INDEX IF NOT EXISTS idx_statement_imports_status ON statement_imports(status);

-- 2. Statement Parsed Rows (Immutable Source Facts)
CREATE TABLE IF NOT EXISTS statement_parsed_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES statement_imports(id) ON DELETE CASCADE,
    source_row_number INTEGER NOT NULL,
    row_type VARCHAR(50) NOT NULL DEFAULT 'TRANSACTION' CHECK (row_type IN (
        'TRANSACTION',
        'NON_TRANSACTION',
        'HEADER',
        'FOOTER',
        'OPENING_BALANCE',
        'CLOSING_BALANCE',
        'UNKNOWN'
    )),
    raw_data JSONB NOT NULL,
    transaction_date DATE,
    value_date DATE,
    description TEXT,
    normalized_description TEXT,
    debit_amount NUMERIC(15,2),
    credit_amount NUMERIC(15,2),
    amount NUMERIC(15,2),
    balance NUMERIC(15,2),
    reference TEXT,
    transaction_id TEXT,
    parse_status VARCHAR(50) NOT NULL DEFAULT 'VALID' CHECK (parse_status IN (
        'VALID',
        'INVALID',
        'SKIPPED'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_statement_parsed_rows_import_row UNIQUE (import_id, source_row_number)
);

CREATE INDEX IF NOT EXISTS idx_statement_parsed_rows_import ON statement_parsed_rows(import_id);
CREATE INDEX IF NOT EXISTS idx_statement_parsed_rows_type ON statement_parsed_rows(import_id, row_type);

-- 3. AI Analysis Runs (Supports Reprocessing without re-uploading)
CREATE TABLE IF NOT EXISTS ai_analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES statement_imports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    run_number INTEGER NOT NULL DEFAULT 1,
    provider VARCHAR(50) NOT NULL DEFAULT 'OpenRouter',
    model VARCHAR(100) NOT NULL DEFAULT 'google/gemini-2.0-flash-exp:free',
    prompt_version VARCHAR(50) NOT NULL DEFAULT 'bank-statement-v1',
    parser_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    classification_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'PROCESSING',
        'PARTIAL_FAILURE',
        'COMPLETED',
        'FAILED',
        'SUPERSEDED',
        'CANCELLED'
    )),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    total_chunks INTEGER NOT NULL DEFAULT 0,
    completed_chunks INTEGER NOT NULL DEFAULT 0,
    failed_chunks INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_runs_import ON ai_analysis_runs(import_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_runs_active ON ai_analysis_runs(import_id, is_active);

-- 4. Statement AI Chunks (Independent Chunk Execution & Retries)
CREATE TABLE IF NOT EXISTS statement_ai_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES statement_imports(id) ON DELETE CASCADE,
    analysis_run_id UUID NOT NULL REFERENCES ai_analysis_runs(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    total_chunks INTEGER NOT NULL,
    source_row_start INTEGER NOT NULL,
    source_row_end INTEGER NOT NULL,
    row_count INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'RETRYABLE'
    )),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    provider VARCHAR(50) NOT NULL DEFAULT 'OpenRouter',
    model VARCHAR(100) NOT NULL,
    prompt_version VARCHAR(50) NOT NULL DEFAULT 'bank-statement-v1',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_code VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_statement_ai_chunks_run_idx UNIQUE (analysis_run_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_statement_ai_chunks_import ON statement_ai_chunks(import_id);
CREATE INDEX IF NOT EXISTS idx_statement_ai_chunks_run ON statement_ai_chunks(analysis_run_id);
CREATE INDEX IF NOT EXISTS idx_statement_ai_chunks_status ON statement_ai_chunks(status);

-- 5. Statement AI Results (Isolated AI Interpretation Layer)
CREATE TABLE IF NOT EXISTS statement_ai_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES statement_imports(id) ON DELETE CASCADE,
    analysis_run_id UUID NOT NULL REFERENCES ai_analysis_runs(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES statement_ai_chunks(id) ON DELETE CASCADE,
    parsed_row_id UUID NOT NULL REFERENCES statement_parsed_rows(id) ON DELETE CASCADE,
    source_row_number INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL DEFAULT 'EXPENSE' CHECK (transaction_type IN (
        'INCOME',
        'EXPENSE',
        'TRANSFER',
        'OTHER'
    )),
    direction VARCHAR(50) NOT NULL DEFAULT 'DEBIT' CHECK (direction IN (
        'DEBIT',
        'CREDIT'
    )),
    merchant VARCHAR(255),
    suggested_category VARCHAR(100),
    suggested_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_confidence NUMERIC(5,4) DEFAULT 0.0000,
    transfer_candidate BOOLEAN DEFAULT FALSE,
    transfer_confidence NUMERIC(5,4) DEFAULT 0.0000,
    ai_notes TEXT,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'VALID' CHECK (validation_status IN (
        'VALID',
        'FLAGGED',
        'INVALID',
        'DUPLICATE'
    )),
    provider VARCHAR(50),
    model VARCHAR(100),
    prompt_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_statement_ai_results_run_row UNIQUE (analysis_run_id, parsed_row_id)
);

CREATE INDEX IF NOT EXISTS idx_statement_ai_results_import ON statement_ai_results(import_id);
CREATE INDEX IF NOT EXISTS idx_statement_ai_results_run ON statement_ai_results(analysis_run_id);
CREATE INDEX IF NOT EXISTS idx_statement_ai_results_chunk ON statement_ai_results(chunk_id);
CREATE INDEX IF NOT EXISTS idx_statement_ai_results_row ON statement_ai_results(parsed_row_id);
