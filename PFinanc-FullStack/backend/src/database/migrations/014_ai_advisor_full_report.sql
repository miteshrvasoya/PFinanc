-- Migration: 014_ai_advisor_full_report.sql
-- Store the complete structured advisor report (previously rebalancing suggestions, SIP/stock plans and
-- the market outlook were only kept inside raw_ai_response and never shown), plus the deterministic
-- financial facts the model was given, so every recommendation can be traced back to its inputs.

ALTER TABLE ai_advisor_reports ADD COLUMN IF NOT EXISTS report JSONB;
ALTER TABLE ai_advisor_reports ADD COLUMN IF NOT EXISTS financial_snapshot JSONB;
ALTER TABLE ai_advisor_reports ADD COLUMN IF NOT EXISTS served_model VARCHAR(150);
ALTER TABLE ai_advisor_reports ADD COLUMN IF NOT EXISTS schema_version SMALLINT NOT NULL DEFAULT 1;
