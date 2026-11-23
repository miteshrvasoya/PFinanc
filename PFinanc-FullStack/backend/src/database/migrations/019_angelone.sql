-- Migration: 019_angelone.sql
-- Angel One SmartAPI integration support tables.

-- Cash-market instruments from Angel One's public instrument master (NSE/BSE equities and ETFs only),
-- used to translate a PFinanc security symbol into the numeric token SmartAPI quotes by.
CREATE TABLE IF NOT EXISTS angelone_instruments (
    exch_seg   VARCHAR(10)  NOT NULL,
    token      VARCHAR(20)  NOT NULL,
    symbol     VARCHAR(60)  NOT NULL,   -- trading symbol, e.g. RELIANCE-EQ (NSE) or RELIANCE (BSE)
    name       VARCHAR(120) NOT NULL,   -- underlying name used for matching, e.g. RELIANCE
    series     VARCHAR(10),             -- EQ, BE, SM, ... (NSE only)
    loaded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (exch_seg, token)
);

CREATE INDEX IF NOT EXISTS idx_angelone_instruments_name ON angelone_instruments (exch_seg, name);

-- What each sync did, for the status screens. Never contains credentials or tokens.
CREATE TABLE IF NOT EXISTS angelone_sync_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID REFERENCES households(id) ON DELETE CASCADE,
    kind          VARCHAR(20) NOT NULL CHECK (kind IN ('PRICES', 'HOLDINGS', 'MASTER')),
    status        VARCHAR(20) NOT NULL CHECK (status IN ('OK', 'PARTIAL', 'FAILED')),
    summary       JSONB,
    error         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_angelone_sync_log_household ON angelone_sync_log (household_id, kind, created_at DESC);
