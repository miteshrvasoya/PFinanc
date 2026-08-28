import crypto from 'crypto';
import { parse } from 'csv-parse/sync';

export interface ColumnMapping {
  dateCol: string;
  valueDateCol?: string;
  descriptionCol: string;
  debitCol?: string;
  creditCol?: string;
  amountCol?: string;
  balanceCol?: string;
  referenceCol?: string;
  transactionIdCol?: string;
}

export interface ParsedSourceRow {
  source_row_number: number;
  row_type: 'TRANSACTION' | 'NON_TRANSACTION' | 'HEADER' | 'FOOTER' | 'OPENING_BALANCE' | 'CLOSING_BALANCE' | 'UNKNOWN';
  raw_data: Record<string, any>;
  transaction_date: string | null;
  value_date: string | null;
  description: string;
  normalized_description: string;
  debit_amount: number | null;
  credit_amount: number | null;
  amount: number | null;
  balance: number | null;
  reference: string | null;
  transaction_id: string | null;
  parse_status: 'VALID' | 'INVALID' | 'SKIPPED';
}

export interface ParseResult {
  fileHash: string;
  fileSizeBytes: number;
  parserVersion: string;
  headers: string[];
  columnMapping: ColumnMapping;
  expectedRowCount: number;
  parsedRowCount: number;
  transactionRowCount: number;
  nonTransactionRowCount: number;
  reconciliationData: {
    calculatedOpeningBalance: number | null;
    calculatedClosingBalance: number | null;
    totalCredits: number;
    totalDebits: number;
    netCashFlow: number;
    isBalanced: boolean;
    discrepancy: number;
  };
  warningMessage: string | null;
  rows: ParsedSourceRow[];
}

export class StatementCsvParser {
  static readonly PARSER_VERSION = '1.0.0';

  /**
   * Compute SHA-256 hash of the input string/buffer
   */
  static computeFileHash(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Detect header columns based on common bank statement column patterns
   */
  static detectColumnMapping(headers: string[]): ColumnMapping {
    const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

    const mapping: ColumnMapping = {
      dateCol: '',
      descriptionCol: '',
    };

    headers.forEach((h) => {
      const n = normalize(h);
      if (n.includes('valuedate') || n === 'vdate') {
        mapping.valueDateCol = h;
      } else if (n.includes('date') || n === 'txn' || n === 'txndate' || n === 'posteddate') {
        if (!mapping.dateCol) mapping.dateCol = h;
      } else if (
        n.includes('desc') ||
        n.includes('narration') ||
        n.includes('particular') ||
        n.includes('remark') ||
        n.includes('details') ||
        n.includes('transactiondetails')
      ) {
        if (!mapping.descriptionCol) mapping.descriptionCol = h;
      } else if (n === 'debit' || n.includes('withdrawal') || n === 'dr' || n === 'debitamount' || n === 'withdrawn') {
        mapping.debitCol = h;
      } else if (n === 'credit' || n.includes('deposit') || n === 'cr' || n === 'creditamount' || n === 'deposited') {
        mapping.creditCol = h;
      } else if (n.includes('amount') || n === 'amt' || n === 'sum') {
        mapping.amountCol = h;
      } else if (n.includes('balance') || n === 'bal' || n.includes('closingbal') || n === 'availbal') {
        mapping.balanceCol = h;
      } else if (n.includes('ref') || n.includes('cheque') || n.includes('utr') || n.includes('chqno')) {
        mapping.referenceCol = h;
      } else if (n.includes('txnid') || n.includes('transactionid') || n === 'id') {
        mapping.transactionIdCol = h;
      }
    });

    if (!mapping.dateCol && headers.length > 0) mapping.dateCol = headers[0];
    if (!mapping.descriptionCol && headers.length > 1) mapping.descriptionCol = headers[1];
    if (!mapping.amountCol && !mapping.debitCol && !mapping.creditCol && headers.length > 2) mapping.amountCol = headers[2];

    return mapping;
  }

  /**
   * Parse various date formats into YYYY-MM-DD
   */
  static parseDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const clean = dateStr.trim();

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // DD-MMM-YYYY e.g. 15-Aug-2026 or 15/Aug/2026
    const dMmmYMatch = clean.match(/^(\d{1,2})[\/\-\.\s]([a-zA-Z]{3,9})[\/\-\.\s](\d{4})$/);
    if (dMmmYMatch) {
      const day = dMmmYMatch[1].padStart(2, '0');
      const monthName = dMmmYMatch[2].toLowerCase().slice(0, 3);
      const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      };
      if (months[monthName]) {
        return `${dMmmYMatch[3]}-${months[monthName]}-${day}`;
      }
    }

    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  /**
   * Parse numeric monetary string
   */
  static parseMoney(valStr: any): number | null {
    if (typeof valStr === 'number') return isNaN(valStr) ? null : valStr;
    if (!valStr) return null;
    let cleaned = String(valStr).replace(/[₹$,\s]/g, '').trim();

    // Handle (100.00) accounting format for negative values
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  }

  /**
   * Clean description into a normalized format for matching
   */
  static normalizeDescription(desc: string): string {
    if (!desc) return '';
    return desc
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse CSV content deterministically and normalize every row
   */
  static parse(csvContent: string, customMapping?: Partial<ColumnMapping>): ParseResult {
    const fileHash = this.computeFileHash(csvContent);
    const fileSizeBytes = Buffer.byteLength(csvContent, 'utf8');

    let rawRecords: Record<string, string>[] = [];
    try {
      rawRecords = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];
    } catch (err: any) {
      throw new Error(`CSV parsing error: ${err.message}`);
    }

    if (rawRecords.length === 0) {
      throw new Error('The uploaded CSV contains no records or valid headers.');
    }

    const headers = Object.keys(rawRecords[0]);
    const mapping: ColumnMapping = {
      ...this.detectColumnMapping(headers),
      ...(customMapping || {}),
    };

    const parsedRows: ParsedSourceRow[] = [];
    let totalCredits = 0;
    let totalDebits = 0;
    let transactionRowCount = 0;
    let nonTransactionRowCount = 0;

    let firstBalance: number | null = null;
    let lastBalance: number | null = null;

    for (let i = 0; i < rawRecords.length; i++) {
      const raw = rawRecords[i];
      const sourceRowNumber = i + 1; // 1-based index

      const rawDate = mapping.dateCol ? raw[mapping.dateCol] : null;
      const rawValDate = mapping.valueDateCol ? raw[mapping.valueDateCol] : null;
      const rawDesc = mapping.descriptionCol ? raw[mapping.descriptionCol] : '';
      const rawRef = mapping.referenceCol ? raw[mapping.referenceCol] : null;
      const rawTxnId = mapping.transactionIdCol ? raw[mapping.transactionIdCol] : null;
      const rawBalance = mapping.balanceCol ? raw[mapping.balanceCol] : null;

      const parsedDate = rawDate ? this.parseDate(rawDate) : null;
      const parsedValDate = rawValDate ? this.parseDate(rawValDate) : null;
      const parsedBalance = rawBalance ? this.parseMoney(rawBalance) : null;

      let debit: number | null = null;
      let credit: number | null = null;
      let amount: number | null = null;

      if (mapping.debitCol && mapping.creditCol) {
        debit = this.parseMoney(raw[mapping.debitCol]);
        credit = this.parseMoney(raw[mapping.creditCol]);
        if (credit !== null && credit > 0) {
          amount = credit;
        } else if (debit !== null && debit > 0) {
          amount = debit;
        }
      } else if (mapping.amountCol) {
        const parsedAmt = this.parseMoney(raw[mapping.amountCol]);
        if (parsedAmt !== null) {
          if (parsedAmt < 0) {
            debit = Math.abs(parsedAmt);
            amount = Math.abs(parsedAmt);
          } else {
            credit = parsedAmt;
            amount = parsedAmt;
          }
        }
      }

      // Check for non-transaction row heuristics (Opening Balance, Summary, Footer)
      const descLower = (rawDesc || '').toLowerCase();
      let rowType: ParsedSourceRow['row_type'] = 'TRANSACTION';
      let parseStatus: ParsedSourceRow['parse_status'] = 'VALID';

      if (descLower.includes('opening balance') || descLower.includes('brought forward') || descLower.includes('b/f')) {
        rowType = 'OPENING_BALANCE';
        nonTransactionRowCount++;
      } else if (descLower.includes('closing balance') || descLower.includes('carried forward') || descLower.includes('c/f')) {
        rowType = 'CLOSING_BALANCE';
        nonTransactionRowCount++;
      } else if (descLower.includes('total') || descLower.includes('summary') || descLower.includes('page')) {
        rowType = 'NON_TRANSACTION';
        nonTransactionRowCount++;
      } else if (!parsedDate || (amount === null || amount === 0)) {
        rowType = 'NON_TRANSACTION';
        parseStatus = 'SKIPPED';
        nonTransactionRowCount++;
      } else {
        transactionRowCount++;
        if (credit && credit > 0) totalCredits += credit;
        if (debit && debit > 0) totalDebits += debit;
      }

      if (parsedBalance !== null) {
        if (firstBalance === null) firstBalance = parsedBalance;
        lastBalance = parsedBalance;
      }

      parsedRows.push({
        source_row_number: sourceRowNumber,
        row_type: rowType,
        raw_data: raw,
        transaction_date: parsedDate,
        value_date: parsedValDate || parsedDate,
        description: rawDesc || 'Transaction',
        normalized_description: this.normalizeDescription(rawDesc),
        debit_amount: debit,
        credit_amount: credit,
        amount: amount,
        balance: parsedBalance,
        reference: rawRef,
        transaction_id: rawTxnId,
        parse_status: parseStatus,
      });
    }

    // Mathematical reconciliation check
    const netCashFlow = Number((totalCredits - totalDebits).toFixed(2));
    let isBalanced = true;
    let discrepancy = 0;
    let warningMessage: string | null = null;

    if (firstBalance !== null && lastBalance !== null && parsedRows.length > 1) {
      const expectedEndBalance = Number((firstBalance + netCashFlow).toFixed(2));
      discrepancy = Number(Math.abs(expectedEndBalance - lastBalance).toFixed(2));
      if (discrepancy > 1.00) {
        isBalanced = false;
        warningMessage = `Statement balance reconciliation warning: expected ending balance ₹${expectedEndBalance}, but found ₹${lastBalance} (Difference: ₹${discrepancy}).`;
      }
    }

    return {
      fileHash,
      fileSizeBytes,
      parserVersion: this.PARSER_VERSION,
      headers,
      columnMapping: mapping,
      expectedRowCount: rawRecords.length,
      parsedRowCount: parsedRows.length,
      transactionRowCount,
      nonTransactionRowCount,
      reconciliationData: {
        calculatedOpeningBalance: firstBalance,
        calculatedClosingBalance: lastBalance,
        totalCredits: Number(totalCredits.toFixed(2)),
        totalDebits: Number(totalDebits.toFixed(2)),
        netCashFlow,
        isBalanced,
        discrepancy,
      },
      warningMessage,
      rows: parsedRows,
    };
  }
}
