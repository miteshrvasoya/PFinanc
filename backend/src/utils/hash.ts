import crypto from 'crypto';

/**
 * General SHA-256 string hash helper
 */
export function generateHash(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Deterministic fingerprint hash for transaction duplicate detection
 */
export function generateTransactionFingerprint(params: {
  accountId: string;
  transactionDate: string;
  amount: number | string;
  description: string;
  reference?: string | null;
}): string {
  const normalizedDate = new Date(params.transactionDate).toISOString().split('T')[0];
  const normalizedAmount = parseFloat(String(params.amount)).toFixed(2);
  const normalizedDesc = params.description.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedRef = (params.reference || '').trim().toLowerCase();

  const payload = `${params.accountId}|${normalizedDate}|${normalizedAmount}|${normalizedDesc}|${normalizedRef}`;
  return generateHash(payload);
}

/**
 * Deterministic fingerprint hash for investment transaction duplicate detection
 */
export function generateInvestmentFingerprint(params: {
  investmentAccountId: string;
  symbol: string;
  transactionDate: string;
  transactionType: string;
  quantity?: number | null;
  pricePerUnit?: number | null;
  netAmount: number | string;
  reference?: string | null;
}): string {
  const normalizedDate = new Date(params.transactionDate).toISOString().split('T')[0];
  const normalizedSymbol = params.symbol.trim().toUpperCase();
  const normalizedType = params.transactionType.trim().toUpperCase();
  const normalizedQty = params.quantity ? parseFloat(String(params.quantity)).toFixed(8) : '0';
  const normalizedPrice = params.pricePerUnit ? parseFloat(String(params.pricePerUnit)).toFixed(4) : '0';
  const normalizedAmount = parseFloat(String(params.netAmount)).toFixed(2);
  const normalizedRef = (params.reference || '').trim().toLowerCase();

  const payload = `${params.investmentAccountId}|${normalizedSymbol}|${normalizedDate}|${normalizedType}|${normalizedQty}|${normalizedPrice}|${normalizedAmount}|${normalizedRef}`;
  return generateHash(payload);
}
