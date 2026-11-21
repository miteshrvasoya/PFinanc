-- Migration: 006_add_investment_transaction_type.sql
-- Description: Add INVESTMENT to transaction_type in statement_ai_results.
--
-- NOTE: The transactions.transaction_type CHECK is owned by migration 011 (which supersedes the
-- list this file used to install). Re-adding an older list here broke startup on databases that
-- already contain newer types (EMI_PAYMENT, INVESTMENT_PURCHASE, ...), so it is no longer touched.

ALTER TABLE statement_ai_results DROP CONSTRAINT IF EXISTS statement_ai_results_transaction_type_check;

ALTER TABLE statement_ai_results
  ADD CONSTRAINT statement_ai_results_transaction_type_check
  CHECK (transaction_type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'OTHER'));
