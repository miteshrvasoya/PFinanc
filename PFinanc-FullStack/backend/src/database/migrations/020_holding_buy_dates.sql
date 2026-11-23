-- Migration: 020_holding_buy_dates.sql
-- When a holding was bought, for holdings that arrive without trade history (for example holdings imported from a
-- broker as a snapshot). Lets the price chart offer "since I bought". Trade history, when present, takes precedence.
CREATE TABLE IF NOT EXISTS holding_buy_dates (
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    security_id  UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
    buy_date     DATE NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (household_id, user_id, security_id)
);
