-- Migration: 013_repair_split_transactions.sql
-- Splitting a transaction used to overwrite its transaction_type with 'SPLIT'. The balance ledger and
-- income/expense analytics ignore that type, so split transactions vanished from balances and reports.
-- Restore the original type, which every split line inherited from its parent at split time.

UPDATE transactions t
SET transaction_type = s.transaction_type,
    updated_at = NOW()
FROM (
    SELECT DISTINCT ON (parent_transaction_id) parent_transaction_id, transaction_type
    FROM transaction_splits
    WHERE transaction_type <> 'SPLIT'
    ORDER BY parent_transaction_id, created_at ASC
) s
WHERE t.id = s.parent_transaction_id
  AND t.transaction_type = 'SPLIT';

-- Split rows that recorded 'SPLIT' themselves (should not exist) fall back to their parent's type.
UPDATE transaction_splits ts
SET transaction_type = t.transaction_type
FROM transactions t
WHERE t.id = ts.parent_transaction_id
  AND ts.transaction_type = 'SPLIT'
  AND t.transaction_type <> 'SPLIT';
