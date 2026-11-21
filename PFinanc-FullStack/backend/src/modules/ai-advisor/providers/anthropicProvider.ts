import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider, ChatMessage, ChatOptions, ChatResponse, LLMError } from './aiProvider.interface.js';

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`). */
const SERVER_FALLBACK_MODELS = new Set([
  'claude-fable-5-2',
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5',
]);

/**
 * Anthropic Claude provider via the official SDK.
 * - Streams and collects with finalMessage() so long reports never hit HTTP timeouts.
 * - Uses structured outputs (output_config.format) when a JSON schema is supplied.
 * - Thinking is adaptive by default on current models; depth is controlled with `effort`.
 * - Sampling params (temperature) are not sent: current Claude models reject them.
 * - The SDK retries 408/409/429/5xx and connection errors (maxRetries below).
 */
export class AnthropicProvider implements IAIProvider {
  readonly name = 'ANTHROPIC';
  private readonly client: Anthropic;

  constructor(
    apiKey: string | undefined = process.env.ANTHROPIC_API_KEY,
    private readonly model: string = 'claude-opus-5-5'
  ) {
    // Without an explicit key the SDK resolves credentials from the environment/profile.
    this.client = new Anthropic({ ...(apiKey ? { apiKey } : {}), maxRetries: 3 });
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const conversation: Anthropic.Beta.BetaMessageParam[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const outputConfig: Anthropic.Beta.BetaOutputConfig = { effort: options.effort ?? 'high' };
    if (options.jsonSchema) {
      outputConfig.format = { type: 'json_schema', schema: options.jsonSchema.schema };
    }

    const useFallbacks = SERVER_FALLBACK_MODELS.has(this.model);

    let final: Anthropic.Beta.BetaMessage;
    try {
      const stream = this.client.beta.messages.stream({
        model: this.model,
        max_tokens: options.maxTokens ?? 32000,
        ...(system ? { system } : {}),
        messages: conversation,
        output_config: outputConfig,
        // On a policy decline the API re-runs the request on a fallback model inside the same call.
        ...(useFallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      });
      final = await stream.finalMessage();
    } catch (err) {
      throw this.mapError(err);
    }

    if (final.stop_reason === 'refusal') {
      const category = final.stop_details?.category ? ` (${final.stop_details.category})` : '';
      throw new LLMError('REFUSED', `Claude declined to produce this analysis${category}.`, this.name);
    }
    if (final.stop_reason === 'max_tokens' || final.stop_reason === 'model_context_window_exceeded') {
      throw new LLMError('TRUNCATED', 'The response was cut off before it finished (output token limit reached).', this.name);
    }

    const content = final.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const usage = final.usage;
    const input =
      (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);

    return {
      content,
      tokensInput: input,
      tokensOutput: usage.output_tokens,
      tokensTotal: input + (usage.output_tokens || 0),
      model: final.model || this.model,
      schemaEnforced: !!options.jsonSchema,
    };
  }

  private mapError(err: unknown): LLMError {
    if (err instanceof LLMError) return err;
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      return new LLMError('AUTH', 'Anthropic rejected the API key. Check the key in AI Advisor settings or ANTHROPIC_API_KEY.', this.name, err.status);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return new LLMError('RATE_LIMIT', 'Anthropic rate limit reached. Try again shortly.', this.name, 429);
    }
    if (err instanceof Anthropic.NotFoundError) {
      return new LLMError('BAD_REQUEST', `Model "${this.model}" was not found. Pick a model from the settings list.`, this.name, 404);
    }
    if (err instanceof Anthropic.BadRequestError) {
      return new LLMError('BAD_REQUEST', `Anthropic rejected the request: ${err.message}`, this.name, 400);
    }
    if (err instanceof Anthropic.APIError) {
      return new LLMError('PROVIDER', `Anthropic API error ${err.status ?? ''}: ${err.message}`, this.name, err.status);
    }
    if (err instanceof Error && /credentials|api key|apiKey/i.test(err.message)) {
      return new LLMError('NOT_CONFIGURED', 'Anthropic API key is not configured. Add one in AI Advisor settings or set ANTHROPIC_API_KEY.', this.name);
    }
    return new LLMError('PROVIDER', `Anthropic request failed: ${(err as Error)?.message || String(err)}`, this.name);
  }
}
