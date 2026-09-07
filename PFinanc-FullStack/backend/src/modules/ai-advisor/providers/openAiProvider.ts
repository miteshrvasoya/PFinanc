import { IAIProvider, ChatMessage, ChatOptions, ChatResponse } from './aiProvider.interface.js';

/**
 * OpenAI provider — uses OPENAI_API_KEY.
 * Default model: gpt-4o
 */
export class OpenAIProvider implements IAIProvider {
  readonly name = 'OPENAI';

  constructor(
    private readonly apiKey: string = process.env.OPENAI_API_KEY || '',
    private readonly model: string = 'gpt-4o'
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY in .env');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 4096,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      tokensInput: data.usage?.prompt_tokens,
      tokensOutput: data.usage?.completion_tokens,
      tokensTotal: data.usage?.total_tokens,
      model: data.model || this.model,
    };
  }
}
