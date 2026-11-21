import { IAIProvider, ChatMessage, ChatOptions, ChatResponse, LLMError } from './aiProvider.interface.js';
import { fetchWithRetry } from './http.js';

/** Reasoning-model families reject `temperature`. */
const isReasoningModel = (model: string) => /^(o\d|gpt-5)/i.test(model);

/**
 * OpenAI provider (Chat Completions) - uses OPENAI_API_KEY or the per-user override.
 * Uses strict JSON-schema output when a schema is supplied.
 */
export class OpenAIProvider implements IAIProvider {
  readonly name = 'OPENAI';

  constructor(
    private readonly apiKey: string = process.env.OPENAI_API_KEY || '',
    private readonly model: string = 'gpt-4o'
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new LLMError('NOT_CONFIGURED', 'OpenAI API key is not configured. Add one in AI Advisor settings or set OPENAI_API_KEY.', this.name);
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_completion_tokens: options.maxTokens ?? 8192,
    };
    if (!isReasoningModel(this.model)) body.temperature = options.temperature ?? 0.2;
    if (options.jsonSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: options.jsonSchema.name, strict: true, schema: options.jsonSchema.schema },
      };
    }

    const data = await fetchWithRetry(this.name, 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const choice = data.choices?.[0];
    if (choice?.message?.refusal || choice?.finish_reason === 'content_filter') {
      throw new LLMError('REFUSED', `OpenAI declined to produce this analysis${choice?.message?.refusal ? `: ${choice.message.refusal}` : ''}.`, this.name);
    }
    if (choice?.finish_reason === 'length') {
      throw new LLMError('TRUNCATED', 'The response was cut off before it finished (output token limit reached).', this.name);
    }

    return {
      content: choice?.message?.content || '',
      tokensInput: data.usage?.prompt_tokens,
      tokensOutput: data.usage?.completion_tokens,
      tokensTotal: data.usage?.total_tokens,
      model: data.model || this.model,
      schemaEnforced: !!options.jsonSchema,
    };
  }
}
