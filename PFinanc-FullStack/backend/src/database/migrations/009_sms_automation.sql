-- 009_sms_automation.sql

-- 1. Device Registrations
CREATE TABLE device_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    app_version VARCHAR(50) NOT NULL,
    sms_detection_enabled BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id)
);

-- 2. Automatic Transaction Settings
CREATE TABLE automatic_transaction_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approval_mode VARCHAR(50) DEFAULT 'MANUAL_APPROVAL', -- MANUAL_APPROVAL, AUTO_APPROVE_HIGH_CONFIDENCE, FULL_MANUAL
    confidence_threshold FLOAT DEFAULT 0.95,
    ai_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 3. SMS Ingestion Events (Audit Log)
CREATE TABLE sms_ingestion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    message_hash VARCHAR(255) NOT NULL,
    sender VARCHAR(100),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processing_status VARCHAR(50) DEFAULT 'PROCESSING', -- PROCESSING, IGNORED, CANDIDATE_CREATED, FAILED
    classification VARCHAR(50), -- FINANCIAL, NON_FINANCIAL, OTP, PROMOTIONAL
    transaction_candidate_id UUID, -- References transaction_candidates(id) later
    error_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, message_hash)
);

-- 4. Transaction Candidates
CREATE TABLE transaction_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    
    source_type VARCHAR(50) DEFAULT 'SMS',
    source_reference VARCHAR(255), -- E.g., message_hash
    
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    
    amount DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'INR',
    direction VARCHAR(20), -- DEBIT, CREDIT
    transaction_type VARCHAR(50), -- EXPENSE, INCOME, TRANSFER, etc
    
    merchant VARCHAR(255),
    description TEXT,
    
    transaction_date DATE,
    reference_number VARCHAR(100),
    
    confidence FLOAT,
    category_suggestion UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_confidence FLOAT,
    
    status VARCHAR(50) DEFAULT 'DETECTED', -- DETECTED, PARSING, PARSED, NEEDS_REVIEW, APPROVED, REJECTED, DUPLICATE, FAILED, EXPIRED, PENDING_SYNC
    
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, source_reference)
);

-- Update sms_ingestion_events to add foreign key constraint if needed, but not strictly required since it's an audit table.
ALTER TABLE sms_ingestion_events ADD CONSTRAINT fk_sms_candidate FOREIGN KEY (transaction_candidate_id) REFERENCES transaction_candidates(id) ON DELETE SET NULL;

-- 5. Add columns to transactions table to support source metadata
-- (NOTE: IF NOT EXISTS is not standard for ADD COLUMN in older postgres without complex blocks, but works in Postgres 11+)
-- We will just do ADD COLUMN. If it was already added, it might fail. But assuming it's new.
-- Actually the previous file had source_type and source_reference already? Let's check.
-- "source_type: data.source_type || 'MANUAL'" was in transactions.service.ts. It probably exists.
-- Let's NOT add source_type and source_reference if they exist. Let's just add source_candidate_id.
ALTER TABLE transactions ADD COLUMN source_candidate_id UUID REFERENCES transaction_candidates(id) ON DELETE SET NULL;

-- 5.5 Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Trigger for updated_at on Candidates
CREATE TRIGGER update_transaction_candidates_modtime
BEFORE UPDATE ON transaction_candidates
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7. Trigger for updated_at on Settings
CREATE TRIGGER update_automatic_transaction_settings_modtime
BEFORE UPDATE ON automatic_transaction_settings
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 8. Trigger for updated_at on Device Registrations
CREATE TRIGGER update_device_registrations_modtime
BEFORE UPDATE ON device_registrations
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
