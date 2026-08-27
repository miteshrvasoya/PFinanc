-- Migration: 004_onboarding_and_classification_rules.sql
-- Description: Schema extensions for Phase 2.5: Resumable Onboarding, Classification Rules, Invitations, and Physical Assets

-- 1. Onboarding Progress Table (Persisted per-user lifecycle)
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step VARCHAR(50) NOT NULL DEFAULT 'bank_accounts' CHECK (current_step IN (
        'welcome', 'family_setup', 'bank_accounts', 'stock_accounts', 'mutual_funds', 'other_assets', 'review', 'completed'
    )),
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
    completed_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_onboarding_user_household UNIQUE (user_id, household_id)
);

-- 2. Classification Rules Table (Persistent learning engine)
CREATE TABLE IF NOT EXISTS classification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    pattern VARCHAR(255) NOT NULL,
    match_type VARCHAR(50) NOT NULL DEFAULT 'CONTAINS' CHECK (match_type IN ('EXACT', 'CONTAINS', 'STARTS_WITH', 'REGEX')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL DEFAULT 'EXPENSE' CHECK (transaction_type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'OTHER')),
    confidence VARCHAR(50) NOT NULL DEFAULT 'USER_RULE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_household_pattern UNIQUE (household_id, pattern)
);

-- 3. Household Invitations Table (Secure tokens for family onboarding)
CREATE TABLE IF NOT EXISTS household_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
    token VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Physical & Precious Assets Table (Gold, SGB, Vehicles, Real Estate)
CREATE TABLE IF NOT EXISTS physical_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN (
        'PHYSICAL_GOLD', 'DIGITAL_GOLD', 'SGB', 'VEHICLE', 'PROPERTY', 'OTHER_ASSET'
    )),
    quantity NUMERIC(24, 8) NOT NULL DEFAULT 1.0 CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    purchase_cost NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_cost >= 0),
    current_value NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (current_value >= 0),
    as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_user_household ON onboarding_progress (user_id, household_id);
CREATE INDEX IF NOT EXISTS idx_classification_rules_household ON classification_rules (household_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON household_invitations (token);
CREATE INDEX IF NOT EXISTS idx_invitations_household_email ON household_invitations (household_id, email);
CREATE INDEX IF NOT EXISTS idx_physical_assets_household ON physical_assets (household_id);
