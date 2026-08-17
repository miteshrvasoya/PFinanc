import { QueryHelper } from '../../../database/queryHelper.js';
import { generateHash } from '../../../utils/hash.js';
import { SecuritiesService } from '../securities/securities.service.js';
import { logAudit } from '../../../utils/audit.js';

export class InvestmentImportsService {
  /**
   * Parse CSV content into structured rows
   */
  static parseCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length >= headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        rows.push(row);
      }
    }

    return { headers, rows };
  }

  /**
   * Preview broker CSV statement with security matching & duplicate detection
   */
  static async preview(
    investmentAccountId: string,
    householdId: string,
    userId: string,
    filename: string,
    csvContent: string
  ) {
    const { headers, rows } = this.parseCsv(csvContent);
    if (rows.length === 0) {
      const error: any = new Error('The uploaded CSV file is empty or could not be parsed');
      error.status = 400;
      error.code = 'EMPTY_CSV';
      throw error;
    }

    // Auto-detect columns
    const findCol = (...candidates: string[]) =>
      headers.find((h) => candidates.some((c) => h.includes(c))) || null;

    const dateCol = findCol('date', 'trade_date', 'trans_date', 'time');
    const symbolCol = findCol('symbol', 'stock', 'scrip', 'instrument', 'security', 'scheme');
    const isinCol = findCol('isin');
    const typeCol = findCol('type', 'action', 'buy_sell', 'trade_type', 'transaction');
    const qtyCol = findCol('qty', 'quantity', 'shares', 'units');
    const priceCol = findCol('price', 'rate', 'nav', 'cost_per_share');
    const amountCol = findCol('amount', 'gross', 'value', 'total', 'net');
    const feeCol = findCol('fee', 'charges', 'brokerage');
    const taxCol = findCol('tax', 'stt', 'gst');
    const refCol = findCol('ref', 'order_id', 'trade_id', 'id');

    let validRows = 0;
    let duplicateRows = 0;
    let invalidRows = 0;

    const seenFingerprints = new Set<string>();
    const parsedRows: any[] = [];

    // Pre-fetch all known securities
    const allSecurities = await QueryHelper.query<any>(`SELECT id, symbol, isin, name, security_type FROM securities`);
    const isinMap = new Map<string, any>();
    const symbolMap = new Map<string, any>();

    allSecurities.forEach((s) => {
      if (s.isin) isinMap.set(s.isin.toUpperCase(), s);
      symbolMap.set(s.symbol.toUpperCase(), s);
    });

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rawDate = dateCol ? raw[dateCol] : '';
      const rawSymbol = symbolCol ? raw[symbolCol] : '';
      const rawIsin = isinCol ? raw[isinCol] : '';
      const rawType = typeCol ? raw[typeCol] : 'BUY';
      const rawQty = qtyCol ? parseFloat(raw[qtyCol].replace(/[^0-9.-]/g, '')) : 0;
      const rawPrice = priceCol ? parseFloat(raw[priceCol].replace(/[^0-9.-]/g, '')) : 0;
      const rawAmount = amountCol ? parseFloat(raw[amountCol].replace(/[^0-9.-]/g, '')) : rawQty * rawPrice;
      const rawFees = feeCol ? parseFloat(raw[feeCol].replace(/[^0-9.-]/g, '') || '0') : 0;
      const rawTaxes = taxCol ? parseFloat(raw[taxCol].replace(/[^0-9.-]/g, '') || '0') : 0;
      const ref = refCol ? raw[refCol] : '';

      // Normalize date (YYYY-MM-DD)
      let parsedDate = rawDate;
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          parsedDate = d.toISOString().split('T')[0];
        }
      } catch (e) {}

      // Normalize type
      let txType = 'BUY';
      const upperType = rawType.toUpperCase();
      if (upperType.includes('SELL') || upperType.includes('REDEMP')) txType = 'SELL';
      else if (upperType.includes('SIP')) txType = 'SIP';
      else if (upperType.includes('DIV')) txType = 'DIVIDEND';
      else if (upperType.includes('BONUS')) txType = 'BONUS';
      else if (upperType.includes('SPLIT')) txType = 'SPLIT';

      // Security Matching
      let matchedSecurity = null;
      if (rawIsin && isinMap.has(rawIsin.toUpperCase())) {
        matchedSecurity = isinMap.get(rawIsin.toUpperCase());
      } else if (rawSymbol && symbolMap.has(rawSymbol.toUpperCase())) {
        matchedSecurity = symbolMap.get(rawSymbol.toUpperCase());
      }

      if (!rawDate || !rawSymbol || isNaN(rawAmount) || rawAmount <= 0) {
        invalidRows++;
        parsedRows.push({
          row_index: i + 1,
          raw_data: raw,
          parsed_data: { date: parsedDate, symbol: rawSymbol, isin: rawIsin, type: txType, quantity: rawQty, price: rawPrice, amount: rawAmount, reference: ref },
          matched_security_id: matchedSecurity?.id || null,
          status: 'INVALID',
          duplicate_reason: 'Missing date, symbol, or positive amount',
        });
        continue;
      }

      // Deterministic Fingerprint
      const fingerprintPayload = `${investmentAccountId}|${rawSymbol.toUpperCase()}|${parsedDate}|${txType}|${rawQty}|${rawPrice}|${rawAmount}|${ref}`;
      const hash = generateHash(fingerprintPayload);

      // Check intra-batch duplicate
      if (seenFingerprints.has(hash)) {
        duplicateRows++;
        parsedRows.push({
          row_index: i + 1,
          raw_data: raw,
          parsed_data: { date: parsedDate, symbol: rawSymbol, isin: rawIsin, type: txType, quantity: rawQty, price: rawPrice, amount: rawAmount, fees: rawFees, taxes: rawTaxes, reference: ref, import_hash: hash },
          matched_security_id: matchedSecurity?.id || null,
          status: 'DUPLICATE',
          duplicate_reason: 'Duplicate within uploaded statement file',
        });
        continue;
      }
      seenFingerprints.add(hash);

      // Check database existing duplicate
      const existingInDb = await QueryHelper.queryOne<{ id: string }>(
        `SELECT id FROM investment_transactions WHERE import_hash = $1`,
        [hash]
      );

      if (existingInDb) {
        duplicateRows++;
        parsedRows.push({
          row_index: i + 1,
          raw_data: raw,
          parsed_data: { date: parsedDate, symbol: rawSymbol, isin: rawIsin, type: txType, quantity: rawQty, price: rawPrice, amount: rawAmount, fees: rawFees, taxes: rawTaxes, reference: ref, import_hash: hash },
          matched_security_id: matchedSecurity?.id || null,
          matched_investment_transaction_id: existingInDb.id,
          status: 'DUPLICATE',
          duplicate_reason: 'Transaction already recorded in ledger with identical parameters',
        });
      } else {
        validRows++;
        parsedRows.push({
          row_index: i + 1,
          raw_data: raw,
          parsed_data: { date: parsedDate, symbol: rawSymbol, isin: rawIsin, type: txType, quantity: rawQty, price: rawPrice, amount: rawAmount, fees: rawFees, taxes: rawTaxes, reference: ref, import_hash: hash },
          matched_security_id: matchedSecurity?.id || null,
          status: 'VALID',
        });
      }
    }

    // Save batch record and preview rows
    return QueryHelper.transaction(async (client) => {
      const batch = await QueryHelper.insert('investment_import_batches', {
        household_id: householdId,
        investment_account_id: investmentAccountId,
        user_id: userId,
        filename,
        total_rows: rows.length,
        valid_rows: validRows,
        duplicate_rows: duplicateRows,
        invalid_rows: invalidRows,
        status: 'PREVIEW',
      }, client);

      for (const pr of parsedRows) {
        await QueryHelper.insert('investment_import_rows', {
          batch_id: batch.id,
          row_index: pr.row_index,
          raw_data: pr.raw_data,
          parsed_data: pr.parsed_data,
          matched_security_id: pr.matched_security_id,
          status: pr.status,
          duplicate_reason: pr.duplicate_reason || null,
          matched_investment_transaction_id: pr.matched_investment_transaction_id || null,
        }, client);
      }

      return {
        batchId: batch.id,
        metrics: {
          totalRows: rows.length,
          validRows,
          duplicateRows,
          invalidRows,
        },
        rows: parsedRows,
      };
    });
  }

  /**
   * Commit parsed import batch to investment ledger
   */
  static async commit(batchId: string, householdId: string, userId: string, includeDuplicates = false) {
    const batch = await QueryHelper.queryOne<{ id: string; investment_account_id: string; status: string }>(
      `SELECT * FROM investment_import_batches WHERE id = $1 AND household_id = $2`,
      [batchId, householdId]
    );

    if (!batch) {
      const error: any = new Error('Import batch not found');
      error.status = 404;
      error.code = 'BATCH_NOT_FOUND';
      throw error;
    }

    if (batch.status === 'COMMITTED') {
      const error: any = new Error('Import batch has already been committed');
      error.status = 400;
      error.code = 'BATCH_ALREADY_COMMITTED';
      throw error;
    }

    const rows = await QueryHelper.query<any>(
      `SELECT * FROM investment_import_rows WHERE batch_id = $1 ORDER BY row_index ASC`,
      [batchId]
    );

    let importedCount = 0;

    await QueryHelper.transaction(async (client) => {
      for (const row of rows) {
        if (row.status === 'INVALID') continue;
        if (row.status === 'DUPLICATE' && !includeDuplicates) continue;

        const p = row.parsed_data;
        let securityId = row.matched_security_id;

        // Auto-provision security if not existing
        if (!securityId) {
          const sec = await SecuritiesService.findOrCreate({
            symbol: p.symbol,
            isin: p.isin || null,
            name: p.symbol,
            security_type: p.type === 'SIP' ? 'MUTUAL_FUND' : 'STOCK',
            initial_price: p.price || undefined,
          }, userId);
          securityId = sec.id;
        }

        const net = p.amount || (p.quantity * p.price + (p.fees || 0) + (p.taxes || 0));

        await QueryHelper.insert('investment_transactions', {
          household_id: householdId,
          investment_account_id: batch.investment_account_id,
          security_id: securityId,
          transaction_type: p.type,
          transaction_date: p.date,
          quantity: p.quantity,
          price_per_unit: p.price,
          gross_amount: p.quantity * p.price,
          fees: p.fees || 0,
          taxes: p.taxes || 0,
          net_amount: net,
          currency: 'INR',
          source: 'CSV_IMPORT',
          status: 'CONFIRMED',
          import_hash: p.import_hash || null,
          external_reference: p.reference || null,
          created_by: userId,
        }, client);

        importedCount++;
      }

      await QueryHelper.update('investment_import_batches', batchId, { status: 'COMMITTED' }, '', [], client);
      await logAudit(householdId, userId, 'INVESTMENT_IMPORT_BATCH', batchId, 'IMPORT', null, { importedCount }, client);
    });

    return { importedCount };
  }
}
