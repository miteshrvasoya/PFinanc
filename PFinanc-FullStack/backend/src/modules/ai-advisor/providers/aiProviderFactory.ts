import { IAIProvider } from './aiProvider.interface.js';
import { OpenRouterProvider } from './openRouterProvider.js';
import { OpenAIProvider } from './openAiProvider.js';
import { GeminiProvider } from './geminiProvider.js';
import { AnthropicProvider } from './anthropicProvider.js';

export type AIProviderType = 'OPENROUTER' | 'OPENAI' | 'GEMINI' | 'ANTHROPIC';

export interface ProviderModelConfig {
  provider: AIProviderType;
  model: string;
  apiKeyOverride?: string;
}

/** Default recommended models for each provider */
export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  OPENROUTER: 'anthropic/claude-sonnet-4-5',
  OPENAI: 'gpt-4o',
  GEMINI: 'gemini-2.5-pro',
  ANTHROPIC: 'claude-opus-5-5',
};

/** Available model options displayed in the settings UI */
export const AVAILABLE_MODELS: Record<AIProviderType, Array<{ id: string; name: string }>> = {
  OPENROUTER: [
    { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'LLaMA 3.3 70B' },
  ],
  OPENAI: [
    { id: 'gpt-4o', name: 'GPT-4o (Recommended)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & cheap)' },
  ],
  GEMINI: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Recommended)' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
  ],
  ANTHROPIC: [
    { id: 'claude-opus-5-5', name: 'Claude Opus 5.5 (Recommended)' },
    { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5 (Faster, lower cost)' },
    { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5 (Fastest, cheapest)' },
    { id: 'claude-fable-5-2', name: 'Claude Fable 5.2 (Most capable, premium)' },
  ],
};

/** Saved configs may reference models that have since been retired; map them to the current default. */
function resolveModel(provider: AIProviderType, model?: string): string {
  if (!model) return DEFAULT_MODELS[provider];
  if (provider === 'GEMINI' && /^gemini-1\./.test(model)) return DEFAULT_MODELS.GEMINI;
  if (provider === 'OPENROUTER' && /^google\/gemini-(1\.|2\.0-flash-exp)/.test(model)) return DEFAULT_MODELS.OPENROUTER;
  return model;
}

/**
 * Factory that instantiates the correct AI provider from config
 */
export class AIProviderFactory {
  static create(cfg: ProviderModelConfig): IAIProvider {
    const { provider, apiKeyOverride } = cfg;
    const model = resolveModel(provider, cfg.model);

    switch (provider) {
      case 'OPENROUTER':
        return new OpenRouterProvider(apiKeyOverride, model);

      case 'OPENAI':
        return new OpenAIProvider(apiKeyOverride || process.env.OPENAI_API_KEY, model);

      case 'GEMINI':
        return new GeminiProvider(apiKeyOverride || process.env.GEMINI_API_KEY, model);

      case 'ANTHROPIC':
        return new AnthropicProvider(apiKeyOverride || process.env.ANTHROPIC_API_KEY, model);

      default:
        console.warn(`[AIProviderFactory] Unknown provider "${provider}", falling back to OpenRouter`);
        return new OpenRouterProvider(apiKeyOverride, DEFAULT_MODELS.OPENROUTER);
    }
  }
}
