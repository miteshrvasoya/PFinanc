-- Migration: 006_add_investment_transaction_type.sql
-- Description: Add INVESTMENT to transaction_type in transactions and statement_ai_results

-- Drop existing constraints
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;
ALTER TABLE statement_ai_results DROP CONSTRAINT IF EXISTS statement_ai_results_transaction_type_check;

-- Add new constraints
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_transaction_type_check 
  CHECK (transaction_type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'REFUND', 'FEE', 'INVESTMENT', 'OTHER'));

ALTER TABLE statement_ai_results 
  ADD CONSTRAINT statement_ai_results_transaction_type_check 
  CHECK (transaction_type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'OTHER'));
