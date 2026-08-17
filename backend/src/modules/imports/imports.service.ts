import { parse } from 'csv-parse/sync';
import { QueryHelper } from '../../database/queryHelper.js';
import { generateTransactionFingerprint } from '../../utils/hash.js';
import { logAudit } from '../../utils/audit.js';

export interface ColumnMapping {
  dateCol: string;
  descriptionCol: string;
  amountCol?: string;
  debitCol?: string;
  creditCol?: string;
  referenceCol?: string;
  categoryCol?: string;
}

export class ImportsService {
  /**
   * Automatically detect column mappings from header names
   */
  static detectColumnMapping(headers: string[]): ColumnMapping {
    const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

    const mapping: ColumnMapping = {
      dateCol: '',
      descriptionCol: '',
    };

    headers.forEach((h) => {
      const n = normalize(h);
      if (n.includes('date') || n === 'txn' || n === 'txndate' || n === 'valuedate') {
        if (!mapping.dateCol) mapping.dateCol = h;
      } else if (n.includes('desc') || n.includes('narration') || n.includes('particular') || n.includes('remark') || n.includes('details')) {
        if (!mapping.descriptionCol) mapping.descriptionCol = h;
      } else if (n === 'debit' || n.includes('withdrawal') || n.includes('dr')) {
        mapping.debitCol = h;
      } else if (n === 'credit' || n.includes('deposit') || n.includes('cr')) {
        mapping.creditCol = h;
      } else if (n.includes('amount') || n === 'amt' || n === 'sum') {
        mapping.amountCol = h;
      } else if (n.includes('ref') || n.includes('cheque') || n.includes('utr') || n.includes('txnid')) {
        mapping.referenceCol = h;
      } else if (n.includes('category') || n.includes('tag')) {
        mapping.categoryCol = h;
      }
    });

    if (!mapping.dateCol && headers.length > 0) mapping.dateCol = headers[0];
    if (!mapping.descriptionCol && headers.length > 1) mapping.descriptionCol = headers[1];
    if (!mapping.amountCol && !mapping.debitCol && !mapping.creditCol && headers.length > 2) mapping.amountCol = headers[2];

    return mapping;
  }

  /**
   * Parse date formats into YYYY-MM-DD
   */
  static parseDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const clean = dateStr.trim();

    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Match YYYY-MM-DD
    const ymdMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  /**
   * Parse numeric monetary value
   */
  static parseMoney(valStr: any): number {
    if (typeof valStr === 'number') return valStr;
    if (!valStr) return 0;
    const cleaned = String(valStr).replace(/,/g, '').trim();
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }

  static async uploadAndPreview(
    householdId: string,
    accountId: string,
    userId: string,
    filename: string,
    csvContent: string,
    customMapping?: Partial<ColumnMapping>
  ) {
    const rawRows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    if (rawRows.length === 0) {
      const error: any = new Error('CSV file contains no rows');
      error.status = 400;
      error.code = 'EMPTY_CSV';
      throw error;
    }

    const headers = Object.keys(rawRows[0]);
    const mapping = { ...this.detectColumnMapping(headers), ...(customMapping || {}) };

    // Fetch existing transaction hashes for this account for duplicate check
    const existingHashes = new Set<string>();
    const existingTx = await QueryHelper.query<{ import_hash: string }>(
      `SELECT import_hash FROM transactions WHERE account_id = $1 AND import_hash IS NOT NULL AND status <> 'VOID'`,
      [accountId]
    );
    existingTx.forEach((t) => existingHashes.add(t.import_hash));

    const batch = await QueryHelper.insert('import_batches', {
      household_id: householdId,
      account_id: accountId,
      user_id: userId,
      filename,
      status: 'PREVIEW',
      column_mapping: JSON.stringify(mapping),
    });

    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    const parsedRows = [];
    const seenHashesInBatch = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rawDate = raw[mapping.dateCol];
      const rawDesc = raw[mapping.descriptionCol] || 'Bank Transaction';
      const rawRef = mapping.referenceCol ? raw[mapping.referenceCol] : null;

      let amount = 0;
      let transactionType: 'INCOME' | 'EXPENSE' = 'EXPENSE';

      if (mapping.debitCol && mapping.creditCol) {
        const debit = this.parseMoney(raw[mapping.debitCol]);
        const credit = this.parseMoney(raw[mapping.creditCol]);
        if (credit > 0) {
          amount = credit;
          transactionType = 'INCOME';
        } else if (debit > 0) {
          amount = debit;
          transactionType = 'EXPENSE';
        }
      } else if (mapping.amountCol) {
        const parsedAmt = this.parseMoney(raw[mapping.amountCol]);
        if (parsedAmt < 0) {
          amount = Math.abs(parsedAmt);
          transactionType = 'EXPENSE';
        } else {
          amount = parsedAmt;
          transactionType = 'INCOME';
        }
      }

      const parsedDate = this.parseDate(rawDate);

      let rowStatus: 'VALID' | 'DUPLICATE' | 'INVALID' = 'VALID';
      let duplicateReason: string | null = null;

      if (!parsedDate || amount <= 0) {
        rowStatus = 'INVALID';
        invalidCount++;
      } else {
        const fingerprint = generateTransactionFingerprint({
          accountId,
          transactionDate: parsedDate,
          amount,
          description: rawDesc,
          reference: rawRef,
        });

        if (existingHashes.has(fingerprint) || seenHashesInBatch.has(fingerprint)) {
          rowStatus = 'DUPLICATE';
          duplicateReason = existingHashes.has(fingerprint)
            ? 'Matches existing ledger record in database'
            : 'Duplicate record within this upload file';
          duplicateCount++;
        } else {
          seenHashesInBatch.add(fingerprint);
          validCount++;
        }

        const parsedData = {
          date: parsedDate,
          description: rawDesc,
          amount,
          transaction_type: transactionType,
          reference: rawRef,
          fingerprint,
        };

        const row = await QueryHelper.insert('import_rows', {
          batch_id: batch.id,
          row_index: i + 1,
          raw_data: JSON.stringify(raw),
          parsed_data: JSON.stringify(parsedData),
          status: rowStatus,
          duplicate_reason: duplicateReason,
        });

        parsedRows.push({ ...row, parsed_data: parsedData });
      }
    }

    await QueryHelper.update('import_batches', batch.id, {
      total_rows: rawRows.length,
      valid_rows: validCount,
      duplicate_rows: duplicateCount,
      invalid_rows: invalidCount,
    });

    return {
      batchId: batch.id,
      filename,
      headers,
      mapping,
      metrics: {
        totalRows: rawRows.length,
        validRows: validCount,
        duplicateRows: duplicateCount,
        invalidRows: invalidCount,
      },
      rows: parsedRows,
    };
  }

  static async commitBatch(batchId: string, householdId: string, userId: string, includeDuplicates = false) {
    const batch = await QueryHelper.queryOne(
      `SELECT * FROM import_batches WHERE id = $1 AND household_id = $2`,
      [batchId, householdId]
    );

    if (!batch) {
      const error: any = new Error('Import batch not found');
      error.status = 404;
      error.code = 'BATCH_NOT_FOUND';
      throw error;
    }

    if (batch.status === 'COMMITTED') {
      const error: any = new Error('Batch has already been committed');
      error.status = 400;
      error.code = 'BATCH_ALREADY_COMMITTED';
      throw error;
    }

    const rows = await QueryHelper.query(
      `SELECT * FROM import_rows WHERE batch_id = $1 ${includeDuplicates ? `AND status IN ('VALID', 'DUPLICATE')` : `AND status = 'VALID'`}`,
      [batchId]
    );

    return QueryHelper.transaction(async (client) => {
      let importedCount = 0;

      for (const r of rows) {
        const p = typeof r.parsed_data === 'string' ? JSON.parse(r.parsed_data) : r.parsed_data;
        if (!p || !p.date || !p.amount) continue;

        const tx = await QueryHelper.insert('transactions', {
          household_id: householdId,
          account_id: batch.account_id,
          user_id: userId,
          transaction_type: p.transaction_type,
          amount: p.amount,
          currency: 'INR',
          transaction_date: p.date,
          description: p.description,
          status: 'CONFIRMED',
          source_type: 'CSV_IMPORT',
          source_reference: batch.filename,
          external_reference: p.reference || null,
          import_hash: p.fingerprint,
        }, client);

        await QueryHelper.update('import_rows', r.id, { matched_transaction_id: tx.id }, '', [], client);
        importedCount++;
      }

      await QueryHelper.update('import_batches', batch.id, { status: 'COMMITTED' }, '', [], client);
      await logAudit(householdId, userId, 'IMPORT_BATCH', batchId, 'IMPORT', batch, { ...batch, status: 'COMMITTED', imported_count: importedCount }, client);

      return { batchId, importedCount };
    });
  }
}
