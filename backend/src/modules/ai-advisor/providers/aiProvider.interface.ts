// AI Provider interface and shared types

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  tokensInput?: number;
  tokensOutput?: number;
  tokensTotal?: number;
  model?: string;
}

export interface IAIProvider {
  readonly name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
}
