-- Migration: 012_transaction_review_flags.sql
-- Description: Lets imported/auto-classified transactions be flagged for manual review
-- without excluding them from balances (unlike DRAFT status).

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_needs_review
  ON transactions (household_id, transaction_date DESC)
  WHERE needs_review = true;
