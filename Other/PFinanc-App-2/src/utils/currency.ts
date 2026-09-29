/**
 * Currency formatter — Indian Rupee (en-IN locale)
 * Output: ₹3,45,210.00
 * All currency displays use tabular-nums via Typography.numericData
 */

export function formatINR(amount: number | string | null | undefined, options?: {
  showDecimals?: boolean;
  compact?: boolean;
}): string {
  if (amount === null || amount === undefined) return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  const { showDecimals = true, compact = false } = options ?? {};

  if (compact) {
    if (Math.abs(num) >= 1_00_00_000) {
      return `₹${(num / 1_00_00_000).toFixed(2)}Cr`;
    }
    if (Math.abs(num) >= 1_00_000) {
      return `₹${(num / 1_00_000).toFixed(2)}L`;
    }
    if (Math.abs(num) >= 1_000) {
      return `₹${(num / 1_000).toFixed(1)}K`;
    }
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(num);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '0.0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatXIRR(value: number | null | undefined): string {
  return formatPercent(value, 2);
}
