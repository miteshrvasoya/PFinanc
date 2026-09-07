-- ==========================================================
-- Migration 008: AI Investment Advisor Agent
-- Per-user AI configuration, run audit trail, structured
-- recommendation reports, and in-app notifications
-- ==========================================================

-- 1. AI Advisor Configuration (per-user, per-household)
CREATE TABLE IF NOT EXISTS ai_advisor_config (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id            UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

    -- AI Provider settings
    ai_provider             VARCHAR(50) NOT NULL DEFAULT 'OPENROUTER' CHECK (ai_provider IN (
                                'OPENROUTER', 'OPENAI', 'GEMINI', 'ANTHROPIC'
                            )),
    model_name              VARCHAR(150) NOT NULL DEFAULT 'anthropic/claude-sonnet-4-5',
    api_key_override        TEXT,                   -- optional per-user key (stored encrypted in future)

    -- Scheduling (standard cron expression, default 9 AM IST = 3:30 AM UTC)
    schedule_cron           VARCHAR(100) NOT NULL DEFAULT '30 3 * * *',
    is_enabled              BOOLEAN NOT NULL DEFAULT TRUE,

    -- Investment budgets (both optional — AI uses general rebalance advice if not set)
    monthly_sip_budget_inr  NUMERIC(15,2),          -- monthly MF/SIP investment capacity
    monthly_stock_budget_inr NUMERIC(15,2),         -- monthly direct equity budget

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_ai_advisor_config_user_household UNIQUE (user_id, household_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_advisor_config_user     ON ai_advisor_config(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_advisor_config_household ON ai_advisor_config(household_id);
CREATE INDEX IF NOT EXISTS idx_ai_advisor_config_enabled  ON ai_advisor_config(is_enabled);

-- 2. AI Advisor Agent Runs (Audit log — one row per execution)
CREATE TABLE IF NOT EXISTS ai_advisor_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

    triggered_by    VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (triggered_by IN (
                        'SCHEDULED', 'MANUAL'
                    )),
    status          VARCHAR(20) NOT NULL DEFAULT 'RUNNING' CHECK (status IN (
                        'RUNNING', 'COMPLETED', 'FAILED'
                    )),

    ai_provider     VARCHAR(50) NOT NULL,
    model_name      VARCHAR(150) NOT NULL,

    started_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    error_message   TEXT,

    -- Token usage (populated after completion)
    tokens_input    INTEGER,
    tokens_output   INTEGER,
    tokens_total    INTEGER,

    -- Snapshot of market data used during this run (for auditability)
    market_data_snapshot    JSONB,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_advisor_runs_user      ON ai_advisor_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_advisor_runs_household ON ai_advisor_runs(household_id);
CREATE INDEX IF NOT EXISTS idx_ai_advisor_runs_status   ON ai_advisor_runs(status);
CREATE INDEX IF NOT EXISTS idx_ai_advisor_runs_started  ON ai_advisor_runs(started_at DESC);

-- 3. AI Advisor Reports (Structured recommendation output per run)
CREATE TABLE IF NOT EXISTS ai_advisor_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              UUID NOT NULL REFERENCES ai_advisor_runs(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id        UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

    -- Portfolio snapshot at time of analysis
    portfolio_snapshot  JSONB NOT NULL,     -- holdings, allocation, XIRR etc.

    -- Market context used by the AI
    market_context      JSONB,              -- Nifty level, top movers, sector trends

    -- Structured AI recommendations (parsed from AI response)
    recommendations     JSONB NOT NULL,     -- array of {action, security, reason, priority, amount, expected_return}

    -- Top-level report fields
    portfolio_health_score  NUMERIC(5,2),   -- 0-100 score
    risk_assessment         VARCHAR(50),    -- Conservative / Moderate / Aggressive
    key_insights            JSONB,          -- string[]

    -- Raw AI output preserved for debugging / re-parsing
    raw_ai_response     TEXT,

    -- Read tracking (for in-app notifications)
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMPTZ,

    created_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_ai_advisor_report_run UNIQUE (run_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_advisor_reports_user      ON ai_advisor_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_advisor_reports_household ON ai_advisor_reports(household_id);
CREATE INDEX IF NOT EXISTS idx_ai_advisor_reports_unread    ON ai_advisor_reports(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_ai_advisor_reports_created   ON ai_advisor_reports(created_at DESC);

-- 4. In-App Notifications (lightweight notification feed)
CREATE TABLE IF NOT EXISTS ai_advisor_notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    report_id       UUID REFERENCES ai_advisor_reports(id) ON DELETE CASCADE,

    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    type            VARCHAR(50) NOT NULL DEFAULT 'AI_REPORT_READY' CHECK (type IN (
                        'AI_REPORT_READY', 'AI_RUN_FAILED', 'AI_RUN_STARTED'
                    )),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_notifications_user   ON ai_advisor_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_notifications_unread ON ai_advisor_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_ai_notifications_created ON ai_advisor_notifications(created_at DESC);
