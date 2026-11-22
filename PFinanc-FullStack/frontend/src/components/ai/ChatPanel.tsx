import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Plus, Trash2, Pencil, Copy, RefreshCw, MessageSquare, Check, AlertTriangle, Sparkles, X } from 'lucide-react';
import { api } from '../../lib/api';
import { RichText } from './RichText';

type Focus = 'general' | 'investments' | 'spending';
interface Msg { id: string; role: 'user' | 'assistant'; content: string }
interface SessionRow { id: string; title: string; focus: Focus; updated_at: string; message_count: number }

const FOCUSES: { id: Focus; label: string; hint: string }[] = [
  { id: 'general', label: 'Everything', hint: 'Whole picture' },
  { id: 'investments', label: 'Investments', hint: 'Buy / hold / sell ideas' },
  { id: 'spending', label: 'Spending', hint: 'Budgets, savings, EMIs' },
];

const STARTERS: Record<Focus, string[]> = {
  general: ['How healthy are my finances right now?', 'Where can I save more each month?', 'Is my emergency fund enough?'],
  investments: [
    'Which of my holdings should I consider reducing, and why?',
    'What should I add to make my portfolio more balanced?',
    'Are any of my lots close to becoming long-term for tax?',
    'Compare my allocation with a simple 60/30/10 plan.',
  ],
  spending: ['What are my biggest spending categories?', 'How much can I safely invest this month?', 'Which recurring payments could I trim?'],
};

export const ChatPanel: React.FC<{ onOpenSettings: () => void; onOpenConnect: () => void }> = ({ onOpenSettings, onOpenConnect }) => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState('New chat');
  const [focus, setFocus] = useState<Focus>('investments');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    const res = await api.listAIChatSessions();
    if (res.success) setSessions(res.data || []);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  const openSession = async (id: string) => {
    setError(null);
    const res = await api.getAIChatSession(id);
    if (res.success) {
      setSessionId(res.data.id);
      setTitle(res.data.title);
      setFocus(res.data.focus || 'general');
      setMessages(res.data.messages || []);
    }
  };

  const newChat = () => {
    setSessionId(null);
    setTitle('New chat');
    setMessages([]);
    setError(null);
    setNeedsKey(false);
    setInput('');
  };

  const fail = (message: string) => {
    setError(message);
    setNeedsKey(/api key|not configured|rejected|unauthor|invalid/i.test(message));
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setError(null);
    setNeedsKey(false);
    setInput('');
    setSending(true);
    const temp: Msg = { id: `tmp-${Date.now()}`, role: 'user', content };
    setMessages((m) => [...m, temp]);
    const res = await api.sendAIChatMessage({ content, sessionId: sessionId || undefined, focus });
    setSending(false);
    if (!res.success) {
      setMessages((m) => m.filter((x) => x.id !== temp.id)); // roll back so the user can retry
      setInput(content);
      return fail(res.error?.message || 'Could not get a reply.');
    }
    setSessionId(res.data.sessionId);
    setTitle(res.data.title);
    setMessages((m) => [...m, res.data.message]);
    loadSessions();
  };

  const regenerate = async () => {
    if (!sessionId || sending) return;
    setError(null);
    setSending(true);
    const res = await api.regenerateAIChat(sessionId);
    setSending(false);
    if (!res.success) return fail(res.error?.message || 'Could not regenerate.');
    setMessages((m) => [...m.slice(0, -1), res.data.message]);
  };

  const copy = async (msg: Msg) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(msg.id);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const remove = async (s: SessionRow) => {
    if (!window.confirm(`Delete "${s.title}"?`)) return;
    await api.deleteAIChatSession(s.id);
    if (s.id === sessionId) newChat();
    loadSessions();
  };

  const saveRename = async (id: string) => {
    const t = renameValue.trim();
    setRenaming(null);
    if (!t) return;
    const res = await api.renameAIChatSession(id, t);
    if (res.success) { if (id === sessionId) setTitle(res.data.title); loadSessions(); }
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 min-h-[560px]">
      {/* Sessions */}
      <aside className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 flex flex-col gap-2 max-h-[640px]">
        <button onClick={newChat} className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {sessions.length === 0 && <p className="text-xs text-slate-500 px-2 py-3">No chats yet. Ask your first question.</p>}
          {sessions.map((s) => (
            <div key={s.id} className={`group rounded-lg px-2.5 py-2 cursor-pointer border ${s.id === sessionId ? 'bg-indigo-500/10 border-indigo-500/40' : 'border-transparent hover:bg-slate-800/60'}`}>
              {renaming === s.id ? (
                <input
                  autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => saveRename(s.id)} onKeyDown={(e) => e.key === 'Enter' && saveRename(s.id)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                />
              ) : (
                <div className="flex items-center gap-2" onClick={() => openSession(s.id)}>
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-200 truncate">{s.title}</p>
                    <p className="text-[10px] text-slate-500">{s.message_count} messages · {new Date(s.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <button title="Rename" onClick={(e) => { e.stopPropagation(); setRenaming(s.id); setRenameValue(s.title); }} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-200"><Pencil className="w-3.5 h-3.5" /></button>
                  <button title="Delete" onClick={(e) => { e.stopPropagation(); remove(s); }} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Conversation */}
      <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl flex flex-col min-h-[560px]">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          {!sessionId && (
            <div className="flex gap-1 bg-slate-800/70 p-1 rounded-lg">
              {FOCUSES.map((f) => (
                <button key={f.id} title={f.hint} onClick={() => setFocus(f.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${focus === f.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-h-[460px]">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><Sparkles className="w-7 h-7 text-indigo-400" /></div>
              <div>
                <p className="text-white font-semibold">Ask about your money</p>
                <p className="text-xs text-slate-400 mt-1">Each new chat starts from your latest accounts and holdings. Type below, or pick a question.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {STARTERS[focus].map((q) => (
                  <button key={q} onClick={() => send(q)} className="px-3 py-1.5 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:border-indigo-500/60 hover:text-white transition-all">{q}</button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">Want ChatGPT or Claude to analyse your portfolio instead? <button onClick={onOpenConnect} className="text-indigo-400 hover:text-indigo-300 underline">Connect your assistant</button></p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-md whitespace-pre-wrap' : 'bg-slate-800/80 text-slate-200 rounded-bl-md border border-slate-700/50'}`}>
                {m.role === 'user' ? m.content : <RichText text={m.content} />}
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-700/50 text-slate-500">
                    <button onClick={() => copy(m)} className="flex items-center gap-1 text-[11px] hover:text-slate-200">
                      {copied === m.id ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                    {m.id === lastAssistantId && (
                      <button onClick={regenerate} disabled={sending} className="flex items-center gap-1 text-[11px] hover:text-slate-200 disabled:opacity-50">
                        <RefreshCw className="w-3 h-3" /> Try again
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start"><div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-400 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Thinking…</div></div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                {needsKey && <button onClick={onOpenSettings} className="mt-1 underline font-semibold">Check AI settings (provider, model, API key)</button>}
              </div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-end gap-2 p-3 border-t border-slate-800"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={2}
            maxLength={2000}
            placeholder="Ask anything about your money… (Enter to send, Shift+Enter for a new line)"
            className="flex-1 resize-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button type="submit" disabled={!input.trim() || sending} className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors" aria-label="Send">
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-slate-600 text-center pb-2">AI guidance based on your data, not professional financial advice.</p>
      </section>
    </div>
  );
};
