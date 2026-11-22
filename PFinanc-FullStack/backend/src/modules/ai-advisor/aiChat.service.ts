import { QueryHelper } from '../../database/queryHelper.js';
import { AIAdvisorService } from './aiAdvisor.service.js';
import { AIProviderFactory } from './providers/aiProviderFactory.js';
import { ChatMessage } from './providers/aiProvider.interface.js';

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;

const CHAT_SYSTEM_PROMPT = `You are PFinanc's personal finance assistant for an Indian household. You are talking to a non-expert, so use short, plain-language answers (no jargon, no tables unless asked).

Rules:
- Base every number on the FINANCIAL DATA below. Amounts are in INR. If the data does not contain what is needed, say so and say what the user could add (for example import a statement or add an account) instead of guessing.
- Never invent transactions, balances, prices or returns. Do not promise returns or guarantee outcomes.
- You may explain, compare and suggest next steps (saving, spending, debt, investing, tax basics). For specific investment or tax decisions, add one short reminder that a qualified advisor should confirm.
- The data is a snapshot taken when this chat started and contains only totals and categories - no merchant names or account numbers. Do not ask for passwords, card numbers or OTPs.
- Keep answers under about 150 words unless the user asks for more detail.`;

function httpError(status: number, code: string, message: string) {
  const e: any = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export class AIChatService {
  static listSessions(userId: string, householdId: string) {
    return QueryHelper.query(
      `SELECT s.id, s.title, s.created_at, s.updated_at,
              (SELECT COUNT(*)::int FROM ai_chat_messages m WHERE m.session_id = s.id) AS message_count
       FROM ai_chat_sessions s
       WHERE s.user_id = $1 AND s.household_id = $2
       ORDER BY s.updated_at DESC
       LIMIT 50`,
      [userId, householdId]
    );
  }

  /** Create a session and freeze a fresh financial snapshot for it. */
  static async createSession(userId: string, householdId: string) {
    const cfg = (await AIAdvisorService.getConfig(userId, householdId)) || (await AIAdvisorService.upsertConfig(userId, householdId, {}));
    const context = await AIAdvisorService.buildAnalysisContext(userId, householdId, cfg);
    return QueryHelper.queryOne(
      `INSERT INTO ai_chat_sessions (user_id, household_id, context, ai_provider, model_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, created_at, updated_at`,
      [userId, householdId, JSON.stringify(context), cfg.aiProvider, cfg.modelName]
    );
  }

  private static async getOwnedSession(sessionId: string, userId: string, householdId: string) {
    const session = await QueryHelper.queryOne<any>(
      `SELECT * FROM ai_chat_sessions WHERE id = $1 AND user_id = $2 AND household_id = $3`,
      [sessionId, userId, householdId]
    );
    if (!session) throw httpError(404, 'CHAT_NOT_FOUND', 'Chat not found');
    return session;
  }

  static async getSession(sessionId: string, userId: string, householdId: string) {
    const s = await this.getOwnedSession(sessionId, userId, householdId);
    const messages = await QueryHelper.query(
      `SELECT id, role, content, created_at FROM ai_chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );
    return { id: s.id, title: s.title, created_at: s.created_at, updated_at: s.updated_at, messages };
  }

  static async deleteSession(sessionId: string, userId: string, householdId: string) {
    await this.getOwnedSession(sessionId, userId, householdId);
    await QueryHelper.query(`DELETE FROM ai_chat_sessions WHERE id = $1`, [sessionId]);
  }

  /** Store the user's message, ask the configured model, store and return the reply. */
  static async sendMessage(sessionId: string, userId: string, householdId: string, content: string) {
    const text = (content || '').trim();
    if (!text) throw httpError(400, 'EMPTY_MESSAGE', 'Message cannot be empty');
    if (text.length > MAX_MESSAGE_CHARS) throw httpError(400, 'MESSAGE_TOO_LONG', `Please keep messages under ${MAX_MESSAGE_CHARS} characters`);

    const session = await this.getOwnedSession(sessionId, userId, householdId);
    // Read the *current* provider/model/key so config changes (web or mobile) apply to the next message.
    const cfg = await AIAdvisorService.getConfig(userId, householdId);
    if (!cfg) throw httpError(400, 'NOT_CONFIGURED', 'Set up the AI Advisor first');

    const history = await QueryHelper.query<{ role: 'user' | 'assistant'; content: string }>(
      `SELECT role, content FROM (
         SELECT role, content, created_at FROM ai_chat_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2
       ) recent ORDER BY created_at ASC`,
      [sessionId, MAX_HISTORY_MESSAGES]
    );

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `${CHAT_SYSTEM_PROMPT}\n\nFINANCIAL DATA (snapshot taken ${new Date(session.created_at).toISOString().slice(0, 10)}):\n${JSON.stringify(session.context || {})}`,
      },
      ...history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      { role: 'user', content: text },
    ];

    const provider = AIProviderFactory.create({ provider: cfg.aiProvider, model: cfg.modelName, apiKeyOverride: cfg.apiKeyOverride });
    // Throws LLMError (NOT_CONFIGURED / AUTH / RATE_LIMIT ...) with a user-presentable message.
    const reply = await provider.chat(messages, { maxTokens: 1200 });

    await QueryHelper.query(`INSERT INTO ai_chat_messages (session_id, role, content) VALUES ($1, 'user', $2)`, [sessionId, text]);
    const assistant = await QueryHelper.queryOne<any>(
      `INSERT INTO ai_chat_messages (session_id, role, content, tokens_total) VALUES ($1, 'assistant', $2, $3)
       RETURNING id, role, content, created_at`,
      [sessionId, reply.content.trim(), reply.tokensTotal ?? null]
    );

    const title = session.title === 'New chat' ? text.replace(/\s+/g, ' ').slice(0, 60) : session.title;
    await QueryHelper.query(`UPDATE ai_chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2`, [title, sessionId]);

    return { message: assistant, title };
  }
}
