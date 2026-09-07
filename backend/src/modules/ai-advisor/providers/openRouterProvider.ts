import { IAIProvider, ChatMessage, ChatOptions, ChatResponse } from './aiProvider.interface.js';
import { config } from '../../../config/env.js';

/**
 * OpenRouter provider — uses the existing OPENROUTER_API_KEY from .env.
 * Supports 100+ models (Claude, GPT-4, Gemini, etc.) through a single endpoint.
 * Default model: anthropic/claude-sonnet-4-5
 */
export class OpenRouterProvider implements IAIProvider {
  readonly name = 'OPENROUTER';

  constructor(
    private readonly apiKey: string = config.openRouter.apiKey || '',
    private readonly model: string = config.openRouter.model || 'anthropic/claude-sonnet-4-5'
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is not configured. Set OPENROUTER_API_KEY in .env');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': config.openRouter.siteUrl || 'http://localhost:3000',
        'X-Title': config.openRouter.appName || 'PFinanc',
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
      throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
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
