'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { api } from '../lib/api';
import {
  BotMessageSquare, Play, RefreshCw, Settings2, ClipboardList,
  History, Zap, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Clock, ChevronRight, Sparkles, BarChart2,
  Target, Shield, DollarSign, IndianRupee, Brain, Activity
} from 'lucide-react';
import { useRouter } from 'next/router';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Recommendation {
  action: string;
  security: string;
  securityType: string;
  reason: string;
  priority: string;
  suggestedAmountInr?: number;
  expectedReturnPct?: number;
  timeHorizon?: string;
}

interface Report {
  id: string;
  portfolio_health_score: number;
  risk_assessment: string;
  key_insights: string[];
  recommendations: Recommendation[];
  rebalancing_suggestions: string[];
  monthly_sip_plan?: any[];
  monthly_stock_plan?: any[];
  market_outlook?: string;
  created_at: string;
  triggered_by: string;
  ai_provider: string;
  model_name: string;
  tokens_total?: number;
  portfolio_snapshot?: any;
}

interface AdvisorConfig {
  aiProvider: string;
  modelName: string;
  scheduleCron: string;
  isEnabled: boolean;
  monthlySipBudgetInr?: number;
  monthlyStockBudgetInr?: number;
  apiKeyOverride?: string;
}

type Tab = 'dashboard' | 'recommendations' | 'history' | 'settings';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ACTION_COLORS: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  BUY: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  SIP: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  SELL: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', icon: <TrendingDown className="w-3.5 h-3.5" /> },
  AVOID: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  HOLD: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', icon: <Minus className="w-3.5 h-3.5" /> },
  REBALANCE: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', icon: <Zap className="w-3.5 h-3.5" /> },
};

const PRIORITY_DOT: Record<string, string> = {
  HIGH: 'bg-rose-400',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-emerald-400',
};

const PROVIDER_LABELS: Record<string, string> = {
  OPENROUTER: 'OpenRouter', OPENAI: 'OpenAI', GEMINI: 'Google Gemini', ANTHROPIC: 'Anthropic',
};

const CRON_PRESETS = [
  { label: '9:00 AM IST (3:30 AM UTC)', value: '30 3 * * *' },
  { label: '7:00 AM IST (1:30 AM UTC)', value: '30 1 * * *' },
  { label: '6:00 PM IST (12:30 PM UTC)', value: '30 12 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Custom', value: 'custom' },
];

// ─── Health Score Ring ────────────────────────────────────────────────────────
const HealthRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 56, c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={r}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
        />
      </svg>
      <div className="text-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-lg font-bold text-white">/100</span>
        <p className="text-xs text-slate-400 mt-0.5">Health</p>
      </div>
    </div>
  );
};

// ─── Recommendation Card ──────────────────────────────────────────────────────
const RecommendationCard: React.FC<{ rec: Recommendation; index: number }> = ({ rec, index }) => {
  const style = ACTION_COLORS[rec.action] || ACTION_COLORS.HOLD;
  return (
    <div
      className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-black/20"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${style.bg} ${style.text} border ${style.border}`}>
            {style.icon} {rec.action}
          </span>
          <span className="text-sm font-semibold text-white">{rec.security}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700 font-medium">
            {rec.securityType?.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[rec.priority] || 'bg-slate-500'}`} />
          <span className="text-[10px] text-slate-400 font-medium">{rec.priority}</span>
        </div>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-3">{rec.reason}</p>

      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
        {rec.suggestedAmountInr && (
          <span className="flex items-center gap-1 text-indigo-300 font-medium">
            <IndianRupee className="w-3 h-3" />
            ₹{rec.suggestedAmountInr.toLocaleString('en-IN')}
          </span>
        )}
        {rec.expectedReturnPct && (
          <span className="flex items-center gap-1 text-emerald-300 font-medium">
            <TrendingUp className="w-3 h-3" />
            ~{rec.expectedReturnPct}% expected
          </span>
        )}
        {rec.timeHorizon && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {rec.timeHorizon}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Settings Panel ───────────────────────────────────────────────────────────
const SettingsPanel: React.FC<{
  config: AdvisorConfig;
  models: Record<string, any[]>;
  onSave: (updated: Partial<AdvisorConfig>) => Promise<void>;
  saving: boolean;
}> = ({ config, models, onSave, saving }) => {
  const [form, setForm] = useState({ ...config });
  const [customCron, setCustomCron] = useState('');
  const [showKey, setShowKey] = useState(false);

  const isCustomCron = !CRON_PRESETS.find(p => p.value === form.scheduleCron && p.value !== 'custom');
  const availableModels = models[form.aiProvider] || [];

  const handleProviderChange = (provider: string) => {
    const defaultModel = models[provider]?.[0]?.id || '';
    setForm(f => ({ ...f, aiProvider: provider, modelName: defaultModel }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cron = isCustomCron ? customCron || form.scheduleCron : form.scheduleCron;
    await onSave({ ...form, scheduleCron: cron });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Toggle */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Enable AI Advisor</p>
          <p className="text-xs text-slate-400 mt-0.5">Allow daily scheduled analysis runs</p>
        </div>
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, isEnabled: !f.isEnabled }))}
          id="ai-advisor-enable-toggle"
          className={`relative w-11 h-6 rounded-full transition-colors ${form.isEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isEnabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* AI Provider */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Brain className="w-4 h-4 text-indigo-400" /> AI Provider</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['OPENROUTER', 'OPENAI', 'GEMINI', 'ANTHROPIC'].map(p => (
            <button
              key={p}
              type="button"
              id={`provider-${p.toLowerCase()}`}
              onClick={() => handleProviderChange(p)}
              className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                form.aiProvider === p
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
              }`}
            >
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs text-slate-400 font-medium mb-1 block">Model</label>
          <select
            id="ai-advisor-model-select"
            value={form.modelName}
            onChange={e => setForm(f => ({ ...f, modelName: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            {availableModels.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 font-medium mb-1 block">API Key Override <span className="text-slate-600">(optional — uses .env key if blank)</span></label>
          <div className="relative">
            <input
              id="ai-advisor-api-key"
              type={showKey ? 'text' : 'password'}
              value={form.apiKeyOverride || ''}
              onChange={e => setForm(f => ({ ...f, apiKeyOverride: e.target.value }))}
              placeholder="sk-... (leave blank to use server default)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white pr-16 focus:border-indigo-500 focus:outline-none"
            />
            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200">
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-400" /> Daily Schedule</h3>
        <select
          id="ai-advisor-schedule-preset"
          value={isCustomCron ? 'custom' : form.scheduleCron}
          onChange={e => {
            if (e.target.value === 'custom') {
              setCustomCron(form.scheduleCron);
            } else {
              setForm(f => ({ ...f, scheduleCron: e.target.value }));
            }
          }}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {isCustomCron && (
          <input
            id="ai-advisor-custom-cron"
            type="text"
            value={customCron}
            onChange={e => setCustomCron(e.target.value)}
            placeholder="Custom cron expression (e.g. 30 3 * * *)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
          />
        )}
        <p className="text-[11px] text-slate-500">All times are UTC. Indian Standard Time is UTC+5:30</p>
      </div>

      {/* Investment Budgets */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-indigo-400" /> Monthly Investment Budgets
          <span className="text-xs text-slate-500 font-normal">(optional)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">SIP / Mutual Fund Budget (₹/mo)</label>
            <input
              id="ai-advisor-sip-budget"
              type="number"
              min={0}
              step={500}
              value={form.monthlySipBudgetInr || ''}
              onChange={e => setForm(f => ({ ...f, monthlySipBudgetInr: e.target.value ? parseFloat(e.target.value) : undefined }))}
              placeholder="e.g. 10000"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">Direct Stock Budget (₹/mo)</label>
            <input
              id="ai-advisor-stock-budget"
              type="number"
              min={0}
              step={500}
              value={form.monthlyStockBudgetInr || ''}
              onChange={e => setForm(f => ({ ...f, monthlyStockBudgetInr: e.target.value ? parseFloat(e.target.value) : undefined }))}
              placeholder="e.g. 5000"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-500">If set, AI will suggest specific investments within these budgets. Leave blank for general portfolio rebalancing advice.</p>
      </div>

      <button
        id="ai-advisor-save-config"
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIAdvisorPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [report, setReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [config, setConfig] = useState<AdvisorConfig | null>(null);
  const [models, setModels] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfgRes, latestRes, reportsRes, runsRes, modelsRes] = await Promise.all([
        api.getAIAdvisorConfig(),
        api.getLatestAIAdvisorReport(),
        api.getAIAdvisorReports(),
        api.getAIAdvisorRuns(),
        api.getAIAdvisorModels(),
      ]);
      if (cfgRes.success) setConfig(cfgRes.data);
      if (latestRes.success) setReport(latestRes.data);
      if (reportsRes.success) setReports(reportsRes.data || []);
      if (runsRes.success) setRuns(runsRes.data || []);
      if (modelsRes.success) setModels(modelsRes.data || {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Check for report query param (from notification click)
  useEffect(() => {
    if (router.query.report) {
      setActiveTab('recommendations');
    }
  }, [router.query.report]);

  // Poll for running status
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(async () => {
      const runsRes = await api.getAIAdvisorRuns(5);
      if (runsRes.success) {
        const latest = runsRes.data?.[0];
        if (latest?.status === 'COMPLETED' || latest?.status === 'FAILED') {
          setRunning(false);
          loadData();
          clearInterval(interval);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [running, loadData]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    const res = await api.triggerAIAdvisorRun();
    if (!res.success) {
      setError(res.error?.message || 'Failed to start analysis');
      setRunning(false);
    }
  };

  const handleSaveConfig = async (updated: Partial<AdvisorConfig>) => {
    setSaving(true);
    const res = await api.updateAIAdvisorConfig({
      aiProvider: updated.aiProvider,
      modelName: updated.modelName,
      apiKeyOverride: updated.apiKeyOverride || undefined,
      scheduleCron: updated.scheduleCron,
      isEnabled: updated.isEnabled,
      monthlySipBudgetInr: updated.monthlySipBudgetInr,
      monthlyStockBudgetInr: updated.monthlyStockBudgetInr,
    });
    if (res.success) setConfig(res.data);
    setSaving(false);
  };

  const recs: Recommendation[] = (() => {
    const raw = report?.recommendations;
    if (!raw) return [];
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
  })();

  const insights: string[] = (() => {
    const raw = report?.key_insights;
    if (!raw) return [];
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
  })();

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'recommendations', label: 'Recommendations', icon: <Target className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings2 className="w-4 h-4" /> },
  ];

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto bg-[#080d1a]">
        <div className="max-w-6xl mx-auto p-6 space-y-6">

          {/* Page Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <BotMessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Investment Advisor</h1>
                <p className="text-sm text-slate-400">Daily AI-powered portfolio analysis & recommendations</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {running && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400 text-xs font-medium animate-pulse">
                  <Activity className="w-3.5 h-3.5" />
                  Analyzing portfolio…
                </div>
              )}
              <button
                id="ai-advisor-run-btn"
                onClick={handleRun}
                disabled={running || loading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
              >
                {running
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running…</>
                  : <><Sparkles className="w-4 h-4" /> Run Now</>
                }
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 w-fit">
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`ai-advisor-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── DASHBOARD TAB ─────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              {loading ? (
                <div className="flex items-center justify-center h-64 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : !report ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                    <BotMessageSquare className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-2">No Analysis Yet</h2>
                  <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                    Click <strong className="text-indigo-400">Run Now</strong> to get your first AI-powered investment analysis, or configure a daily schedule in Settings.
                  </p>
                  <button onClick={handleRun} disabled={running}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-all mx-auto">
                    <Sparkles className="w-4 h-4" /> Run First Analysis
                  </button>
                </div>
              ) : (
                <>
                  {/* Health + Risk + Meta Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Health Ring */}
                    <div className="sm:col-span-1 bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center gap-3">
                      <HealthRing score={report.portfolio_health_score || 0} />
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Portfolio Health Score</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {report.portfolio_health_score >= 75 ? '🟢 Excellent' : report.portfolio_health_score >= 55 ? '🟡 Good' : '🔴 Needs Attention'}
                        </p>
                      </div>
                    </div>

                    {/* Risk + Meta */}
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs text-slate-400 font-medium">Risk Profile</span>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-white">{report.risk_assessment}</p>
                          <p className="text-[11px] text-slate-500 mt-1">Based on your current allocation</p>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-3">
                          <ClipboardList className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs text-slate-400 font-medium">Recommendations</span>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-white">{recs.length}</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {recs.filter(r => r.priority === 'HIGH').length} high priority
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs text-slate-400 font-medium">AI Model</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{PROVIDER_LABELS[report.ai_provider] || report.ai_provider}</p>
                          <p className="text-[11px] text-slate-500 mt-1 font-mono">{report.model_name}</p>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs text-slate-400 font-medium">Last Analysis</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                          <p className="text-[11px] text-slate-500 mt-1">{new Date(report.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Insights */}
                  {insights.length > 0 && (
                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" /> Key Insights
                      </h3>
                      <ul className="space-y-2.5">
                        {insights.map((insight: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Market Outlook */}
                  {report.market_outlook && (
                    <div className="bg-gradient-to-r from-indigo-900/20 to-violet-900/20 border border-indigo-500/20 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" /> Market Outlook
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed">{report.market_outlook}</p>
                    </div>
                  )}

                  {/* Top 3 Recs Preview */}
                  {recs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white">Top Recommendations</h3>
                        <button onClick={() => setActiveTab('recommendations')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                          View all <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {recs.slice(0, 3).map((rec, i) => <RecommendationCard key={i} rec={rec} index={i} />)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── RECOMMENDATIONS TAB ───────────────────────────────── */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {!report ? (
                <div className="text-center py-16 text-slate-400">No report available yet. Run an analysis first.</div>
              ) : (
                <>
                  {/* Filter chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400">Filter:</span>
                    {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                      <button key={p} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 hover:border-indigo-500/50 hover:text-indigo-300 transition-all">
                        {p}
                      </button>
                    ))}
                  </div>

                  {recs.length === 0 ? (
                    <p className="text-slate-500 text-sm">No recommendations in this report.</p>
                  ) : (
                    <div className="space-y-3">
                      {recs.map((rec, i) => <RecommendationCard key={i} rec={rec} index={i} />)}
                    </div>
                  )}

                  {/* SIP Plan */}
                  {report.monthly_sip_plan && (typeof report.monthly_sip_plan === 'string' ? JSON.parse(report.monthly_sip_plan) : report.monthly_sip_plan).length > 0 && (
                    <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-5 mt-4">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-emerald-400" /> Suggested Monthly SIP Plan
                      </h3>
                      <div className="space-y-2">
                        {(typeof report.monthly_sip_plan === 'string' ? JSON.parse(report.monthly_sip_plan) : report.monthly_sip_plan).map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                            <div>
                              <p className="text-sm font-medium text-white">{s.fund}</p>
                              <p className="text-xs text-slate-400">{s.reason}</p>
                            </div>
                            <span className="text-sm font-bold text-emerald-400">₹{s.amount?.toLocaleString('en-IN')}/mo</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stock Plan */}
                  {report.monthly_stock_plan && (typeof report.monthly_stock_plan === 'string' ? JSON.parse(report.monthly_stock_plan) : report.monthly_stock_plan).length > 0 && (
                    <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" /> Suggested Monthly Stock Plan
                      </h3>
                      <div className="space-y-2">
                        {(typeof report.monthly_stock_plan === 'string' ? JSON.parse(report.monthly_stock_plan) : report.monthly_stock_plan).map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                            <div>
                              <p className="text-sm font-medium text-white">{s.stock}</p>
                              <p className="text-xs text-slate-400">{s.reason}</p>
                            </div>
                            <span className="text-sm font-bold text-indigo-400">₹{s.amount?.toLocaleString('en-IN')}/mo</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rebalancing */}
                  {report.rebalancing_suggestions && (typeof report.rebalancing_suggestions === 'string' ? JSON.parse(report.rebalancing_suggestions) : report.rebalancing_suggestions).length > 0 && (
                    <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" /> Rebalancing Suggestions
                      </h3>
                      <ul className="space-y-2">
                        {(typeof report.rebalancing_suggestions === 'string' ? JSON.parse(report.rebalancing_suggestions) : report.rebalancing_suggestions).map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ──────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{reports.length}</p>
                  <p className="text-xs text-slate-400 mt-1">Total Reports</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{runs.filter(r => r.status === 'COMPLETED').length}</p>
                  <p className="text-xs text-slate-400 mt-1">Successful Runs</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-rose-400">{runs.filter(r => r.status === 'FAILED').length}</p>
                  <p className="text-xs text-slate-400 mt-1">Failed Runs</p>
                </div>
              </div>

              {reports.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">No reports yet.</div>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => {
                    const recs2 = (() => {
                      try { return typeof r.recommendations === 'string' ? JSON.parse(r.recommendations) : r.recommendations; } catch { return []; }
                    })();
                    return (
                      <button
                        key={r.id}
                        onClick={() => { setReport(r); setActiveTab('dashboard'); }}
                        className="w-full text-left bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/40 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                              (r.portfolio_health_score || 0) >= 75 ? 'bg-emerald-500/10 text-emerald-400' :
                              (r.portfolio_health_score || 0) >= 50 ? 'bg-amber-500/10 text-amber-400' :
                              'bg-rose-500/10 text-rose-400'
                            }`}>
                              {r.portfolio_health_score || '—'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              <p className="text-xs text-slate-400">
                                {recs2.length} recommendations · {r.risk_assessment || 'N/A'} · {PROVIDER_LABELS[r.ai_provider] || r.ai_provider}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              r.triggered_by === 'SCHEDULED' ? 'bg-slate-700 text-slate-300' : 'bg-indigo-500/20 text-indigo-300'
                            }`}>{r.triggered_by}</span>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS TAB ─────────────────────────────────────── */}
          {activeTab === 'settings' && config && (
            <SettingsPanel
              config={config}
              models={models}
              onSave={handleSaveConfig}
              saving={saving}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
