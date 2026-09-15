import { ClassificationService } from '../../classification/classification.service.js';

export interface ParsedTransaction {
  isFinancial: boolean;
  amount: number | null;
  currency: string;
  direction: 'DEBIT' | 'CREDIT' | null;
  transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'WITHDRAWAL' | 'FEE' | 'REFUND' | 'UNKNOWN';
  merchant: string | null;
  accountSuffix: string | null;
  transactionDate: Date | null;
  referenceNumber: string | null;
  confidence: number;
}

export class DeterministicTransactionParser {
  // Common keywords to detect if it's financial
  private static FINANCIAL_KEYWORDS = ['debited', 'credited', 'spent', 'paid', 'withdrawn', 'purchase', 'payment', 'sent', 'transferred', 'deducted', 'received', 'salary', 'refund', 'cashback'];

  static async parse(body: string, sender: string, receivedAt: Date, householdId: string): Promise<ParsedTransaction> {
    const text = body.toLowerCase();
    
    let isFinancial = false;
    for (const keyword of this.FINANCIAL_KEYWORDS) {
      if (text.includes(keyword)) {
        isFinancial = true;
        break;
      }
    }
    
    // Quick escape for OTPs
    if (text.includes('otp') || text.includes('one time password')) {
      isFinancial = false;
    }

    let confidence = 0;
    
    // Amount Extraction
    // Looks for Rs., INR, ₹ followed by number
    const amountRegex = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/i;
    const amountMatch = body.match(amountRegex);
    let amount: number | null = null;
    
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      confidence += 0.20;
    }

    // Direction Extraction
    let direction: 'DEBIT' | 'CREDIT' | null = null;
    const isDebit = /(debited|spent|paid|withdrawn|purchase|deducted)/i.test(text);
    const isCredit = /(credited|received|salary|refund|cashback|deposit)/i.test(text);

    if (isDebit && !isCredit) {
      direction = 'DEBIT';
      confidence += 0.20;
    } else if (isCredit && !isDebit) {
      direction = 'CREDIT';
      confidence += 0.20;
    }

    // Account Suffix Extraction
    // Looks for A/c XX1234, ending 1234, etc.
    const accountRegex = /(?:a\/c|acct|account).*(?:xx|ending|x*)\s*(\d{4})/i;
    const accMatch = body.match(accountRegex);
    let accountSuffix: string | null = null;
    if (accMatch && accMatch[1]) {
      accountSuffix = accMatch[1];
      confidence += 0.15;
    }

    // Reference Extraction
    const refRegex = /(?:ref|upi ref|txn|reference|utr)[^\w]*([a-zA-Z0-9]{6,})/i;
    const refMatch = body.match(refRegex);
    let referenceNumber: string | null = null;
    if (refMatch && refMatch[1]) {
      referenceNumber = refMatch[1];
      confidence += 0.10;
    }
    
    // Merchant Extraction (very basic heuristics)
    let merchant: string | null = null;
    const upiRegex = /upi\/(?:cr|dr|pay)\/[a-zA-Z0-9]*\/([a-zA-Z0-9\s]+)\//i;
    const upiMatch = body.match(upiRegex);
    
    const infoAtRegex = /(?:at|to|from)\s+([a-zA-Z0-9\s]+?)(?:\s+on|\.|$)/i;
    const infoMatch = body.match(infoAtRegex);
    
    if (upiMatch && upiMatch[1]) {
      merchant = upiMatch[1].trim();
      confidence += 0.15;
    } else if (infoMatch && infoMatch[1]) {
      const matchText = infoMatch[1].trim();
      if (!['a', 'an', 'the', 'your'].includes(matchText.toLowerCase())) {
         merchant = matchText;
         confidence += 0.05;
      }
    }

    // Transaction Type
    let transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'WITHDRAWAL' | 'FEE' | 'REFUND' | 'UNKNOWN' = 'UNKNOWN';
    
    if (direction === 'DEBIT') {
      transactionType = 'EXPENSE';
      if (text.includes('atm') && text.includes('withdrawn')) transactionType = 'WITHDRAWAL';
      if (text.includes('charge') || text.includes('fee')) transactionType = 'FEE';
    } else if (direction === 'CREDIT') {
      transactionType = 'INCOME';
      if (text.includes('refund')) transactionType = 'REFUND';
    }
    
    // Transfer logic - very heuristic, proper transfer detection needs both sides
    if (text.includes('transfer')) {
        transactionType = 'TRANSFER';
    }

    if (transactionType !== 'UNKNOWN') {
      confidence += 0.10;
    }
    
    // Cap confidence
    confidence = Math.min(confidence, 1.0);

    return {
      isFinancial,
      amount,
      currency: 'INR',
      direction,
      transactionType,
      merchant,
      accountSuffix,
      transactionDate: receivedAt, // We fallback to receivedAt for now, can add date extraction
      referenceNumber,
      confidence
    };
  }
}
