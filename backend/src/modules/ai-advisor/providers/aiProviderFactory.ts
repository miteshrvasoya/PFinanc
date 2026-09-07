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
  GEMINI: 'gemini-1.5-pro',
  ANTHROPIC: 'claude-sonnet-4-5',
};

/** Available model options displayed in the settings UI */
export const AVAILABLE_MODELS: Record<AIProviderType, Array<{ id: string; name: string }>> = {
  OPENROUTER: [
    { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (Recommended)' },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude Haiku 3.5 (Fast & cheap)' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'LLaMA 3.3 70B' },
  ],
  OPENAI: [
    { id: 'gpt-4o', name: 'GPT-4o (Recommended)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & cheap)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  ],
  GEMINI: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Recommended)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast)' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  ],
  ANTHROPIC: [
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (Recommended)' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku 3.5 (Fast & cheap)' },
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5 (Most capable)' },
  ],
};

/**
 * Factory that instantiates the correct AI provider from config
 */
export class AIProviderFactory {
  static create(cfg: ProviderModelConfig): IAIProvider {
    const { provider, model, apiKeyOverride } = cfg;

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
