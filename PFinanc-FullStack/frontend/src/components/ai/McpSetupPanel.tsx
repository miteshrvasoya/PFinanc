import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plug, Copy, Check, Trash2, KeyRound, ShieldCheck, AlertTriangle, Globe, Activity, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';

interface Setup {
  suggestedBaseUrl: string;
  suggestedBaseUrlSource: string;
  reachableFromInternet: boolean;
  warnings: string[];
  scopes: { id: string; description: string }[];
  tools: { name: string; description: string; scope: string }[];
  prompts: { name: string; title: string }[];
}
interface Connection {
  id: string; name: string; tokenHint: string; scopes: string[]; status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  lastUsedAt: string | null; useCount: number; createdAt: string; expiresAt: string | null;
}
interface ActivityRow { id: string; tool: string; status: string; connection_name: string; created_at: string }

type Platform = 'claude' | 'chatgpt' | 'other';

const PROMPTS = [
  'Review my PFinanc portfolio. Which holdings should I consider selling or trimming, and what should I consider buying instead? Check current prices and recent news, and explain your reasoning.',
  'Check live prices for my holdings and tell me what moved the most since my last update.',
  'Do I have too much in one stock or sector? Suggest a more balanced allocation for a long-term investor.',
  'Which of my lots turn long-term (12 months) in the next two months, and does waiting before selling make sense?',
  'I can invest ₹25,000 this month. Based on my portfolio and cash flow, how should I split it?',
];

const CopyBox: React.FC<{ value: string; label?: string; mono?: boolean; secret?: boolean }> = ({ value, label, mono = true, secret }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* unavailable */ }
  };
  return (
    <div>
      {label && <p className="text-[11px] text-slate-400 font-medium mb-1">{label}</p>}
      <div className="flex items-start gap-2 bg-slate-950/70 border border-slate-700 rounded-lg p-2.5">
        <pre className={`flex-1 text-xs whitespace-pre-wrap break-all ${mono ? 'font-mono' : ''} ${secret ? 'text-amber-300' : 'text-slate-300'}`}>{value}</pre>
        <button onClick={copy} className="flex-shrink-0 flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700">
          {done ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
    </div>
  );
};

const Step: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-3">
    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">{n}</span>{title}
    </h3>
    {children}
  </section>
);

export const McpSetupPanel: React.FC = () => {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['investments']);
  const [expires, setExpires] = useState<string>('90');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>('claude');

  const load = useCallback(async () => {
    const [s, c, a] = await Promise.all([api.getMcpSetup(), api.listMcpConnections(), api.getMcpActivity(30)]);
    if (s.success) {
      setSetup(s.data);
      const saved = typeof window !== 'undefined' ? localStorage.getItem('pfinanc_mcp_base_url') : null;
      setBaseUrl((cur) => cur || saved || s.data.suggestedBaseUrl);
    }
    if (c.success) setConnections(c.data || []);
    if (a.success) setActivity(a.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  const mcpUrl = `${cleanBase}/mcp`;
  const tokenForDocs = newToken || '<YOUR_TOKEN>';
  const urlWithToken = `${cleanBase}/mcp/t/${tokenForDocs}`;
  const isLocalUrl = useMemo(() => /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(cleanBase), [cleanBase]);

  const persistBase = (v: string) => {
    setBaseUrl(v);
    try { localStorage.setItem('pfinanc_mcp_base_url', v); } catch { /* ignore */ }
  };

  const toggleScope = (id: string) => setScopes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const res = await api.createMcpConnection({ name, scopes: scopes.length ? scopes : ['investments'], expiresInDays: expires === 'never' ? null : Number(expires) });
    setCreating(false);
    if (!res.success) return setError(res.error?.message || 'Could not create the connection.');
    setNewToken(res.data.token);
    setName('');
    load();
  };

  const revoke = async (c: Connection) => {
    if (!window.confirm(`Revoke "${c.name}"? Any assistant using it will lose access immediately.`)) return;
    await api.revokeMcpConnection(c.id);
    load();
  };

  const claudeDesktopJson = JSON.stringify({
    mcpServers: { pfinanc: { command: 'npx', args: ['-y', 'mcp-remote', mcpUrl, '--header', 'Authorization:${PFINANC_AUTH}'], env: { PFINANC_AUTH: `Bearer ${tokenForDocs}` } } },
  }, null, 2);
  const curlTest = `curl -s ${mcpUrl} \\\n  -H "Authorization: Bearer ${tokenForDocs}" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json, text/event-stream" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="bg-gradient-to-r from-indigo-900/30 to-violet-900/20 border border-indigo-500/30 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white flex items-center gap-2"><Plug className="w-5 h-5 text-indigo-400" /> Connect Claude, ChatGPT or any AI assistant</h2>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">
          PFinanc includes an <strong>MCP server</strong>. Once connected, your assistant can read your portfolio (holdings, cost, P&amp;L, trades), fetch live prices,
          research the stocks you own, and write a report on what to hold, sell or buy. It is <strong>read-only</strong>: it can never change your data.
          Because PFinanc is self-hosted, the address below is <em>your own server</em>.
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400"><ShieldCheck className="w-4 h-4 text-emerald-400" /> You choose what each connection can see, and you can revoke it any time.</div>
      </div>

      {setup?.warnings?.map((w, i) => (
        <div key={i} className="flex items-start gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{w}</div>
      ))}

      <Step n={1} title="Your server address">
        <p className="text-xs text-slate-400">The public HTTPS address of your PFinanc backend. Set <code className="text-indigo-300">PUBLIC_BASE_URL</code> in the backend <code className="text-indigo-300">.env</code> to pre-fill this for everyone.</p>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-500" />
          <input value={baseUrl} onChange={(e) => persistBase(e.target.value)} placeholder="https://finance.example.com"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none" />
        </div>
        <CopyBox label="Your MCP endpoint" value={mcpUrl} />
        {isLocalUrl && <p className="text-[11px] text-amber-400">This looks like a local address. Claude.ai and ChatGPT connect from the internet and cannot reach it; use a public HTTPS URL or a tunnel (Cloudflare Tunnel, ngrok). Desktop and command-line assistants on this network can use it.</p>}
      </Step>

      <Step n={2} title="Create a connection">
        {newToken && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 space-y-2">
            <p className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Copy your access token now. It is shown only once.</p>
            <CopyBox value={newToken} secret />
            <button onClick={() => setNewToken(null)} className="text-[11px] text-slate-400 underline">I have saved it</button>
          </div>
        )}
        <form onSubmit={create} className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_200px] gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder='Name, e.g. "Claude" or "ChatGPT"' maxLength={100} required
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
            <select value={expires} onChange={(e) => setExpires(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              <option value="30">Expires in 30 days</option>
              <option value="90">Expires in 90 days</option>
              <option value="365">Expires in 1 year</option>
              <option value="never">Never expires</option>
            </select>
          </div>
          <div className="space-y-1.5">
            {(setup?.scopes || []).map((s) => (
              <label key={s.id} className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={scopes.includes(s.id)} disabled={s.id === 'investments'} onChange={() => toggleScope(s.id)} className="mt-0.5 accent-indigo-500" />
                <span><strong className="text-white">{s.id}</strong>: {s.description}</span>
              </label>
            ))}
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button disabled={creating || !name.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {creating ? 'Creating…' : 'Create connection'}
          </button>
        </form>

        {connections.length > 0 && (
          <div className="border-t border-slate-800 pt-3 space-y-2">
            {connections.map((c) => (
              <div key={c.id} className="flex items-center gap-3 text-xs bg-slate-800/40 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 font-medium truncate">{c.name} <span className="text-slate-500 font-mono ml-1">{c.tokenHint}</span></p>
                  <p className="text-slate-500">
                    {c.scopes.join(', ')} · {c.useCount} calls · {c.lastUsedAt ? `last used ${new Date(c.lastUsedAt).toLocaleDateString('en-IN')}` : 'never used'}
                    {c.expiresAt && c.status === 'ACTIVE' ? ` · expires ${new Date(c.expiresAt).toLocaleDateString('en-IN')}` : ''}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{c.status}</span>
                {c.status === 'ACTIVE' && <button onClick={() => revoke(c)} title="Revoke" className="text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
        )}
      </Step>

      <Step n={3} title="Connect your assistant">
        <div className="flex gap-1 bg-slate-800/70 p-1 rounded-lg w-fit">
          {([['claude', 'Claude'], ['chatgpt', 'ChatGPT'], ['other', 'Other / test']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setPlatform(id)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${platform === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{label}</button>
          ))}
        </div>
        {!newToken && <p className="text-[11px] text-amber-400">Create a connection above and the snippets below fill in your token automatically.</p>}

        {platform === 'claude' && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="space-y-2">
              <p className="font-semibold text-white">Claude on the web or desktop (custom connector)</p>
              <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                <li>Open Claude, then <strong>Settings → Connectors → Add custom connector</strong> (needs a plan that supports custom connectors).</li>
                <li>Name it <strong>PFinanc</strong> and paste this URL. The token is part of the URL, so keep it private.</li>
                <li>Start a chat, enable the PFinanc connector, and try a prompt below.</li>
              </ol>
              <CopyBox value={urlWithToken} secret={!!newToken} />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">Claude Code (terminal)</p>
              <CopyBox value={`claude mcp add --transport http pfinanc ${mcpUrl} --header "Authorization: Bearer ${tokenForDocs}"`} />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">Claude Desktop config file (works with a local server too)</p>
              <p className="text-slate-400">Add this to <code>claude_desktop_config.json</code> (needs Node.js). It uses the <code>mcp-remote</code> bridge to send the Authorization header.</p>
              <CopyBox value={claudeDesktopJson} />
            </div>
          </div>
        )}

        {platform === 'chatgpt' && (
          <div className="space-y-2 text-xs text-slate-300">
            <ol className="list-decimal pl-5 space-y-1 text-slate-400">
              <li>In ChatGPT open <strong>Settings → Connectors → Advanced</strong> and turn on <strong>Developer mode</strong> (availability depends on your plan and region).</li>
              <li>Choose <strong>Create</strong> (add a connector), name it <strong>PFinanc</strong>, and paste the URL below as the MCP server URL.</li>
              <li>Set authentication to <strong>No authentication</strong>. The token inside the URL is what protects it.</li>
              <li>In a new chat, add the PFinanc connector from the tools menu and ask your question.</li>
            </ol>
            <CopyBox value={urlWithToken} secret={!!newToken} />
            <p className="text-slate-500">ChatGPT calls your server from the internet, so the address must be public HTTPS. Tool calls may ask for your approval; the PFinanc tools only read data.</p>
          </div>
        )}

        {platform === 'other' && (
          <div className="space-y-2 text-xs text-slate-300">
            <p className="text-slate-400">Any assistant or tool that supports MCP over <strong>Streamable HTTP</strong> works: use the endpoint with an <code>Authorization: Bearer</code> header, or the URL that already contains the token.</p>
            <CopyBox label="Endpoint" value={mcpUrl} />
            <CopyBox label="Header" value={`Authorization: Bearer ${tokenForDocs}`} secret={!!newToken} />
            <CopyBox label="Quick test from a terminal (should list the tools)" value={curlTest} />
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300">About MCP <ExternalLink className="w-3 h-3" /></a>
          </div>
        )}
      </Step>

      <Step n={4} title="Ask for the analysis">
        <p className="text-xs text-slate-400">Try one of these. Your assistant will call the PFinanc tools, then combine your numbers with its own research.</p>
        <div className="space-y-2">{PROMPTS.map((p) => <CopyBox key={p} value={p} mono={false} />)}</div>
        <p className="text-[11px] text-slate-500">Assistants that support MCP prompts also show ready-made ones: {setup?.prompts?.map((p) => p.title).join(', ')}.</p>
      </Step>

      <section className="grid md:grid-cols-2 gap-5">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">What an assistant can read</h3>
          <ul className="space-y-1.5">
            {(setup?.tools || []).map((t) => (
              <li key={t.name} className="text-xs"><code className="text-indigo-300">{t.name}</code> <span className="text-slate-500">· {t.description}</span></li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500 mt-3">Never shared: passwords, account numbers, raw SMS, merchant names. Nothing can be changed or traded.</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-400" /> Recent access</h3>
          {activity.length === 0 ? <p className="text-xs text-slate-500">No assistant has used a connection yet.</p> : (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto">
              {activity.map((a) => (
                <li key={a.id} className="text-xs flex items-center justify-between gap-2">
                  <span className="text-slate-300 truncate"><code className="text-indigo-300">{a.tool}</code> <span className="text-slate-500">· {a.connection_name}</span></span>
                  <span className={`text-[10px] ${a.status === 'OK' ? 'text-slate-500' : 'text-amber-400'}`}>{a.status !== 'OK' ? `${a.status} · ` : ''}{new Date(a.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-[11px] text-slate-600">Analysis from an AI assistant is not financial advice. Treat tokens like passwords; the URL variant puts the token in the address, so avoid sharing screenshots of it.</p>
    </div>
  );
};
