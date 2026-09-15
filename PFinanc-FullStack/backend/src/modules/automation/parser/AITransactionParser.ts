import { ParsedTransaction } from './DeterministicTransactionParser.js';

export class AITransactionParser {
  static async parse(body: string, sender: string, receivedAt: Date): Promise<ParsedTransaction | null> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn('OpenRouter API key not configured for AI fallback.');
      return null;
    }

    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
    
    const prompt = `
Extract financial transaction data from the following SMS message.
Sender: ${sender}
Received At: ${receivedAt.toISOString()}
Message: ${body}

Return a valid JSON object strictly matching this TypeScript interface:
{
  isFinancial: boolean;
  amount: number | null;
  currency: string; // e.g. "INR"
  direction: "DEBIT" | "CREDIT" | null;
  transactionType: "EXPENSE" | "INCOME" | "TRANSFER" | "WITHDRAWAL" | "FEE" | "REFUND" | "UNKNOWN";
  merchant: string | null; // e.g. "Swiggy"
  accountSuffix: string | null; // e.g. "4521"
  referenceNumber: string | null;
  confidence: number; // 0.0 to 1.0
}
Output ONLY JSON, no markdown formatting.
`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
         console.error('AI fallback failed', await response.text());
         return null;
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Clean up markdown if AI ignored instruction
      let jsonStr = content;
      if (jsonStr.startsWith('\`\`\`json')) {
         jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
      }

      const parsed = JSON.parse(jsonStr) as ParsedTransaction;
      parsed.transactionDate = receivedAt;
      return parsed;

    } catch (e) {
      console.error('Error parsing AI fallback response', e);
      return null;
    }
  }
}
