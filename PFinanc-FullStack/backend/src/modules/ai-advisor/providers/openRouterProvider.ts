import { IAIProvider, ChatMessage, ChatOptions, ChatResponse, LLMError } from './aiProvider.interface.js';
import { fetchWithRetry } from './http.js';
import { config } from '../../../config/env.js';

/**
 * OpenRouter provider - one endpoint for many models (uses OPENROUTER_API_KEY or the per-user override).
 * Structured-output support varies by routed model, so JSON is requested through the prompt and the
 * caller validates/repairs it.
 */
export class OpenRouterProvider implements IAIProvider {
  readonly name = 'OPENROUTER';

  constructor(
    private readonly apiKey: string = config.openRouter.apiKey || '',
    private readonly model: string = config.openRouter.model || 'anthropic/claude-sonnet-4-5'
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new LLMError('NOT_CONFIGURED', 'OpenRouter API key is not configured. Add one in AI Advisor settings or set OPENROUTER_API_KEY.', this.name);
    }

    const data = await fetchWithRetry(this.name, 'https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        // Attribution headers: app identity only, never user data.
        'HTTP-Referer': config.openRouter.siteUrl || 'http://localhost:3000',
        'X-Title': config.openRouter.appName || 'PFinanc',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 8192,
      }),
    });

    // OpenRouter can report upstream failures inside a 200 response.
    if (data.error) {
      throw new LLMError('PROVIDER', `OpenRouter upstream error: ${data.error.message || JSON.stringify(data.error).slice(0, 200)}`, this.name);
    }
    const choice = data.choices?.[0];
    if (choice?.finish_reason === 'length') {
      throw new LLMError('TRUNCATED', 'The response was cut off before it finished (output token limit reached).', this.name);
    }
    if (choice?.finish_reason === 'content_filter') {
      throw new LLMError('REFUSED', 'The routed model declined to produce this analysis.', this.name);
    }

    return {
      content: choice?.message?.content || '',
      tokensInput: data.usage?.prompt_tokens,
      tokensOutput: data.usage?.completion_tokens,
      tokensTotal: data.usage?.total_tokens,
      model: data.model || this.model,
      schemaEnforced: false,
    };
  }
}
