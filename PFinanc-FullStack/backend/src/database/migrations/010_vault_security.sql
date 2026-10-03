-- Migration: Vault Security Data Models
-- Description: Zero-knowledge password and secret manager for PFinanc users

CREATE TABLE IF NOT EXISTS vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    
    -- Metadata (Plaintext for searching)
    category VARCHAR(100) NOT NULL DEFAULT 'Other',
    is_shared BOOLEAN DEFAULT false,

    -- Zero-Knowledge Payload (AES-256-GCM encrypted on client side)
    encrypted_data TEXT NOT NULL,
    iv VARCHAR(255) NOT NULL,
    auth_tag VARCHAR(255) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vault_items_owner ON vault_items(owner_id);
CREATE INDEX idx_vault_items_household ON vault_items(household_id);


