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
