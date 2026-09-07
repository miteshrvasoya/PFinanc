import { config } from '../../../config/env.js';
import { QueryHelper } from '../../../database/queryHelper.js';
import { logAudit } from '../../../utils/audit.js';
import { OpenRouterProvider, AiInputRow } from './openRouter.provider.js';

export interface CreateRunOptions {
  model?: string;
  chunkSize?: number;
  promptVersion?: string;
  forceMock?: boolean;
  asyncExecution?: boolean;
}

export class AiAnalysisService {
  static readonly DEFAULT_CHUNK_SIZE = 25;

  /**
   * Initialize and start a new AI Analysis Run for a parsed statement
   */
  static async createAnalysisRun(
    importId: string,
    householdId: string,
    userId: string,
    options: CreateRunOptions = {}
  ) {
    const statementImport = await QueryHelper.queryOne<any>(
      `SELECT * FROM statement_imports WHERE id = $1 AND household_id = $2`,
      [importId, householdId]
    );

    if (!statementImport) {
      const error: any = new Error('Statement import not found');
      error.status = 404;
      error.code = 'IMPORT_NOT_FOUND';
      throw error;
    }

    // AI can ONLY be started after status is PARSED or PARSED_WITH_WARNING
    if (!['PARSED', 'PARSED_WITH_WARNING', 'AI_PARTIAL_FAILURE', 'READY_FOR_REVIEW'].includes(statementImport.status)) {
      const error: any = new Error(`Cannot start AI analysis on statement with status '${statementImport.status}'. Status must be 'PARSED'.`);
      error.status = 400;
      error.code = 'INVALID_IMPORT_STATE';
      throw error;
    }

    // 1. Mark previous active runs as superseded
    await QueryHelper.query(
      `UPDATE ai_analysis_runs SET is_active = FALSE, status = 'SUPERSEDED', updated_at = NOW() WHERE import_id = $1 AND is_active = TRUE`,
      [importId]
    );

    // 2. Determine run number
    const countRes = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ai_analysis_runs WHERE import_id = $1`,
      [importId]
    );
    const runNumber = parseInt(countRes?.count || '0', 10) + 1;

    const model = options.model || config.openRouter.model || 'inclusionai/ling-3.0-flash-fin:free';
    const promptVersion = options.promptVersion || OpenRouterProvider.PROMPT_VERSION;

    // 3. Create ai_analysis_runs record
    const run = await QueryHelper.insert<any>('ai_analysis_runs', {
      import_id: importId,
      user_id: userId,
      run_number: runNumber,
      provider: 'OpenRouter',
      model,
      prompt_version: promptVersion,
      parser_version: statementImport.parser_version,
      classification_version: '1.0.0',
      status: 'PROCESSING',
      is_active: true,
      started_at: new Date().toISOString(),
    });

    // 4. Update import master status
    await QueryHelper.update('statement_imports', importId, {
      status: 'AI_PROCESSING',
    });

    // 5. Read parsed rows from database (never from uploaded file!)
    const parsedRows = await QueryHelper.query<any>(
      `SELECT id, source_row_number, transaction_date, description, debit_amount, credit_amount, balance, reference
       FROM statement_parsed_rows
       WHERE import_id = $1 AND row_type = 'TRANSACTION' AND parse_status = 'VALID'
       ORDER BY source_row_number ASC`,
      [importId]
    );

    if (parsedRows.length === 0) {
      await QueryHelper.update('ai_analysis_runs', run.id, {
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      });
      await QueryHelper.update('statement_imports', importId, {
        status: 'READY_FOR_REVIEW',
      });
      return { run, totalChunks: 0, totalRows: 0 };
    }

    // 6. Generate chunks
    const chunkSize = options.chunkSize || this.DEFAULT_CHUNK_SIZE;
    const totalChunks = Math.ceil(parsedRows.length / chunkSize);
    const chunkIds: string[] = [];

    for (let c = 0; c < totalChunks; c++) {
      const chunkRows = parsedRows.slice(c * chunkSize, (c + 1) * chunkSize);
      const startRow = chunkRows[0].source_row_number;
      const endRow = chunkRows[chunkRows.length - 1].source_row_number;

      const chunkRecord = await QueryHelper.insert<any>('statement_ai_chunks', {
        import_id: importId,
        analysis_run_id: run.id,
        chunk_index: c + 1,
        total_chunks: totalChunks,
        source_row_start: startRow,
        source_row_end: endRow,
        row_count: chunkRows.length,
        status: 'PENDING',
        provider: 'OpenRouter',
        model,
        prompt_version: promptVersion,
      });

      chunkIds.push(chunkRecord.id);
    }

    await QueryHelper.update('ai_analysis_runs', run.id, {
      total_chunks: totalChunks,
    });

    await logAudit(householdId, userId, 'STATEMENT_IMPORT', importId, 'UPDATE', null, {
      action: 'ai_analysis_started',
      runNumber,
      totalChunks,
      totalRows: parsedRows.length,
    });

    // 7. Process chunks
    const executeChunks = async () => {
      for (const cid of chunkIds) {
        try {
          await this.processChunk(cid, { forceMock: options.forceMock, model, customPromptVersion: promptVersion });
        } catch (err) {
          console.error(`Chunk execution error for chunk ${cid}:`, err);
        }
      }
    };

    if (options.asyncExecution !== false) {
      executeChunks().catch(console.error);
    } else {
      await executeChunks();
    }

    return {
      runId: run.id,
      runNumber,
      totalChunks,
      totalRows: parsedRows.length,
      status: 'PROCESSING',
    };
  }

  /**
   * Process an individual AI chunk
   */
  static async processChunk(
    chunkId: string,
    options: {
      model?: string;
      customPromptVersion?: string;
      forceMock?: boolean;
    } = {}
  ) {
    const chunk = await QueryHelper.queryOne<any>(
      `SELECT * FROM statement_ai_chunks WHERE id = $1`,
      [chunkId]
    );

    if (!chunk) throw new Error(`Chunk ${chunkId} not found`);

    await QueryHelper.update('statement_ai_chunks', chunkId, {
      status: 'PROCESSING',
      started_at: new Date().toISOString(),
      attempt_count: (chunk.attempt_count || 0) + 1,
    });

    // Read rows for this chunk from statement_parsed_rows
    const rows = await QueryHelper.query<any>(
      `SELECT id, source_row_number, transaction_date, description, debit_amount, credit_amount, balance, reference
       FROM statement_parsed_rows
       WHERE import_id = $1 
         AND source_row_number >= $2 
         AND source_row_number <= $3
         AND row_type = 'TRANSACTION'
         AND parse_status = 'VALID'
       ORDER BY source_row_number ASC`,
      [chunk.import_id, chunk.source_row_start, chunk.source_row_end]
    );

    const aiInputs: AiInputRow[] = rows.map((r) => ({
      parsedRowId: r.id,
      sourceRowNumber: r.source_row_number,
      date: r.transaction_date ? String(r.transaction_date).split('T')[0] : null,
      description: r.description,
      debit: r.debit_amount ? Number(r.debit_amount) : null,
      credit: r.credit_amount ? Number(r.credit_amount) : null,
      balance: r.balance ? Number(r.balance) : null,
      reference: r.reference,
    }));

    // Call OpenRouter AI (WITHOUT holding open DB transaction)
    const response = await OpenRouterProvider.analyzeChunk(chunkId, aiInputs, {
      model: options.model || chunk.model,
      customPromptVersion: options.customPromptVersion || chunk.prompt_version,
      forceMock: options.forceMock,
    });

    if (response.success && response.results.length > 0) {
      // Store results atomically in DB transaction
      await QueryHelper.transaction(async (client) => {
        for (const res of response.results) {
          // Use insert / upsert for idempotency
          await QueryHelper.query(
            `INSERT INTO statement_ai_results (
              import_id,
              analysis_run_id,
              chunk_id,
              parsed_row_id,
              source_row_number,
              transaction_type,
              direction,
              merchant,
              suggested_category,
              category_confidence,
              transfer_candidate,
              transfer_confidence,
              ai_notes,
              provider,
              model,
              prompt_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (analysis_run_id, parsed_row_id) DO UPDATE SET
              chunk_id = EXCLUDED.chunk_id,
              transaction_type = EXCLUDED.transaction_type,
              direction = EXCLUDED.direction,
              merchant = EXCLUDED.merchant,
              suggested_category = EXCLUDED.suggested_category,
              category_confidence = EXCLUDED.category_confidence,
              transfer_candidate = EXCLUDED.transfer_candidate,
              transfer_confidence = EXCLUDED.transfer_confidence,
              ai_notes = EXCLUDED.ai_notes,
              updated_at = NOW()`,
            [
              chunk.import_id,
              chunk.analysis_run_id,
              chunk.id,
              res.parsedRowId,
              res.sourceRowNumber,
              res.transactionType,
              res.direction,
              res.merchant,
              res.suggestedCategory,
              res.categoryConfidence,
              res.transferCandidate,
              res.transferConfidence,
              res.aiNotes,
              response.provider,
              response.model,
              response.promptVersion,
            ],
            client
          );
        }

        await QueryHelper.update(
          'statement_ai_chunks',
          chunk.id,
          {
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
            error_code: null,
            error_message: null,
          },
          '',
          [],
          client
        );
      });
    } else {
      await QueryHelper.update('statement_ai_chunks', chunk.id, {
        status: 'FAILED',
        error_code: response.errorCode || 'UNKNOWN_ERROR',
        error_message: response.errorMessage || 'AI analysis failed',
      });
    }

    // Refresh overall run status
    await this.updateRunProgress(chunk.analysis_run_id, chunk.import_id);
    return response;
  }

  /**
   * Retry an individual failed chunk
   */
  static async retryChunk(
    chunkId: string,
    householdId: string,
    userId: string,
    options: { forceMock?: boolean } = {}
  ) {
    const chunk = await QueryHelper.queryOne<any>(
      `SELECT sac.*, si.household_id 
       FROM statement_ai_chunks sac
       JOIN statement_imports si ON si.id = sac.import_id
       WHERE sac.id = $1 AND si.household_id = $2`,
      [chunkId, householdId]
    );

    if (!chunk) throw new Error('Chunk not found or access denied');

    // Clean any partial results for this chunk
    await QueryHelper.query(
      `DELETE FROM statement_ai_results WHERE chunk_id = $1`,
      [chunkId]
    );

    await logAudit(householdId, userId, 'STATEMENT_IMPORT', chunk.import_id, 'UPDATE', null, {
      action: 'ai_chunk_retry',
      chunkId,
      chunkIndex: chunk.chunk_index,
    });

    return this.processChunk(chunkId, options);
  }

  /**
   * Compute aggregated run completion status
   */
  private static async updateRunProgress(runId: string, importId: string) {
    const chunks = await QueryHelper.query<any>(
      `SELECT status FROM statement_ai_chunks WHERE analysis_run_id = $1`,
      [runId]
    );

    const completed = chunks.filter((c) => c.status === 'COMPLETED').length;
    const failed = chunks.filter((c) => c.status === 'FAILED').length;
    const total = chunks.length;

    let runStatus = 'PROCESSING';
    let importStatus = 'AI_PROCESSING';

    if (completed === total && total > 0) {
      runStatus = 'COMPLETED';
      importStatus = 'READY_FOR_REVIEW';
    } else if (failed > 0 && completed + failed === total) {
      runStatus = 'PARTIAL_FAILURE';
      importStatus = 'AI_PARTIAL_FAILURE';
    }

    await QueryHelper.update('ai_analysis_runs', runId, {
      completed_chunks: completed,
      failed_chunks: failed,
      status: runStatus,
      completed_at: runStatus === 'COMPLETED' ? new Date().toISOString() : null,
    });

    await QueryHelper.update('statement_imports', importId, {
      status: importStatus,
    });
  }
}
