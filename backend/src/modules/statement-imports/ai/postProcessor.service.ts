import { QueryHelper } from '../../../database/queryHelper.js';
import { generateTransactionFingerprint } from '../../../utils/hash.js';

export interface EnrichedAiResult {
  aiResultId: string;
  parsedRowId: string;
  sourceRowNumber: number;
  date: string | null;
  description: string;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'OTHER';
  merchant: string;
  suggestedCategory: string;
  suggestedCategoryId: string | null;
  categoryConfidence: number;
  transferCandidate: boolean;
  transferConfidence: number;
  isDuplicate: boolean;
  duplicateReason: string | null;
  aiNotes: string;
}

export class StatementPostProcessor {
  /**
   * Enrich AI analysis results with database category IDs, duplicate checking, and transfer candidate resolution
   */
  static async enrichResults(
    householdId: string,
    accountId: string,
    analysisRunId: string
  ): Promise<EnrichedAiResult[]> {
    // 1. Fetch categories for matching
    const categories = await QueryHelper.query<{ id: string; name: string; type: string }>(
      `SELECT id, name, type FROM categories WHERE household_id IS NULL OR household_id = $1`,
      [householdId]
    );

    const catMap = new Map<string, string>();
    categories.forEach((c) => catMap.set(c.name.toLowerCase(), c.id));

    // 2. Fetch existing transaction hashes for duplicate detection
    const existingHashes = new Set<string>();
    const existingTx = await QueryHelper.query<{ import_hash: string }>(
      `SELECT import_hash FROM transactions WHERE account_id = $1 AND import_hash IS NOT NULL AND status <> 'VOID'`,
      [accountId]
    );
    existingTx.forEach((t) => existingHashes.add(t.import_hash));

    // 3. Fetch joined parsed rows & AI results for this analysis run
    const rows = await QueryHelper.query<any>(
      `SELECT 
        sar.id as ai_result_id,
        sar.parsed_row_id,
        sar.source_row_number,
        sar.transaction_type,
        sar.direction,
        sar.merchant,
        sar.suggested_category,
        sar.category_confidence,
        sar.transfer_candidate,
        sar.transfer_confidence,
        sar.ai_notes,
        spr.transaction_date,
        spr.description,
        spr.amount,
        spr.reference,
        spr.balance
       FROM statement_ai_results sar
       JOIN statement_parsed_rows spr ON spr.id = sar.parsed_row_id
       WHERE sar.analysis_run_id = $1
       ORDER BY sar.source_row_number ASC`,
      [analysisRunId]
    );

    const seenInRun = new Set<string>();
    const enriched: EnrichedAiResult[] = [];

    for (const r of rows) {
      const amountVal = Number(r.amount) || 0;
      let dateVal = null;
      if (r.transaction_date) {
        if (r.transaction_date instanceof Date) {
          const y = r.transaction_date.getFullYear();
          const m = String(r.transaction_date.getMonth() + 1).padStart(2, '0');
          const d = String(r.transaction_date.getDate()).padStart(2, '0');
          dateVal = `${y}-${m}-${d}`;
        } else {
          // If it's already a string like "2024-08-09T00:00:00Z"
          dateVal = String(r.transaction_date).split('T')[0].split(' ')[0];
        }
      }

      // Fingerprint check
      let isDuplicate = false;
      let duplicateReason: string | null = null;

      if (dateVal && amountVal > 0) {
        const fingerprint = generateTransactionFingerprint({
          accountId,
          transactionDate: dateVal,
          amount: amountVal,
          description: r.description,
          reference: r.reference,
        });

        if (existingHashes.has(fingerprint)) {
          isDuplicate = true;
          duplicateReason = 'Matches an existing transaction in the account ledger';
        } else if (seenInRun.has(fingerprint)) {
          isDuplicate = true;
          duplicateReason = 'Duplicate record within this statement file';
        } else {
          seenInRun.add(fingerprint);
        }
      }

      // Category matching
      let categoryId: string | null = null;
      if (r.suggested_category) {
        const catKey = r.suggested_category.toLowerCase();
        categoryId = catMap.get(catKey) || null;
        if (!categoryId) {
          // Fuzzy check
          for (const [name, id] of catMap.entries()) {
            if (catKey.includes(name) || name.includes(catKey)) {
              categoryId = id;
              break;
            }
          }
        }
      }

      enriched.push({
        aiResultId: r.ai_result_id,
        parsedRowId: r.parsed_row_id,
        sourceRowNumber: r.source_row_number,
        date: dateVal,
        description: r.description,
        amount: amountVal,
        direction: r.direction,
        transactionType: r.transaction_type,
        merchant: r.merchant,
        suggestedCategory: r.suggested_category,
        suggestedCategoryId: categoryId,
        categoryConfidence: Number(r.category_confidence) || 0.85,
        transferCandidate: Boolean(r.transfer_candidate),
        transferConfidence: Number(r.transfer_confidence) || 0.0,
        isDuplicate,
        duplicateReason,
        aiNotes: r.ai_notes || '',
      });
    }

    return enriched;
  }
}
