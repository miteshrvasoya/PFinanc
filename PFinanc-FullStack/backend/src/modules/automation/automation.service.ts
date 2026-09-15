import { QueryHelper } from '../../database/queryHelper.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import { DeterministicTransactionParser, ParsedTransaction } from './parser/DeterministicTransactionParser.js';
import { AITransactionParser } from './parser/AITransactionParser.js';
import { ClassificationService } from '../classification/classification.service.js';

export class AutomationService {

  static async syncCandidates(householdId: string, userId: string, deviceId: string, candidates: any[]) {
    const results = [];

    // Ensure device is registered
    await QueryHelper.query(
      `INSERT INTO device_registrations (user_id, device_id, platform, app_version) 
       VALUES ($1, $2, 'android', '1.0.0') 
       ON CONFLICT (user_id, device_id) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP`,
      [userId, deviceId]
    );

    // Fetch user settings
    const settings = await QueryHelper.queryOne<{ approval_mode: string, confidence_threshold: number, ai_enabled: boolean }>(
      `SELECT * FROM automatic_transaction_settings WHERE user_id = $1`, [userId]
    ) || { approval_mode: 'MANUAL_APPROVAL', confidence_threshold: 0.95, ai_enabled: false };

    for (const raw of candidates) {
      try {
        // 1. Audit Log
        const eventId = await QueryHelper.insert('sms_ingestion_events', {
          user_id: userId,
          device_id: deviceId,
          message_hash: raw.messageHash,
          sender: raw.sender,
          received_at: raw.receivedAt,
          processing_status: 'PROCESSING'
        }).then(res => res.id).catch(() => null); // Ignore unique constraint violation if already processed

        if (!eventId) {
            results.push({ messageHash: raw.messageHash, status: 'DUPLICATE_EVENT' });
            continue;
        }

        // 2. Parse
        let parsed: ParsedTransaction | null = await DeterministicTransactionParser.parse(raw.body, raw.sender, new Date(raw.receivedAt), householdId);
        
        if (parsed.isFinancial && parsed.confidence < settings.confidence_threshold && settings.ai_enabled) {
          const aiParsed = await AITransactionParser.parse(raw.body, raw.sender, new Date(raw.receivedAt));
          if (aiParsed) parsed = aiParsed;
        }

        if (!parsed.isFinancial) {
          await QueryHelper.update('sms_ingestion_events', eventId, { processing_status: 'IGNORED', classification: 'NON_FINANCIAL' });
          results.push({ messageHash: raw.messageHash, status: 'IGNORED' });
          continue;
        }

        // 3. Category classification & Account Matching
        let categoryId = null;
        let categoryConfidence = 0;
        if (parsed.merchant) {
           const classResult = await ClassificationService.classify(householdId, parsed.merchant, parsed.amount || 0);
           categoryId = classResult.categoryId;
           categoryConfidence = classResult.confidence === 'USER_RULE' ? 1.0 : 0.8;
        }

        // Basic account matching based on suffix
        let accountId = null;
        if (parsed.accountSuffix) {
            const acc = await QueryHelper.queryOne<{ id: string }>(
                `SELECT id FROM accounts WHERE household_id = $1 AND name ILIKE $2 LIMIT 1`,
                [householdId, `%${parsed.accountSuffix}%`]
            );
            if (acc) accountId = acc.id;
        }

        // 4. Candidate Creation
        let status = 'NEEDS_REVIEW';
        if (settings.approval_mode === 'AUTO_APPROVE_HIGH_CONFIDENCE' && parsed.confidence >= settings.confidence_threshold && accountId && parsed.amount) {
           status = 'APPROVED';
        }

        const candidate = await QueryHelper.insert('transaction_candidates', {
          household_id: householdId,
          user_id: userId,
          device_id: deviceId,
          source_type: 'SMS',
          source_reference: raw.messageHash,
          account_id: accountId,
          amount: parsed.amount,
          currency: parsed.currency,
          direction: parsed.direction,
          transaction_type: parsed.transactionType,
          merchant: parsed.merchant,
          transaction_date: parsed.transactionDate?.toISOString().split('T')[0],
          reference_number: parsed.referenceNumber,
          confidence: parsed.confidence,
          category_suggestion: categoryId,
          category_confidence: categoryConfidence,
          status: status
        });

        await QueryHelper.update('sms_ingestion_events', eventId, { 
            processing_status: 'CANDIDATE_CREATED', 
            classification: 'FINANCIAL',
            transaction_candidate_id: candidate.id 
        });

        // 5. Auto-approval execution
        if (status === 'APPROVED') {
            await TransactionsService.createTransaction(householdId, userId, {
                account_id: accountId,
                category_id: categoryId,
                transaction_type: parsed.transactionType,
                amount: parsed.amount,
                currency: parsed.currency,
                transaction_date: parsed.transactionDate?.toISOString().split('T')[0],
                merchant_name: parsed.merchant,
                source_type: 'SMS',
                source_reference: raw.messageHash,
                source_candidate_id: candidate.id
            });
        }

        results.push({ messageHash: raw.messageHash, status: 'CANDIDATE_CREATED', candidateId: candidate.id });

      } catch (err: any) {
        results.push({ messageHash: raw.messageHash, status: 'ERROR', error: err.message });
      }
    }

    return results;
  }

  static async getCandidates(householdId: string) {
      return QueryHelper.query(`SELECT * FROM transaction_candidates WHERE household_id = $1 AND status = 'NEEDS_REVIEW' ORDER BY created_at DESC`, [householdId]);
  }

  static async approveCandidate(id: string, householdId: string, userId: string, overrides: any) {
      const candidate = await QueryHelper.queryOne(`SELECT * FROM transaction_candidates WHERE id = $1 AND household_id = $2`, [id, householdId]);
      if (!candidate || candidate.status !== 'NEEDS_REVIEW') throw new Error('Candidate not found or not in review state');

      // Prevent duplicate approval
      const exists = await QueryHelper.queryOne(`SELECT id FROM transactions WHERE source_candidate_id = $1`, [id]);
      if (exists) {
          await QueryHelper.update('transaction_candidates', id, { status: 'DUPLICATE' });
          throw new Error('Candidate already processed');
      }

      const txData = {
          account_id: overrides.account_id || candidate.account_id,
          category_id: overrides.category_id || candidate.category_suggestion,
          transaction_type: overrides.transaction_type || candidate.transaction_type,
          amount: overrides.amount || candidate.amount,
          currency: overrides.currency || candidate.currency,
          transaction_date: overrides.transaction_date || candidate.transaction_date,
          merchant_name: overrides.merchant || candidate.merchant,
          description: overrides.description || candidate.description,
          source_type: 'SMS',
          source_reference: candidate.source_reference,
          source_candidate_id: id
      };

      const transaction = await TransactionsService.createTransaction(householdId, userId, txData);
      
      await QueryHelper.update('transaction_candidates', id, { status: 'APPROVED' });

      return transaction;
  }

  static async rejectCandidate(id: string, householdId: string) {
      return QueryHelper.update('transaction_candidates', id, { status: 'REJECTED' }, 'household_id = $1', [householdId]);
  }
}
