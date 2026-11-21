// AI Provider interface and shared types

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface JsonSchemaSpec {
  /** Short identifier (letters, digits, underscores) - required by OpenAI-style APIs. */
  name: string;
  /** JSON Schema (draft 2020-12 subset): every object must set additionalProperties: false and list all keys in `required`. */
  schema: Record<string, unknown>;
}

export interface ChatOptions {
  /** Ignored by providers/models that do not accept sampling parameters (e.g. current Claude models). */
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider to constrain output to this schema when it supports it (prompt instructions are still sent). */
  jsonSchema?: JsonSchemaSpec;
  /** Reasoning depth for providers that support it (Claude). */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

export interface ChatResponse {
  content: string;
  tokensInput?: number;
  tokensOutput?: number;
  tokensTotal?: number;
  /** Model that actually produced the answer (may differ from the requested one, e.g. after a fallback). */
  model?: string;
  /** True when the provider enforced `jsonSchema` server-side. */
  schemaEnforced?: boolean;
}

export type LLMErrorCode = 'NOT_CONFIGURED' | 'AUTH' | 'RATE_LIMIT' | 'TRUNCATED' | 'REFUSED' | 'BAD_REQUEST' | 'PROVIDER';

/** Normalised provider error so callers can react (and show users) something better than a raw HTTP body. */
export class LLMError extends Error {
  constructor(
    public readonly code: LLMErrorCode,
    message: string,
    public readonly provider: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export interface IAIProvider {
  readonly name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
}
