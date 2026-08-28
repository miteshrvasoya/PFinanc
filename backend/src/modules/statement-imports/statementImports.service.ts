import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';
import { StatementCsvParser, ColumnMapping } from './parser/csvParser.js';
import { StatementPostProcessor } from './ai/postProcessor.service.js';

export interface UploadParseOptions {
  customMapping?: Partial<ColumnMapping>;
  allowDuplicateFile?: boolean;
}

export class StatementImportsService {
  /**
   * Phase A: Deterministic CSV Ingestion and Atomic Persistence
   */
  static async uploadAndParse(
    householdId: string,
    accountId: string,
    userId: string,
    filename: string,
    csvContent: string,
    options: UploadParseOptions = {}
  ) {
    // 1. Verify account exists and belongs to household
    const account = await QueryHelper.queryOne<any>(
      `SELECT id, name FROM accounts WHERE id = $1 AND household_id = $2`,
      [accountId, householdId]
    );

    if (!account) {
      const error: any = new Error('Account not found in household');
      error.status = 404;
      error.code = 'ACCOUNT_NOT_FOUND';
      throw error;
    }

    // 2. Parse deterministically in memory
    const parsed = StatementCsvParser.parse(csvContent, options.customMapping);

    // 3. Duplicate file detection
    if (!options.allowDuplicateFile) {
      const existingImport = await QueryHelper.queryOne<any>(
        `SELECT id, filename, status, created_at FROM statement_imports 
         WHERE account_id = $1 AND file_hash = $2 AND status NOT IN ('FAILED', 'CANCELLED')`,
        [accountId, parsed.fileHash]
      );

      if (existingImport) {
        const error: any = new Error(
          `This statement file has already been uploaded as import '${existingImport.filename}' on ${new Date(existingImport.created_at).toLocaleDateString()}.`
        );
        error.status = 409;
        error.code = 'DUPLICATE_FILE';
        error.existingImportId = existingImport.id;
        throw error;
      }
    }

    // 4. Atomic Database Transaction for Phase A
    const createdImport = await QueryHelper.transaction(async (client) => {
      // Create master import record
      const imp = await QueryHelper.insert<any>(
        'statement_imports',
        {
          household_id: householdId,
          account_id: accountId,
          user_id: userId,
          filename,
          file_hash: parsed.fileHash,
          file_size_bytes: parsed.fileSizeBytes,
          parser_version: parsed.parserVersion,
          status: 'PARSING',
          expected_row_count: parsed.expectedRowCount,
          parsed_row_count: 0,
          non_transaction_count: 0,
          column_mapping: JSON.stringify(parsed.columnMapping),
          reconciliation_data: JSON.stringify(parsed.reconciliationData),
        },
        client
      );

      // Batch insert all parsed source rows into statement_parsed_rows
      const BATCH_SIZE = 500;
      for (let i = 0; i < parsed.rows.length; i += BATCH_SIZE) {
        const chunk = parsed.rows.slice(i, i + BATCH_SIZE);

        const valuesClauses: string[] = [];
        const queryParams: any[] = [];
        let pIdx = 1;

        for (const r of chunk) {
          valuesClauses.push(
            `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`
          );
          queryParams.push(
            imp.id,
            r.source_row_number,
            r.row_type,
            JSON.stringify(r.raw_data),
            r.transaction_date,
            r.value_date,
            r.description,
            r.normalized_description,
            r.debit_amount,
            r.credit_amount,
            r.amount,
            r.balance,
            r.reference,
            r.transaction_id,
            r.parse_status
          );
        }

        await QueryHelper.query(
          `INSERT INTO statement_parsed_rows (
            import_id,
            source_row_number,
            row_type,
            raw_data,
            transaction_date,
            value_date,
            description,
            normalized_description,
            debit_amount,
            credit_amount,
            amount,
            balance,
            reference,
            transaction_id,
            parse_status
          ) VALUES ${valuesClauses.join(', ')}`,
          queryParams,
          client
        );
      }

      // 5. Parsed Row Count & Integrity Verification Check
      const countCheck = await QueryHelper.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM statement_parsed_rows WHERE import_id = $1`,
        [imp.id],
        client
      );

      const actualStored = parseInt(countCheck?.count || '0', 10);
      if (actualStored !== parsed.parsedRowCount) {
        throw new Error(
          `Row integrity check failed: expected ${parsed.parsedRowCount} rows, but database persisted ${actualStored}. Rolling back transaction.`
        );
      }

      const finalStatus = parsed.warningMessage ? 'PARSED_WITH_WARNING' : 'PARSED';

      // Update import status to PARSED
      const updated = await QueryHelper.update(
        'statement_imports',
        imp.id,
        {
          status: finalStatus,
          parsed_row_count: actualStored,
          non_transaction_count: parsed.nonTransactionRowCount,
          warning_message: parsed.warningMessage,
        },
        '',
        [],
        client
      );

      return updated;
    });

    await logAudit(householdId, userId, 'STATEMENT_IMPORT', createdImport.id, 'CREATE', null, {
      action: 'statement_parsed',
      filename,
      fileHash: parsed.fileHash,
      totalRows: parsed.expectedRowCount,
      status: createdImport.status,
    });

    return {
      importId: createdImport.id,
      filename,
      fileHash: parsed.fileHash,
      status: createdImport.status,
      expectedRowCount: parsed.expectedRowCount,
      parsedRowCount: parsed.parsedRowCount,
      transactionRowCount: parsed.transactionRowCount,
      nonTransactionRowCount: parsed.nonTransactionRowCount,
      reconciliationData: parsed.reconciliationData,
      warningMessage: parsed.warningMessage,
    };
  }

  /**
   * Get Statement Import details with active run and chunk progress
   */
  static async getImport(importId: string, householdId: string) {
    const imp = await QueryHelper.queryOne<any>(
      `SELECT si.*, a.name as account_name, a.institution_name, u.name as user_name
       FROM statement_imports si
       JOIN accounts a ON a.id = si.account_id
       JOIN users u ON u.id = si.user_id
       WHERE si.id = $1 AND si.household_id = $2`,
      [importId, householdId]
    );

    if (!imp) {
      const error: any = new Error('Statement import not found');
      error.status = 404;
      error.code = 'IMPORT_NOT_FOUND';
      throw error;
    }

    const activeRun = await QueryHelper.queryOne<any>(
      `SELECT * FROM ai_analysis_runs WHERE import_id = $1 AND is_active = TRUE`,
      [importId]
    );

    let chunks: any[] = [];
    if (activeRun) {
      chunks = await QueryHelper.query<any>(
        `SELECT id, chunk_index, total_chunks, source_row_start, source_row_end, row_count, status, attempt_count, error_code, error_message, started_at, completed_at
         FROM statement_ai_chunks
         WHERE analysis_run_id = $1
         ORDER BY chunk_index ASC`,
        [activeRun.id]
      );
    }

    return {
      ...imp,
      activeRun,
      chunks,
    };
  }

  /**
   * Get paginated parsed source rows
   */
  static async getParsedRows(
    importId: string,
    householdId: string,
    page = 1,
    limit = 100,
    rowType?: string
  ) {
    const imp = await QueryHelper.queryOne(
      `SELECT id FROM statement_imports WHERE id = $1 AND household_id = $2`,
      [importId, householdId]
    );
    if (!imp) throw new Error('Statement import not found');

    const offset = (page - 1) * limit;
    const typeFilter = rowType ? `AND row_type = $2` : '';
    const params = rowType ? [importId, rowType, limit, offset] : [importId, limit, offset];
    const limitIdx = rowType ? '$3' : '$2';
    const offsetIdx = rowType ? '$4' : '$3';

    const rows = await QueryHelper.query(
      `SELECT * FROM statement_parsed_rows
       WHERE import_id = $1 ${typeFilter}
       ORDER BY source_row_number ASC
       LIMIT ${limitIdx} OFFSET ${offsetIdx}`,
      params
    );

    const total = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM statement_parsed_rows WHERE import_id = $1 ${typeFilter}`,
      rowType ? [importId, rowType] : [importId]
    );

    return {
      rows,
      page,
      limit,
      total: parseInt(total?.count || '0', 10),
    };
  }

  /**
   * Get consolidated review dataset (Parsed Source + AI Predictions + Duplicate Check)
   */
  static async getReviewData(importId: string, householdId: string) {
    const imp = await this.getImport(importId, householdId);

    if (!imp.activeRun) {
      return {
        import: imp,
        results: [],
        categories: [],
      };
    }

    const categories = await QueryHelper.query(
      `SELECT id, name, type FROM categories WHERE household_id IS NULL OR household_id = $1 ORDER BY name ASC`,
      [householdId]
    );

    const enrichedResults = await StatementPostProcessor.enrichResults(
      householdId,
      imp.account_id,
      imp.activeRun.id
    );

    return {
      import: imp,
      results: enrichedResults,
      categories,
    };
  }

  /**
   * Phase C: Final User Confirmation & Atomic Financial Ledger Commitment
   */
  static async confirmStatementImport(
    importId: string,
    householdId: string,
    userId: string,
    options: {
      includeDuplicates?: boolean;
      rowOverrides?: Record<string, { category_id?: string; transaction_type?: string; description?: string; merchant?: string }>;
    } = {}
  ) {
    const imp = await this.getImport(importId, householdId);

    if (imp.status === 'COMPLETED') {
      const error: any = new Error('This statement import has already been committed to the financial ledger.');
      error.status = 400;
      error.code = 'ALREADY_COMMITTED';
      throw error;
    }

    if (!imp.activeRun) {
      const error: any = new Error('No completed AI analysis run found to confirm.');
      error.status = 400;
      error.code = 'NO_ACTIVE_AI_RUN';
      throw error;
    }

    const enrichedResults = await StatementPostProcessor.enrichResults(
      householdId,
      imp.account_id,
      imp.activeRun.id
    );

    const { includeDuplicates = false, rowOverrides = {} } = options;

    return QueryHelper.transaction(async (client) => {
      let committedCount = 0;

      for (const item of enrichedResults) {
        if (item.isDuplicate && !includeDuplicates) {
          continue;
        }

        const override = rowOverrides[item.parsedRowId] || {};
        const finalCategoryId = override.category_id !== undefined ? override.category_id : item.suggestedCategoryId;
        const finalType = override.transaction_type || item.transactionType || 'EXPENSE';
        const finalDesc = override.description || item.description;

        await QueryHelper.insert(
          'transactions',
          {
            household_id: householdId,
            account_id: imp.account_id,
            user_id: userId,
            category_id: finalCategoryId || null,
            transaction_type: finalType,
            amount: item.amount,
            currency: 'INR',
            transaction_date: item.date || new Date().toISOString().split('T')[0],
            description: finalDesc,
            status: 'CONFIRMED',
            source_type: 'CSV_IMPORT',
            source_reference: imp.filename,
            external_reference: null,
          },
          client
        );

        committedCount++;
      }

      await QueryHelper.update(
        'statement_imports',
        importId,
        {
          status: 'COMPLETED',
        },
        '',
        [],
        client
      );

      await logAudit(householdId, userId, 'STATEMENT_IMPORT', importId, 'CONFIRM', imp, {
        status: 'COMPLETED',
        committedCount,
      }, client);

      return {
        importId,
        committedCount,
        status: 'COMPLETED',
      };
    });
  }
}
