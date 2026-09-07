import { QueryHelper } from '../../../database/queryHelper.js';
import { generateHash } from '../../../utils/hash.js';
import { SecuritiesService } from '../securities/securities.service.js';
import { logAudit } from '../../../utils/audit.js';
import { GenericCsvParser, ColumnMapping } from './parsers/GenericCsvParser.js';

export class InvestmentImportsService {
  /**
   * Step 1: Upload and create staging import
   */
  static async createImport(
    householdId: string,
    userId: string,
    investmentAccountId: string,
    investmentType: 'STOCK' | 'MUTUAL_FUND',
    importMode: 'TRANSACTIONS' | 'HOLDINGS',
    filename: string,
    csvContent: string
  ) {
    const fileHash = generateHash(csvContent);

    // Check for duplicate file
    const existing = await QueryHelper.queryOne<{ id: string }>(
      `SELECT id FROM investment_imports WHERE file_hash = $1 AND investment_account_id = $2`,
      [fileHash, investmentAccountId]
    );

    if (existing) {
      const error: any = new Error('This file has already been imported for this account.');
      error.status = 400;
      error.code = 'DUPLICATE_FILE';
      throw error;
    }

    const rawRecords = GenericCsvParser.parseRaw(csvContent);
    if (!rawRecords || rawRecords.length === 0) {
      const error: any = new Error('The uploaded CSV file is empty or could not be parsed.');
      error.status = 400;
      error.code = 'EMPTY_CSV';
      throw error;
    }

    const headers = Object.keys(rawRecords[0] || {});
    const detectedMapping = GenericCsvParser.detectColumns(headers);

    return QueryHelper.transaction(async (client) => {
      const importRec = await QueryHelper.insert('investment_imports', {
        family_id: householdId,
        user_id: userId,
        investment_account_id: investmentAccountId,
        investment_type: investmentType,
        import_mode: importMode,
        file_name: filename,
        file_hash: fileHash,
        status: 'UPLOADED',
        total_source_rows: rawRecords.length,
      }, client);

      // We only insert raw data initially, parse happens in Step 2
      let rowIndex = 1;
      const batchRows = rawRecords.map(row => ({
        import_id: importRec.id,
        source_row_number: rowIndex++,
        raw_data: row,
        parse_status: 'PENDING',
        validation_status: 'PENDING'
      }));

      // Insert raw rows
      for (const row of batchRows) {
        await QueryHelper.insert('investment_import_rows', row, client);
      }

      return {
        importId: importRec.id,
        headers,
        detectedMapping,
        totalRows: rawRecords.length
      };
    });
  }

  /**
   * Step 2: Parse and Validate rows using provided mapping
   */
  static async parseAndValidate(importId: string, householdId: string, mapping: ColumnMapping) {
    const importRec = await QueryHelper.queryOne<any>(
      `SELECT * FROM investment_imports WHERE id = $1 AND family_id = $2`,
      [importId, householdId]
    );

    if (!importRec) throw new Error('Import not found');

    const rows = await QueryHelper.query<any>(
      `SELECT * FROM investment_import_rows WHERE import_id = $1 ORDER BY source_row_number ASC`,
      [importId]
    );

    // Fetch securities
    const allSecurities = await QueryHelper.query<any>(`SELECT id, symbol, isin, name, security_type FROM securities`);
    const isinMap = new Map<string, any>();
    const symbolMap = new Map<string, any>();
    allSecurities.forEach((s) => {
      if (s.isin) isinMap.set(s.isin.toUpperCase(), s);
      symbolMap.set(s.symbol.toUpperCase(), s);
    });

    let validRows = 0, invalidRows = 0, duplicateRows = 0, parsedRowsCount = 0;
    const seenFingerprints = new Set<string>();

    await QueryHelper.transaction(async (client) => {
      for (const row of rows) {
        let normData;
        try {
          normData = GenericCsvParser.normalizeRow(
            row.raw_data,
            mapping,
            importRec.import_mode,
            importRec.investment_type,
            importRec.investment_account_id
          );
        } catch (err: any) {
          await QueryHelper.update('investment_import_rows', row.id, {
            parse_status: 'FAILED',
            validation_status: 'INVALID',
            error_message: err.message
          }, '', [], client);
          invalidRows++;
          continue;
        }

        parsedRowsCount++;

        // Match Security
        let matchedSecurityId = null;
        if (normData.isin && isinMap.has(normData.isin.toUpperCase())) {
          matchedSecurityId = isinMap.get(normData.isin.toUpperCase()).id;
        } else if (normData.symbol && symbolMap.has(normData.symbol.toUpperCase())) {
          matchedSecurityId = symbolMap.get(normData.symbol.toUpperCase()).id;
        }

        // Validate basic constraints
        if (!normData.symbol || (!normData.quantity && !normData.amount && !normData.investedAmount)) {
          await QueryHelper.update('investment_import_rows', row.id, {
            parse_status: 'SUCCESS',
            normalized_data: normData,
            validation_status: 'INVALID',
            error_message: 'Missing symbol or positive quantity/amount',
            matched_security_id: matchedSecurityId
          }, '', [], client);
          invalidRows++;
          continue;
        }

        if (importRec.import_mode === 'TRANSACTIONS') {
          // Check Duplicates
          const hash = normData.import_hash;
          if (seenFingerprints.has(hash)) {
            await QueryHelper.update('investment_import_rows', row.id, {
              parse_status: 'SUCCESS',
              normalized_data: normData,
              validation_status: 'DUPLICATE',
              error_message: 'Duplicate within uploaded statement file',
              matched_security_id: matchedSecurityId
            }, '', [], client);
            duplicateRows++;
            continue;
          }
          seenFingerprints.add(hash);

          const existingInDb = await QueryHelper.queryOne<{ id: string }>(
            `SELECT id FROM investment_transactions WHERE import_hash = $1`,
            [hash]
          );

          if (existingInDb) {
            await QueryHelper.update('investment_import_rows', row.id, {
              parse_status: 'SUCCESS',
              normalized_data: normData,
              validation_status: 'DUPLICATE',
              error_message: 'Transaction already recorded in ledger',
              matched_security_id: matchedSecurityId
            }, '', [], client);
            duplicateRows++;
            continue;
          }
        } else {
          // HOLDINGS Duplicate check: exact same as_of_date and symbol in this import?
          const hash = `${normData.symbol}_${normData.asOfDate}`;
          if (seenFingerprints.has(hash)) {
            await QueryHelper.update('investment_import_rows', row.id, {
              parse_status: 'SUCCESS',
              normalized_data: normData,
              validation_status: 'DUPLICATE',
              error_message: 'Duplicate holding entry for same date in file',
              matched_security_id: matchedSecurityId
            }, '', [], client);
            duplicateRows++;
            continue;
          }
          seenFingerprints.add(hash);
          
          // Also check DB for holding on same date for same security
          if (matchedSecurityId) {
            const existingInDb = await QueryHelper.queryOne<{ id: string }>(
              `SELECT id FROM investment_holdings WHERE investment_account_id = $1 AND instrument_id = $2 AND as_of_date = $3`,
              [importRec.investment_account_id, matchedSecurityId, normData.asOfDate]
            );
            if (existingInDb) {
              await QueryHelper.update('investment_import_rows', row.id, {
                parse_status: 'SUCCESS',
                normalized_data: normData,
                validation_status: 'DUPLICATE',
                error_message: 'Holding snapshot already exists for this date',
                matched_security_id: matchedSecurityId
              }, '', [], client);
              duplicateRows++;
              continue;
            }
          }
        }

        // Valid
        await QueryHelper.update('investment_import_rows', row.id, {
          parse_status: 'SUCCESS',
          normalized_data: normData,
          validation_status: 'VALID',
          matched_security_id: matchedSecurityId
        }, '', [], client);
        validRows++;
      }

      await QueryHelper.update('investment_imports', importId, {
        status: 'READY_FOR_REVIEW',
        parsed_rows: parsedRowsCount,
        valid_rows: validRows,
        invalid_rows: invalidRows
      }, '', [], client);
    });

    return { importId, validRows, invalidRows, duplicateRows };
  }

  /**
   * Step 3: Get preview details
   */
  static async getPreview(importId: string, householdId: string) {
    const importRec = await QueryHelper.queryOne<any>(
      `SELECT * FROM investment_imports WHERE id = $1 AND family_id = $2`,
      [importId, householdId]
    );

    if (!importRec) throw new Error('Import not found');

    const rows = await QueryHelper.query<any>(
      `SELECT * FROM investment_import_rows WHERE import_id = $1 ORDER BY source_row_number ASC`,
      [importId]
    );

    return {
      import: importRec,
      rows: rows
    };
  }

  /**
   * Step 4: Commit
   */
  static async commit(importId: string, householdId: string, userId: string, includeDuplicates = false) {
    const importRec = await QueryHelper.queryOne<any>(
      `SELECT * FROM investment_imports WHERE id = $1 AND family_id = $2`,
      [importId, householdId]
    );

    if (!importRec) throw new Error('Import not found');
    if (importRec.status === 'COMPLETED') throw new Error('Import already completed');

    const rows = await QueryHelper.query<any>(
      `SELECT * FROM investment_import_rows WHERE import_id = $1 ORDER BY source_row_number ASC`,
      [importId]
    );

    let importedCount = 0;

    await QueryHelper.transaction(async (client) => {
      await QueryHelper.update('investment_imports', importId, { status: 'IMPORTING' }, '', [], client);

      for (const row of rows) {
        if (row.validation_status === 'INVALID' || row.parse_status !== 'SUCCESS') continue;
        if (row.validation_status === 'DUPLICATE' && !includeDuplicates) continue;

        const p = row.normalized_data;
        let securityId = row.matched_security_id;

        // Auto-provision security
        if (!securityId) {
          const sec = await SecuritiesService.findOrCreate({
            symbol: p.symbol,
            isin: p.isin || null,
            name: p.symbol,
            security_type: importRec.investment_type,
            initial_price: p.price || p.currentPrice || undefined,
          }, userId);
          securityId = sec.id;
          
          // update row
          await QueryHelper.update('investment_import_rows', row.id, { matched_security_id: securityId }, '', [], client);
        }

        if (importRec.import_mode === 'TRANSACTIONS') {
          await QueryHelper.insert('investment_transactions', {
            household_id: householdId,
            investment_account_id: importRec.investment_account_id,
            security_id: securityId,
            transaction_type: p.type,
            transaction_date: p.date,
            quantity: p.quantity,
            price_per_unit: p.price,
            gross_amount: p.quantity * p.price,
            fees: p.fees || 0,
            taxes: p.taxes || 0,
            net_amount: p.amount || (p.quantity * p.price + (p.fees || 0) + (p.taxes || 0)),
            currency: 'INR',
            source: 'CSV_IMPORT',
            status: 'CONFIRMED',
            import_hash: p.import_hash || null,
            external_reference: p.reference || null,
            created_by: userId,
            source_import_id: importId,
            source_import_row_id: row.id
          }, client);
        } else {
          // HOLDINGS
          await QueryHelper.insert('investment_holdings', {
            family_id: householdId,
            user_id: userId,
            investment_account_id: importRec.investment_account_id,
            instrument_id: securityId,
            quantity: p.quantity,
            average_cost: p.averageCost,
            invested_amount: p.investedAmount,
            current_price: p.currentPrice,
            current_value: p.currentValue,
            as_of_date: p.asOfDate,
            source_import_id: importId,
            source_import_row_id: row.id
          }, client);
        }

        importedCount++;
      }

      await QueryHelper.update('investment_imports', importId, { 
        status: 'COMPLETED',
        completed_at: new Date()
      }, '', [], client);
      
      await logAudit(householdId, userId, 'INVESTMENT_IMPORT', importId, 'IMPORT_COMMITTED', null, { importedCount, mode: importRec.import_mode }, client);
    });

    return { importedCount };
  }
}
