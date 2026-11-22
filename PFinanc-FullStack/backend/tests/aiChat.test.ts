import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';
import { AIProviderFactory } from '../src/modules/ai-advisor/providers/aiProviderFactory.js';
import { ChatMessage, ChatResponse, IAIProvider, LLMError } from '../src/modules/ai-advisor/providers/aiProvider.interface.js';

let jwt = '';
let householdId = '';
const auth = (t = jwt, h = householdId) => ({ Authorization: `Bearer ${t}`, 'x-household-id': h });

class FakeProvider implements IAIProvider {
  readonly name = 'FAKE';
  calls: ChatMessage[][] = [];
  fail: LLMError | null = null;
  n = 0;
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    this.calls.push(messages);
    if (this.fail) throw this.fail;
    this.n++;
    return { content: `Answer ${this.n} about **your money**`, tokensTotal: 42 };
  }
}
const fake = new FakeProvider();

beforeAll(async () => {
  await runMigrations();
  await runSeed();
  jest.spyOn(AIProviderFactory, 'create').mockReturnValue(fake);
  const login = await request(app).post('/api/auth/login').send({ email: 'owner@pfinanc.local', password: 'Password@123' });
  jwt = login.body.data.token;
  householdId = login.body.data.defaultHouseholdId;
});

afterAll(async () => {
  jest.restoreAllMocks();
  await pool.query(`DELETE FROM ai_chat_sessions WHERE title LIKE 'jest %' OR title LIKE 'What%'`);
});

const sessionsCount = async () => (await request(app).get('/api/ai-advisor/chat/sessions').set(auth())).body.data.length as number;

describe('AI chat', () => {
  let sessionId = '';

  it('starts a new session automatically from the first message and answers', async () => {
    const before = await sessionsCount();
    const res = await request(app).post('/api/ai-advisor/chat/message').set(auth()).send({ content: 'What should I do with my portfolio?', focus: 'investments' });
    expect(res.status).toBe(200);
    expect(res.body.data.sessionId).toBeTruthy();
    expect(res.body.data.focus).toBe('investments');
    expect(res.body.data.message.content).toMatch(/^Answer 1/);
    expect(res.body.data.title).toMatch(/^What should I do/);
    sessionId = res.body.data.sessionId;
    expect(await sessionsCount()).toBe(before + 1);

    // The model sees the focus guide, the frozen snapshot and a LIVE portfolio block
    const system = fake.calls.at(-1)![0].content;
    expect(system).toMatch(/FOCUS:.*investment portfolio/s);
    expect(system).toMatch(/FINANCIAL DATA/);
    expect(system).toMatch(/LIVE PORTFOLIO \(as of/);
    expect(system).toMatch(/investmentSignals/);
    expect(system).not.toMatch(/account_number/i);
  });

  it('keeps history across messages and refreshes the live block each time', async () => {
    const res = await request(app).post('/api/ai-advisor/chat/message').set(auth()).send({ sessionId, content: 'And what about taxes?' });
    expect(res.status).toBe(200);
    const sent = fake.calls.at(-1)!;
    expect(sent.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(sent[1].content).toMatch(/What should I do/);
    expect(sent[3].content).toBe('And what about taxes?');
    const s = await request(app).get(`/api/ai-advisor/chat/sessions/${sessionId}`).set(auth());
    expect(s.body.data.messages).toHaveLength(4);
  });

  it('skips the portfolio block for spending-focused chats', async () => {
    const res = await request(app).post('/api/ai-advisor/chat/message').set(auth()).send({ content: 'jest spending question', focus: 'spending' });
    expect(res.status).toBe(200);
    expect(fake.calls.at(-1)![0].content).not.toMatch(/LIVE PORTFOLIO \(as of/);
  });

  it('regenerates the last answer without duplicating the question', async () => {
    const res = await request(app).post(`/api/ai-advisor/chat/sessions/${sessionId}/regenerate`).set(auth());
    expect(res.status).toBe(200);
    const sent = fake.calls.at(-1)!;
    // the question being re-asked is not duplicated in the history
    expect(sent.filter((m) => m.content === 'And what about taxes?')).toHaveLength(1);
    const s = await request(app).get(`/api/ai-advisor/chat/sessions/${sessionId}`).set(auth());
    expect(s.body.data.messages).toHaveLength(4);
    expect(s.body.data.messages.at(-1).content).toBe(res.body.data.message.content);
  });

  it('renames and validates titles', async () => {
    const ok = await request(app).patch(`/api/ai-advisor/chat/sessions/${sessionId}`).set(auth()).send({ title: 'jest renamed' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.title).toBe('jest renamed');
    expect((await request(app).patch(`/api/ai-advisor/chat/sessions/${sessionId}`).set(auth()).send({ title: '  ' })).status).toBe(400);
  });

  it('rejects empty and oversized messages', async () => {
    expect((await request(app).post('/api/ai-advisor/chat/message').set(auth()).send({ content: '   ' })).status).toBe(400);
    expect((await request(app).post('/api/ai-advisor/chat/message').set(auth()).send({ content: 'x'.repeat(2001) })).status).toBe(400);
  });

  it('surfaces provider errors, keeps the conversation intact and leaves no ghost session', async () => {
    const before = await sessionsCount();
    fake.fail = new LLMError('AUTH', 'The API key was rejected.', 'FAKE', 401);
    const fresh = await request(app).post('/api/ai-advisor/chat/message').set(auth()).send({ content: 'hello?' });
    expect(fresh.status).toBe(400);
    expect(fresh.body.error.message).toMatch(/API key/);
    expect(await sessionsCount()).toBe(before);

    const existing = await request(app).post('/api/ai-advisor/chat/message').set(auth()).send({ sessionId, content: 'will fail' });
    expect(existing.status).toBe(400);
    const s = await request(app).get(`/api/ai-advisor/chat/sessions/${sessionId}`).set(auth());
    expect(s.body.data.messages).toHaveLength(4);

    fake.fail = new LLMError('PROVIDER', 'Provider is down', 'FAKE', 503);
    expect((await request(app).post('/api/ai-advisor/chat/message').set(auth()).send({ sessionId, content: 'again' })).status).toBe(502);
    fake.fail = null;
  });

  it('isolates sessions between users and supports delete', async () => {
    const other = await request(app).post('/api/auth/register').send({ email: `chat_other_${Date.now()}@test.local`, password: 'Password@123', name: 'Other' });
    const o = auth(other.body.data.token, other.body.data.defaultHouseholdId);
    expect((await request(app).get(`/api/ai-advisor/chat/sessions/${sessionId}`).set(o)).status).toBe(404);
    expect((await request(app).post('/api/ai-advisor/chat/message').set(o).send({ sessionId, content: 'steal' })).status).toBe(404);
    expect((await request(app).delete(`/api/ai-advisor/chat/sessions/${sessionId}`).set(o)).status).toBe(404);
    expect((await request(app).delete(`/api/ai-advisor/chat/sessions/${sessionId}`).set(auth())).status).toBe(200);
    expect((await request(app).get(`/api/ai-advisor/chat/sessions/${sessionId}`).set(auth())).status).toBe(404);
  });
});
