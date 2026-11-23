import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';
import { MCP_TOOL_CATALOG } from '../src/modules/mcp/mcpCatalog.js';

let jwt = '';
let householdId = '';
const auth = () => ({ Authorization: `Bearer ${jwt}`, 'x-household-id': householdId });

const rpc = (token: string | null, method: string, params: any = {}, viaPath = false) => {
  const url = viaPath && token ? `/mcp/t/${token}` : '/mcp';
  const r = request(app).post(url).set('Accept', 'application/json, text/event-stream').set('Content-Type', 'application/json');
  if (token && !viaPath) r.set('Authorization', `Bearer ${token}`);
  return r.send({ jsonrpc: '2.0', id: 1, method, params });
};
const callTool = (token: string, name: string, args: any = {}) => rpc(token, 'tools/call', { name, arguments: args });
const toolText = (res: any) => res.body?.result?.content?.[0]?.text as string;

async function newConnection(body: any) {
  const res = await request(app).post('/api/mcp/connections').set(auth()).send(body);
  return { status: res.status, token: res.body.data?.token as string, id: res.body.data?.connection?.id as string, body: res.body };
}

beforeAll(async () => {
  await runMigrations();
  await runSeed();
  const login = await request(app).post('/api/auth/login').send({ email: 'owner@pfinanc.local', password: 'Password@123' });
  jwt = login.body.data.token;
  householdId = login.body.data.defaultHouseholdId;
});

afterAll(async () => {
  await pool.query(`DELETE FROM mcp_access_tokens WHERE name LIKE 'jest-%'`);
});

describe('MCP connection management', () => {
  it('requires a normal login', async () => {
    expect((await request(app).get('/api/mcp/connections')).status).toBe(401);
  });

  it('returns setup info with the tool catalog and a base URL', async () => {
    const res = await request(app).get('/api/mcp/setup').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.suggestedBaseUrl).toMatch(/^https?:\/\//);
    expect(res.body.data.tools.map((t: any) => t.name)).toEqual(MCP_TOOL_CATALOG.map((t) => t.name));
  });

  it('shows the token once and stores only a hash', async () => {
    const c = await newConnection({ name: 'jest-hash', scopes: ['investments'] });
    expect(c.status).toBe(201);
    expect(c.token).toMatch(/^pfmcp_/);
    const list = await request(app).get('/api/mcp/connections').set(auth());
    const row = list.body.data.find((r: any) => r.id === c.id);
    expect(JSON.stringify(row)).not.toContain(c.token);
    const db = await pool.query(`SELECT token_hash FROM mcp_access_tokens WHERE id = $1`, [c.id]);
    expect(db.rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(db.rows[0].token_hash).not.toBe(c.token);
  });

  it('validates input', async () => {
    expect((await newConnection({ name: '' })).status).toBe(400);
    expect((await newConnection({ name: 'jest-bad', scopes: ['everything'] })).status).toBe(400);
    expect((await newConnection({ name: 'jest-bad', expiresInDays: 9999 })).status).toBe(400);
  });
});

describe('MCP endpoint', () => {
  let token = '';
  let tokenId = '';

  beforeAll(async () => {
    const c = await newConnection({ name: 'jest-main', scopes: ['investments'] });
    token = c.token;
    tokenId = c.id;
  });

  it('rejects missing, malformed and unknown tokens', async () => {
    expect((await rpc(null, 'tools/list')).status).toBe(401);
    expect((await rpc('not-a-token', 'tools/list')).status).toBe(401);
    expect((await rpc('pfmcp_' + 'x'.repeat(43), 'tools/list')).status).toBe(401);
  });

  it('refuses non-POST methods and foreign browser origins', async () => {
    expect((await request(app).get('/mcp').set('Authorization', `Bearer ${token}`)).status).toBe(405);
    const res = await request(app).post('/mcp').set('Origin', 'https://evil.example').set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json, text/event-stream').send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.status).toBe(403);
  });

  it('initializes and advertises server instructions', async () => {
    const res = await rpc(token, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'jest', version: '1' } });
    expect(res.status).toBe(200);
    expect(res.body.result.serverInfo.name).toBe('pfinanc');
    expect(res.body.result.instructions).toMatch(/not licensed financial advice/);
  });

  it('lists exactly the cataloged tools, all read-only', async () => {
    const res = await rpc(token, 'tools/list');
    const tools = res.body.result.tools;
    expect(tools.map((t: any) => t.name).sort()).toEqual(MCP_TOOL_CATALOG.map((t) => t.name).sort());
    expect(tools.every((t: any) => t.annotations?.readOnlyHint === true)).toBe(true);
  });

  it('lists prompts', async () => {
    const res = await rpc(token, 'prompts/list');
    expect(res.body.result.prompts.map((p: any) => p.name)).toEqual(expect.arrayContaining(['portfolio_review', 'rebalance_ideas']));
  });

  it('returns portfolio data scoped to the token owner', async () => {
    const res = await callTool(token, 'get_portfolio_overview');
    expect(res.body.result.isError).toBeFalsy();
    const data = JSON.parse(toolText(res));
    expect(data.scope).toBe('personal');
    expect(data.totals).toEqual(expect.objectContaining({ currentValue: expect.any(Number), holdingsCount: expect.any(Number) }));
  });

  it('lists holdings, signals and transactions', async () => {
    const holdings = JSON.parse(toolText(await callTool(token, 'list_holdings', { limit: 5 })));
    expect(Array.isArray(holdings.positions)).toBe(true);
    const signals = JSON.parse(toolText(await callTool(token, 'get_portfolio_signals')));
    expect(signals.caveats.join(' ')).toMatch(/Not investment advice/);
    const txns = JSON.parse(toolText(await callTool(token, 'list_investment_transactions', { days: 3650, limit: 5 })));
    expect(Array.isArray(txns.transactions)).toBe(true);
  });

  it('explains unknown symbols instead of crashing', async () => {
    const res = await callTool(token, 'get_holding', { symbol: 'NO_SUCH_SYMBOL' });
    expect(res.body.result.isError).toBe(true);
    expect(toolText(res)).toMatch(/No holding/);
  });

  it('denies household scope and cashflow without the matching permission', async () => {
    const household = await callTool(token, 'get_portfolio_overview', { scope: 'household' });
    expect(household.body.result.isError).toBe(true);
    expect(toolText(household)).toMatch(/household/);
    const cash = await callTool(token, 'get_cashflow_summary');
    expect(cash.body.result.isError).toBe(true);
    expect(toolText(cash)).toMatch(/cashflow/);
  });

  it('allows household and cashflow when the connection has them', async () => {
    const wide = await newConnection({ name: 'jest-wide', scopes: ['investments', 'cashflow', 'household'] });
    const household = await callTool(wide.token, 'get_portfolio_overview', { scope: 'household' });
    expect(household.body.result.isError).toBeFalsy();
    expect(JSON.parse(toolText(household)).scope).toBe('household');
    const cash = await callTool(wide.token, 'get_cashflow_summary', { months: 3 });
    expect(cash.body.result.isError).toBeFalsy();
    expect(JSON.parse(toolText(cash)).kpis).toBeDefined();
  });

  it('works through the URL-token variant', async () => {
    const res = await rpc(token, 'tools/list', {}, true);
    expect(res.status).toBe(200);
    expect(res.body.result.tools.length).toBe(MCP_TOOL_CATALOG.length);
  });

  it('records tool names (not data) in the activity log and bumps usage', async () => {
    const res = await request(app).get('/api/mcp/activity').set(auth());
    const mine = res.body.data.filter((a: any) => a.connection_name === 'jest-main');
    expect(mine.map((a: any) => a.tool)).toEqual(expect.arrayContaining(['get_portfolio_overview', 'get_cashflow_summary']));
    expect(mine.some((a: any) => a.status === 'DENIED')).toBe(true);
    const list = await request(app).get('/api/mcp/connections').set(auth());
    expect(list.body.data.find((r: any) => r.id === tokenId).useCount).toBeGreaterThan(0);
  });

  it('stops working immediately after revoke, and expired tokens are rejected', async () => {
    const temp = await newConnection({ name: 'jest-revoke' });
    expect((await rpc(temp.token, 'tools/list')).status).toBe(200);
    expect((await request(app).delete(`/api/mcp/connections/${temp.id}`).set(auth())).status).toBe(200);
    expect((await rpc(temp.token, 'tools/list')).status).toBe(401);
    expect((await request(app).delete(`/api/mcp/connections/${temp.id}`).set(auth())).status).toBe(404);

    const exp = await newConnection({ name: 'jest-expire', expiresInDays: 1 });
    await pool.query(`UPDATE mcp_access_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`, [exp.id]);
    expect((await rpc(exp.token, 'tools/list')).status).toBe(401);
  });

  it('does not let one user see or revoke another user\'s connections', async () => {
    const other = await request(app).post('/api/auth/register').send({ email: `mcp_other_${Date.now()}@test.local`, password: 'Password@123', name: 'Other' });
    const otherAuth = { Authorization: `Bearer ${other.body.data.token}`, 'x-household-id': other.body.data.defaultHouseholdId };
    const list = await request(app).get('/api/mcp/connections').set(otherAuth);
    expect(list.body.data).toEqual([]);
    expect((await request(app).delete(`/api/mcp/connections/${tokenId}`).set(otherAuth)).status).toBe(404);
  });
});
