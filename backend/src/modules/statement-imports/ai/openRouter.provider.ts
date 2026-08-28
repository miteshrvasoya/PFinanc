import { config } from '../../../config/env.js';

export interface AiInputRow {
  parsedRowId: string;
  sourceRowNumber: number;
  date: string | null;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
  reference: string | null;
}

export interface AiResultRow {
  parsedRowId: string;
  sourceRowNumber: number;
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'OTHER';
  direction: 'DEBIT' | 'CREDIT';
  merchant: string;
  suggestedCategory: string;
  categoryConfidence: number;
  transferCandidate: boolean;
  transferConfidence: number;
  aiNotes: string;
}

export interface AiProviderResponse {
  success: boolean;
  provider: string;
  model: string;
  promptVersion: string;
  results: AiResultRow[];
  errorCode?: string;
  errorMessage?: string;
}

export class OpenRouterProvider {
  static readonly PROMPT_VERSION = 'bank-statement-v1';

  /**
   * Process a chunk of parsed transaction rows through OpenRouter AI
   */
  static async analyzeChunk(
    chunkId: string,
    rows: AiInputRow[],
    options: {
      model?: string;
      customPromptVersion?: string;
      forceMock?: boolean;
    } = {}
  ): Promise<AiProviderResponse> {
    const model = (config.openRouter.model || options.model || 'inclusionai/ling-3.0-flash-fin:free') as string;
    const promptVersion = options.customPromptVersion || this.PROMPT_VERSION;
    const apiKey = config.openRouter.apiKey;

    // If forceMock or no API key provided, use deterministic mock classifier
    if (options.forceMock || !apiKey) {
      return this.analyzeDeterministicFallback(chunkId, rows, model, promptVersion);
    }

    try {
      const systemPrompt = `You are a financial transaction classification expert for Indian and international bank statements.
Analyze each transaction row and return a JSON object with this EXACT schema:
{
  "transactions": [
    {
      "sourceRowNumber": number,
      "transactionType": "INCOME" | "EXPENSE" | "TRANSFER" | "OTHER",
      "direction": "DEBIT" | "CREDIT",
      "merchant": string,
      "suggestedCategory": string,
      "categoryConfidence": number (between 0.00 and 1.00),
      "transferCandidate": boolean,
      "transferConfidence": number (between 0.00 and 1.00),
      "aiNotes": string
    }
  ]
}
Rules:
1. Every input row MUST have a corresponding output item with matching sourceRowNumber.
2. Common Indian merchants (Swiggy, Zomato, Uber, Amazon, Flipkart, Tata Power, D-Mart, Netflix, Zepto, Blinkit) must be extracted accurately.
3. Salary credits, interest credits, dividends must have transactionType "INCOME".
4. UPI/NEFT/IMPS transfers to personal names or other bank accounts must have transferCandidate: true.
5. Return RAW JSON ONLY. Do not wrap in markdown or backticks.`;

      const userContent = JSON.stringify({
        chunkId,
        totalRows: rows.length,
        rows: rows.map((r) => ({
          sourceRowNumber: r.sourceRowNumber,
          date: r.date,
          description: r.description,
          debit: r.debit,
          credit: r.credit,
          balance: r.balance,
          reference: r.reference,
        })),
      });

      const siteUrl = config.openRouter.siteUrl || 'http://localhost:3000';
      const appName = config.openRouter.appName || 'PFinanc';

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': siteUrl,
          'X-Title': appName,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`OpenRouter API returned HTTP ${response.status}: ${errorText}. Falling back to deterministic classifier.`);
        // Fallback gracefully so ingestion never breaks
        return this.analyzeDeterministicFallback(chunkId, rows, model, promptVersion);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.warn('OpenRouter returned empty content. Falling back to deterministic classifier.');
        return this.analyzeDeterministicFallback(chunkId, rows, model, promptVersion);
      }

      // Robust JSON extraction
      const parsedPayload = this.extractJson(content);
      if (!parsedPayload) {
        console.warn(`Failed to parse OpenRouter JSON. Content was: ${content.slice(0, 200)}... Falling back to deterministic classifier.`);
        return this.analyzeDeterministicFallback(chunkId, rows, model, promptVersion);
      }

      const txList = parsedPayload.transactions || (Array.isArray(parsedPayload) ? parsedPayload : []);
      if (!Array.isArray(txList) || txList.length === 0) {
        return this.analyzeDeterministicFallback(chunkId, rows, model, promptVersion);
      }

      // Map back to parsedRowId
      const rowMap = new Map<number, AiInputRow>();
      rows.forEach((r) => rowMap.set(r.sourceRowNumber, r));

      const validatedResults: AiResultRow[] = [];
      for (const item of txList) {
        const srcNum = item.sourceRowNumber;
        const matchingInput = rowMap.get(srcNum);
        if (!matchingInput) continue;

        validatedResults.push({
          parsedRowId: matchingInput.parsedRowId,
          sourceRowNumber: srcNum,
          transactionType: ['INCOME', 'EXPENSE', 'TRANSFER', 'OTHER'].includes(item.transactionType)
            ? item.transactionType
            : matchingInput.credit && matchingInput.credit > 0
              ? 'INCOME'
              : 'EXPENSE',
          direction: matchingInput.credit && matchingInput.credit > 0 ? 'CREDIT' : 'DEBIT',
          merchant: item.merchant || this.extractMerchantFallback(matchingInput.description),
          suggestedCategory: item.suggestedCategory || 'General',
          categoryConfidence: typeof item.categoryConfidence === 'number' ? item.categoryConfidence : 0.85,
          transferCandidate: Boolean(item.transferCandidate),
          transferConfidence: typeof item.transferConfidence === 'number' ? item.transferConfidence : 0.0,
          aiNotes: item.aiNotes || `Classified via ${model}`,
        });
      }

      // If results count matches rows, return success
      if (validatedResults.length > 0) {
        return {
          success: true,
          provider: 'OpenRouter',
          model,
          promptVersion,
          results: validatedResults,
        };
      }

      return this.analyzeDeterministicFallback(chunkId, rows, model, promptVersion);
    } catch (err: any) {
      console.warn(`OpenRouter network exception: ${err.message}. Falling back to deterministic classifier.`);
      return this.analyzeDeterministicFallback(chunkId, rows, model, promptVersion);
    }
  }

  /**
   * Robust JSON extraction from AI outputs (handles markdown fences, surrounding text, etc.)
   */
  private static extractJson(content: string): any {
    if (!content) return null;
    const clean = content.trim();

    // 1. Try direct parse
    try {
      return JSON.parse(clean);
    } catch {}

    // 2. Try stripping markdown code fences ```json ... ```
    const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {}
    }

    // 3. Try finding substring from first { to last }
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
      } catch {}
    }

    // 4. Try finding substring from first [ to last ]
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(clean.slice(firstBracket, lastBracket + 1));
      } catch {}
    }

    return null;
  }

  /**
   * Deterministic local classification fallback for testing, offline use, or when no API key is provided
   */
  static analyzeDeterministicFallback(
    chunkId: string,
    rows: AiInputRow[],
    model: string,
    promptVersion: string
  ): AiProviderResponse {
    const results: AiResultRow[] = rows.map((r) => {
      const desc = (r.description || '').toUpperCase();
      const isCredit = r.credit !== null && r.credit > 0;

      let merchant = this.extractMerchantFallback(r.description);
      let category = 'Other';
      let confidence = 0.90;
      let txType: AiResultRow['transactionType'] = isCredit ? 'INCOME' : 'EXPENSE';
      let isTransfer = false;
      let transferConf = 0.0;

      if (desc.includes('SALARY') || desc.includes('PAYROLL')) {
        category = 'Salary & Income';
        merchant = 'Employer';
        txType = 'INCOME';
      } else if (desc.includes('SWIGGY') || desc.includes('ZOMATO') || desc.includes('RESTAURANT')) {
        category = 'Food & Dining';
        merchant = desc.includes('SWIGGY') ? 'Swiggy' : desc.includes('ZOMATO') ? 'Zomato' : 'Dining';
        txType = 'EXPENSE';
      } else if (desc.includes('UBER') || desc.includes('OLA') || desc.includes('METRO') || desc.includes('PETROL')) {
        category = 'Transportation';
        merchant = desc.includes('UBER') ? 'Uber' : desc.includes('OLA') ? 'Ola' : 'Fuel';
        txType = 'EXPENSE';
      } else if (desc.includes('AMAZON') || desc.includes('FLIPKART') || desc.includes('MYNTRA')) {
        category = 'Shopping';
        merchant = desc.includes('AMAZON') ? 'Amazon' : 'Flipkart';
        txType = 'EXPENSE';
      } else if (desc.includes('ELECTRICITY') || desc.includes('POWER') || desc.includes('WATER') || desc.includes('AIRTEL') || desc.includes('JIO')) {
        category = 'Utilities';
        merchant = 'Utility Provider';
        txType = 'EXPENSE';
      } else if (desc.includes('TRANSFER') || desc.includes('UPI/') || desc.includes('IMPS') || desc.includes('NEFT')) {
        isTransfer = true;
        transferConf = 0.85;
        category = 'Transfer';
        txType = 'TRANSFER';
      } else if (desc.includes('INTEREST') || desc.includes('DIVIDEND')) {
        category = 'Investment Income';
        txType = 'INCOME';
      }

      return {
        parsedRowId: r.parsedRowId,
        sourceRowNumber: r.sourceRowNumber,
        transactionType: txType,
        direction: isCredit ? 'CREDIT' : 'DEBIT',
        merchant,
        suggestedCategory: category,
        categoryConfidence: confidence,
        transferCandidate: isTransfer,
        transferConfidence: transferConf,
        aiNotes: 'Classified via Deterministic Inference',
      };
    });

    return {
      success: true,
      provider: 'DeterministicInference',
      model,
      promptVersion,
      results,
    };
  }

  private static extractMerchantFallback(description: string): string {
    if (!description) return 'Unknown';
    const parts = description.split(/[\/\-_:]/);
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed.length > 2 && !/^\d+$/.test(trimmed) && !['UPI', 'IMPS', 'NEFT', 'RTGS', 'POS', 'ATM'].includes(trimmed.toUpperCase())) {
        return trimmed;
      }
    }
    return description.slice(0, 30);
  }
}
