import { IAIProvider, ChatMessage, ChatOptions, ChatResponse, LLMError } from './aiProvider.interface.js';
import { fetchWithRetry } from './http.js';

const BLOCKED_FINISH_REASONS = new Set(['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII']);

/**
 * Google Gemini provider (generateContent REST) - uses GEMINI_API_KEY or the per-user override.
 * The key is sent in the x-goog-api-key header (never in the URL, where it would leak into logs).
 */
export class GeminiProvider implements IAIProvider {
  readonly name = 'GEMINI';

  constructor(
    private readonly apiKey: string = process.env.GEMINI_API_KEY || '',
    private readonly model: string = 'gemini-2.5-pro'
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new LLMError('NOT_CONFIGURED', 'Gemini API key is not configured. Add one in AI Advisor settings or set GEMINI_API_KEY.', this.name);
    }

    const systemMsg = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

    const body: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 8192,
        // JSON mode; the schema itself is described in the prompt (Gemini's schema dialect differs).
        ...(options.jsonSchema ? { responseMimeType: 'application/json' } : {}),
      },
    };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg }] };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const data = await fetchWithRetry(this.name, url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify(body),
    });

    if (data.promptFeedback?.blockReason) {
      throw new LLMError('REFUSED', `Gemini blocked the request (${data.promptFeedback.blockReason}).`, this.name);
    }
    const candidate = data.candidates?.[0];
    if (BLOCKED_FINISH_REASONS.has(candidate?.finishReason)) {
      throw new LLMError('REFUSED', `Gemini stopped for policy reasons (${candidate.finishReason}).`, this.name);
    }
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new LLMError('TRUNCATED', 'The response was cut off before it finished (output token limit reached).', this.name);
    }

    // A response may be split across several parts; skip "thought" parts from thinking models.
    const text = (candidate?.content?.parts || [])
      .filter((p: any) => typeof p.text === 'string' && !p.thought)
      .map((p: any) => p.text)
      .join('');
    const usage = data.usageMetadata;

    return {
      content: text,
      tokensInput: usage?.promptTokenCount,
      tokensOutput: usage?.candidatesTokenCount,
      tokensTotal: usage?.totalTokenCount,
      model: data.modelVersion || this.model,
      schemaEnforced: false,
    };
  }
}
