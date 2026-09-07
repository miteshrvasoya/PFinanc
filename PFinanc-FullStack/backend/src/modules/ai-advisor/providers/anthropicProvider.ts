import { IAIProvider, ChatMessage, ChatOptions, ChatResponse } from './aiProvider.interface.js';

/**
 * Anthropic Claude provider — uses ANTHROPIC_API_KEY via REST.
 * Default model: claude-sonnet-4-5
 */
export class AnthropicProvider implements IAIProvider {
  readonly name = 'ANTHROPIC';

  constructor(
    private readonly apiKey: string = process.env.ANTHROPIC_API_KEY || '',
    private readonly model: string = 'claude-sonnet-4-5'
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is not configured. Set ANTHROPIC_API_KEY in .env');
    }

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const conversationMsgs = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const body: any = {
      model: this.model,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.3,
      messages: conversationMsgs,
    };

    if (systemMsg) {
      body.system = systemMsg;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json() as any;
    const text = data.content?.[0]?.text || '';
    const usage = data.usage;

    return {
      content: text,
      tokensInput: usage?.input_tokens,
      tokensOutput: usage?.output_tokens,
      tokensTotal: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
      model: data.model || this.model,
    };
  }
}
