-- Migration: 021_stock_signals.sql
-- Advisory technical-analysis signals (never places orders): stored daily candles, watchlist, per-household
-- settings, daily signal runs and their results, de-duplicated alerts, and backtest history.

-- Daily candles shared by every household, keyed by the Angel One instrument. Prices are as delivered by the
-- exchange feed (not split-adjusted), so abnormal gaps are detected and the symbol is flagged instead of signalled.
CREATE TABLE IF NOT EXISTS candles (
    exchange    VARCHAR(10)   NOT NULL,
    token       VARCHAR(20)   NOT NULL,
    symbol      VARCHAR(60)   NOT NULL,
    trade_date  DATE          NOT NULL,
    open        NUMERIC(18,4) NOT NULL,
    high        NUMERIC(18,4) NOT NULL,
    low         NUMERIC(18,4) NOT NULL,
    close       NUMERIC(18,4) NOT NULL,
    volume      BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (exchange, token, trade_date)
);

CREATE TABLE IF NOT EXISTS candle_sync_state (
    exchange      VARCHAR(10)  NOT NULL,
    token         VARCHAR(20)  NOT NULL,
    symbol        VARCHAR(60)  NOT NULL,
    last_date     DATE,
    candle_count  INTEGER      NOT NULL DEFAULT 0,
    data_reliable BOOLEAN      NOT NULL DEFAULT TRUE,
    data_notes    JSONB        NOT NULL DEFAULT '[]'::jsonb,
    fetched_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (exchange, token)
);

CREATE TABLE IF NOT EXISTS watchlist (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    symbol        VARCHAR(60) NOT NULL,
    exchange      VARCHAR(10) NOT NULL DEFAULT 'NSE',
    note          VARCHAR(200),
    added_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_watchlist UNIQUE (household_id, symbol)
);

CREATE TABLE IF NOT EXISTS signal_settings (
    household_id  UUID PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
    enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    config        JSONB   NOT NULL DEFAULT '{}'::jsonb,   -- overrides on top of the code defaults
    updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signal_runs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    as_of_date     DATE NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED')),
    trigger        VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    universe_size  INTEGER NOT NULL DEFAULT 0,
    scored         INTEGER NOT NULL DEFAULT 0,
    skipped        INTEGER NOT NULL DEFAULT 0,
    errors         JSONB NOT NULL DEFAULT '[]'::jsonb,
    config         JSONB,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ,
    -- one run per household per trading day: re-running replaces the results (idempotent)
    CONSTRAINT uq_signal_run_day UNIQUE (household_id, as_of_date)
);

CREATE TABLE IF NOT EXISTS signals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id         UUID NOT NULL REFERENCES signal_runs(id) ON DELETE CASCADE,
    household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    symbol         VARCHAR(60) NOT NULL,
    exchange       VARCHAR(10) NOT NULL,
    token          VARCHAR(20) NOT NULL,
    as_of_date     DATE NOT NULL,
    score          NUMERIC(6,1) NOT NULL,
    label          VARCHAR(20) NOT NULL CHECK (label IN ('STRONG_BUY','BUY','WATCH','HOLD','REDUCE','SELL','AVOID')),
    confidence     NUMERIC(4,2) NOT NULL,
    reasons        JSONB NOT NULL DEFAULT '[]'::jsonb,
    warnings       JSONB NOT NULL DEFAULT '[]'::jsonb,
    components     JSONB NOT NULL DEFAULT '{}'::jsonb,
    entry_low      NUMERIC(18,2),
    entry_high     NUMERIC(18,2),
    stop           NUMERIC(18,2),
    target1        NUMERIC(18,2),
    target2        NUMERIC(18,2),
    risk_reward    NUMERIC(6,2),
    trade_valid    BOOLEAN NOT NULL DEFAULT FALSE,
    trade_note     TEXT,
    extended       BOOLEAN NOT NULL DEFAULT FALSE,
    indicators     JSONB NOT NULL DEFAULT '{}'::jsonb,
    avg_traded_value NUMERIC(20,2),
    liquid         BOOLEAN NOT NULL DEFAULT TRUE,
    data_reliable  BOOLEAN NOT NULL DEFAULT TRUE,
    data_notes     JSONB NOT NULL DEFAULT '[]'::jsonb,
    sources        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- HOLDING / WATCHLIST / PRESET
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_signal_run_symbol UNIQUE (run_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_signals_household_date ON signals (household_id, as_of_date DESC, score DESC);

-- Alerts already sent. The unique key is what prevents repeats: the same state for the same symbol alerts once.
CREATE TABLE IF NOT EXISTS signal_alerts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    symbol        VARCHAR(60) NOT NULL,
    kind          VARCHAR(30) NOT NULL,
    dedupe_key    VARCHAR(120) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_signal_alert UNIQUE (household_id, symbol, kind, dedupe_key)
);

CREATE TABLE IF NOT EXISTS backtest_runs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id   UUID REFERENCES households(id) ON DELETE CASCADE,
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    params         JSONB NOT NULL,
    symbols_count  INTEGER NOT NULL DEFAULT 0,
    metrics        JSONB NOT NULL,
    trades         JSONB NOT NULL DEFAULT '[]'::jsonb,
    equity_curve   JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_household ON backtest_runs (household_id, created_at DESC);

-- Signal alerts reuse the in-app notification list.
ALTER TABLE ai_advisor_notifications DROP CONSTRAINT IF EXISTS ai_advisor_notifications_type_check;
ALTER TABLE ai_advisor_notifications ADD CONSTRAINT ai_advisor_notifications_type_check CHECK (type IN (
    'AI_REPORT_READY', 'AI_RUN_FAILED', 'AI_RUN_STARTED',
    'SIGNAL_STRONG_BUY', 'SIGNAL_SELL', 'SIGNAL_STOP_HIT', 'SIGNAL_TARGET_HIT', 'SIGNAL_ENTRY_ZONE'
));
