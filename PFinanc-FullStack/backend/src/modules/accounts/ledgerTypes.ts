/**
 * Canonical direction of every non-transfer transaction_type on its own account.
 * TRANSFER legs are resolved via the transfers table (source = debit, destination = credit).
 *
 * Keep in sync with transactions_transaction_type_check (migration 011).
 */
export const CREDIT_TRANSACTION_TYPES = [
  'INCOME',
  'REFUND',
  'LOAN_DISBURSEMENT',
  'LENT_PRINCIPAL_RECEIVED',
  'LENT_INTEREST_RECEIVED',
  'BORROWED_AMOUNT',
  'RENT_RECEIVED',
  'INVESTMENT_REDEMPTION',
  'INVESTMENT_INCOME',
] as const;

export const DEBIT_TRANSACTION_TYPES = [
  'EXPENSE',
  'FEE',
  'OTHER',
  'EMI_PAYMENT',
  'LENT_AMOUNT',
  'BORROWED_PRINCIPAL_REPAID',
  'BORROWED_INTEREST_PAID',
  'RENT_PAID',
  'INVESTMENT_PURCHASE',
] as const;

const toSqlList = (types: readonly string[]) => types.map((t) => `'${t}'`).join(', ');

export const CREDIT_TYPES_SQL = toSqlList(CREDIT_TRANSACTION_TYPES);
export const DEBIT_TYPES_SQL = toSqlList(DEBIT_TRANSACTION_TYPES);

/**
 * Types that count as household income / expense in reports (dashboard, analytics). Principal flows
 * (loans, EMIs, lending, investments) move money but are not income or spending, so they are excluded.
 */
export const INCOME_REPORT_TYPES = ['INCOME', 'REFUND', 'RENT_RECEIVED', 'LENT_INTEREST_RECEIVED', 'INVESTMENT_INCOME'] as const;
export const EXPENSE_REPORT_TYPES = ['EXPENSE', 'FEE', 'RENT_PAID', 'BORROWED_INTEREST_PAID'] as const;
export const INCOME_REPORT_SQL = toSqlList(INCOME_REPORT_TYPES);
export const EXPENSE_REPORT_SQL = toSqlList(EXPENSE_REPORT_TYPES);

/** Types a user may assign to an existing (non-transfer) transaction. */
export const ASSIGNABLE_TRANSACTION_TYPES = [...CREDIT_TRANSACTION_TYPES, ...DEBIT_TRANSACTION_TYPES] as const;
