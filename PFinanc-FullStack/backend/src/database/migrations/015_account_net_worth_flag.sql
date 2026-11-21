-- Migration: 015_account_net_worth_flag.sql
-- Accounts whose statements have not been imported yet (e.g. a family member's account that so far only
-- contains the counterpart legs of transfers) show balances that are artifacts, not money. This flag lets
-- the user keep such accounts out of net worth until their data is complete.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS include_in_net_worth BOOLEAN NOT NULL DEFAULT true;
