import { IAIProvider, ChatMessage, ChatOptions, ChatResponse } from './aiProvider.interface.js';

/**
 * Google Gemini provider — uses GEMINI_API_KEY via REST.
 * Default model: gemini-1.5-pro
 */
export class GeminiProvider implements IAIProvider {
  readonly name = 'GEMINI';

  constructor(
    private readonly apiKey: string = process.env.GEMINI_API_KEY || '',
    private readonly model: string = 'gemini-1.5-pro'
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in .env');
    }

    // Convert OpenAI-style messages to Gemini format
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const conversationMsgs = messages.filter(m => m.role !== 'system');

    const contents = conversationMsgs.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    };

    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg }] };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = data.usageMetadata;

    return {
      content: text,
      tokensInput: usage?.promptTokenCount,
      tokensOutput: usage?.candidatesTokenCount,
      tokensTotal: usage?.totalTokenCount,
      model: this.model,
    };
  }
}
