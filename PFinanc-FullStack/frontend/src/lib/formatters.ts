/**
 * Indian Rupee (INR) currency formatting
 * Formats numbers into ₹1,25,000.00 standard Indian notation
 */
export function formatINR(amount: number | string | null | undefined, showDecimals = true): string {
  if (amount === null || amount === undefined) return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const parts = absNum.toFixed(showDecimals ? 2 : 0).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : '';

  // Indian format: last 3 digits, then pairs of 2 digits
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return `${isNegative ? '-' : ''}₹${integerPart}${decimalPart}`;
}

/**
 * Format dates into friendly readable strings
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/** Transaction types that increase the balance of the account they are booked on (mirrors backend ledgerTypes.ts). */
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
];

export const isCreditTransaction = (tx: { transaction_type: string }) =>
  CREDIT_TRANSACTION_TYPES.includes(tx.transaction_type);

/**
 * Today's date as YYYY-MM-DD in the user's local timezone.
 * (`new Date().toISOString().split('T')[0]` is the UTC date, i.e. yesterday before 05:30 IST.)
 */
export const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Compact Indian notation for axis ticks and tight spaces: ₹950, ₹12K, ₹1.2L, ₹3.4Cr. */
export const formatINRCompact = (amount: number): string => {
  const sign = amount < 0 ? '-' : '';
  const n = Math.abs(amount || 0);
  const trim = (v: number) => (v >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, ''));
  if (n >= 1e7) return `${sign}₹${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `${sign}₹${trim(n / 1e5)}L`;
  if (n >= 1e3) return `${sign}₹${trim(n / 1e3)}K`;
  return `${sign}₹${Math.round(n)}`;
};
