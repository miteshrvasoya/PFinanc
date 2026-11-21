import { LLMError } from './aiProvider.interface.js';

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);

/**
 * fetch() for the REST-based providers: retries transient failures (429 / 5xx / network) with
 * exponential backoff, honouring Retry-After, and maps final failures to LLMError.
 */
export async function fetchWithRetry(
  provider: string,
  url: string,
  init: RequestInit,
  { attempts = 3, timeoutMs = 120_000 }: { attempts?: number; timeoutMs?: number } = {}
): Promise<any> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await sleep(backoff(attempt));
        continue;
      }
      throw new LLMError('PROVIDER', `${provider} request failed: ${(err as Error).message}`, provider);
    }

    if (response.ok) {
      return response.json();
    }

    const body = await response.text().catch(() => '');
    if (RETRYABLE.has(response.status) && attempt < attempts) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 30) * 1000 : backoff(attempt));
      lastError = new Error(body);
      continue;
    }

    const detail = summarise(body);
    if (response.status === 401 || response.status === 403) {
      throw new LLMError('AUTH', `${provider} rejected the API key (${response.status}). ${detail}`, provider, response.status);
    }
    if (response.status === 429) {
      throw new LLMError('RATE_LIMIT', `${provider} rate limit / quota exceeded. ${detail}`, provider, 429);
    }
    if (response.status >= 400 && response.status < 500) {
      throw new LLMError('BAD_REQUEST', `${provider} rejected the request (${response.status}). ${detail}`, provider, response.status);
    }
    throw new LLMError('PROVIDER', `${provider} error ${response.status}. ${detail}`, provider, response.status);
  }

  throw new LLMError('PROVIDER', `${provider} request failed: ${String(lastError)}`, provider);
}

const backoff = (attempt: number) => Math.min(1000 * 2 ** (attempt - 1), 8000) + Math.floor(Math.random() * 250);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pull the human-readable message out of a JSON error body (never echo request contents). */
function summarise(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return String(parsed?.error?.message || parsed?.message || '').slice(0, 300);
  } catch {
    return body.slice(0, 300);
  }
}
