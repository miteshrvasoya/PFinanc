/**
 * PFinanc — Currency utilities
 * Uses integer paise (1 INR = 100 paise) to avoid floating-point errors.
 */

/**
 * Format paise amount as Indian Rupee string.
 * e.g. 6500000 → "₹65,000"
 *      -85000  → "-₹850"
 */
export function formatINR(paise: number, showSign = false): string {
  const rupees = Math.abs(paise) / 100;
  const formatted = formatIndianNumber(rupees);
  const prefix = paise < 0 ? '-₹' : showSign && paise > 0 ? '+₹' : '₹';
  return `${prefix}${formatted}`;
}

/**
 * Format a number using Indian number system: 12,45,000
 */
export function formatIndianNumber(n: number): string {
  const str = n.toFixed(0);
  const result: string[] = [];
  let count = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    result.unshift(str[i]);
    count++;
    // First comma at 3 digits, then every 2
    if (i > 0) {
      if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
        result.unshift(',');
      }
    }
  }
  return result.join('');
}

/**
 * Parse a string like "₹1,450" or "1450" to paise integer.
 */
export function parseINRToPaise(input: string): number {
  const cleaned = input.replace(/[₹,\s]/g, '');
  const rupees = parseFloat(cleaned);
  if (isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Format a paise value as a compact string: ₹65K, ₹4.25L
 */
export function formatINRCompact(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  const sign = paise < 0 ? '-' : '';
  if (rupees >= 10_000_000) {
    return `${sign}₹${(rupees / 10_000_000).toFixed(1)}Cr`;
  }
  if (rupees >= 100_000) {
    return `${sign}₹${(rupees / 100_000).toFixed(2)}L`;
  }
  if (rupees >= 1_000) {
    return `${sign}₹${(rupees / 1_000).toFixed(1)}K`;
  }
  return `${sign}₹${rupees.toFixed(0)}`;
}
